/**
 * ft_loader.js — Microsoft Graph API verze
 * Čte 0_SEZNAM_UKOLU-GLOBAL.xlsx přímo z OneDrive přes Graph API
 * bez závislosti na OneDrive sync klientovi.
 */
const FTLoader = (() => {

  // ── Konfigurace ────────────────────────────────────────────────────────
  const CLIENT_ID   = "ae981a87-988a-4555-b47d-374ea6d1364a";
  const TENANT      = "common";
  const SCOPES      = ["Files.ReadWrite", "offline_access", "User.Read"];
  const SITE_DOMAIN = "filtrationtechnology-my.sharepoint.com";
  const FILE_ID     = "01ATLFZQQO2E5CHGULPNC24ZZR7XV4GPF6";
  const DATA_KEY  = "ftWorkbookData";
  const RAW_KEY   = "ftWorkbookRaw";
  const TOKEN_KEY = "ftMsalToken";
  const POLL_MS   = 3000;

  let _onData = null, _onStatus = null;
  let _lastModified = "", _pollTimer = null;
  let _accessToken = null;
  let _fileHandle = null; // fallback pro lokální použití
  let _lastHash = "";

  function status(msg, err) { if (_onStatus) _onStatus(msg, !!err); }

  // ── Token management ───────────────────────────────────────────────────
  function saveToken(token, expiresIn) {
    const expiry = Date.now() + (expiresIn - 60) * 1000;
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, expiry }));
    _accessToken = token;
  }

  function loadToken() {
    try {
      const s = sessionStorage.getItem(TOKEN_KEY);
      if (!s) return null;
      const { token, expiry } = JSON.parse(s);
      if (Date.now() > expiry) { sessionStorage.removeItem(TOKEN_KEY); return null; }
      return token;
    } catch(e) { return null; }
  }

  function getAuthUrl() {
    // Ulož aktuální stránku do sessionStorage pro redirect po přihlášení
    sessionStorage.setItem("ft_returnUrl", window.location.href);
    const redirect = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "token",
      redirect_uri: redirect,
      scope: SCOPES.join(" "),
      response_mode: "fragment",
      prompt: "select_account"
    });
    return `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params}`;
  }

  function handleRedirect() {
    // Zkontroluj token předaný přes index.html
    const pending = sessionStorage.getItem("ft_pendingToken");
    if (pending) {
      sessionStorage.removeItem("ft_pendingToken");
      const params = new URLSearchParams(pending);
      const token = params.get("access_token");
      const expiresIn = parseInt(params.get("expires_in") || "3600");
      if (token) { saveToken(token, expiresIn); return true; }
    }

    // Zkontroluj token přímo v URL hash
    const hash = window.location.hash.substring(1);
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const expiresIn = parseInt(params.get("expires_in") || "3600");
    if (token) {
      saveToken(token, expiresIn);
      history.replaceState(null, "", window.location.pathname + window.location.search);
      const returnUrl = sessionStorage.getItem("ft_returnUrl");
      if (returnUrl && returnUrl !== window.location.href) {
        sessionStorage.removeItem("ft_returnUrl");
        window.location.href = returnUrl;
        return true;
      }
      sessionStorage.removeItem("ft_returnUrl");
      return true;
    }
    return false;
  }

  // ── Graph API volání ───────────────────────────────────────────────────
  async function graphRequest(url, options = {}) {
    if (!_accessToken) throw new Error("Nejsi přihlášen");
    const resp = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${_accessToken}`,
        "Accept": "application/json",
        ...(options.headers || {})
      }
    });
    if (resp.status === 401) {
      _accessToken = null;
      sessionStorage.removeItem(TOKEN_KEY);
      throw new Error("Token vypršel — přihlaš se znovu");
    }
    return resp;
  }

  // Shares API — funguje pro vlastníka i sdílené uživatele přes sharing URL
  const SHARE_ID = "u!aHR0cHM6Ly9maWx0cmF0aW9udGVjaG5vbG9neS1teS5zaGFyZXBvaW50LmNvbS86eDovZy9wZXJzb25hbC9rb21hbmVrX2ZpbHRyYXRpb25fY3ovSVFBTzBUb2ptb3Q3UmE1bk1mM3J3enktQVFKV2h3R1VtSzlyY05ETzRBdEVpeHc";

  function fileContentUrl() {
    return `https://graph.microsoft.com/v1.0/shares/${SHARE_ID}/driveItem/content`;
  }
  function fileMetaUrl() {
    return `https://graph.microsoft.com/v1.0/shares/${SHARE_ID}/driveItem`;
  }
  function fileUploadUrl() {
    // Pro zápis použij přímé drives endpoint (vlastník)
    const DRIVE_ID = "b!5V3s2tClpEa_4lcy6IrLfY8v0jcgtyxGrV-Bu-D9juLqY1-yhTnkTZ1Sic0XuOxx";
    return `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${FILE_ID}/content`;
  }

  // ── Parse ──────────────────────────────────────────────────────────────
  function excelDateToISO(v) {
    if (!v) return null;
    function localISO(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
    if (v instanceof Date && !isNaN(v)) return localISO(v);
    if (typeof v === "number" && isFinite(v))
      return localISO(new Date(Math.round(v - 25569) * 86400000));
    if (typeof v === "string") {
      const t = v.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      const mDot = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (mDot) return `${mDot[3]}-${mDot[2].padStart(2,"0")}-${mDot[1].padStart(2,"0")}`;
      const mUS = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (mUS) {
        let y = parseInt(mUS[3], 10);
        if (y < 100) y += y < 50 ? 2000 : 1900;
        return `${y}-${mUS[1].padStart(2,"0")}-${mUS[2].padStart(2,"0")}`;
      }
    }
    return null;
  }
  function pb(v) {
    return ["true","pravda","ano","1","yes"].includes(String(v||"").trim().toLowerCase());
  }
  function own(v) { return String(v||"").trim() || "Nezařazeno"; }

  function parseBuffer(buffer) {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const main = wb.Sheets["ALLDATBASE"];
    if (!main) throw new Error('Chybí list "ALLDATBASE"');
    const rows = XLSX.utils.sheet_to_json(main, { header:1, raw:true, defval:null });

    const hdr = (rows[0] || []).map(h => String(h||"").trim().toLowerCase());
    const col = (names) => {
      for (const n of names) { const i = hdr.indexOf(n.toLowerCase()); if (i >= 0) return i; }
      return -1;
    };
    const C = {
      ID:        col(["id"])                          >= 0 ? col(["id"])                          : 0,
      TASK:      col(["úkol","task","název"])          >= 0 ? col(["úkol","task","název"])          : 2,
      PRIORITY:  col(["priorita","priority"])          >= 0 ? col(["priorita","priority"])          : 3,
      PROJECT:   col(["projekt","project"])            >= 0 ? col(["projekt","project"])            : 4,
      SALES:     col(["sales","obchod"])               >= 0 ? col(["sales","obchod"])               : 5,
      WAITING:   col(["čeká se","waiting"])            >= 0 ? col(["čeká se","waiting"])            : 6,
      SUBTASK:   col(["podúkol","subtask"])            >= 0 ? col(["podúkol","subtask"])            : 7,
      STATE:     col(["stav","state","status"])        >= 0 ? col(["stav","state","status"])        : 8,
      PROGRESS:  col(["progress","procent","%"])       >= 0 ? col(["progress","procent","%"])       : 9,
      CREATED:   col(["datum zápisu","created"])       >= 0 ? col(["datum zápisu","created"])       : 10,
      PLANNED:   col(["plánovaný","planned"])          >= 0 ? col(["plánovaný","planned"])          : 11,
      TODAY:     col(["dnes","today","aktuální"])      >= 0 ? col(["dnes","today","aktuální"])      : 12,
      DONE:      col(["dokončeno","done","finished"])  >= 0 ? col(["dokončeno","done","finished"])  : 13,
      DUE:       col(["due","termín"])                 >= 0 ? col(["due","termín"])                 : 17,
      OWNER:     col(["řešitel","owner","assignee"])   >= 0 ? col(["řešitel","owner","assignee"])   : 18,
      NOTE:      col(["upřesnění","note","poznámka"])  >= 0 ? col(["upřesnění","note","poznámka"])  : 19,
      INOTE:     col(["interní","internal"])           >= 0 ? col(["interní","internal"])           : 20,
      AUTO:      col(["auto","spz","v auto"])          >= 0 ? col(["auto","spz","v auto"])          : 21,
      CANCELLED: col(["zrušeno","cancelled","zruseno"])>= 0 ? col(["zrušeno","cancelled","zruseno"]): 22,
    };

    const tasks = rows.slice(1)
      .filter(r => r.some(c => c !== null && c !== ""))
      .map(r => ({
        id: String(r[C.ID]||"").trim(), title: String(r[C.TASK]||"").trim(),
        priority: (String(r[C.PRIORITY]||"P3").trim().toUpperCase()) || "P3",
        project: String(r[C.PROJECT]||"").trim(), sales: String(r[C.SALES]||"").trim(),
        waiting: pb(r[C.WAITING]), subtask: pb(r[C.SUBTASK]), status: String(r[C.STATE]||"").trim(),
        progress: typeof r[C.PROGRESS]==="number" ? r[C.PROGRESS] : 0,
        createdDate: excelDateToISO(r[C.CREATED]), plannedDate: excelDateToISO(r[C.PLANNED]),
        todayFlag: pb(r[C.TODAY]), doneDate: excelDateToISO(r[C.DONE]), dueDate: excelDateToISO(r[C.DUE]),
        owner: own(r[C.OWNER]), note: String(r[C.NOTE]||"").trim(), internalNote: String(r[C.INOTE]||"").trim(),
        auto: String(r[C.AUTO]||"").trim(),
        cancelled: ["true","ano","1","yes"].includes(String(r[C.CANCELLED]||"").trim().toLowerCase())
      }))
      .filter(t => t.id || t.title);

    const backlog = [];
    ["Úkoly dílna","Externisti"].forEach(name => {
      const s = wb.Sheets[name];
      if (!s) return;
      XLSX.utils.sheet_to_json(s,{header:1,raw:true,defval:null})
        .filter(r => /^P\d$/i.test(String(r[0]||"").trim()) && r[1] && r[2])
        .forEach(r => backlog.push({
          id: String(r[1]||"").trim(), title: String(r[2]||"").trim(),
          priority: String(r[0]||"P3").trim().toUpperCase(),
          owner: own(r[3]),
          note: r[4] && String(r[4]).trim()!=="(prázdné)" ? String(r[4]).trim() : "",
          source: name
        }));
    });

    const auta = [];
    const autaSheet = wb.Sheets["AUTA"];
    if (autaSheet) {
      XLSX.utils.sheet_to_json(autaSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] || r[1]).forEach(r => {
          auta.push({ popis: String(r[0]||"").trim(), spz: String(r[1]||"").trim(), zodpovedna: String(r[2]||"").trim(), dostupnost: String(r[3]||"volné").trim().toLowerCase() || "volné" });
        });
    }

    const autaRezervace = [];
    const rezSheet = wb.Sheets["AUTA_REZERVACE"];
    if (rezSheet) {
      XLSX.utils.sheet_to_json(rezSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          autaRezervace.push({ spz: String(r[0]||"").trim(), datum: excelDateToISO(r[1]) || String(r[1]||"").trim(), stav: String(r[2]||"používané").trim().toLowerCase() || "používané", poznamka: String(r[3]||"").trim() });
        });
    }

    const resitele = [];
    const resSheet = wb.Sheets["RESITEL"];
    if (resSheet) {
      XLSX.utils.sheet_to_json(resSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0]).forEach(r => {
          resitele.push({ zkratka: String(r[0]||"").trim(), jmeno: String(r[1]||"").trim(), prijmeni: String(r[2]||"").trim() });
        });
    }

    const opakovaci = [];
    const opSheet = wb.Sheets["OPAKOVACI"];
    if (opSheet) {
      XLSX.utils.sheet_to_json(opSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          opakovaci.push({ id: String(r[0]||"").trim(), title: String(r[1]||"").trim(), owner: String(r[2]||"").trim(), typ: String(r[3]||"weekly").trim().toLowerCase(), hodnota: String(r[4]||"1").trim(), aktivni: String(r[5]||"ANO").trim().toUpperCase() === "ANO", note: String(r[6]||"").trim() });
        });
    }

    const opakovaciVyjimky = [];
    const opvSheet = wb.Sheets["OPAKUJICI_VYJIMKY"];
    if (opvSheet) {
      XLSX.utils.sheet_to_json(opvSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          opakovaciVyjimky.push({ id: String(r[0]||"").trim(), datum: excelDateToISO(r[1]) || String(r[1]||"").trim(), duvod: String(r[2]||"").trim() });
        });
    }

    function localISO(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }

    function generateRecurring(opakovaci, opakovaciVyjimky, tasks) {
      const vyjimkySet = new Set(opakovaciVyjimky.map(v => `${v.id}|${v.datum}`));
      const taskIndex = new Map();
      tasks.forEach(t => { if (t.id && t.plannedDate) taskIndex.set(`${t.id}|${t.plannedDate}`, t); });
      const today = new Date(); today.setHours(0,0,0,0);
      const fromDate = new Date(today); fromDate.setDate(today.getDate() - 28);
      const toDate   = new Date(today); toDate.setDate(today.getDate() + 28);
      const result = [];
      opakovaci.filter(o => o.aktivni).forEach(o => {
        const dates = [];
        const val = parseInt(o.hodnota, 10) || 1;
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
          result.push({ id: o.id, title: o.title, owner: o.owner, plannedDate: iso, priority: "P3", project: "", status: "Opakující se", note: o.note || "", internalNote: "", auto: "", waiting: false, subtask: false, recurring: true });
        });
      });
      return result;
    }

    const recurringTasks = generateRecurring(opakovaci, opakovaciVyjimky, tasks);
    const allTasks = [...tasks.filter(t => !t.cancelled), ...recurringTasks];
    const allOwners = [...new Set([...allTasks.map(t=>t.owner),...backlog.map(t=>t.owner)])]
      .filter(Boolean).sort((a,b)=>a.localeCompare(b,"cs"));

    return { tasks: allTasks, backlog, owners: allOwners, auta, autaRezervace, resitele, opakovaci, opakovaciVyjimky };
  }

  // ── localStorage ───────────────────────────────────────────────────────
  function saveData(parsed, fileName) {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify({ parsedData: parsed, fileName, savedAt: new Date().toISOString() }));
    } catch(e) {}
  }

  function saveRaw(buffer, fileName) {
    try {
      const uint8 = new Uint8Array(buffer);
      const CHUNK = 8192; let binary = "";
      for (let i = 0; i < uint8.length; i += CHUNK)
        binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
      localStorage.setItem(RAW_KEY, JSON.stringify({ b64: btoa(binary), fileName, savedAt: new Date().toISOString() }));
    } catch(e) {}
  }

  function loadRaw() {
    try {
      const s = localStorage.getItem(RAW_KEY);
      if (!s) return null;
      const { b64, fileName, savedAt } = JSON.parse(s);
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { buffer: bytes.buffer, fileName, savedAt };
    } catch(e) { return null; }
  }

  function applyParsed(parsed, fileName) {
    saveData(parsed, fileName);
    if (_onData) _onData(parsed);
    status(`Načteno · ${fileName} · ${new Date().toLocaleString("cs-CZ")}`);
  }

  // ── Graph API: načtení souboru ────────────────────────────────────────
  async function loadFromGraph(silent) {
    if (!_accessToken) return false;
    try {
      // 1. Zkontroluj lastModifiedDateTime
      const metaResp = await graphRequest(fileMetaUrl());
      if (!metaResp.ok) {
        const err = await metaResp.text();
        throw new Error(`Meta ${metaResp.status}: ${err.slice(0,200)}`);
      }
      const meta = await metaResp.json();
      const lastMod = meta.lastModifiedDateTime || "";
      if (lastMod === _lastModified) return false;

      // 2. Stáhni soubor
      const fileResp = await graphRequest(fileContentUrl());
      if (!fileResp.ok) {
        const err = await fileResp.text();
        throw new Error(`File ${fileResp.status}: ${err.slice(0,200)}`);
      }
      const buffer = await fileResp.arrayBuffer();
      _lastModified = lastMod;

      const parsed = parseBuffer(buffer);
      saveData(parsed, meta.name || "0_SEZNAM_UKOLU-GLOBAL.xlsx");
      saveRaw(buffer, meta.name || "0_SEZNAM_UKOLU-GLOBAL.xlsx");
      if (_onData) _onData(parsed);
      status(`Načteno · ${meta.name} · ${new Date(lastMod).toLocaleString("cs-CZ")}`);
      return true;
    } catch(e) {
      if (!silent) status(`Graph API chyba: ${e.message}`, true);
      console.error("loadFromGraph:", e);
      return false;
    }
  }

  // ── Graph API: zápis souboru ──────────────────────────────────────────
  async function saveToGraph(buffer, fileName) {
    if (!_accessToken) throw new Error("Nejsi přihlášen — nelze uložit");
    const uploadUrl = fileUploadUrl();
    const resp = await graphRequest(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      body: buffer
    });
    if (!resp.ok) throw new Error(`Upload error ${resp.status}`);
    const meta = await resp.json();
    _lastModified = meta.lastModifiedDateTime || _lastModified;
    return meta;
  }

  // ── File Handle fallback (lokální použití) ────────────────────────────
  let _lastHandleModified = 0;
  function setFileHandle(handle) {
    _fileHandle = handle;
    _lastHandleModified = 0;
  }

  async function loadFromHandle(silent) {
    if (!_fileHandle) return false;
    try {
      const file = await _fileHandle.getFile();
      if (file.lastModified === _lastHandleModified) return false;
      _lastHandleModified = file.lastModified;
      const buffer = await file.arrayBuffer();
      const parsed = parseBuffer(buffer);
      saveData(parsed, file.name);
      saveRaw(buffer, file.name);
      if (_onData) _onData(parsed);
      status(`Načteno · ${file.name} · ${new Date().toLocaleString("cs-CZ")}`);
      return true;
    } catch(e) {
      if (!silent) status(`Chyba čtení souboru: ${e.message}`, true);
      return false;
    }
  }

  // ── Polling ────────────────────────────────────────────────────────────
  async function poll() {
    if (_accessToken) {
      await loadFromGraph(true);
    } else if (_fileHandle) {
      await loadFromHandle(true);
    }
  }

  // ── UI: přihlašovací banner ───────────────────────────────────────────
  function showLoginBanner() {
    const existing = document.getElementById("ftLoginBanner");
    if (existing) return;
    const banner = document.createElement("div");
    banner.id = "ftLoginBanner";
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#1d4ed8;color:white;padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:sans-serif;";
    banner.innerHTML = `
      <span style="font-size:14px;font-weight:600;">🔐 Přihlaš se Microsoft účtem pro přístup k OneDrive databázi</span>
      <button id="ftLoginBtn" style="background:white;color:#1d4ed8;border:none;border-radius:8px;padding:8px 18px;font-size:13px;font-weight:700;cursor:pointer;">Přihlásit se →</button>
    `;
    document.body.prepend(banner);
    document.getElementById("ftLoginBtn").addEventListener("click", () => {
      window.location.href = getAuthUrl();
    });
  }

  function hideLoginBanner() {
    document.getElementById("ftLoginBanner")?.remove();
  }

  // ── Init ───────────────────────────────────────────────────────────────
  function init({ onData, onStatus }) {
    _onData   = onData;
    _onStatus = onStatus;

    // 1. Zpracuj OAuth redirect (token v URL hash)
    const fromRedirect = handleRedirect();

    // 2. Zkus načíst token ze session
    _accessToken = loadToken();

    // 3. Zobraz data z cache okamžitě
    try {
      const cached = localStorage.getItem(DATA_KEY);
      if (cached) {
        const { parsedData, fileName, savedAt } = JSON.parse(cached);
        if (parsedData && _onData) {
          _onData(parsedData);
          status(`Z cache · ${fileName} · ${new Date(savedAt).toLocaleString("cs-CZ")}`);
        }
      }
    } catch(e) {}

    // 4. Pokud máme token → načti čerstvá data z Graph API
    if (_accessToken) {
      hideLoginBanner();
      loadFromGraph(false);
    } else {
      // Bez tokenu — zobraz login banner (nebo načti z file handle)
      if (_fileHandle) {
        loadFromHandle(false);
      } else {
        showLoginBanner();
        status("Přihlaš se Microsoft účtem pro načtení dat", true);
      }
    }

    // 5. Spusť polling
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(poll, POLL_MS);

    // 6. Storage event — propagace mezi záložkami
    window.addEventListener("storage", e => {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const { parsedData } = JSON.parse(e.newValue);
        if (parsedData && _onData) _onData(parsedData);
      } catch(_) {}
    });
  }

  async function reload() {
    if (_accessToken) await loadFromGraph(false);
    else if (_fileHandle) await loadFromHandle(false);
  }

  function pushWorkbook(buffer, fileName) {
    try {
      const parsed = parseBuffer(buffer instanceof Uint8Array ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer);
      saveData(parsed, fileName);
      saveRaw(buffer instanceof Uint8Array ? buffer.buffer : buffer, fileName);
      _lastModified = ""; // Vynutí přenačtení při příštím pollingu
    } catch(e) { console.warn("ft_loader: pushWorkbook failed", e); }
  }

  function getAutoDostupnost(spz, datum, auta, autaRezervace) {
    const rez = autaRezervace.find(r => r.spz === spz && r.datum === datum);
    if (rez) return rez.stav;
    const auto = auta.find(a => a.spz === spz);
    if (auto && auto.dostupnost !== "volné") return auto.dostupnost;
    return "volné";
  }

  return { init, reload, loadRaw, pushWorkbook, getAutoDostupnost, setFileHandle, saveToGraph, isAuthenticated: () => !!_accessToken };

})();
