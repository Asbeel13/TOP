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
  const POLL_MS      = 5000;

  // Token — uložen přímo v kódu (repozitář top-data je private)
  const GITHUB_TOKEN = "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";

  function getToken() {
    return window.FT_CONFIG?.token || GITHUB_TOKEN;
  }
  function getCurrentUserFromConfig() {
    return window.FT_CONFIG?.user || localStorage.getItem("ftCurrentUser") || "unknown";
  }

  const DATA_KEY = "ftWorkbookData";
  const USER_KEY = "ftCurrentUser"; // zkratka přihlášeného uživatele

  let _onData = null, _onStatus = null;
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
          plannedDate: iso, priority: "P3", project: "",
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

    const activeTasks = tasks.filter(t => !t.cancelled);
    const recurringTasks = generateRecurring(json.opakovaci, json.vyjimky, activeTasks);
    const allTasks = [...activeTasks, ...recurringTasks];
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

      // Dekóduj Base64 obsah
      const jsonStr = atob(data.content.replace(/\n/g, ""));
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

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2))));

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
  function getAutoDostupnost(spz, datum, auta, autaRezervace) {
    const rez = autaRezervace.find(r => r.spz === spz && r.datum === datum);
    if (rez) return rez.stav;
    const auto = auta.find(a => a.spz === spz);
    if (auto && auto.dostupnost !== "volné") return auto.dostupnost;
    return "volné";
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init({ onData, onStatus }) {
    _onData   = onData;
    _onStatus = onStatus;

    // 1. Okamžitě zobraz data z localStorage cache
    try {
      const cached = localStorage.getItem(DATA_KEY);
      if (cached) {
        const { parsedData, sha, savedAt } = JSON.parse(cached);
        if (parsedData) {
          _lastSha = sha || "";
          if (_onData) _onData(parsedData);
          status(`Z cache · ${new Date(savedAt).toLocaleString("cs-CZ")}`);
        }
      }
    } catch(e) {}

    // 2. Načti čerstvá data z GitHubu
    fetchFromGitHub(false);

    // 3. Polling
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => fetchFromGitHub(true), POLL_MS);

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

  return {
    init, reload, saveToGitHub, getRawJson,
    getAutoDostupnost, setFileHandle, loadRaw, pushWorkbook, isAuthenticated,
    getCurrentUser: () => getCurrentUserFromConfig() || localStorage.getItem(USER_KEY) || "unknown",
    setCurrentUser: (u) => localStorage.setItem(USER_KEY, u),
  };

})();
