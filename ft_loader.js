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
        localStorage.setItem(RESOLVED_USER_KEY, existing.zkratka);
        localStorage.setItem(VERIFIED_FLAG_KEY, "true");
        return { verified: true, zkratka: existing.zkratka };
      }
      localStorage.setItem(VERIFIED_FLAG_KEY, "false");
      return { verified: false, zkratka: null };
    } catch (e) {
      console.warn("resolveUserFromWhitelist selhalo:", e);
      // Síťová chyba ap. — nepovažuj to za "neověřeno natrvalo", jen zatím nevíme
      return { verified: null, zkratka: null };
    }
  }

  function isUserVerified() {
    return localStorage.getItem(VERIFIED_FLAG_KEY) === "true";
  }

  function showTokenDialog(onSuccess) {
    if (document.getElementById("ftTokenDialog")) return;
    const div = document.createElement("div");
    div.id = "ftTokenDialog";
    div.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
    div.innerHTML = `
      <div style="background:white;border-radius:16px;padding:32px;width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.3);font-family:sans-serif;">
        <h2 style="margin:0 0 8px;font-size:20px;">🔑 Přístup k databázi TOP</h2>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;">Zadej svůj GitHub Personal Access Token. Obdržíš ho od správce systému.</p>
        <input id="ftTokenInput" type="password" placeholder="ghp_... nebo github_pat_..." style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:8px;">
        <input id="ftUserInput" type="text" placeholder="Tvoje zkratka (např. JK, RS, LR)" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;margin-bottom:16px;">
        <button id="ftTokenSave" style="width:100%;padding:12px;background:#1d4ed8;color:white;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;">Uložit a pokračovat →</button>
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

  function generateRecurring(opakovaci, vyjimky, tasks) {
    const vyjimkySet = new Set(vyjimky.map(v => `${v.id}|${v.datum}`));
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
        result.push({
          id: o.id, title: o.title, owner: o.owner,
          plannedDate: iso, priority: o.priority || "P2", project: "",
          state: "Opakující se", note: o.note || "", internalNote: "",
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
        const [y, m, d] = t.plannedDate.split("-").map(Number);
        for (let i = 0; i < duration; i++) {
          const dd = new Date(y, m - 1, d);
          dd.setDate(dd.getDate() + i);
          const iso = `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,"0")}-${String(dd.getDate()).padStart(2,"0")}`;
          result.push({
            ...t,
            plannedDate: iso,
            multiDayIndex: i + 1,
            multiDayTotal: duration,
            isMultiDay: true,
          });
        }
      });
      return result;
    }

    const activeTasks = tasks.filter(t => !t.cancelled);
    const expandedTasks = expandMultiDayTasks(activeTasks);
    const recurringTasks = generateRecurring(json.opakovaci, json.vyjimky, expandedTasks);
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

      // Dekóduj Base64 → UTF-8 správně
      const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
      const jsonStr = new TextDecoder("utf-8").decode(bytes);
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

    const user = localStorage.getItem(USER_KEY) || "unknown";
    json.updatedAt = new Date().toISOString();
    json.updatedBy = user;

    // Enkóduj JSON → UTF-8 → Base64 (po částech, aby nedošlo k přetečení zásobníku u velkých souborů)
    const jsonBytes = new TextEncoder().encode(JSON.stringify(json, null, 2));
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

    // 1. Vymaž starou cache s špatným kódováním
    try { localStorage.removeItem(DATA_KEY); } catch(e) {}

    // 2. Ověř identitu proti seznamu (pokud ještě není ověřená) — TEPRVE PAK
    //    načti data, aby kontrola oprávnění při onData měla platný výsledek.
    const existingToken = getToken();
    if (existingToken) {
      const verifyPromise = localStorage.getItem(VERIFIED_FLAG_KEY) !== "true"
        ? resolveUserFromWhitelist(existingToken).catch(() => {})
        : Promise.resolve();
      verifyPromise.then(() => fetchFromGitHub(false));
    } else {
      showTokenDialog(() => fetchFromGitHub(false));
    }

    // 3. Polling — data i indikátor aktivity
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => {
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
    return techWrite && verified;
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
      const encoded = btoa(JSON.stringify(payload));
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

  return {
    init, reload, saveToGitHub, getRawJson,
    getAutoDostupnost, setFileHandle, loadRaw, pushWorkbook, isAuthenticated,
    getCurrentUser: () => getCurrentUserFromConfig() || localStorage.getItem(USER_KEY) || "unknown",
    setCurrentUser: (u) => localStorage.setItem(USER_KEY, u),
    checkWritePermission,
    canActuallyWrite,
    isUserVerified,
    resolveUserFromWhitelist,
    signalEditing,
    checkActivity,
  };

})();
