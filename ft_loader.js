/**
 * ft_loader.js — GitHub API verze
 * Data uložena jako JSON v private GitHub repozitáři.
 * Čtení: kdokoliv s read tokenem
 * Zápis: přes commit s SHA kontrolou (optimistic locking)
 */
const FTLoader = (() => {

  // ── Konfigurace ────────────────────────────────────────────────────────
  const GITHUB_OWNER = "asbeel13";
  const GITHUB_REPO  = "top-data";
  const GITHUB_FILE  = "database.json";
  const USERS_FILE   = "users.json";
  const POLL_MS      = 5000;

  // Token — uložen přímo v kódu (repozitář top-data je private)
  const TOKEN_STORAGE_KEY = "ftGithubToken";
  const RESOLVED_USER_KEY = "ftResolvedUser";

  function getToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ||
           window.FT_CONFIG?.token || "";
  }
  function getCurrentUserFromConfig() {
    return localStorage.getItem(RESOLVED_USER_KEY) ||
           window.FT_CONFIG?.user ||
           localStorage.getItem("ftCurrentUser") || "unknown";
  }

  // ── Registr uživatelů (token hash -> zkratka) ─────────────────────────
  async function hashToken(token) {
    const enc = new TextEncoder().encode(token);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // ── Ověření tokenu proti předschválenému seznamu (žádná samoregistrace) ──
  const VERIFIED_FLAG_KEY = "ftUserVerified";
  const USER_ROLE_KEY = "ftUserRole";

  async function resolveUserFromWhitelist(token) {
    const hash = await hashToken(token);
    const usersUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${USERS_FILE}`;
    try {
      const resp = await fetch(usersUrl, { headers: headers() });
      if (!resp.ok) throw new Error(`users.json ${resp.status}`);
      const data = await resp.json();
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const usersDb = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      const existing = (usersDb.users || []).find(u => u.tokenHash === hash);
      if (existing) {
        // Chybějící role u starších záznamů = "planovac" (zpětná kompatibilita,
        // beze změny chování pro dosud registrované uživatele).
        const role = existing.role || "planovac";
        localStorage.setItem(RESOLVED_USER_KEY, existing.zkratka);
        localStorage.setItem(VERIFIED_FLAG_KEY, "true");
        localStorage.setItem(USER_ROLE_KEY, role);
        return { verified: true, zkratka: existing.zkratka, role };
      }
      localStorage.setItem(VERIFIED_FLAG_KEY, "false");
      localStorage.removeItem(USER_ROLE_KEY);
      return { verified: false, zkratka: null, role: null };
    } catch (e) {
      console.warn("resolveUserFromWhitelist selhalo:", e);
      // Síťová chyba ap. — nepovažuj to za "neověřeno natrvalo", jen zatím nevíme
      return { verified: null, zkratka: null, role: null };
    }
  }

  function isUserVerified() {
    return localStorage.getItem(VERIFIED_FLAG_KEY) === "true";
  }

  function getUserRole() {
    if (!isUserVerified()) return null;
    return localStorage.getItem(USER_ROLE_KEY) || "planovac";
  }

  function showTokenDialog(onSuccess) {
    if (document.getElementById("ftTokenDialog")) return;
    const div = document.createElement("div");
    div.id = "ftTokenDialog";
    div.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    div.innerHTML = `
      <div style="background:white;border-radius:16px;padding:32px;width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:var(--font-body, sans-serif);">
        <h2 style="margin:0 0 8px;font-size:20px;font-family:var(--font-heading, sans-serif);">🔑 Přístup k databázi TOP</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Zadej svůj GitHub Personal Access Token. Obdržíš ho od správce systému.</p>
        <input id="ftTokenInput" type="password" placeholder="ghp_... nebo github_pat_..." style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:8px;font-family:inherit;">
        <input id="ftUserInput" type="text" placeholder="Tvoje zkratka (např. JK, RS, LR)" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:16px;font-family:inherit;">
        <button id="ftTokenSave" style="width:100%;padding:12px;background:var(--brand-accent, #1d4ed8);color:var(--brand-accent-ink, white);border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--font-heading, sans-serif);">Uložit a pokračovat →</button>
        <p style="color:#9ca3af;font-size:11px;margin:12px 0 0;text-align:center;">Token se uloží jen v tomto prohlížeči. Při příštím otevření se zadávat nemusí.</p>
      </div>
    `;
    document.body.appendChild(div);
    document.getElementById("ftTokenSave").addEventListener("click", async () => {
      const token = document.getElementById("ftTokenInput").value.trim();
      const user = document.getElementById("ftUserInput").value.trim();
      if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
        alert("Token musí začínat ghp_ (classic) nebo github_pat_ (fine-grained)");
        return;
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (user) localStorage.setItem("ftCurrentUser", user);
      const saveBtn = document.getElementById("ftTokenSave");
      saveBtn.disabled = true;
      saveBtn.textContent = "Ověřuji…";
      await resolveUserFromWhitelist(token);
      div.remove();
      if (onSuccess) onSuccess();
    });
  }

  const DATA_KEY = "ftWorkbookData";
  const USER_KEY = "ftCurrentUser"; // zkratka přihlášeného uživatele

  let _onData = null, _onStatus = null, _onActivity = null;
  let _pollTimer = null;
  let _lastSha = "";
  let _lastEtag = "";
  // Přesný text database.json, ke kterému patří SHA v _base.sha — výchozí
  // stav pro historii úprav (viz "Historie úprav úkolů" níž). Drží se
  // v paměti spolu se SHA, ne z localStorage cache: ta se při plné kvótě
  // tiše neuloží a historie by pak porovnávala se zastaralými daty.
  let _base = null; // { sha, str }

  function status(msg, err) { if (_onStatus) _onStatus(msg, !!err); }

  function apiUrl() {
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
  }

  function headers(extra = {}) {
    const token = getToken();
    if (!token) throw new Error("Chybí config.js s tokenem. Zkopíruj config.js do složky s HTML soubory.");
    return {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json",
      ...extra
    };
  }

  // ── Parsování dat ───────────────────────────────────────────────────────
  function excelDateToISO(v) {
    if (!v) return null;
    function localISO(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
    if (v instanceof Date && !isNaN(v)) return localISO(v);
    if (typeof v === "string") {
      const t = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      const mDot = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (mDot) return `${mDot[3]}-${mDot[2].padStart(2,"0")}-${mDot[1].padStart(2,"0")}`;
    }
    return null;
  }

  function generateRecurring(opakovaci, vyjimky, tasks, dokonceni) {
    const vyjimkySet = new Set(vyjimky.map(v => `${v.id}|${v.datum}`));
    // dokonceni je ZÁMĚRNĚ oddělené od výjimek — výjimka = "tenhle den se negeneruje vůbec",
    // dokončení = "tenhle den se má zobrazit jako hotový", obojí se nesmí míchat.
    const dokonceniSet = new Set((dokonceni || []).map(d => `${d.id}|${d.datum}`));
    const taskIndex = new Map();
    tasks.forEach(t => { if (t.id && t.plannedDate) taskIndex.set(`${t.id}|${t.plannedDate}`, t); });

    function localISO(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }

    const today = new Date(); today.setHours(0,0,0,0);
    const fromDate = new Date(today); fromDate.setDate(today.getDate() - 28);
    const toDate   = new Date(today); toDate.setDate(today.getDate() + 28);

    const result = [];
    (opakovaci || []).filter(o => o.aktivni).forEach(o => {
      const val = parseInt(o.hodnota, 10) || 1;
      const dates = [];

      if (o.typ === "weekly") {
        const jsDay = val === 7 ? 0 : val;
        for (let dd = new Date(fromDate); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
          if (dd.getDay() === jsDay) dates.push(new Date(dd));
        }
      } else if (o.typ === "interval") {
        const ref = new Date("2025-01-01");
        for (let dd = new Date(fromDate); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
          if (Math.round((dd - ref) / 86400000) % val === 0) dates.push(new Date(dd));
        }
      } else if (o.typ === "monthly") {
        for (let dd = new Date(fromDate); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
          if (dd.getDate() === val) dates.push(new Date(dd));
        }
      }

      dates.forEach(d => {
        const iso = localISO(d);
        if (vyjimkySet.has(`${o.id}|${iso}`)) return;
        if (taskIndex.has(`${o.id}|${iso}`)) return;
        const isDone = dokonceniSet.has(`${o.id}|${iso}`);
        result.push({
          id: o.id, title: o.title, owner: o.owner,
          plannedDate: iso, priority: o.priority || "P2", project: "",
          state: isDone ? "Dokončeno" : "Opakující se", note: o.note || "", internalNote: "",
          auto: "", waiting: false, cancelled: false, recurring: true
        });
      });
    });
    return result;
  }

  // Normalizovaný seznam spoluřešitelů úkolu (2026-09-21) — JEDINÉ místo
  // s touhle logikou, používá ho rozpad na kopie v parseDatabase i detail
  // úkolu na všech stránkách. Funguje pro originál i pro zobrazovací kopii
  // (u kopie je hlavní řešitel v primaryOwner, ne v owner). Vynechá
  // prázdné hodnoty, duplicity a hlavního řešitele; ne-pole = žádní.
  // Státní svátek ze SPA syncu (*SPA-HOL-…, 2026-09-22): SPA ho posílá jako
  // JEDEN úkol s coOwners = všichni (místo úkolu na každého člověka — kvůli
  // velikosti database.json). Pro zobrazení se ale chová, jako by měl každý
  // vlastní úkol: bez štítků "s JK"/"+ RS, LR…", bez čárkovaného označení
  // kopie a v počítadlech jako dřív. Kopie v kalendáři se vyrábějí dál
  // (listCoOwners), jen je navenek nevidět.
  function isSpaHoliday(task) {
    return String((task && task.id) || "").startsWith("*SPA-HOL-");
  }

  function getCoOwners(task) {
    if (isSpaHoliday(task)) return [];
    return listCoOwners(task);
  }

  function listCoOwners(task) {
    if (!task || !Array.isArray(task.coOwners)) return [];
    const primary = task.primaryOwner || task.owner || "";
    const seen = new Set();
    const result = [];
    task.coOwners.forEach(c => {
      const co = String(c || "").trim();
      if (!co || co === primary || seen.has(co)) return;
      seen.add(co);
      result.push(co);
    });
    return result;
  }

  // Krátký štítek sdíleného úkolu pro kartu v kalendáři (2026-09-21):
  // kopie u spoluřešitele → "s <hlavní>", originál se spoluřešiteli →
  // "+ RS, LR", jinak "". Prostý text — volající ho musí escapovat.
  function getCoOwnerLabel(task) {
    if (!task || isSpaHoliday(task)) return "";
    if (task.isCoOwnerCopy) return `s ${task.primaryOwner || "?"}`;
    const co = getCoOwners(task);
    return co.length ? `+ ${co.join(", ")}` : "";
  }

  function escapeHtmlLocal(str) {
    return (str ?? "").toString()
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  // ── Výběr spoluřešitelů ve formulářích (2026-09-21) ────────────────────
  // JEDNO sdílené místo pro Správu úkolů, Dashboard i mobilní Dashboard.
  // Zaškrtávací seznam řešitelů: bez hlavního řešitele, bez vyřazených —
  // ale už vybraný vyřazený/neznámý spoluřešitel zůstane vidět zaškrtnutý
  // s poznámkou (stejná zásada jako u výběru auta/řešitele: úprava úkolu
  // nesmí nic tiše smazat). locked = úkol ze SPA syncu (*SPA…): topSync.js
  // ho při každém běhu přepisuje, spoluřešitelé by se ztratili → jen text.
  // Při změně hlavního řešitele zavolat znovu se selected z
  // readCoOwnerPicker(), ať se nový hlavní ze seznamu vyřadí.
  function renderCoOwnerPicker(container, { resitele = [], selected = [], primary = "", locked = false } = {}) {
    if (!container) return;
    if (locked) {
      container.dataset.ready = "0";
      container.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">U úkolů synchronizovaných ze SPA nelze spoluřešitele nastavit.</div>`;
      return;
    }
    const sel = new Set((selected || []).map(s => String(s || "").trim()).filter(Boolean));
    const items = [];
    (resitele || []).forEach(r => {
      if (!r || !r.zkratka || r.zkratka === primary) return;
      if (r.vyrazen && !sel.has(r.zkratka)) return;
      items.push({ value: r.zkratka, title: `${r.jmeno || ""} ${r.prijmeni || ""}`.trim(), note: r.vyrazen ? " (vyřazen)" : "" });
    });
    sel.forEach(s => {
      if (s !== primary && !items.some(i => i.value === s)) items.push({ value: s, title: s, note: " (neznámý)" });
    });
    const labelStyle = "display:inline-flex;align-items:center;gap:5px;padding:6px 10px;min-height:36px;" +
      "border:1px solid var(--line-medium);border-radius:6px;font-size:13px;font-weight:normal;" +
      "text-transform:none;letter-spacing:normal;color:var(--text);cursor:pointer;margin:0;";
    container.dataset.ready = "1";
    container.innerHTML = items.length
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">` + items.map(i =>
          `<label style="${labelStyle}" title="${escapeHtmlLocal(i.title)}"><input type="checkbox" value="${escapeHtmlLocal(i.value)}"${sel.has(i.value) ? " checked" : ""} style="width:auto;height:auto;min-height:0;margin:0;padding:0;"> ${escapeHtmlLocal(i.value)}${escapeHtmlLocal(i.note)}</label>`
        ).join("") + `</div>`
      : `<div style="font-size:12px;color:var(--text-muted);padding:4px 0;">Žádní další řešitelé.</div>`;
  }

  // Vybraní spoluřešitelé z pickeru, nebo null, když picker není
  // vykreslený/je zamčený — volající pak coOwners NEMĚNÍ (nesmí je smazat).
  function readCoOwnerPicker(container) {
    if (!container || container.dataset.ready !== "1") return null;
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  }

  function parseDatabase(json) {
    const tasks = (json.tasks || []).map(t => ({
      ...t,
      plannedDate: excelDateToISO(t.plannedDate),
      doneDate:    excelDateToISO(t.doneDate),
      createdDate: excelDateToISO(t.createdDate),
      dueDate:     excelDateToISO(t.dueDate),
    }));

    // Rozprostři vícedenní úkoly (durationDays > 1) na jednotlivé dny
    function expandMultiDayTasks(taskList) {
      const result = [];
      taskList.forEach(t => {
        const duration = parseInt(t.durationDays, 10) || 1;
        if (duration <= 1 || !t.plannedDate) {
          result.push(t);
          return;
        }
        // activeDays: pole čísel 1(Po)..7(Ne). Chybí/prázdné = každý den (původní chování).
        const activeDays = Array.isArray(t.activeDays) && t.activeDays.length > 0 ? t.activeDays : null;
        const [y, m, d] = t.plannedDate.split("-").map(Number);

        // Nejdřív zjisti, které dny v rozsahu jsou skutečně aktivní (pro správné číslování X/Y)
        const occurrences = [];
        for (let i = 0; i < duration; i++) {
          const dd = new Date(y, m - 1, d);
          dd.setDate(dd.getDate() + i);
          const jsDay = dd.getDay(); // 0=Ne,1=Po,...,6=So
          const isoWeekday = jsDay === 0 ? 7 : jsDay; // převod na 1=Po..7=Ne
          if (!activeDays || activeDays.includes(isoWeekday)) {
            occurrences.push(dd);
          }
        }

        occurrences.forEach((dd, idx) => {
          const iso = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
          // Pokud je pole completedDays a tenhle konkrétní den v něm je, JEN tahle
          // dlaždice se zobrazí jako hotová — celkový task.state zůstává nedotčený,
          // dokud nejsou hotové úplně všechny dny (viz markDayComplete).
          const completedDays = Array.isArray(t.completedDays) ? t.completedDays : [];
          const dayDone = completedDays.includes(iso);
          result.push({
            ...t,
            plannedDate: iso,
            multiDayIndex: idx + 1,
            multiDayTotal: occurrences.length,
            isMultiDay: true,
            state: dayDone ? "Dokončeno" : t.state,
          });
        });
      });
      return result;
    }

    // Spoluřešitelé (coOwners, 2026-09-21): úkol se má v kalendáři ukázat i
    // u každého spoluřešitele. Stejný princip jako expandMultiDayTasks —
    // kopie existují JEN v zobrazovacích datech (DATA.tasks), nikdy se
    // neukládají. Všechny pohledy seskupují podle t.owner, proto kopie nese
    // owner = spoluřešitel; skutečný hlavní řešitel je v primaryOwner.
    // Kdo z kopie zapisuje zpět do surových dat, NESMÍ brát task.owner
    // (přepsal by hlavního řešitele) — číst task.primaryOwner || task.owner.
    // Originál se nemění. Jen úkoly s plannedDate (kalendář) — nenaplánované
    // by se jinak zdvojovaly v Backlogu Dashboardu.
    function expandCoOwnerCopies(taskList) {
      const result = [];
      taskList.forEach(t => {
        if (!t.plannedDate) return;
        const primary = t.owner || "";
        // Svátek: kopie BEZ primaryOwner i isCoOwnerCopy — zobrazí se, počítá
        // i v detailu ukáže jako vlastní úkol daného člověka (viz isSpaHoliday
        // výš; s primaryOwner by detail u DH ukazoval řešitele "AMa").
        // Bezpečné jen proto, že úprava/zrušení *SPA úkolů je na mobilu
        // zakázaná (tydenni_dashboard_mobile.html, openModal) — jinak by
        // úprava z kopie zapsala do svátku owner = tenhle člověk.
        const svatek = isSpaHoliday(t);
        listCoOwners(t).forEach(co => {
          result.push(svatek
            ? { ...t, owner: co }
            : { ...t, owner: co, primaryOwner: primary, isCoOwnerCopy: true });
        });
      });
      return result;
    }

    const activeTasks = tasks.filter(t => !t.cancelled);
    const expandedTasks = expandMultiDayTasks(activeTasks);
    const coOwnerCopies = expandCoOwnerCopies(expandedTasks);
    // generateRecurring dostává záměrně jen expandedTasks (bez kopií) — její
    // index id|datum by se kopiemi stejně nezměnil (stejné id i datum).
    const recurringTasks = generateRecurring(json.opakovaci, json.vyjimky, expandedTasks, json.dokonceni);
    const allTasks = [...expandedTasks, ...coOwnerCopies, ...recurringTasks];
    const owners = [...new Set(allTasks.map(t => t.owner))].filter(Boolean).sort((a,b) => a.localeCompare(b,"cs"));

    return {
      tasks: allTasks,
      allTasks: tasks, // včetně zrušených — pro správu úkolů
      backlog: [],
      owners,
      resitele:      json.resitele      || [],
      auta:          json.auta          || [],
      autaRezervace: json.auta_rezervace|| [],
      opakovaci:     json.opakovaci     || [],
      opakovaciVyjimky: json.vyjimky   || [],
      opakovaciDokonceni: json.dokonceni || [],
    };
  }

  // ── Čtení z GitHub ─────────────────────────────────────────────────────
  async function fetchFromGitHub(silent) {
    try {
      const resp = await fetch(apiUrl(), {
        headers: headers({ "If-None-Match": _lastEtag })
      });

      if (resp.status === 304) return false; // Beze změny

      if (!resp.ok) throw new Error(`GitHub API ${resp.status}: ${await resp.text().then(t => t.slice(0,200))}`);

      _lastEtag = resp.headers.get("etag") || "";
      const data = await resp.json();
      const sha = data.sha;

      if (sha === _lastSha) return false;
      _lastSha = sha;

      // Dekóduj Base64 → UTF-8 správně. KRITICKÁ OPRAVA (2026-09-18) — nad
      // ~1MB GitHub Contents API pole "content" v JSON odpovědi vůbec
      // nevrací (jen sha/size/download_url), takže tenhle blok mlčky
      // dostal undefined a appka spadla na "Chyba načtení: Unexpected end
      // of JSON input" (nahlásil JK po syncu svátků ze SPA, database.json
      // přerostl 1MB). Když content chybí, druhý dotaz na stejnou URL s
      // "raw" Accept hlavičkou — funguje až do 100MB, stejná autentizace.
      // Stejná oprava už byla nasazená v SPA `topSync.js` (nactiSoubor()).
      let jsonStr;
      if (data.content) {
        const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
        jsonStr = new TextDecoder("utf-8").decode(bytes);
      } else {
        const rawResp = await fetch(apiUrl(), { headers: headers({ "Accept": "application/vnd.github.v3.raw" }) });
        if (!rawResp.ok) throw new Error(`GitHub API (raw, soubor nad 1MB) ${rawResp.status}`);
        jsonStr = await rawResp.text();
      }
      _base = { sha, str: jsonStr };
      const json = JSON.parse(jsonStr);
      const parsed = parseDatabase(json);

      // Ulož do localStorage pro sdílení mezi záložkami
      try {
        localStorage.setItem(DATA_KEY, JSON.stringify({
          parsedData: parsed,
          rawJson: json,
          sha,
          savedAt: new Date().toISOString()
        }));
      } catch(e) {}

      if (_onData) _onData(parsed);
      status(`Načteno · ${new Date(json.updatedAt || Date.now()).toLocaleString("cs-CZ")} · ${json.updatedBy || ""}`);
      return true;
    } catch(e) {
      // Neplatný token — vymaž ho a nabídni zadání nového
      if (e.message.includes("401")) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        status("Token je neplatný — zadej nový", true);
        showTokenDialog(() => fetchFromGitHub(false));
        return false;
      }
      if (!silent) status(`Chyba načtení: ${e.message}`, true);
      console.error("ft_loader fetchFromGitHub:", e);
      return false;
    }
  }

  // ── Zápis do GitHub ────────────────────────────────────────────────────
  async function saveToGitHub(json, commitMessage) {
    if (!_lastSha) throw new Error("SHA neznámé — nejdřív načti data");

    // Oprava 2026-09-17 (nález č. 9): dřív čteno přímo z localStorage
    // (ftCurrentUser — cokoliv, co si uživatel napsal do dialogu při
    // zadávání tokenu, nikdy neověřené proti whitelistu). Veřejné
    // FTLoader.getCurrentUser() (používané všude jinde pro commit zprávy)
    // přitom správně upřednostňuje ftResolvedUser (zkratku ověřenou v
    // resolveUserFromWhitelist) — saveToGitHub() tenhle přesnější zdroj
    // nikdy nepoužívalo, takže json.updatedBy/committer v historii commitů
    // top-data mohly ukazovat jiné jméno, než jaké appka jinde hlásila
    // jako "Načteno · ... · kdo".
    const user = getCurrentUserFromConfig();
    json.updatedAt = new Date().toISOString();
    json.updatedBy = user;

    // Stav PŘED uložením pro historii úprav — jen když přesně odpovídá SHA,
    // proti kterému se ukládá (GitHub zápis přijme jen při shodě SHA, takže
    // rozdíl pak ukazuje přesně to, co TOHLE uložení změnilo).
    const historyBase = _base && _base.sha === _lastSha ? _base.str : null;
    const _baseAtStart = !!_base; // jen pro diagnostiku, když historyBase chybí

    // Enkóduj JSON → UTF-8 → Base64 (po částech, aby nedošlo k přetečení zásobníku u velkých souborů)
    // Kompaktní zápis (bez odsazení), ne JSON.stringify(json, null, 2) jako
    // dřív — KRITICKÁ OPRAVA (2026-09-18, viz fetchFromGitHub() výš). Bez
    // tohohle by první další uložení z appky (odkudkoliv — Dashboard,
    // Správa úkolů) zase nafouklo soubor zpátky nad ~1MB, i po SPA-side
    // opravě v topSync.js. Nikdo tenhle soubor needituje ručně, odsazení
    // nemá funkční přínos.
    const jsonStr = JSON.stringify(json);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < jsonBytes.length; i += CHUNK) {
      binary += String.fromCharCode(...jsonBytes.subarray(i, i + CHUNK));
    }
    const content = btoa(binary);

    const resp = await fetch(apiUrl(), {
      method: "PUT",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message: commitMessage || `Update by ${user}`,
        content,
        sha: _lastSha,
        committer: { name: user, email: `${user}@filtration.cz` }
      })
    });

    if (resp.status === 409) {
      throw new Error("CONFLICT: Někdo jiný mezitím uložil změny. Přenačti data a zkus znovu.");
    }
    if (!resp.ok) {
      throw new Error(`GitHub zápis ${resp.status}: ${await resp.text().then(t => t.slice(0,200))}`);
    }

    const data = await resp.json();
    _lastSha = data.content.sha;
    _lastEtag = ""; // Vynutí přenačtení při příštím pollingu

    // KRITICKÁ OPRAVA (2026-08-21): ihned po úspěšném zápisu aktualizuj i
    // lokální cache (DATA_KEY), ať přesně odpovídá tomu, co se právě
    // uložilo. Dřív se cache aktualizovala JEN přes samostatný
    // reload()/fetchFromGitHub() — asynchronní síťový požadavek navíc.
    // To vytvářelo ČASOVOU MEZERU mezi okamžitou aktualizací _lastSha a
    // opožděnou aktualizací cache. Pokud v tomhle okně proběhlo DALŠÍ
    // volání saveToGitHub() (např. rychlé založení druhého úkolu hned po
    // prvním), getRawJson() vrátil ZASTARALÁ data BEZ prvního úkolu — a
    // protože _lastSha už byl aktuální, GitHub zápis přijal jako platný
    // (žádný konflikt 409), čímž TICHĚ PŘEPSAL a ztratil první úkol.
    // Přesně tohle způsobilo zmizení úkolu "Demontáž potrubí 102"
    // 2026-08-21 — dva úkoly založené rychle po sobě, druhý přepsal první.
    try {
      const parsed = parseDatabase(json);
      localStorage.setItem(DATA_KEY, JSON.stringify({
        parsedData: parsed,
        rawJson: json,
        sha: _lastSha,
        savedAt: new Date().toISOString()
      }));
    } catch(e) {}

    _base = { sha: _lastSha, str: jsonStr };
    // Historie AŽ PO úspěšném uložení úkolu, zápis běží na pozadí — její
    // chyba nikdy nesmí shodit ani zdržet uložení (rozhodnutí JK
    // 2026-09-22: "nejdřív úkol, pak historie").
    try {
      recordHistory(historyBase, json, user, {
        message: commitMessage || "",
        reason: historyBase ? "" : (_baseAtStart ? "jine_sha" : "zadny"),
      });
    }
    catch (e) { console.warn("ft_loader historie:", e); }

    return data;
  }

  // ── Historie úprav úkolů (2026-09-23, viz HISTORIE_UPRAV_navrh.md) ─────
  // Kdo úkol založil / změnil / dal hotovo / zrušil / smazal. Zapisuje se
  // JEN odsud (všechny zápisy TOP jdou přes saveToGitHub) — rozdíl stavu
  // před a po uložení, takže stránky nic volat nemusí a zachytí se i
  // hromadné "Uloženo uživatelem X" ze Správy úkolů.
  // Ukládá se MIMO database.json do měsíčních souborů
  // top-data/history/YYYY-MM.json = { version: 1, events: [ … ] }:
  //   { t: čas UTC, u: kdo, id, d: plannedDate, a: akce, f: změněná pole,
  //     ch: { pole: [staré, nové] } jen u HISTORY_KEY_FIELDS (u zalozen /
  //     smazan jejich výchozí / poslední hodnoty), dny / dnyZpet: přidané /
  //     odebrané hotové dny vícedenního úkolu, n: název (jen u zalozen /
  //     smazan — smazaný úkol jinak nejde dohledat) }
  // Akce: zalozen, zmena, hotovo, den_hotovo, zrusen, obnoven, smazan,
  // opak_hotovo / opak_hotovo_zruseno (dokonceni opakujícího se pravidla,
  // id = ID pravidla), opak_zrusen / opak_obnoven (výjimka = "tenhle den
  // se negeneruje", Dashboard "Zrušit dnes"; + duvod) — přidáno
  // 2026-09-23, JK chce u opakovaného úkolu vidět, kdo ho smazal. Úpravy
  // samotných pravidel se nezapisují (JK: zatím ne). Úkoly ze SPA (*SPA…
  // dovolené, svátky) se nezapisují.
  // Diagnostika (2026-09-25, bez id → u úkolu se nezobrazuje):
  // bez_vychoziho_stavu (+ duvod "zadny"/"jine_sha", zprava = zpráva
  // commitu), chyba_historie (+ chyba, zprava); hromadna_zmena (+ pocet).
  // pozde: n = záznam zapsaný až z fronty po n neúspěšných pokusech.
  const HISTORY_DIR = "history";
  const HISTORY_KEY_FIELDS = ["state", "owner", "coOwners", "plannedDate", "priority", "auto"];
  const HISTORY_IGNORED_FIELDS = new Set(["lastUpdated"]);
  // Pojistka proti zahlcení souboru (např. kdyby se změnil formát všech
  // úkolů najednou) — místo stovek záznamů jen jeden souhrnný.
  const HISTORY_MAX_EVENTS = 200;
  let _historyQueue = Promise.resolve();

  // Prázdné hodnoty se berou jako shodné — Správa úkolů při uložení
  // přeformátuje VŠECHNY úkoly (chybějící pole → "" / false / []), to
  // nesmí vypadat jako změna.
  function historyEmpty(v) {
    return v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);
  }
  function historySame(a, b) {
    if (historyEmpty(a) && historyEmpty(b)) return true;
    if (typeof a !== "object" && typeof b !== "object") return String(a) === String(b);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  function historyChangedFields(o, n) {
    return [...new Set([...Object.keys(o), ...Object.keys(n)])]
      .filter(k => !HISTORY_IGNORED_FIELDS.has(k) && !historySame(o[k], n[k]));
  }

  // Páruje úkoly před/po podle id. Změna plannedDate u unikátního ID je
  // tedy "zmena", ne smazání + založení. Víc úkolů se stejným id (zástupy
  // za opakující se pravidlo, ale v živých datech i staré duplicity se
  // stejným id I datem — např. *0463* zrušený + nezrušený) se páruje
  // nejdřív na úplnou shodu obsahu, pak podle plannedDate, zbytek v pořadí.
  // Bez kroku "úplná shoda" se duplicity zkřížily a uložení bez jediné
  // změny zapsalo falešné zrusen/obnoven (zjištěno testem 2026-09-23).
  function historyPairTasks(before, after) {
    const group = list => {
      const m = new Map();
      (list || []).forEach(t => {
        if (!t || !t.id) return;
        if (!m.has(t.id)) m.set(t.id, []);
        m.get(t.id).push(t);
      });
      return m;
    };
    const b = group(before), a = group(after);
    const pairs = [];
    new Set([...b.keys(), ...a.keys()]).forEach(id => {
      const bl = [...(b.get(id) || [])], al = [...(a.get(id) || [])];
      if (bl.length > 1 || al.length > 1) {
        const matchBy = same => {
          for (let i = 0; i < bl.length; ) {
            const j = al.findIndex(t => same(bl[i], t));
            if (j >= 0) { pairs.push([bl[i], al[j]]); bl.splice(i, 1); al.splice(j, 1); }
            else i++;
          }
        };
        matchBy((x, y) => historyChangedFields(x, y).length === 0);
        matchBy((x, y) => x.plannedDate === y.plannedDate);
      }
      while (bl.length && al.length) pairs.push([bl.shift(), al.shift()]);
      bl.forEach(t => pairs.push([t, null]));
      al.forEach(t => pairs.push([null, t]));
    });
    return pairs;
  }

  function buildHistoryEvents(before, after, user, t) {
    const events = [];
    const isSpa = x => /^\*?SPA/.test(String((x && x.id) || ""));
    const push = (a, task, extra) => events.push({ t, u: user, id: task.id, d: task.plannedDate || "", a, ...extra });

    const val = v => historyEmpty(v) ? null : v;
    // Výchozí hodnoty klíčových polí u založení/smazání ("založen pro RS
    // na 7. 10., P1").
    const snapshot = (task, created) => {
      const ch = {};
      HISTORY_KEY_FIELDS.forEach(k => {
        if (!historyEmpty(task[k])) ch[k] = created ? [null, task[k]] : [task[k], null];
      });
      return ch;
    };

    historyPairTasks(before.tasks, after.tasks).forEach(([o, n]) => {
      if (isSpa(n || o)) return;
      if (!o) { push("zalozen", n, { n: n.title || "", ch: snapshot(n, true) }); return; }
      if (!n) { push("smazan", o, { n: o.title || "", ch: snapshot(o, false) }); return; }
      const f = historyChangedFields(o, n), ch = {};
      if (!f.length) return;
      f.filter(k => HISTORY_KEY_FIELDS.includes(k)).forEach(k => { ch[k] = [val(o[k]), val(n[k])]; });
      const extra = { f };
      if (Object.keys(ch).length) extra.ch = ch;
      // completedDays (hotové dny vícedenního úkolu) — jen přidané /
      // odebrané dny, ne celý seznam dvakrát.
      if (f.includes("completedDays")) {
        const od = o.completedDays || [], nd = n.completedDays || [];
        const plus = nd.filter(x => !od.includes(x)), minus = od.filter(x => !nd.includes(x));
        if (plus.length) extra.dny = plus;
        if (minus.length) extra.dnyZpet = minus;
      }
      let a = "zmena";
      if (!o.cancelled && n.cancelled) a = "zrusen";
      else if (o.cancelled && !n.cancelled) a = "obnoven";
      else if (o.state !== "Dokončeno" && n.state === "Dokončeno") a = "hotovo";
      else if (extra.dny) a = "den_hotovo";
      push(a, n, extra);
    });

    const key = x => `${x.id}|${x.datum}`;
    const bD = new Set((before.dokonceni || []).map(key));
    const aD = new Set((after.dokonceni || []).map(key));
    (after.dokonceni || []).forEach(x => {
      if (!bD.has(key(x))) events.push({ t, u: user, id: x.id, d: x.datum, a: "opak_hotovo" });
    });
    (before.dokonceni || []).forEach(x => {
      if (!aD.has(key(x))) events.push({ t, u: user, id: x.id, d: x.datum, a: "opak_hotovo_zruseno" });
    });
    const bV = new Set((before.vyjimky || []).map(key));
    const aV = new Set((after.vyjimky || []).map(key));
    (after.vyjimky || []).forEach(x => {
      if (!bV.has(key(x))) events.push({ t, u: user, id: x.id, d: x.datum, a: "opak_zrusen", ...(x.duvod ? { duvod: x.duvod } : {}) });
    });
    (before.vyjimky || []).forEach(x => {
      if (!aV.has(key(x))) events.push({ t, u: user, id: x.id, d: x.datum, a: "opak_obnoven" });
    });
    return events;
  }

  // info = { message: zpráva commitu uložení, reason: proč chybí výchozí stav }
  function recordHistory(baseStr, json, user, info) {
    const t = new Date().toISOString().slice(0, 19) + "Z";
    const msg = String((info && info.message) || "").slice(0, 150);
    let events;
    if (!baseStr) {
      // Diagnostika (2026-09-25): dřív se takové uložení jen tiše
      // nezapsalo (console.warn) a zpětně nešlo zjistit proč (případ JaM
      // 2026-09-24 06:29). Záznam bez id se u úkolu nezobrazuje, je jen
      // pro dohledání v souboru historie.
      events = [{ t, u: user, a: "bez_vychoziho_stavu", duvod: (info && info.reason) || "", zprava: msg }];
    } else {
      try {
        events = buildHistoryEvents(JSON.parse(baseStr), json, user, t);
      } catch (e) {
        events = [{ t, u: user, a: "chyba_historie", chyba: String(e && e.message || e).slice(0, 200), zprava: msg }];
      }
    }
    if (!events.length) return;
    if (events.length > HISTORY_MAX_EVENTS) {
      console.warn(`ft_loader historie: ${events.length} záznamů najednou, zapisuji jen souhrn`);
      events = [{ t, u: user, a: "hromadna_zmena", pocet: events.length }];
    }
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    enqueueHistory(month, events, user);
  }

  // ── Fronta nezapsaných záznamů (2026-09-25) ──────────────────────────
  // Dřív: zápis historie selhal (síť, souběh) → 3 okamžité pokusy → záznam
  // ztracen (JaM 2026-09-24 06:29, 1 z 31 uložení). Teď se každá dávka
  // nejdřív uloží do localStorage (ftHistoryPending) a smaže se až po
  // úspěšném zápisu; co nevyjde, zkusí se znovu při dalším uložení, při
  // otevření stránky a při pollingu (nejdřív po HISTORY_RETRY_MS).
  // Zápis je idempotentní (appendHistory přeskočí záznamy, které už v
  // souboru jsou), takže opakování ani dvě záložky nic nezdvojí; mezi
  // záložkami navíc Web Locks, kde je prohlížeč má.
  const HISTORY_PENDING_KEY = "ftHistoryPending";
  const HISTORY_RETRY_MS = 60000;
  const HISTORY_PENDING_MAX = 200;                  // dávek
  const HISTORY_PENDING_MAX_AGE = 14 * 86400000;    // pak se dávka zahodí
  let _historyMem = null;   // náhrada, když localStorage nejde zapsat
  let _historyLastTry = 0;

  function readPendingHistory() {
    if (_historyMem) return _historyMem.slice();
    try {
      const a = JSON.parse(localStorage.getItem(HISTORY_PENDING_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function writePendingHistory(list) {
    if (_historyMem) { _historyMem = list.slice(); return; }
    try {
      if (list.length) localStorage.setItem(HISTORY_PENDING_KEY, JSON.stringify(list));
      else localStorage.removeItem(HISTORY_PENDING_KEY);
    } catch (e) {
      _historyMem = list.slice(); // plná kvóta apod. — aspoň do zavření stránky
    }
  }
  function hasPendingHistory() { return readPendingHistory().length > 0; }

  function enqueueHistory(month, events, user) {
    const list = readPendingHistory();
    list.push({ k: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, month, events, user, at: Date.now(), tries: 0 });
    while (list.length > HISTORY_PENDING_MAX) list.shift();
    writePendingHistory(list);
    flushHistory();
  }

  // Fronta = zápisy jdou postupně (dvě rychlá uložení po sobě by jinak
  // soupeřila o SHA stejného souboru).
  function flushHistory() {
    _historyQueue = _historyQueue
      .then(() => (navigator.locks && navigator.locks.request)
        ? navigator.locks.request("ftHistoryFlush", flushPendingHistory)
        : flushPendingHistory())
      .catch(e => console.warn("ft_loader historie:", e));
    return _historyQueue;
  }

  async function flushPendingHistory() {
    _historyLastTry = Date.now();
    for (let guard = 0; guard < HISTORY_PENDING_MAX; guard++) {
      const list = readPendingHistory().filter(x => Date.now() - (x.at || 0) < HISTORY_PENDING_MAX_AGE);
      if (!list.length) { writePendingHistory([]); return; }
      const entry = list[0];
      try {
        // Pozdě zapsaný záznam nese počet neúspěšných pokusů (diagnostika).
        const events = entry.tries ? entry.events.map(e => ({ ...e, pozde: entry.tries })) : entry.events;
        await appendHistory(entry.month, events, entry.user || getCurrentUserFromConfig());
        writePendingHistory(readPendingHistory().filter(x => x.k !== entry.k));
      } catch (e) {
        console.warn("ft_loader historie: zápis se nepovedl, zkusím později", e);
        writePendingHistory(readPendingHistory().map(x => x.k === entry.k
          ? { ...x, tries: (x.tries || 0) + 1, err: String(e && e.message || e).slice(0, 120) } : x));
        return;
      }
    }
  }

  // Klíč záznamu pro kontrolu "už je v souboru" (pole pozde se ignoruje).
  function historyEventKey(e) {
    return [e.t, e.u, e.id || "", e.a, e.d || "", e.zprava || ""].join("|");
  }

  function historyUrl(month) {
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${HISTORY_DIR}/${month}.json`;
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }

  // Načte měsíční soubor historie; neexistuje → { sha: null, doc: prázdný }.
  async function readHistoryMonth(month) {
    const resp = await fetch(historyUrl(month), { headers: headers(), cache: "no-store" });
    if (resp.status === 404) return { sha: null, doc: { version: 1, events: [] } };
    if (!resp.ok) throw new Error(`historie ${month} GET ${resp.status}`);
    const data = await resp.json();
    let str;
    if (data.content) {
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      str = new TextDecoder("utf-8").decode(bytes);
    } else {
      // nad ~1MB Contents API "content" nevrací (viz fetchFromGitHub)
      const raw = await fetch(historyUrl(month), { headers: headers({ "Accept": "application/vnd.github.v3.raw" }), cache: "no-store" });
      if (!raw.ok) throw new Error(`historie ${month} (raw) ${raw.status}`);
      str = await raw.text();
    }
    const doc = JSON.parse(str); // poškozený soubor → chyba, NIKDY ho nepřepsat
    if (!Array.isArray(doc.events)) doc.events = [];
    return { sha: data.sha, doc };
  }

  // 3 pokusy s prodlevou 1 s a 3 s (dřív hned po sobě — krátký výpadek
  // nebo souběh je všechny "spálil"). Při chybě i po 3 pokusech zůstává
  // dávka ve frontě (flushPendingHistory) a zkusí se později.
  async function appendHistory(month, events, user) {
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) await new Promise(r => setTimeout(r, attempt === 2 ? 1000 : 3000));
      try {
        const { sha, doc } = await readHistoryMonth(month);
        // Idempotence: co už v souboru je (opakovaný pokus po chybě, která
        // ve skutečnosti proběhla; druhá záložka), se znovu nepřidá.
        const have = new Set(doc.events.map(historyEventKey));
        const add = events.filter(e => !have.has(historyEventKey(e)));
        if (!add.length) return;
        doc.events.push(...add);
        const body = {
          message: `Historie: ${add.length} záznam(ů) od ${user}`,
          content: utf8ToBase64(JSON.stringify(doc)),
          committer: { name: user, email: `${user}@filtration.cz` }
        };
        if (sha) body.sha = sha;
        const resp = await fetch(historyUrl(month), {
          method: "PUT",
          headers: headers({ "Content-Type": "application/json" }),
          body: JSON.stringify(body)
        });
        if (resp.ok) return;
        // 409 = někdo mezitím zapsal, 422 = soubor mezitím někdo založil,
        // 5xx = výpadek GitHubu → načíst znovu a zkusit to znovu
        lastErr = new Error(`historie ${month} PUT ${resp.status}`);
      } catch (e) {
        lastErr = e; // síť, poškozený soubor (ten se nikdy nepřepíše) …
      }
    }
    throw lastErr || new Error(`historie ${month}: zápis se nepovedl`);
  }

  // ── Zobrazení historie (Správa úkolů + Dashboard, 2026-09-23) ──────────
  // JEDINÉ místo — stránky jen vloží prázdný <div class="history-panel"
  // hidden> a volají toggleTaskHistory(panel, task, ctx) / resetTaskHistory
  // (panel). Vzhled v components.css (.history-*).
  //   task = úkol z modalu (id, plannedDate, createdDate, recurring)
  //   ctx  = { tasks: úkoly stránky (kvůli sdílenému ID zástupů),
  //            ruleIds: ID opakujících se pravidel }
  // Opakovaný výskyt (task.recurring, JEN Dashboard): žádná podrobná
  // historie, jen kdo dal Hotovo / zrušil den / zapsal zástup — k datu
  // výskytu (JK 2026-09-23).
  const HISTORY_START_MONTH = "2026-09"; // zápis nasazen 2026-09-23
  const HISTORY_SINCE_TEXT = "Historie se zapisuje od 23. 9. 2026.";
  // Krok 3: záznamy PŘED zavedením historie zpětně vytěžené ze zpráv
  // commitů top-data (jen založení, Hotovo, úpravy/zrušení z mobilu) —
  // jeden soubor history/import-git.json, načte se jako "nejstarší
  // stránka" za měsíci. Úkoly založené až po zavedení ho nepotřebují.
  const HISTORY_IMPORT = "import-git";
  const HISTORY_IMPORT_UNTIL = "2026-09-24"; // createdDate < → může mít zpětné záznamy
  const HISTORY_IMPORT_TEXT = "Záznamy před 23. 9. 2026 jsou doplněné zpětně z historie ukládání — jen založení a Hotovo, ne úpravy ve Správě úkolů.";
  const HISTORY_PAGE_MONTHS = 3;
  const _historyMonthCache = new Map(); // uzavřené měsíce se už nemění

  const HISTORY_ACTIONS = {
    zalozen: ["Založen", "h-new"], zmena: ["Změna", "h-change"],
    hotovo: ["Hotovo", "h-done"], den_hotovo: ["Hotový den", "h-done"],
    zrusen: ["Zrušen", "h-cancel"], obnoven: ["Obnoven", "h-restore"],
    smazan: ["Smazán", "h-cancel"],
    opak_hotovo: ["Hotovo", "h-done"], opak_hotovo_zruseno: ["Hotovo vráceno", "h-restore"],
    opak_zrusen: ["Zrušen den", "h-cancel"], opak_obnoven: ["Den obnoven", "h-restore"],
  };
  const HISTORY_FIELD_LABELS = {
    title: "název", note: "poznámka", internalNote: "interní poznámka", state: "stav",
    owner: "řešitel", coOwners: "spoluřešitelé", plannedDate: "datum", priority: "priorita",
    auto: "auto", dueDate: "požadované ukončení", doneDate: "datum dokončení",
    durationDays: "počet dní", activeDays: "aktivní dny", project: "projekt",
    internalProject: "dodatečné označení projektu", sales: "obchodní zástupce",
    subtask: "podúkol", createdDate: "datum zapsání", waiting: "čeká se",
  };

  function historyMonthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  function historyMonthLabel(month) {
    if (month === HISTORY_IMPORT) return "před 23. 9. 2026";
    const [y, m] = month.split("-").map(Number);
    const name = new Date(y, m - 1, 1).toLocaleString("cs-CZ", { month: "long" });
    return y === new Date().getFullYear() ? name : `${name} ${y}`;
  }
  // Měsíce od založení úkolu (nejdřív HISTORY_START_MONTH) po aktuální, od nejnovějšího.
  function historyMonthsFor(task) {
    const now = new Date();
    let from = String((task && task.createdDate) || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(from) || from < HISTORY_START_MONTH) from = HISTORY_START_MONTH;
    const list = [];
    for (const d = new Date(now.getFullYear(), now.getMonth(), 1); historyMonthKey(d) >= from; d.setMonth(d.getMonth() - 1)) {
      list.push(historyMonthKey(d));
    }
    if (!list.length) list.push(historyMonthKey(now));
    const created = String((task && task.createdDate) || "");
    if (!created || created < HISTORY_IMPORT_UNTIL) list.push(HISTORY_IMPORT);
    return list;
  }
  function loadHistoryMonthCached(month) {
    const isCurrent = month === historyMonthKey(new Date());
    if (!isCurrent && _historyMonthCache.has(month)) return _historyMonthCache.get(month);
    const p = readHistoryMonth(month).then(r => r.doc.events || []);
    if (!isCurrent) {
      _historyMonthCache.set(month, p);
      p.catch(() => _historyMonthCache.delete(month));
    }
    return p;
  }

  function historyEventMatches(e, task, ctx) {
    if (!e || !task || e.id !== task.id) return false;
    const a = String(e.a || "");
    const pd = e.ch && e.ch.plannedDate;
    const onDate = e.d === task.plannedDate || (Array.isArray(pd) && pd.includes(task.plannedDate));
    if (task.recurring) {
      // Opakovaný výskyt: Hotovo / zrušení dne k tomuto datu + zástup na
      // tento den (úkol se stejným ID jako pravidlo).
      return onDate && (a.startsWith("opak_") || a === "zalozen" || a === "zrusen" || a === "smazan");
    }
    // Dokončení/výjimky pravidla nepatří k zástupu se stejným ID.
    if (a.startsWith("opak_")) return false;
    // Stejné ID má víc úkolů (zástupy za pravidlo) → jen záznamy k tomuto datu.
    const tasks = (ctx && ctx.tasks) || [];
    const ruleIds = (ctx && ctx.ruleIds) || [];
    const shared = tasks.filter(t => t && t.id === task.id).length > 1 || ruleIds.includes(task.id);
    return shared ? onDate : true;
  }

  function historyFmtDate(iso) {
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(iso);
    return `${+m[3]}. ${+m[2]}.` + (+m[1] === new Date().getFullYear() ? "" : ` ${m[1]}`);
  }
  function historyFmtValue(v) {
    if (v === null || v === undefined || v === "" || v === false) return "—";
    if (v === true) return "ano";
    if (Array.isArray(v)) return v.length ? v.map(historyFmtValue).join(", ") : "—";
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? historyFmtDate(v) : String(v);
  }
  function historyFmtTime(t) {
    const d = new Date(t);
    if (isNaN(d)) return String(t || "");
    const year = d.getFullYear() === new Date().getFullYear() ? "" : ` ${d.getFullYear()}`;
    return `${d.getDate()}. ${d.getMonth() + 1}.${year} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  function historyDetail(e) {
    const ch = e.ch || {};
    if (e.a === "opak_zrusen") return e.duvod ? `důvod: ${e.duvod}` : "";
    if (e.a === "zalozen" || e.a === "smazan") {
      const i = e.a === "zalozen" ? 1 : 0;
      const bits = [];
      if (ch.owner) bits.push(`řešitel ${historyFmtValue(ch.owner[i])}`);
      if (ch.coOwners) bits.push(`spoluřešitelé ${historyFmtValue(ch.coOwners[i])}`);
      if (ch.plannedDate) bits.push(`na ${historyFmtValue(ch.plannedDate[i])}`);
      if (ch.priority) bits.push(historyFmtValue(ch.priority[i]));
      if (ch.auto) bits.push(`auto ${historyFmtValue(ch.auto[i])}`);
      return bits.join(", ");
    }
    const parts = [];
    Object.keys(ch).forEach(k => {
      if (k === "state" && e.a === "hotovo") return; // "Nový → Dokončeno" říká už štítek
      parts.push(`${HISTORY_FIELD_LABELS[k] || k} ${historyFmtValue(ch[k][0])} → ${historyFmtValue(ch[k][1])}`);
    });
    if (e.dny) parts.push(`hotové dny: ${e.dny.map(historyFmtDate).join(", ")}`);
    if (e.dnyZpet) parts.push(`vrácené dny: ${e.dnyZpet.map(historyFmtDate).join(", ")}`);
    const skip = new Set(["completedDays", "cancelled", ...(e.a === "hotovo" ? ["doneDate"] : [])]);
    const other = (e.f || []).filter(k => !(k in ch) && !skip.has(k));
    if (other.length) parts.push(`upraveno: ${other.map(k => HISTORY_FIELD_LABELS[k] || k).join(", ")}`);
    return parts.join(" · ");
  }
  function historyRowHtml(e, ctx) {
    let [label, cls] = HISTORY_ACTIONS[e.a] || [e.a, "h-change"];
    // Úkol se stejným ID jako opakující se pravidlo = zástup
    if (e.a === "zalozen" && ((ctx && ctx.ruleIds) || []).includes(e.id)) label = "Zástup";
    return `<div class="history-row">` +
      `<span class="history-time">${escapeHtmlLocal(historyFmtTime(e.t))}</span>` +
      `<span class="history-user">${escapeHtmlLocal(e.u || "?")}</span>` +
      `<span class="history-detail"><span class="history-badge ${cls}">${escapeHtmlLocal(label)}</span>${escapeHtmlLocal(historyDetail(e))}</span>` +
      `</div>`;
  }

  function resetTaskHistory(panel) {
    if (!panel) return;
    panel._history = null;
    panel.hidden = true;
    panel.innerHTML = "";
  }

  // Otevře/zavře historii úkolu v panelu. Druhé kliknutí zavře.
  async function toggleTaskHistory(panel, task, ctx) {
    if (!panel || !task || !task.id) return;
    if (!panel.hidden) { resetTaskHistory(panel); return; }
    const st = { task, ctx: ctx || {}, months: historyMonthsFor(task), shown: 0 };
    panel._history = st;
    panel.hidden = false;
    panel.innerHTML = `<div class="history-title">${task.recurring ? "Historie výskytu" : "Historie úkolu"}</div>` +
      `<div class="history-list"></div><div class="history-foot"></div>`;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    await showMoreTaskHistory(panel, st);
  }

  async function showMoreTaskHistory(panel, st) {
    if (panel._history !== st) return;
    const list = panel.querySelector(".history-list");
    const foot = panel.querySelector(".history-foot");
    const months = st.months.slice(st.shown, st.shown + HISTORY_PAGE_MONTHS);
    foot.textContent = "Načítám…";
    let events;
    try {
      events = (await Promise.all(months.map(loadHistoryMonthCached))).flat();
    } catch (e) {
      if (panel._history === st) {
        foot.innerHTML = `<span class="history-error">Historii se nepodařilo načíst: ${escapeHtmlLocal(e.message)}</span>`;
      }
      return;
    }
    // Mezitím zavřeno nebo otevřen jiný úkol → nevykreslovat.
    if (panel._history !== st) return;
    st.shown += months.length;
    const rows = events.filter(e => historyEventMatches(e, st.task, st.ctx))
      .sort((a, b) => String(b.t || "").localeCompare(String(a.t || "")));
    list.insertAdjacentHTML("beforeend", rows.map(e => historyRowHtml(e, st.ctx)).join(""));

    const rest = st.months.slice(st.shown);
    if (rest.length) {
      foot.innerHTML = `<button type="button" class="history-btn" style="padding:6px 12px;font-size:12px;">Zobrazit starší (${escapeHtmlLocal(historyMonthLabel(rest[0]))})</button>`;
      foot.querySelector("button").addEventListener("click", () => showMoreTaskHistory(panel, st));
    } else {
      const text = st.months.includes(HISTORY_IMPORT) ? `${HISTORY_SINCE_TEXT} ${HISTORY_IMPORT_TEXT}` : HISTORY_SINCE_TEXT;
      foot.textContent = list.children.length ? text : `Zatím žádné záznamy. ${text}`;
    }
  }

  // ── Pomocné funkce pro správu dat ─────────────────────────────────────
  function getRawJson() {
    try {
      const s = localStorage.getItem(DATA_KEY);
      if (!s) return null;
      return JSON.parse(s).rawJson || null;
    } catch(e) { return null; }
  }

  // ── localStorage → sdílení mezi záložkami ─────────────────────────────
  function initStorageSync() {
    window.addEventListener("storage", e => {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const { parsedData, sha, rawJson } = JSON.parse(e.newValue);
        if (parsedData && sha !== _lastSha) {
          _lastSha = sha;
          _base = rawJson ? { sha, str: JSON.stringify(rawJson) } : null;
          if (_onData) _onData(parsedData);
        }
      } catch(_) {}
    });
  }

  // ── Getters/setters pro správu úkolů ──────────────────────────────────
  function getAutoDostupnost(spz, datum, auta, autaRezervace, tasks) {
    const c = getAutoConflicts(spz, [datum], { tasks: tasks || [], auta, autaRezervace });
    const rez = c.find(x => x.typ === "rezervace");
    if (rez) return rez.stav;
    if (c.some(x => x.typ === "ukol")) return "používané";
    const stav = c.find(x => x.typ === "stav");
    return stav ? stav.stav : "volné";
  }

  // ── Kolize auta pro zadávaný úkol (2026-09-22) ─────────────────────────
  // JEDINÉ místo téhle logiky — dřív 3 mírně odlišné kopie (výš
  // getAutoDostupnost, Správa getAutoDostupnostDen/checkAutoWarning,
  // Dashboard checkAutoWarningNew) a všechny porovnávaly jen plannedDate
  // = ZAČÁTEK úkolu, takže vícedenní úkoly unikaly (auto obsazené 2. dnem
  // vícedenního úkolu se jevilo volné; u nového vícedenního úkolu se
  // kontroloval jen 1. den).
  //   dates   = VŠECHNY dny zadávaného úkolu (getMultiDayOccurrenceDates)
  //   tasks   = SUROVÉ úkoly (raw.tasks nebo pole Správy úkolů), NE
  //             zobrazovací DATA.tasks — ty obsahují kopie spoluřešitelů a
  //             opakující se výskyty (dvojí hlášení / chybějící vícedenní dny)
  //   exclude = funkce, true pro právě upravovaný úkol (nesmí kolidovat
  //             sám se sebou)
  // Vrací [{ datum, typ: "ukol"|"rezervace"|"stav", task?, stav?, poznamka? }]
  // seřazené podle data. Přidělit auto víc lidem je DOVOLENÉ (JK) — tohle
  // jen upozorňuje, nic neblokuje.
  function getAutoConflicts(spz, dates, { tasks = [], auta = [], autaRezervace = [], exclude = null } = {}) {
    const want = new Set((dates || []).filter(Boolean));
    if (!spz || want.size === 0) return [];
    const out = [];
    (autaRezervace || []).forEach(r => {
      if (r && r.spz === spz && want.has(r.datum)) out.push({ datum: r.datum, typ: "rezervace", stav: r.stav || "", poznamka: r.poznamka || "" });
    });
    (tasks || []).forEach(t => {
      if (!t || t.cancelled || t.auto !== spz || (exclude && exclude(t))) return;
      getMultiDayOccurrenceDates(t).forEach(d => { if (want.has(d)) out.push({ datum: d, typ: "ukol", task: t }); });
    });
    const a = (auta || []).find(x => x && x.spz === spz);
    if (a && a.dostupnost && a.dostupnost !== "volné") out.push({ datum: null, typ: "stav", stav: a.dostupnost });
    return out.sort((x, y) => String(x.datum || "").localeCompare(String(y.datum || "")));
  }

  // Úroveň pro barvu: "kolize" (jiný úkol, --auto-kolize), "stav"
  // (rezervace/trvalý stav, --auto-kolize-stav), "" = volné.
  function autoConflictLevel(conflicts) {
    if (!conflicts || !conflicts.length) return "";
    return conflicts.some(c => c.typ === "ukol") ? "kolize" : "stav";
  }

  // Text hlášky pod polem Auto (prostý text, volající nastaví textContent).
  function describeAutoConflicts(spz, conflicts) {
    if (!conflicts || !conflicts.length) return "";
    const den = iso => { const [y, m, d] = String(iso).split("-").map(Number); return `${d}. ${m}.`; };
    const lines = [];
    const ukoly = conflicts.filter(c => c.typ === "ukol");
    ukoly.slice(0, 4).forEach(c => {
      const t = c.task;
      const kdo = t.owner || t.assignee || "?";
      lines.push(`⚠ Auto ${spz} je ${den(c.datum)} už přiřazené: ${t.id || ""} ${t.title || t.task || ""} (${kdo})`.replace(/\s+/g, " "));
    });
    if (ukoly.length > 4) lines.push(`… a další ${ukoly.length - 4}×`);
    conflicts.filter(c => c.typ === "rezervace").forEach(c => {
      lines.push(`⚠ Auto ${spz} je ${den(c.datum)} označené jako: ${c.stav}${c.poznamka ? " — " + c.poznamka : ""}`);
    });
    const stav = conflicts.find(c => c.typ === "stav");
    if (stav) lines.push(`⚠ Auto ${spz} má trvalý stav: ${stav.stav}`);
    return lines.join("\n");
  }

  // Označí položky rozbalovacího seznamu aut: obsazené auto dostane
  // symbol ⚠ a barvu z theme.css (--auto-kolize / --auto-kolize-stav).
  // Bez vyplněného data (dates prázdné) vrátí seznam do původní podoby.
  // Barvu <option> respektuje Chrome/Edge/Firefox na desktopu; Safari a
  // Android ji ignorují — proto i symbol ⚠, ten je vidět všude. Obarví i
  // samotný <select> podle zrovna vybraného auta. Původní text položky
  // drží data-label, takže jde volat opakovaně.
  function markAutoOptions(select, dates, ctx) {
    if (!select) return;
    const color = lvl => lvl === "kolize" ? "var(--auto-kolize)" : lvl === "stav" ? "var(--auto-kolize-stav)" : "";
    const opts = Array.from(select.options);
    opts.forEach(opt => {
      if (!opt.value) { opt.dataset.level = ""; return; }
      if (opt.dataset.label === undefined) opt.dataset.label = opt.textContent;
      const c = (dates && dates.length) ? getAutoConflicts(opt.value, dates, ctx) : [];
      const lvl = autoConflictLevel(c);
      opt.textContent = lvl ? `⚠ ${opt.dataset.label}` : opt.dataset.label;
      opt.title = lvl ? describeAutoConflicts(opt.value, c) : "";
      opt.dataset.level = lvl;
    });
    const selOpt = select.options[select.selectedIndex];
    const selColor = selOpt && selOpt.value ? color(selOpt.dataset.level) : "";
    select.style.color = selColor;
    // Položky jinak barvu dědí ze <select> — když je <select> obarvený,
    // volné položky dostanou výslovně běžnou barvu textu, ať nevypadají
    // taky obsazené.
    opts.forEach(opt => { opt.style.color = color(opt.dataset.level) || (selColor ? "var(--text)" : ""); });
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init({ onData, onStatus, onActivity }) {
    _onData     = onData;
    _onStatus   = onStatus;
    _onActivity = onActivity;

    // Cache se zobrazí až po prvním úspěšném načtení z GitHubu

    // 1. Vymaž cache, jen když je OPRAVDU poškozená (oprava 2026-09-17,
    //    nález č. 18) — dřív se DATA_KEY mazal bezpodmínečně při KAŽDÉM
    //    init() (historicky kvůli jednorázové migraci špatného kódování,
    //    dávno vyřešené). To ale znamenalo, že otevření DRUHÉ záložky
    //    appky smazalo platnou, čerstvou cache PRVNÍ záložky — sdílenou
    //    přes initStorageSync() — dokud se druhá záložka sama znovu
    //    nenačetla z GitHubu; první záložka mezitím na pokus o uložení
    //    dostala "Data ještě nejsou načtena, zkus to za chvíli znovu."
    //    Teď se maže jen skutečně nerozparsovatelná cache, platná
    //    (i z jiné záložky) zůstává netknutá.
    try {
      const existingCache = localStorage.getItem(DATA_KEY);
      if (existingCache) JSON.parse(existingCache);
    } catch(e) {
      try { localStorage.removeItem(DATA_KEY); } catch(e2) {}
    }

    // 2. Ověř identitu proti seznamu — TEPRVE PAK načti data, aby kontrola
    //    oprávnění při onData měla platný výsledek.
    //    Ověřuje se při KAŽDÉM startu stránky (oprava 2026-09-17), ne jen
    //    když v localStorage ještě chybí příznak "ověřeno": dřív se výsledek
    //    prvního ověření držel napořád, takže změna role nebo vyřazení
    //    uživatele z users.json se v už ověřeném prohlížeči nikdy neprojevily.
    //    Cena = jeden GET users.json navíc při načtení stránky. Při síťové
    //    chybě resolveUserFromWhitelist() příznaky nemění (viz tam), takže
    //    poslední známý stav zůstává — žádný výpadek přístupu offline.
    let _verifyDone = false;
    const existingToken = getToken();
    if (existingToken) {
      resolveUserFromWhitelist(existingToken)
        .catch(() => {})
        .then(() => { _verifyDone = true; fetchFromGitHub(false); if (hasPendingHistory()) flushHistory(); });
    } else {
      showTokenDialog(() => { _verifyDone = true; fetchFromGitHub(false); if (hasPendingHistory()) flushHistory(); });
    }

    // 3. Polling — data i indikátor aktivity (až po dokončení ověření výše,
    //    ať první onData nikdy neproběhne se zastaralou rolí)
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => {
      if (!_verifyDone) return;
      fetchFromGitHub(true);
      // Nezapsané záznamy historie (viz flushPendingHistory) — nejdřív po minutě.
      if (Date.now() - _historyLastTry > HISTORY_RETRY_MS && hasPendingHistory()) flushHistory();
      if (_onActivity && getToken()) {
        checkActivity().then(info => _onActivity(info));
      }
    }, POLL_MS);

    // 4. Sync mezi záložkami
    initStorageSync();
  }

  async function reload() {
    await fetchFromGitHub(false);
  }

  // Zachováno pro zpětnou kompatibilitu
  function setFileHandle() {}
  function loadRaw() { return null; }
  function pushWorkbook() {}
  function isAuthenticated() { return true; }

  // ── Zjištění oprávnění tokenu (read-only vs zápis) ─────────────────────
  // Poznámka: GET /repos/{owner}/{repo} vrací oprávnění GITHUB ÚČTU na repo,
  // NE rozsah konkrétního fine-grained tokenu — proto nespolehlivé pro detekci.
  // Místo toho zkusíme skutečný zápis s úmyslně špatným SHA:
  //   409 (SHA conflict) = token zápis umí, jen SHA nesedí → MÁ oprávnění
  //   403 (Forbidden)    = token zápis vůbec neumí → NEMÁ oprávnění
  let _cachedCanWrite = null;

  async function checkWritePermission() {
    if (_cachedCanWrite !== null) return _cachedCanWrite;
    try {
      const resp = await fetch(apiUrl(), {
        method: "PUT",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: "permission-check (nemělo by se nikdy uložit)",
          content: btoa("permission-check-probe"),
          sha: "0000000000000000000000000000000000000000"
        })
      });
      if (resp.status === 409) { _cachedCanWrite = true; return true; }
      if (resp.status === 403) { _cachedCanWrite = false; return false; }
      // Neočekávaný stav — pro jistotu považuj za bez oprávnění
      _cachedCanWrite = false;
      return false;
    } catch(e) {
      _cachedCanWrite = false;
      return false;
    }
  }

  // Kombinovaná kontrola: token musí mít TECHNICKÉ oprávnění k zápisu NA GITHUBU
  // A ZÁROVEŇ musí být jeho identita ověřená proti předschválenému seznamu.
  // I technicky zápisný token bez ověřené identity se chová jako pouze pro čtení.
  async function canActuallyWrite() {
    const [techWrite, verified] = await Promise.all([checkWritePermission(), Promise.resolve(isUserVerified())]);
    // Plný přístup (editace, mazání, nové úkoly...) jen pro roli "planovac".
    return techWrite && verified && getUserRole() === "planovac";
  }

  // Označit hotovo smí plánovači i operátoři — operátoři jinak v appce nesmí nic jiného.
  async function canMarkDone() {
    const [techWrite, verified] = await Promise.all([checkWritePermission(), Promise.resolve(isUserVerified())]);
    const role = getUserRole();
    return techWrite && verified && (role === "planovac" || role === "operator");
  }

  // ── Indikátor "někdo právě edituje" ────────────────────────────────────
  const ACTIVITY_FILE = "activity.json";
  const ACTIVITY_FRESH_SECONDS = 90; // aktivita starší než toto se považuje za neaktuální

  function activityUrl() {
    return `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${ACTIVITY_FILE}`;
  }

  async function signalEditing(action) {
    try {
      const user = getCurrentUserFromConfig();
      const resp = await fetch(activityUrl(), { headers: headers() });
      if (!resp.ok) return;
      const data = await resp.json();
      const sha = data.sha;
      const payload = { lastEditBy: user, lastEditAt: new Date().toISOString(), action: action || "edituje" };
      // UTF-8 bezpečné kódování (btoa samotné padá na diakritice typu á/é/ž/š)
      const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
      let binary = "";
      for (let i = 0; i < payloadBytes.length; i += 8192) {
        binary += String.fromCharCode(...payloadBytes.subarray(i, i + 8192));
      }
      const encoded = btoa(binary);
      await fetch(activityUrl(), {
        method: "PUT",
        headers: headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ message: `Aktivita: ${user} ${action || "edituje"}`, content: encoded, sha })
      });
    } catch(e) {
      console.warn("signalEditing selhalo:", e);
    }
  }

  async function checkActivity() {
    try {
      const resp = await fetch(activityUrl(), { headers: headers() });
      if (!resp.ok) return null;
      const data = await resp.json();
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const info = JSON.parse(new TextDecoder("utf-8").decode(bytes));
      if (!info.lastEditAt) return null;
      const secondsAgo = (Date.now() - new Date(info.lastEditAt).getTime()) / 1000;
      if (secondsAgo > ACTIVITY_FRESH_SECONDS) return null;
      const currentUser = getCurrentUserFromConfig();
      if (info.lastEditBy === currentUser) return null;
      return { by: info.lastEditBy, action: info.action, secondsAgo: Math.round(secondsAgo) };
    } catch(e) {
      return null;
    }
  }

  // Vrátí seznam ISO dat, které měl vícedenní úkol skutečně obsadit (respektuje activeDays)
  function getMultiDayOccurrenceDates(task) {
    const duration = parseInt(task.durationDays, 10) || 1;
    if (duration <= 1 || !task.plannedDate) return [task.plannedDate].filter(Boolean);
    const activeDays = Array.isArray(task.activeDays) && task.activeDays.length > 0 ? task.activeDays : null;
    const [y, m, d] = task.plannedDate.split("-").map(Number);
    const dates = [];
    for (let i = 0; i < duration; i++) {
      const dd = new Date(y, m - 1, d);
      dd.setDate(dd.getDate() + i);
      const jsDay = dd.getDay();
      const isoWeekday = jsDay === 0 ? 7 : jsDay;
      if (!activeDays || activeDays.includes(isoWeekday)) {
        dates.push(`${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`);
      }
    }
    return dates;
  }

  // Jsou už hotové úplně všechny dny, které měl vícedenní úkol obsadit?
  function isMultiDayTaskFullyComplete(task) {
    const allDates = getMultiDayOccurrenceDates(task);
    const completed = Array.isArray(task.completedDays) ? task.completedDays : [];
    return allDates.length > 0 && allDates.every(d => completed.includes(d));
  }

  // ── Nalezení raw záznamu pro konkrétní klikaný výskyt (oprava 2026-09-17,
  // nález č. 6) ────────────────────────────────────────────────────────────
  // Víc raw záznamů v tasks[] může mít STEJNÉ id — typicky víc "zástupů" za
  // stejné opakující se pravidlo v různých obdobích (openSubstituteModal
  // nekontroluje kolizi, protože id zástupu je záměrně shodné s id pravidla),
  // nebo jediný vícedenní zástup, jehož vlastní plannedDate (začátek rozsahu)
  // se liší od klikaného dne uprostřed rozsahu. Prostý `find(t => t.id ===
  // id)` bez ohledu na datum (dřívější kód to řešil jen pro `recurring`
  // jednodenní výskyt porovnáním `rawTask.plannedDate !== plannedDate`) mohl
  // zapsat completedDays/úpravu do ÚPLNĚ JINÉHO záznamu se stejným id.
  // Řešení: mezi všemi kandidáty se stejným id vybrat ten, jehož SKUTEČNÝ
  // rozsah dní (respektuje durationDays/activeDays, stejná logika jako
  // getMultiDayOccurrenceDates) klikaný den opravdu obsahuje.
  function findRawTaskForOccurrence(rawTasks, id, plannedDate) {
    return (rawTasks || []).find(t => t && t.id === id && getMultiDayOccurrenceDates(t).includes(plannedDate)) || null;
  }

  // ── Generování ID nových úkolů ──────────────────────────────────────────
  // DŘÍVE: "nejvyšší číslo v datech + 1", počítáno NEZÁVISLE v Dashboardu
  // (generateNextIdNew) i ve Správě úkolů (generateNextId) — dvě oddělené
  // kopie stejné logiky. Když dva lidé zakládali nový úkol skoro současně
  // (jeden v Dashboardu, druhý ve Správě úkolů, nebo dva v tom samém
  // souboru v různých záložkách), obě funkce mohly nezávisle na sobě
  // vypočítat STEJNÉ "další volné" číslo ze své vlastní, mírně zastaralé
  // kopie dat — reálně se to stalo opakovaně (viz CLAUDE.md, čištění
  // duplicitních ID 2026-08-xx).
  //
  // NOVĚ: ID se odvozuje z aktuálního času (v milisekundách), ne z pořadí
  // v datech. Dva lidé by museli uložit úkol v tom samém MILISEKUNDOVÉM
  // okamžiku, aby došlo ke kolizi — u lidmi ovládaných kliknutí prakticky
  // nemožné. Navíc funkce jako pojistku navíc kontroluje kolizi proti
  // aktuálně známým ID a v nepravděpodobném případě shody připojí náhodný
  // znak navíc. Formát "*Txxxxxx*" (T + 6 znaků v soustavě base36) se
  // vizuálně i strukturně nemůže srazit se starými číselnými ID
  // ("*0001*"..) ani s ID opakujících se pravidel ("RFT001"..).
  function generateNextTaskId(existingTasks) {
    const existingIds = new Set((existingTasks || []).map(t => t && t.id).filter(Boolean));
    // 8 znaků base36 z milisekundové značky = perioda opakování ~89 let
    // (36^8 ms). Kratší (6 znaků) by se opakovalo už po ~25 dnech - kolize
    // by se řešila jen záchrannou kontrolou níže, ne tím, že by k ní
    // vůbec nemělo reálně dojít. Tohle je hlavní obrana, kontrola je
    // druhá vrstva navíc.
    const suffix = Date.now().toString(36).toUpperCase().padStart(8, "0").slice(-8);
    let candidate = `*T${suffix}*`;
    while (existingIds.has(candidate)) {
      const rand = Math.floor(Math.random() * 36).toString(36).toUpperCase();
      candidate = `*T${suffix}${rand}*`;
    }
    return candidate;
  }

  return {
    init, reload, saveToGitHub, getRawJson,
    getAutoDostupnost, setFileHandle, loadRaw, pushWorkbook, isAuthenticated,
    getCurrentUser: () => getCurrentUserFromConfig() || localStorage.getItem(USER_KEY) || "unknown",
    setCurrentUser: (u) => localStorage.setItem(USER_KEY, u),
    checkWritePermission,
    canActuallyWrite,
    canMarkDone,
    isUserVerified,
    getUserRole,
    resolveUserFromWhitelist,
    signalEditing,
    checkActivity,
    getMultiDayOccurrenceDates,
    isMultiDayTaskFullyComplete,
    generateNextTaskId,
    findRawTaskForOccurrence,
    getCoOwners,
    getCoOwnerLabel,
    renderCoOwnerPicker,
    readCoOwnerPicker,
    getAutoConflicts,
    autoConflictLevel,
    describeAutoConflicts,
    markAutoOptions,
    buildHistoryEvents,
    readHistoryMonth,
    toggleTaskHistory,
    resetTaskHistory,
  };

})();
