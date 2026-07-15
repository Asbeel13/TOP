/**
 * ft_loader.js — automatické načítání 0_SEZNAM_UKOLU-GLOBAL.xlsx
 * Soubor musí být ve stejné složce jako HTML stránky.
 * Sdílení dat mezi stránkami přes localStorage (ftWorkbookData).
 */
const FTLoader = (() => {

  const DATA_KEY   = "ftWorkbookData";
  const RAW_KEY    = "ftWorkbookRaw";
  const XLSX_FILE  = "0_SEZNAM_UKOLU-GLOBAL.xlsx";
  const POLL_MS    = 3000;

  let _onData = null, _onStatus = null;
  let _lastHash = "", _pollTimer = null;

  function status(msg, err) { if (_onStatus) _onStatus(msg, !!err); }

  // ── Hash ───────────────────────────────────────────────────────────────
  async function hashBuffer(buffer) {
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
  }

  // ── Parse ──────────────────────────────────────────────────────────────
  function excelDateToISO(v) {
    if (!v) return null;
    function localISO(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,"0");
      const day = String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    }
    if (v instanceof Date && !isNaN(v)) return localISO(v);
    if (typeof v === "number" && isFinite(v))
      return localISO(new Date(Math.round(v - 25569) * 86400000));
    if (typeof v === "string") {
      const t = v.trim();
      // YYYY-MM-DD — vrať přímo, bez new Date() aby se předešlo UTC posunu
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      // DD.MM.YYYY
      const mDot = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (mDot) return `${mDot[3]}-${mDot[2].padStart(2,"0")}-${mDot[1].padStart(2,"0")}`;
    }
    return null;
  }
  function pb(v) {
    if (typeof v === "boolean") return v;
    return ["true","pravda","ano","1","yes"].includes(String(v||"").trim().toLowerCase());
  }
  function own(v) { return String(v||"").trim() || "Nezařazeno"; }

  function parseBuffer(buffer) {
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });
    const main = wb.Sheets["ALLDATBASE"];
    if (!main) throw new Error('Chybí list "ALLDATBASE"');
    const rows = XLSX.utils.sheet_to_json(main, { header:1, raw:true, defval:null });

    // ── Dynamicky najdi sloupce podle záhlaví ──
    const hdr = (rows[0] || []).map(h => String(h||"").trim().toLowerCase());
    const col = (names) => {
      for (const n of names) {
        const i = hdr.indexOf(n.toLowerCase());
        if (i >= 0) return i;
      }
      return -1;
    };
    // Pevné indexy jako fallback (struktura ALLDATBASE před přidáním RESITEL)
    const C = {
      ID:       col(["id"])                        >= 0 ? col(["id"])                        : 0,
      TASK:     col(["úkol","task","název"])        >= 0 ? col(["úkol","task","název"])        : 2,
      PRIORITY: col(["priorita","priority"])        >= 0 ? col(["priorita","priority"])        : 3,
      PROJECT:  col(["projekt","project"])          >= 0 ? col(["projekt","project"])          : 4,
      SALES:    col(["sales","obchod"])             >= 0 ? col(["sales","obchod"])             : 5,
      WAITING:  col(["čeká se","waiting"])          >= 0 ? col(["čeká se","waiting"])          : 6,
      SUBTASK:  col(["podúkol","subtask"])          >= 0 ? col(["podúkol","subtask"])          : 7,
      STATE:    col(["stav","state","status"])      >= 0 ? col(["stav","state","status"])      : 8,
      PROGRESS: col(["progress","procent","%"])     >= 0 ? col(["progress","procent","%"])     : 9,
      CREATED:  col(["datum zápisu","created"])     >= 0 ? col(["datum zápisu","created"])     : 10,
      PLANNED:  col(["plánovaný","planned"])        >= 0 ? col(["plánovaný","planned"])        : 11,
      TODAY:    col(["dnes","today","aktuální"])    >= 0 ? col(["dnes","today","aktuální"])    : 12,
      DONE:     col(["dokončeno","done","finished"])>= 0 ? col(["dokončeno","done","finished"]): 13,
      DUE:      col(["due","termín"])               >= 0 ? col(["due","termín"])               : 17,
      OWNER:    col(["řešitel","owner","assignee"]) >= 0 ? col(["řešitel","owner","assignee"]) : 18,
      NOTE:     col(["upřesnění","note","poznámka"])>= 0 ? col(["upřesnění","note","poznámka"]): 19,
      INOTE:    col(["interní","internal"])         >= 0 ? col(["interní","internal"])         : 20,
      AUTO:     col(["auto","spz","v auto"])        >= 0 ? col(["auto","spz","v auto"])        : 21,
      CANCELLED:col(["zrušeno","cancelled","zruseno"]) >= 0 ? col(["zrušeno","cancelled","zruseno"]) : 22,
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
        cancelled: pb(r[C.CANCELLED]),
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
    const owners = [...new Set([...tasks.map(t=>t.owner),...backlog.map(t=>t.owner)])]
      .filter(Boolean).sort((a,b)=>a.localeCompare(b,"cs"));

    // ── List Auta ──
    const auta = [];
    const autaSheet = wb.Sheets["AUTA"];
    if (autaSheet) {
      XLSX.utils.sheet_to_json(autaSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] || r[1]).forEach(r => {
          auta.push({
            popis:      String(r[0]||"").trim(),
            spz:        String(r[1]||"").trim(),
            zodpovedna: String(r[2]||"").trim(),
            dostupnost: String(r[3]||"volné").trim().toLowerCase() || "volné"
          });
        });
    }

    // ── List Auta_rezervace ──
    const autaRezervace = [];
    const rezSheet = wb.Sheets["AUTA_REZERVACE"];
    if (rezSheet) {
      XLSX.utils.sheet_to_json(rezSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          autaRezervace.push({
            spz:      String(r[0]||"").trim(),
            datum:    excelDateToISO(r[1]) || String(r[1]||"").trim(),
            stav:     String(r[2]||"používané").trim().toLowerCase() || "používané",
            poznamka: String(r[3]||"").trim()
          });
        });
    }

    // ── List RESITEL ──
    const resitele = [];
    const resSheet = wb.Sheets["RESITEL"];
    if (resSheet) {
      XLSX.utils.sheet_to_json(resSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0]).forEach(r => {
          resitele.push({
            zkratka:  String(r[0]||"").trim(),
            jmeno:    String(r[1]||"").trim(),
            prijmeni: String(r[2]||"").trim()
          });
        });
    }

    // ── List OPAKOVACI ──
    const opakovaci = [];
    const opSheet = wb.Sheets["OPAKOVACI"];
    if (opSheet) {
      XLSX.utils.sheet_to_json(opSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          opakovaci.push({
            id:       String(r[0]||"").trim(),
            title:    String(r[1]||"").trim(),
            owner:    String(r[2]||"").trim(),
            typ:      String(r[3]||"weekly").trim().toLowerCase(),
            hodnota:  String(r[4]||"1").trim(),
            aktivni:  String(r[5]||"ANO").trim().toUpperCase() === "ANO",
            note:     String(r[6]||"").trim()
          });
        });
    }

    // ── List OPAKOVACI_VYJIMKY ──
    const opakovaciVyjimky = [];
    const opvSheet = wb.Sheets["OPAKOVACI_VYJIMKY"];
    if (opvSheet) {
      XLSX.utils.sheet_to_json(opvSheet, {header:1, raw:false, defval:""})
        .slice(1).filter(r => r[0] && r[1]).forEach(r => {
          opakovaciVyjimky.push({
            id:     String(r[0]||"").trim(),
            datum:  excelDateToISO(r[1]) || String(r[1]||"").trim(),
            duvod:  String(r[2]||"").trim()
          });
        });
    }

    // ── Generuj výskyty opakujících se úkolů pro ±4 týdny ──
    function generateRecurring(opakovaci, opakovaciVyjimky, tasks) {
      const vyjimkySet = new Set(opakovaciVyjimky.map(v => `${v.id}|${v.datum}`));
      // Index existujících úkolů v ALLDATBASE: id|datum → task
      const taskIndex = new Map();
      tasks.forEach(t => { if (t.id && t.plannedDate) taskIndex.set(`${t.id}|${t.plannedDate}`, t); });

      const today = new Date(); today.setHours(0,0,0,0);
      const fromDate = new Date(today); fromDate.setDate(today.getDate() - 28);
      const toDate   = new Date(today); toDate.setDate(today.getDate() + 28);

      const result = [];
      opakovaci.filter(o => o.aktivni).forEach(o => {
        const dates = [];
        if (o.typ === "weekly") {
          // hodnota = číslo dne 1=Po..7=Ne
          const targetDay = parseInt(o.hodnota, 10);
          const d = new Date(fromDate);
          // Posuň na první výskyt targetDay
          const diff = (targetDay - d.getDay() + 7) % 7 || 7;
          d.setDate(d.getDate() + (diff === 7 && d.getDay() === targetDay % 7 ? 0 : diff));
          // Pro JS: 0=Ne,1=Po...6=So; převod: 1=Po→1, 7=Ne→0
          const jsDay = targetDay === 7 ? 0 : targetDay;
          const start = new Date(fromDate);
          for (let dd = new Date(start); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
            if (dd.getDay() === jsDay) dates.push(new Date(dd));
          }
        } else if (o.typ === "interval") {
          // hodnota = každých N dní od referenčního data (epoch)
          const n = parseInt(o.hodnota, 10) || 1;
          const ref = new Date("2025-01-01"); // referenční bod
          for (let dd = new Date(fromDate); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
            const diff = Math.round((dd - ref) / 86400000);
            if (diff % n === 0) dates.push(new Date(dd));
          }
        } else if (o.typ === "monthly") {
          // hodnota = den v měsíci
          const dayOfMonth = parseInt(o.hodnota, 10);
          for (let dd = new Date(fromDate); dd <= toDate; dd.setDate(dd.getDate() + 1)) {
            if (dd.getDate() === dayOfMonth) dates.push(new Date(dd));
          }
        }

        dates.forEach(d => {
          const iso = d.toISOString().slice(0,10);
          // Přeskočit výjimky
          if (vyjimkySet.has(`${o.id}|${iso}`)) return;
          // Pokud existuje v ALLDATBASE → použij ten (už je v tasks)
          if (taskIndex.has(`${o.id}|${iso}`)) return;
          // Jinak přidej jako recurring šablonu
          result.push({
            id: o.id, title: o.title, owner: o.owner,
            plannedDate: iso, priority: "P3", project: "",
            status: "Opakující se", note: o.note, internalNote: "",
            auto: "", waiting: false, subtask: false,
            recurring: true
          });
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
  function saveData(parsed, fileName, hash) {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify({
        parsedData: parsed, fileName, hash, savedAt: new Date().toISOString()
      }));
    } catch(e) { console.warn("ft_loader: saveData failed", e); }
  }

  function loadData() {
    try { const s = localStorage.getItem(DATA_KEY); return s ? JSON.parse(s) : null; }
    catch(e) { return null; }
  }

  function saveRaw(buffer, fileName) {
    try {
      const uint8 = new Uint8Array(buffer);
      const CHUNK = 8192;
      let binary = "";
      for (let i = 0; i < uint8.length; i += CHUNK)
        binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
      localStorage.setItem(RAW_KEY, JSON.stringify({
        b64: btoa(binary), fileName, savedAt: new Date().toISOString()
      }));
    } catch(e) { console.warn("ft_loader: saveRaw failed", e); }
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

  // ── Apply ──────────────────────────────────────────────────────────────
  function applyData(c) {
    if (_onData) _onData(c.parsedData);
    const dt = new Date(c.savedAt).toLocaleString("cs-CZ");
    status(`Načteno · ${c.fileName} · ${dt}`);
  }

  // ── File Handle (OneDrive / lokální disk) ─────────────────────────────
  let _fileHandle = null;
  let _lastModified = 0;

  function setFileHandle(handle) {
    _fileHandle = handle;
    _lastModified = 0; // Reset — přinutí přenačtení při příštím pollingu
  }

  // ── Načtení přes fileHandle ────────────────────────────────────────────
  async function loadFromHandle(silent) {
    if (!_fileHandle) return false;
    try {
      const file = await _fileHandle.getFile();
      if (file.lastModified === _lastModified) {
        return false; // Soubor se nezměnil
      }
      _lastModified = file.lastModified;
      const buffer = await file.arrayBuffer();
      const hash = await hashBuffer(buffer);
      if (hash === _lastHash) return false;
      _lastHash = hash;
      const parsed = parseBuffer(buffer);
      saveData(parsed, file.name, hash);
      saveRaw(buffer, file.name);
      if (_onData) _onData(parsed);
      status(`Načteno · ${file.name} · ${new Date().toLocaleString("cs-CZ")}`);
      return true;
    } catch(e) {
      if (!silent) status(`Chyba čtení souboru: ${e.message}`, true);
      return false;
    }
  }

  // ── Fetch ze serveru (fallback bez fileHandle) ─────────────────────────
  async function fetchAndLoad(silent) {
    // Pokud máme fileHandle, použij ho místo fetch
    if (_fileHandle) return loadFromHandle(silent);

    let buffer;
    try {
      const resp = await fetch(XLSX_FILE + "?t=" + Date.now(), { cache: "no-store" });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      buffer = await resp.arrayBuffer();
    } catch(e) {
      if (!silent) status(`Soubor ${XLSX_FILE} nelze načíst: ${e.message}`, true);
      return false;
    }

    const hash = await hashBuffer(buffer);
    if (hash === _lastHash) {
      return false;
    }

    _lastHash = hash;
    const parsed = parseBuffer(buffer);
    saveData(parsed, XLSX_FILE, hash);
    saveRaw(buffer, XLSX_FILE);
    if (_onData) _onData(parsed);
    status(`Načteno · ${XLSX_FILE} · ${new Date().toLocaleString("cs-CZ")}`);
    return true;
  }

  // ── Public API ─────────────────────────────────────────────────────────
  function init({ onData, onStatus }) {
    _onData   = onData;
    _onStatus = onStatus;

    // 1. Okamžitě zobraz data z cache
    const c = loadData();
    if (c && c.parsedData) {
      _lastHash = c.hash || "";
      applyData(c);
    }

    // 2. Načti čerstvá data ze souboru
    fetchAndLoad(false);

    // 3. Poslouchej změny z jiných záložek (např. správa po uložení)
    window.addEventListener("storage", e => {
      if (e.key !== DATA_KEY || !e.newValue) return;
      try {
        const nc = JSON.parse(e.newValue);
        if (nc && nc.parsedData && nc.hash !== _lastHash) {
          _lastHash = nc.hash || "";
          applyData(nc);
        }
      } catch(_) {}
    });

    // 4. Polling — každých 5 s kontroluj změny souboru
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(() => fetchAndLoad(true), POLL_MS);
  }

  async function reload() {
    await fetchAndLoad(false);
  }

  /**
   * Správa úkolů: zavolej po načtení nebo uložení souboru.
   * buffer = ArrayBuffer nebo Uint8Array
   */
  function pushWorkbook(buffer, fileName) {
    try {
      let ab = buffer;
      if (buffer instanceof Uint8Array) {
        ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
      const parsed = parseBuffer(ab);
      // Použij náhodný hash aby storage event vždy proběhl
      const hash = "push-" + Date.now();
      saveData(parsed, fileName, hash);
      saveRaw(ab, fileName);
      _lastHash = hash;
    } catch(e) {
      console.warn("ft_loader: pushWorkbook failed", e);
    }
  }

  /**
   * Vrátí stav auta pro daný den.
   * Priorita: rezervace pro konkrétní den > trvalý stav z listu Auta > "volné"
   */
  function getAutoDostupnost(spz, datum, auta, autaRezervace) {
    const rez = autaRezervace.find(r => r.spz === spz && r.datum === datum);
    if (rez) return rez.stav;
    const auto = auta.find(a => a.spz === spz);
    if (auto && auto.dostupnost !== "volné") return auto.dostupnost;
    return "volné";
  }

  return { init, reload, loadRaw, pushWorkbook, getAutoDostupnost, setFileHandle };

})();
