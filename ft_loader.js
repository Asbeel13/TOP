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

    const activeTasks = tasks.filter(t => !t.cancelled);
    const expandedTasks = expandMultiDayTasks(activeTasks);
    const recurringTasks = generateRecurring(json.opakovaci, json.vyjimky, expandedTasks, json.dokonceni);
    const allTasks = [...expandedTasks, ...recurringTasks];
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

    // Enkóduj JSON → UTF-8 → Base64 (po částech, aby nedošlo k přetečení zásobníku u velkých souborů)
    // Kompaktní zápis (bez odsazení), ne JSON.stringify(json, null, 2) jako
    // dřív — KRITICKÁ OPRAVA (2026-09-18, viz fetchFromGitHub() výš). Bez
    // tohohle by první další uložení z appky (odkudkoliv — Dashboard,
    // Správa úkolů) zase nafouklo soubor zpátky nad ~1MB, i po SPA-side
    // opravě v topSync.js. Nikdo tenhle soubor needituje ručně, odsazení
    // nemá funkční přínos.
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
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

    return data;
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
        const { parsedData, sha } = JSON.parse(e.newValue);
        if (parsedData && sha !== _lastSha) {
          _lastSha = sha;
          if (_onData) _onData(parsedData);
        }
      } catch(_) {}
    });
  }

  // ── Getters/setters pro správu úkolů ──────────────────────────────────
  function getAutoDostupnost(spz, datum, auta, autaRezervace, tasks) {
    const rez = autaRezervace.find(r => r.spz === spz && r.datum === datum);
    if (rez) return rez.stav;
    // Kontrola přes úkoly, které mají toto auto přiřazené na daný den
    if (tasks) {
      const conflict = tasks.find(t => !t.cancelled && t.auto === spz && t.plannedDate === datum);
      if (conflict) return "používané";
    }
    const auto = auta.find(a => a.spz === spz);
    if (auto && auto.dostupnost !== "volné") return auto.dostupnost;
    return "volné";
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
        .then(() => { _verifyDone = true; fetchFromGitHub(false); });
    } else {
      showTokenDialog(() => { _verifyDone = true; fetchFromGitHub(false); });
    }

    // 3. Polling — data i indikátor aktivity (až po dokončení ověření výše,
    //    ať první onData nikdy neproběhne se zastaralou rolí)
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => {
      if (!_verifyDone) return;
      fetchFromGitHub(true);
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
  };

})();
