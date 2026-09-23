# CLAUDE.md — Projekt TOP (Týdenní operační plán)

Tento soubor je persistentní kontext pro Claude Code. Přečti si ho na začátku
každé relace — shrnuje architekturu, rozhodnutí a nástrahy z dlouhého vývoje
tohoto projektu (stovky iterací v Claude.ai chatu). Cílem je, abys nemusel(a)
nic z tohoto znovu objevovat od nuly.

## ✅ Duplicity v databázi (2026-09-23, VYŘEŠENO a ověřeno)

**✅ JK spustil úklidový skript 2026-09-23 18:37:36** (commit "Úklid
duplicitních ID: smazány 4 zrušené kopie …"). Ověřeno na čerstvé
kopii: 1 618 úkolů, 0 duplicitních ID, 0 duplicit obsahu, ostatní
seznamy čisté; `*0463*` = platný „Hanon - prázdné“, `*0464*` = platný
„Hanon - plné“, `*0701*` = 1 zrušený, `*TMTJXVNFJ*` = platný s autem
7Z3 2432. Zároveň **první ostrý zápis historie úprav**:
`history/2026-09.json` založen (18:37:37, 4× `smazan` s názvem a
posledními hodnotami).

Kontrola celé `database.json` (1 622 úkolů): auta, rezervace, řešitelé,
opakovací pravidla, výjimky, dokončení, spoluřešitelé a completedDays
jsou BEZ duplicit. Nálezy jen v `tasks[]`:
- **A) stejné ID i datum (4 dvojice):** `*0463*`, `*0464*` (23. 7.,
  JN, zrušená kopie jednoho ID nesla název platné kopie druhého),
  `*0701*` (28. 8., 2 identické zrušené), `*TMTJXVNFJ*` (4. 9., zrušený
  bez auta + platný s autem). Příčina = chyba s `rowIndex` ve Správě
  opravená 2026-09-17; od 4. 9. žádná nová duplicita. **JK: smazat
  zrušené kopie.** Správa umí jen rušit → připraven jednorázový skript do
  konzole Správy (hledá kopii podle id + title + `cancelled`, když stav
  nesedí, zastaví se bez uložení; ukládá přes `saveToGitHub`, takže se
  smazání zapíše i do historie). Otestováno mockem: 1622 → 1618, 0
  duplicitních ID, 4× `smazan` v historii, druhé spuštění nic neuloží.
- **B) stejný obsah pod různým ID:** „H9 - teče horní ventil“
  `*0044*`/`*0137*`, „HMFiT 46“ `*0324*`/`*0338*` — **JK zrušil `*0137*`
  a `*0338*` ručně** (ověřeno v datech).
- **Pojistky navržené a ZAMÍTNUTÉ JK ("nedělat"):** odmítnutí uložení,
  které by vytvořilo nové duplicitní ID; Hotovo nikdy na zrušený úkol
  (`findRawTaskForOccurrence`). Neotvírat znovu bez nového důvodu.

## ✅ Úklid tlačítek (2026-09-23, NASAZENO a ověřeno — commit `01c05a6`)

**✅ Nahráno JK a ověřeno (2026-09-23 06:20, `01c05a6`, 2 soubory):**
`git fetch` + `cmp` — oba soubory shodné s lokální verzí; GitHub Pages
(stažení bez cache) servíruje novou verzi obou souborů.

Na žádost JK ("teď už ani jedno tlačítko není aktuálně potřeba"):
- **`tydenni_prehled_mobile.html`** — ODSTRANĚN odkaz 🖥️ "Přepnout na
  desktopovou verzi" z horní lišty (zůstaly ⚙️, 🌙, 📋).
- **`sprava_ukolu_linked.html`** — tlačítko `#debugBtn` (🔍 Debug) jen
  SKRYTO atributem `hidden`, funkce `debugGitHub()` zůstává (jde zavolat
  z konzole prohlížeče, je to čistě diagnostický GET bez zápisu).
  Ověřeno, že žádné CSS pravidlo pro `button` nenastavuje `display`, takže
  `hidden` nic nepřebíjí.

## ✅ Kolize aut při zadávání úkolu (2026-09-22, NASAZENO a ověřeno — commit `007b552`)

**✅ Nahráno JK a ověřeno (2026-09-22 15:34, `007b552`, 4 soubory):**
`git fetch` + `cmp` — `theme.css`, `ft_loader.js`, Dashboard, Správa
bajtově shodné s ověřenou verzí. GitHub Pages: SHA-256 všech 4 sedí;
nasazený `ft_loader.js` spuštěný samostatně správně hlásí 2. den
vícedenního úkolu a ignoruje zrušený; nasazený `theme.css` rozparsován
celý (obě pravidla `:root` i `html.dark`, žádné utnutí komentářem jako
v1.3.1), `--auto-kolize`/`--auto-kolize-stav` v obou režimech.
`Esperanto/theme.css` (kanonická, `3c48890`) bajtově shodná.
**✅ JK otestoval v appce s reálnými daty (2026-09-22): zobrazení v
Dashboardu i ve Správě úkolů v pořádku. Hotovo.**

**Nahlásil JK:** při zakládání úkolu se neukazuje upozornění, že auto
je ten den už zapsané u jiného člověka. (Přidělit auto víc lidem je
ŽÁDOUCÍ — jen má systém upozornit, nic neblokovat.)

**Zjištěno:**
- **Dashboard:** `checkAutoWarningNew()` existovala, ale od vzniku
  (2026-07-17, ověřeno `git log -S`) se volala JEN z tlačítka "Použít" u
  ručně psané SPZ — výběr auta ze seznamu ani změna data ji nikdy
  nespustily. Nebyla to regrese.
- **Správa úkolů:** napojeno bylo (změna auta/data), ale všechny 3 kopie
  logiky (`getAutoDostupnost` v `ft_loader.js` — nikým nevolaná,
  `getAutoDostupnostDen`/`checkAutoWarning` ve Správě,
  `checkAutoWarningNew` v Dashboardu) porovnávaly jen `plannedDate` =
  ZAČÁTEK úkolu → auto obsazené 2.+ dnem vícedenního úkolu se jevilo
  volné (i v "dostupnost dnes" v Přehledu aut) a u nového vícedenního
  úkolu se kontroloval jen 1. den.

**Opraveno (JK schválil; pravidlo JK: všechny barvy jen přes proměnné
v `theme.css`; v rozbalovacím seznamu jen symbol ⚠, žádný text):**
- `theme.css` **v1.4.1**: `--auto-kolize` (červená, jiný úkol) a
  `--auto-kolize-stav` (oranžová, rezervace/trvalý stav), obě s tmavou
  hodnotou. Kanonicky i v `Esperanto/theme.css`.
- `ft_loader.js`: JEDINÉ místo logiky — `getAutoConflicts(spz, dates,
  {tasks, auta, autaRezervace, exclude})` (všechny dny zadávaného i
  existujících úkolů přes `getMultiDayOccurrenceDates`, bez zrušených,
  bez upravovaného úkolu; pracuje nad SUROVÝMI úkoly, ne nad
  `DATA.tasks` s kopiemi spoluřešitelů), `autoConflictLevel`,
  `describeAutoConflicts` (text hlášky: den, ID, název, řešitel),
  `markAutoOptions(select, dates, ctx)` (⚠ + barva položky, obarví i
  `<select>` podle vybraného auta; volné položky pak výslovně
  `var(--text)`, jinak by barvu zdědily). `getAutoDostupnost` volá novou
  logiku.
- Dashboard: kontrola na změnu auta, data, počtu dní i aktivních dnů +
  hned při otevření (datum bývá předvyplněné z "+").
- Správa úkolů: totéž + při otevření modalu (u úpravy se ukáže i už
  existující kolize) + po přestavění seznamu aut při přenačtení dat;
  `getAutoDostupnostDen` (Přehled aut) přes sdílenou logiku.
- Hláška pod polem: `white-space:pre-line` (víc řádků), barva z tokenu;
  natvrdo zapsané `#cc1f1a` v Dashboardu odstraněno.
- Barvu `<option>` respektuje Chrome/Edge/Firefox na desktopu; Safari a
  Android ji ignorují → symbol ⚠ je vidět všude.
- Mobilní Dashboard pole Auto nemá — beze změny.

**Ověřeno:** mock GitHub API + kopie živé DB + testovací scénář (vícedenní
úkol s autem X 5.–7. 10., rezervace Y 6. 10., zrušený úkol se Z):
Dashboard — bez data nic, 6. 10. (den 2) X kolize/Y stav, hláška s ID a
řešitelem, zrušený se nehlásí, 2.–4. 10. bez kolize, 2.–6. 10. kolize,
jen pá+so bez kolize; barvy z tokenů ve světlém (`rgb(204,31,26)`/
`rgb(217,119,6)`) i tmavém (`#f87171`/`#fbbf24`) režimu, screenshoty.
Správa — úprava úkolu nekoliduje sama se sebou (rezervace uprostřed
jeho trvání se hlásí), nový úkol hlásí, značky přežijí přestavění
seznamu, dostupnost X 5./6./7. 10. "používané" (dřív jen 5.), 8. volné,
Y "servis", zrušený Z volné. Žádné JS chyby. Statika: `{}`/`()`/`/* */`
vyvážené (theme.css +5 komentářů = nové), CRLF, bez BOM, žádný hex v
nových řádcích HTML.

**K nahrání:** `theme.css`, `ft_loader.js`,
`tydenni_dashboard_live_reload_local_linked.html`,
`sprava_ukolu_linked.html`. Stránky jsou jištěné proti staré
`ft_loader.js` z HTTP cache (bez funkcí se jen nic neoznačí).

## 🚧 ROZPRACOVÁNO: Historie úprav úkolů (2026-09-23 obnoveno — krok 1 hotový lokálně, NENAHRÁNO)

**Stav 2026-09-23:** JK práci obnovil. Krok 1 (zápis historie v
`ft_loader.js`) hotový a otestovaný mockem na kopii živé DB, čeká se na
krok 2 (zobrazení ve Správě) — nahrává se společně. Detail, doplněná
rozhodnutí (auto ANO, pravidla/výjimky zatím NE), průběh testu a
vedlejší nález (`findRawTaskForOccurrence` nevynechává zrušené) v
**`TOP/HISTORIE_UPRAV_navrh.md`**, sekce nahoře.

JK chce u úkolu vidět kdo založil / změnil / dal hotovo / smazal.
Návrh, měření četnosti úprav, odhad velikosti, rozhodnutí JK a kroky
implementace jsou v **`TOP/HISTORIE_UPRAV_navrh.md`**. Klíčové: historie do
samostatných měsíčních souborů `top-data/history/YYYY-MM.json` (NE do
`database.json`), zápis jediným místem v `saveToGitHub()` přes diff
před/po, zobrazení jen ve Správě úkolů, zpětné doplnění z commitů.

## ✅ Svátky ze SPA jako jeden sdílený úkol (2026-09-22, NASAZENO na obou stranách, JK vizuálně potvrdil — HOTOVO)

**✅ Nahráno JK a ověřeno (2026-09-22, commit `77a549e`, 2 soubory):**
první pokus o nahrání se na GitHubu neprojevil (žádný commit) — odhaleno
`git fetch`, JK nahrál znovu. `git fetch` + `cmp`: všechny soubory appky
bajtově shodné s lokální verzí. GitHub Pages: sestavení doběhlo ~1 min
po commitu (první kontrola ještě ukázala starý obsah); pak SHA-256 obou
souborů (`cache:"no-store"`) sedí a nasazený `ft_loader.js` spuštěný
samostatně: svátek bez štítku i bez spoluřešitelů v detailu, běžný
sdílený úkol "+ RS" / kopie "s JK" beze změny. Vestavěný prohlížeč
ještě chvíli držel starý `ft_loader.js` v HTTP cache (`transferSize 0`,
`max-age=600`) — zpoždění prohlížeče, ne nasazení; stránky jsou proti
tomu jištěné. **SPA restartována** (konzole `31 dovolené + 26 svátků`),
živá `database.json` ověřena (jen čtení): 26 svátků v novém formátu, 0
ve starém, 713 kB. První nahrání ve 14:33 omylem skončilo v `top-data`
(`ft_loader.js` + `tydenni_dashboard_mobile.html`), JK je ve 14:39
smazal — ověřeno, že `top-data` je čistý. **Zbývá jen vizuální kontrola
svátků v TOP (JK).**

Změna kontraktu SPA→TOP (odsouhlasil JK): svátek = JEDEN úkol
`*SPA-HOL-<datum>*`, `owner` = první zkratka abecedně, `coOwners` =
ostatní (místo úkolu na každého člověka, ~442 → ~26 úkolů,
`database.json` ~832 → ~683 kB). **Plný popis je v
`Esperanto/INTEGRACE.md`, sekce 5, záznam 2026-09-22** (rozhodující) —
tady jen TOP-side shrnutí.

- `ft_loader.js` (upravila SPA-side session): `isSpaHoliday()`,
  `getCoOwners()`/`getCoOwnerLabel()` pro svátek prázdné (žádné štítky,
  žádné "Spoluřešitelé" v detailu), rozpad přes interní `listCoOwners()`.
- **TOP-side kontrola (2026-09-22) našla 1 vadu:** kopie svátku nesla
  `primaryOwner` → detail u DH ukazoval řešitele "AMa". **Opraveno:**
  kopie svátku BEZ `primaryOwner` i `isCoOwnerCopy`. Aby to nešlo zneužít
  (primaryOwner jinak chrání mobilní úpravu z kopie před přepsáním
  hlavního řešitele), `tydenni_dashboard_mobile.html` `openModal()` u
  **všech `*SPA` úkolů skrývá "Upravit" i "Zrušit"** (sdílený svátek by
  zrušení schovalo všem najednou; úpravu SPA úkolu stejně přepíše sync).
- **Ověřeno:** kopie živé DB, 12/12 (regrese bajtově shodná s GitHub
  verzí; převod svátků → každý vidí přesně stejné svátky, 442 dvojic;
  bez štítků/rámečku; ostatní úkoly beze změny) + skutečná mobilní
  stránka s mockem (svátek u všech 17, detail u DH ukazuje DH, u svátku i
  dovolené Upravit/Zrušit skryté, Hotovo zůstává, běžný úkol má obě
  tlačítka, žádné JS chyby). Statika: `{}`/`()`/`/* */` vyvážené, CRLF,
  bez BOM.
- **K nahrání:** `ft_loader.js` + `tydenni_dashboard_mobile.html`. Pak
  restart SPA serveru s novým `topSync.js` (obrácené pořadí nic nerozbije).

## ✅ Spoluřešitelé úkolu (2026-09-21, kroky 1–4 NASAZENO a ověřeno — HOTOVO)

**✅ JK potvrdil z provozu (2026-09-23): "Spoluřešitelé obecně fungují
jak mají."** Spoluřešitelé u OPAKOVANÝCH úkolů zůstávají jen jako bod do
budoucna ("ber v patrnost, teď to dělat nebudeme") — nezačínat bez JK.

**✅ Nahráno JK a ověřeno (2026-09-21, commit `7fd1219`):** `git fetch` +
`diff` — všech 6 souborů appky (`ft_loader.js`, `sprava_ukolu_linked.html`,
`tydenni_dashboard_live_reload_local_linked.html`,
`tydenni_dashboard_mobile.html`, `tydenni_prehled.html`,
`tydenni_prehled_mobile.html`) bajtově shodných s lokální verzí. Živě na
GitHub Pages: SHA-256 všech 6 souborů staženích s `cache:"no-store"`
sedí, načtená stránka má `FTLoader.getCoOwners`/`getCoOwnerLabel`/
`renderCoOwnerPicker`/`readCoOwnerPicker`, žádné chyby v konzoli.
Stejným commitem nahrán i `CLAUDE.md` — obsah shodný, jen GitHub ho teď
drží s CRLF (dřív LF); `git diff` ho kvůli `core.autocrlf=true` ukazuje
jako změněný celý, hash souboru je ale stejný. Skutečná data (karty,
picker s reálnými řešiteli) ověří JK v appce — token se nezadává.

**Navazující změna 2026-09-22 — svátky ze SPA jako jeden sdílený úkol
(✅ NAHRÁNO JK 2026-09-22, SPA sync potvrdil `+ 26 svátků`):** SPA posílá svátek jako JEDEN úkol
`*SPA-HOL-<datum>*` s `coOwners` = všichni SPA-propojení lidé (místo úkolu
na každého, 442 → 26 úkolů v `database.json`). Změna jen v `ft_loader.js`:
interní `isSpaHoliday(task)`; veřejná `getCoOwners()` pro svátek vrací
`[]` a `getCoOwnerLabel()` `""` (žádné "s JK"/"+ …"/"Spoluřešitelé" v
kartách a detailu); `expandCoOwnerCopies()` čte novou interní
`listCoOwners()` a kopiím svátku dává `isCoOwnerCopy: false` → bez
čárkovaného rámečku, počítadla jako dřív. Stránky ani Správa úkolů se
nemění (ve Správě je svátek jeden řádek "AMa + JK, LR, …"). Ověřeno
headless Edge testem (9/9 + end-to-end se SPA 7/7). Nahrát jen
`ft_loader.js`, PŘED restartem SPA. Změna kontraktu — plný popis v
`Esperanto/INTEGRACE.md` (sekce 2 + sekce 5, 2026-09-22).

**Zadání JK:** u každého úkolu zůstává hlavní řešitel (= dnešní pole
Řešitel/`owner`), navíc jde doplnit další řešitele. Úkol se v kalendáři
ukáže i u nich — jeden úkol pro víc lidí místo zakládání kopií.
Probráno zatím jen teoreticky + read-only průzkum kódu (grep `owner` 229×
/ `assignee` 44× napříč 6 soubory). Nezávisle posouzeno i druhou Claude
instancí, její dva postřehy ověřeny v kódu (viz níže).

### Rozhodnutí JK (2026-09-21)

1. **Jeden stav pro celý úkol** — "Hotovo" od kteréhokoliv řešitele =
   hotovo pro všechny (vč. jednotlivých dnů v `completedDays`). Žádné
   per-řešitel dokončení.
2. **Kopie u spoluřešitele vizuálně označit** jako sdílenou (štítek/
   odlišný styl karty), ať je poznat hlavní vs. spoluřešitel a úkol se
   nepočítá dvakrát.
3. **Opakující se úkoly (`opakovaci`) — zatím NE.** Pravidla mají vlastní
   `owner` (jiný objekt než `task`), spoluřešitelé se jich netýkají.
   Zapsáno jako bod do budoucna (viz "Nápady uživatele", bod 3).
4. **Filtr "Řešitel" ve Správě úkolů zahrne i spoluřešitele** ("Řešitel
   = JK" ukáže i úkoly, kde je JK jen spoluřešitel).

### Datový model

- `owner` **beze změny** = hlavní řešitel. Nové volitelné pole
  `coOwners: ["LR","MK"]` (chybí/prázdné u všech stávajících úkolů →
  nulová migrace, SPA sync i opakující se úkoly beze změny).
- Zamítnuto: `owners: []` s hlavním na prvním místě — migrace 960+ úkolů
  a přepis všeho, co čte `owner`.
- Validace: hlavní řešitel nesmí být zároveň ve `coOwners`, žádné
  duplicity, vyřazení řešitelé (`vyrazen`) se nenabízejí.
- **U `*SPA` úkolů (dovolená, svátky) spoluřešitele NENABÍZET** —
  `topSync.js` je při každém běhu maže a vytváří znovu, ručně přidaní
  spoluřešitelé by se tiše ztratili.

### Architektura řešení — rozpad v `parseDatabase()`

`ft_loader.js` už dnes vyrábí kopie úkolů (`expandMultiDayTasks()` rozpadá
vícedenní úkol na dny, `generateRecurring()` přidává výskyty) a všechny
pohledy seskupují `DATA.tasks` podle `t.owner`. Proto: v `parseDatabase()`
(po `expandMultiDayTasks`, před `generateRecurring`, ř. ~260–263) vyrobit
pro každého spoluřešitele kopii s `owner: <spoluřešitel>`,
`primaryOwner: <hlavní>`, `isCoOwnerCopy: true`. Zobrazení podle osoby
(kalendář, sloupce lidí, mobilní karty) pak funguje **bez úprav**.
`allTasks` (surová data pro Správu úkolů) zůstává bez kopií.

### Mapa míst v kódu (stav k 2026-09-21, čísla řádků se budou posouvat)

**POZOR — zhruba polovina výskytů `owner` NENÍ `task.owner`:** klíč v
rozvržení lidí (`DEFAULT_PEOPLE_LAYOUT`, `peopleLayout`, `PEOPLE_LABELS`,
`selectedPeople`, `loadPeopleLayout`) a `{owner}/{repo}` v GitHub API.
**Tyhle NEMĚNIT.**

- **A. Jádro — `ft_loader.js`:** 196 (`generateRecurring`, nechat),
  207–263 (`parseDatabase`/`expandMultiDayTasks` — místo rozpadu),
  264 (`owners` z `t.owner`), 266–270 (návratový objekt).
- **B. Zobrazení podle osoby (funguje díky kopiím, jen ověřit):**
  prehled_mobile 598–612; prehled 823–832; dashboard_mobile 738–752;
  Dashboard 1484 (`selectedPeople`), 1672–1679, 1769, **1778
  (`statPeople` — počítadlo), 1312 (`activeTaskCount` v modalu
  Řešitelé)**. Všechna počítadla nad `DATA.tasks` zkontrolovat na
  dvojí započtení kopií.
- **C. Editace/dokončení:**
  - **"Hotovo" je s kopiemi BEZPEČNÉ (ověřeno):** všechny 4 stránky
    hledají originál přes `FTLoader.findRawTaskForOccurrence(raw.tasks,
    id, plannedDate)` (`ft_loader.js:667`) — podle `id` + data, `owner`
    nečte.
  - **SKUTEČNÁ CHYBA k ošetření — mobilní úprava:**
    `tydenni_dashboard_mobile.html:913` předvyplní formulář z
    `task.owner` zobrazené kopie (= spoluřešitel), ř. 944 to zapíše jako
    `owner` do originálu → spoluřešitel by se úpravou stal hlavním
    řešitelem a původní hlavní tiše zmizí. Oprava: ř. 913 číst
    `task.primaryOwner || task.owner`. Grep všech `.owner =` v celém TOP
    potvrdil, že je to JEDINÉ přiřazení `owner` do originálu.
  - **Detail úkolu (jen zobrazení):** štítek `task.owner || "Bez
    řešitele"` ukáže u kopie spoluřešitele — opravit na hlavního +
    seznam spoluřešitelů na VŠECH 4 místech: Dashboard 1616, prehled 975,
    prehled_mobile 665, dashboard_mobile 808.
  - Zakládání/editační formuláře (přidat výběr spoluřešitelů): Dashboard
    993, 2106–2109, 2174–2256; dashboard_mobile 419, 450, 913/944,
    1030, 1068, 1211–1212; Správa 714, 1434–1446, 1514–1515, 1632–1633.
  - Desktopový Dashboard edituje přes odkaz do Správy úkolů (surová
    data) a Kanban drag&drop pracuje nad `allTasks` — obojí bezpečné.
  - Zástup (Správa 800–803, 2298–2369; Dashboard 1079–1082, 1928–1999)
    — spoluřešitele neřešit.
- **D. Správa úkolů:** filtr Řešitel 969–1002 (naplnění + localStorage —
  pozor na past z 2026-09-17, obnovení uloženého filtru až po naplnění
  selectu), 1035/1057 (samotné filtrování — musí projít i
  spoluřešitel), 1051 (fulltext), 1154–1155 a 1239–1255 (štítky
  Kanban/karta). **2487 a 2664 — mapování `owner↔assignee`, pravděpodobně
  `tasksToJson()`/`loadFromRaw()` = Nástraha č. 1: `coOwners` MUSÍ být
  přidané na obě místa, jinak se při jakémkoliv uložení smaže u všech
  úkolů.** Správa používá souběžně `assignee` i `owner` pro totéž —
  `coOwners` přidat pod jedním názvem.
- **E. Opakující se pravidla** (Správa 2086–2286, `opakovaci[].owner`)
  — mimo rozsah (rozhodnutí 3).
- **F. Ověřit zvlášť (nejsou v grepu):** auta/`auta_rezervace` a
  případné kolize podle řešitele, styl označení kopie v
  `components.css` (`.task-card`), `config.js`/`index.html` (legacy).

### Doporučený postup implementace

1. `parseDatabase()` — rozpad na kopie s `primaryOwner`/`isCoOwnerCopy`.
2. Mobilní úprava (913) + štítky detailu (4 místa) na `primaryOwner`.
3. `coOwners` do `tasksToJson()`/`loadFromRaw()` + filtr/fulltext/štítky
   ve Správě úkolů.
4. UI výběr spoluřešitelů + vizuální označení kopie, soubor po souboru
   od nejmenšího (`tydenni_prehled_mobile.html`), jako u redesignu.
5. **Regresní test na kopii živé databáze:** bez `coOwners` musí vše
   vypadat a chovat se PŘESNĚ jako dnes; s `coOwners` ověřit zobrazení,
   Hotovo, mobilní úpravu, uložení ve Správě (pole nezmizí), počítadla.

### Průběh implementace

**Krok 1 — HOTOVO lokálně (2026-09-21), NENAHRÁNO (čeká na JK):**
`ft_loader.js` → nová `expandCoOwnerCopies()` v `parseDatabase()`.
Kopie s `owner:<spoluřešitel>`, `primaryOwner:<hlavní>`,
`isCoOwnerCopy:true`; originál se nemění. Upřesnění oproti návrhu:
- Kopie **jen pro úkoly s `plannedDate`** — nenaplánované by se jinak
  zdvojovaly v Backlogu Dashboardu (`renderBacklog`, `statBacklog`).
- Kopie se vytvářejí PO `expandMultiDayTasks` (vícedenní úkol → kopie
  každého dne), `generateRecurring` dostává dál jen `expandedTasks`
  (index `id|datum` by se kopiemi stejně nezměnil).
- Obranně: duplicity, prázdné hodnoty, hlavní řešitel ve `coOwners` a
  `coOwners` jiného typu než pole se ignorují.

**Ověřeno:** Node na stroji není — test v prohlížeči (Browser pane přes
dočasný localhost server) nad **kopií živé `database.json`** (2007
úkolů, mělký klon `top-data` jen pro čtení, po testu smazán), HEAD vs.
nová verze `parseDatabase` s háčkem na zpřístupnění. 15/15 kontrol OK:
výstup na živých datech (bez `coOwners`) **bajtově identický** s HEAD
(2136 zobrazovacích úkolů, 26 owners, 178 opakujících výskytů);
umělé `coOwners` → správný počet kopií (jednodenní 2, vícedenní 3 dny ×1),
vstup nemutován, nenaplánovaný/zrušený bez kopie, `allTasks` bez kopií,
neplatný typ bez pádu. Vyváženost `{}` 198/198, `()` 574/574, `[]`
34/34, backticky 62 (beze změny).

**Bezpečné nahrát samostatně** — dokud žádný úkol nemá `coOwners`
(zatím je nejde v UI zadat), chování appky se nemění (ověřeno výše).

**Krok 2 — HOTOVO lokálně (2026-09-21), NENAHRÁNO (čeká na JK):**
- `ft_loader.js`: nová sdílená `getCoOwners(task)` (exportovaná jako
  `FTLoader.getCoOwners`) — JEDINÉ místo normalizace seznamu
  spoluřešitelů (trim, bez duplicit, bez hlavního řešitele, ne-pole =
  `[]`), hlavního bere z `primaryOwner || owner`, takže funguje pro
  originál i kopii. `expandCoOwnerCopies()` ji teď používá místo vlastní
  kopie logiky.
- Detail úkolu na všech 4 stránkách (Dashboard, Přehled, Přehled mobil,
  Dashboard mobil): štítek řešitele = `task.primaryOwner || task.owner`,
  nový štítek `👥 Spoluřešitelé: RS, LR` (jen když nějací jsou).
- `tydenni_dashboard_mobile.html` `openEditModalFromDetail()`: předvyplnění
  řešitele z `task.primaryOwner || task.owner` — oprava chyby, kdy by
  úprava z kopie přepsala hlavního řešitele spoluřešitelem.
- Dashboard `renderStats()`: `statPlanned`/`statWaiting` počítají jen
  originály (`!t.isCoOwnerCopy`), `statPeople` kopie započítává.
- Prověřeno a beze změny: `taskMatches()` (ř. 1484 — kopie projde, když je
  spoluřešitel vybraný v zobrazení, žádoucí), kolize auta (ř. 2159, `find`
  — kopie má stejné `auto`/datum, výsledek stejný), Přehledy/mobilní
  Dashboard nemají žádná počítadla úkolů.

**Ověřeno:** stejný test v prohlížeči nad čerstvou kopií živé
`database.json` (po testu smazána), 29/29 OK — všech 15 kontrol z kroku 1
znovu (regrese stále bajtově identická s HEAD), `getCoOwners` pro
originál/kopii/neplatné vstupy, hlavní řešitel pro detail a mobilní
úpravu z kopie i originálu, počítadlo bez kopií, a **syntaxe všech inline
skriptů 4 upravených stránek** (`new Function()` nad každým `<script>`,
HEAD i nová verze — náhrada za `node --check`). Vyváženost `{}` +1 pár
na stránku (nový `${...}` ve štítku), `ft_loader.js` 200/200, počet
`<script>` tagů beze změny.

**Nahrát společně:** `ft_loader.js` + 4 HTML stránky. Chování appky se
do zadání prvních `coOwners` viditelně nemění. Volání na stránkách je
jištěné `FTLoader.getCoOwners ? ... : []` — HTTP cache prohlížeče
(`max-age=600`, viz redesign 2026-09-15) může až 10 min po nahrání
servírovat novou stránku se STAROU `ft_loader.js`; bez pojistky by
otevření detailu úkolu spadlo na TypeError. `sw.js` je network-first,
online problém nedělá, `CACHE_NAME` netřeba povyšovat.

**Krok 3 — HOTOVO lokálně (2026-09-21), NENAHRÁNO (čeká na JK):**
`sprava_ukolu_linked.html` (jediný soubor):
- **Nástraha č. 1 ošetřena:** `coOwners` doplněno do `taskToRawFormat()`
  (uložení — normalizované, prázdné pole se neukládá vůbec) i do
  mapování v `loadFromRaw()` (načtení). `saveNewTaskWithRetry()` jede
  přes `taskToRawFormat()`, takže je pokryté automaticky. Úprava z
  modalu (`Object.assign` bez `coOwners`) pole zachová.
- Nové lokální `normalizeCoOwners(list, primary)` + `taskCoOwners(t)` —
  stejná pravidla jako `FTLoader.getCoOwners`, ale **záměrně vlastní
  kopie**: používá je ukládání a to nesmí spadnout, kdyby prohlížeč z
  HTTP cache podal starý `ft_loader.js`. Při uložení se tím
  automaticky odstraní i hlavní řešitel ze `coOwners` (např. když se
  hlavním řešitelem stane dosavadní spoluřešitel).
- Filtr "Řešitel" zahrnuje spoluřešitele (rozhodnutí JK), fulltext
  hledá i ve spoluřešitelích, záložní naplnění filtru (když chybí
  `resitele`) je obsahuje taky.
- Tabulka: pod hlavním řešitelem šedě `+ RS, LR`; Kanban karta:
  `JK + RS, LR`.
- Záměrně beze změny: zástup (ř. ~2353, nový úkol bez spoluřešitelů),
  opakující se pravidla.

**Ověřeno:** test v prohlížeči nad čerstvou kopií živé `database.json`
(po testu smazána), skutečné funkce vytažené přímo ze zdrojáku HEAD i
nové verze. 15/15 OK: **plný cyklus načtení → uložení živých dat (2007
úkolů) bajtově shodný s HEAD**, žádný úkol nezískal `coOwners`,
`taskIdentityKey` (párování `rowIndex`) beze změny; s `coOwners` přežijí
uložení (vyčištěné), druhý cyklus idempotentní, úprava z modalu je
zachová, změna hlavního na spoluřešitele ho ze seznamu vyřadí, prázdné
pole se neuloží; filtr (hlavní ✓ / spoluřešitel ✓ / jiný ✗ / Všichni ✓);
kontrolní test potvrdil, že STARÁ verze pole při uložení opravdu ztrácí
(test tedy Nástrahu č. 1 skutečně chytá). Syntaxe obou inline skriptů OK,
`{}` 646/646, `()` 1754/1754, `<script>` beze změny, bez BOM.

**Krok 4 — HOTOVO lokálně (2026-09-21), NENAHRÁNO (čeká na JK):**
funkce je tímhle poprvé dostupná uživatelům.
- `ft_loader.js`: 3 nové sdílené funkce — `renderCoOwnerPicker(container,
  {resitele, selected, primary, locked})` (zaškrtávací seznam: bez
  hlavního řešitele, bez vyřazených; už vybraný vyřazený/neznámý zůstane
  zaškrtnutý s poznámkou, ať úprava nic tiše nesmaže; `locked` = úkol ze
  SPA syncu → jen text), `readCoOwnerPicker(container)` (vrací `null`,
  když picker neběží/je zamčený → volající `coOwners` NEMĚNÍ),
  `getCoOwnerLabel(task)` (`"s JK"` u kopie, `"+ RS, LR"` u originálu).
- Formuláře: Správa úkolů (modal, nový i úprava; SPA úkoly zamčené),
  Dashboard (nový úkol), mobilní Dashboard (nový úkol i úprava). Při
  změně hlavního řešitele se picker překreslí a nového hlavního vyřadí.
  Všechna volání jištěná pro starou `ft_loader.js` z HTTP cache.
- Kalendář: Dashboard + Přehled desktop — `.shared-badge` (`👥 s JK` /
  `👥 + RS, LR`), kopie navíc `outline: 1px dashed` (ZÁMĚRNĚ `outline`,
  ne `border-color` — nesmí se prát s barevným levým okrajem priority
  `.task.px` / `html.dark .task.p*`). Oba mobilní pohledy — `.meta-tag`
  s novou liniovou ikonou `ICON_USERS` v řádku štítků.

**Ověřeno — poprvé na SKUTEČNÝCH stránkách:** všech 5 stránek spuštěno v
prohlížeči s **mockem GitHub API** (`mock_github.js` vložený před
`ft_loader.js`: podvrhne `users.json` s hashem testovacího tokenu, role
planovac; `database.json` = kopie živé DB s uměle doplněnými `coOwners`;
PUT se zachytí místo zápisu na GitHub — **žádný síťový požadavek na
GitHub, žádný skutečný token**). Otestováno: Dashboard — štítky, kopie
s čárkovaným okrajem, nový úkol se spoluřešitelem uložen a po reloadu
zobrazen u obou lidí; Správa — picker předvyplněný, hlavní se nenabízí,
změna se uloží, **uložení ÚPLNĚ JINÉHO úkolu `coOwners` ostatních úkolů
zachová (živý test Nástrahy č. 1)**, filtr Řešitel se spoluřešitelem,
SPA úkol zamčený; mobilní Dashboard — úprava otevřená z KOPIE u
spoluřešitele uložila hlavního beze změny (oprava z kroku 2 potvrzena),
nový úkol z mobilu se spoluřešitelem; oba Přehledy — štítky + detail.
Žádné JS chyby v konzoli (jediná hláška = registrace service workeru na
dočasném testovacím serveru, `sw.js` beze změny). Vizuálně zkontrolováno
screenshoty (desktop Dashboard, modal Správy, mobilní Dashboard, tmavý
režim). Statika: `{}`/`()` vyvážené, `/* */` +1 pár = nový komentář,
`<script>` beze změny, CRLF zachováno, bez BOM. Po testu smazána kopie
dat i `localStorage`/`sessionStorage`/cache testovacího originu.

**Poučení k mocku (znovupoužitelné):** po `saveToGitHub()` stránka
nepřekreslí nová data sama — `fetchFromGitHub()` končí na `sha ===
_lastSha`. Mock proto drží svou DB v `sessionStorage` a test po uložení
stránku znovu načte. Neověřeno, jak se to chová proti skutečnému GitHubu
(tam hraje roli i cache API odpovědí) — beze změny, jen poznamenáno.

**Pořadí nahrání:** `sprava_ukolu_linked.html` ideálně **spolu s kroky
1–2 nebo před zadáním prvních `coOwners`** — jakmile nějaký úkol
`coOwners` má, stará Správa úkolů by je při prvním uložení čehokoliv
smazala u všech úkolů. Samostatně je bezpečná kdykoliv (na datech bez
`coOwners` se nic nemění).

Zapsáno i do `Esperanto/INTEGRACE.md` (Konvence č. 7 — dotýká se
`*SPA` úkolů).

## ✅ Firemní redesign TOP (2026-09-15, HOTOVO — TOP strana; SPA nerozhodnuto)

**Cíl:** JK poskytl skutečné firemní podklady (logo, barevný manuál, odkaz
na firemní web pro "feeling") — navazuje na dokončené sjednocení palety
níže, ale jde o VĚTŠÍ zásah: nejen barvy, ale i typografie, tvar
komponent (karty úkolů, tlačítka) a "chrome" panel (sidebar/topbar),
aby TOP i SPA vypadaly jako firemní appka Filtration Technology, ne
jen jako appka s jednotnou, ale obecnou paletou.

**Postup (schválen JK):** nejdřív čistě teoretická diskuze (nástroj,
podklady), pak **statický mockup** (Artifact, 2026-09-15 — mobilní
přehled + desktopový dashboard, přepínatelný světlý/tmavý režim) — JK
schválil ("ano, sedí to"). Až PAK přišla otázka na architekturu: JK
očekával, že výměna `theme.css` změní vzhled VŠUDE, stejně jako u
barev — upozorněno, že tvar komponent (ne jen barva) potřebuje sdílené
CSS TŘÍDY, ne jen proměnné, což `theme.css` sám o sobě neřeší (viz
jeho vlastní pravidlo "jen proměnné" v hlavičce). JK odsouhlasil
důkladné řešení: nový sesterský soubor **`components.css`**.

**Zjištěno/rozhodnuto (2026-09-15):**
- Firemní barvy z `S:\...\LOGO\manual-2020.pdf` a `novelogo_filtration.pdf`:
  oranžová Pantone 1655 U (CMYK 0/65/92/0, ≈ `#FF5914`), šedá Cool Gray 10
  (CMYK 0/0/0/70, ≈ `#4D4D4D`). Font v manuálu (Galano Classic, Tw Cen MT)
  je placený/bez webové licence — JK odsouhlasil volnou náhradu **Jost**
  (nadpisy) + **Work Sans** (text).
- `www.filtration.cz` feeling: hodně bílé plochy, ploché tlačítko/karty,
  jemné zaoblení, liniové ikony, oranžová jen jako akcent — ne plošně.
- **Barvy priorit/stavů (`--prio-*`, `--tile-*`, `--warn-block`,
  `--success-block`) zůstávají BEZE ZMĚNY hodnot** (JK rozhodnutí) — mění
  se jen jejich TVAR (pruh + štítek místo plné plochy u kartového
  zobrazení). Nižší riziko nové kolize než přebírání přesných odstínů
  z mockupu.
- `--accent` (modrá) zůstává BEZE ZMĚNY — má vlastní sémantiku
  (`--prio-p2-text`, `--auto-pouzivane`), nesmí se zaměnit za novou
  `--brand-accent` (oranžová, jen CTA/akcent).
- `theme.css` povýšen na **v1.4.0** — nová `--brand-accent`/
  `--brand-accent-ink`, přebarvené `--navy-*` (teplá antracitová místo
  námořnické modré, invariantní jako dřív), doladěné `--text-on-navy-*`,
  nové invariantní `--chrome-border`/`--chrome-muted`/`--chrome-input-bg`/
  `--chrome-hover` (zavírají mezeru natvrdo zapsaných chrome hodnot
  popsanou u minulého zapojování — teď mají tokenový domov), nové
  `--font-heading`/`--font-body`, nové `--radius-sm`/`--radius-xs`.
  Plný detail viz hlavička `theme.css` v1.4.0.
- Nový soubor **`components.css` v1.0.0** — sdílené CSS třídy
  (`.btn`/`.btn-primary`/`.btn-secondary`, `.icon-btn`, `.task-card` +
  `.priority-tag`, `.person-block`/`.person-head`/`.avatar`), použité
  na schváleném mockupu. Musí se načíst PO `theme.css`. Husté kalendářní
  mřížky Dashboardu/Přehledu desktop (plná barevná plocha buňky)
  `components.css` NENAHRAZUJE — jiný účel, zůstávají svým vlastním
  pravidlem v každé stránce.
- **Ověřeno staticky** (vyváženost `/* */` v `theme.css` 103/103,
  vyváženost `{ }` v `components.css` 34/34, strojová kontrola že
  každý `var(--x)` v `components.css` je deklarovaný v `theme.css`) i
  **živě na GitHub Pages** po nahrání JK (2026-09-15): oba soubory se
  rozparsovaly bez chyby (35 CSS pravidel, žádné opakování bugu s
  uříznutým komentářem), `--brand-accent` dává přesně `#FF5914`,
  `--navy-800` přesně `#262421`, font `.btn-primary` je skutečně
  `Jost`, `.icon-btn`/`.task-card` mají nové menší zaoblení
  (4px/8px), a barva priority P0 (`#fff1f2`/`#be123c`) je beze změny
  — přesně jak bylo rozhodnuto.

### `tydenni_prehled_mobile.html` zapojen na `components.css` + fonty (2026-09-15, 1. ze 5 souborů)

Stejný pořadí jako u sjednocení palety — začal nejmenším souborem.
Provedeno:
- Přidán Google Fonts odkaz (Jost + Work Sans) a `<link
  rel="stylesheet" href="components.css">` PO `theme.css`.
- `body`/`.topbar h1`/`.day-label .day-name` přepnuty na
  `var(--font-body)`/`var(--font-heading)`.
- `.today-btn` přepnuto z `var(--accent)` (modrá) na `var(--brand-accent)`
  (nová firemní oranžová) — jediný skutečný CTA prvek na týhle stránce.
- Lokální CSS pro `.person-block`/`.person-head`/`.person-tasks`/`.task`
  (a jeho `.p0`–`.px`/`.waiting`/`.done`/`.recurring-icon`/
  `.multiday-badge`/`.spz`) smazáno — teď to všechno dodává
  `components.css`. `#content` dostalo `display:flex;flex-direction:
  column;gap:12px` náhradou za zrušené `.person-block{margin-bottom}`.
- Zastaralé `html.dark .person-block`/`.person-head` přepisy smazány
  (nová verze bere barvu z `--panel`/`--line-soft`, které mají tmavou
  varintu už v `theme.css`, žádný extra přepis netřeba).
- JS (`cardClass()`, `renderMobileDay()`): třída `task` → `task-card`,
  nová funkce `statusTag()` (jeden štítek v tag-row — "Hotovo"/"Čeká"/
  "P0"–"P3", stejná priorita jako CSS kaskáda pro barvu pruhu), emoji
  (🔁📅🚗) nahrazena liniovými SVG ikonami (`ICON_RECUR`/`ICON_CALENDAR`/
  `ICON_CAR`) uvnitř `.meta-tag`. Blok osoby dostal `.avatar` (iniciály
  = zkratka řešitele) + `.person-name`/`.person-code` místo starého
  `.code`/`.name` na tmavém pruhu.
- **Genuinní mezera nalezená při zapojování** (stejný vzorec jako u
  `theme.css` v minulé fázi): mockup nepočítal s malými ikona+text
  štítky pro "opakující se"/"vícedenní"/SPZ — doplněna nová třída
  `.meta-tag` do `components.css` (v1.0.1).
- `.icon-btn` v hlavičce záměrně NEPŘEVEDENO na verzi z `components.css`
  (32×32px) — ponechána lokální 42×42px verze kvůli dotykovému cíli na
  mobilu (accessibility minimum), `components.css` verze je menší,
  vhodná spíš pro desktop dashboard. Lokální `<style>` se načítá PO
  `components.css`, takže má přednost automaticky, není potřeba nic
  navíc řešit.

**Ověřeno:** vyváženost `{ }` v `<style>` (47/47) i `<script>` (162/162)
blocích zvlášť, počet `<script>` tagů beze změny (2), strojová kontrola
že žádná použitá CSS třída (`task-card`, `priority-tag.*`, `meta-tag`,
`person-block`/`person-head`/`avatar`/`person-name`/`person-code`/
`person-tasks`) nechybí v `components.css`.

**Nahrávání — poučení k zapsání:** JK při prvním pokusu omylem nahrál
jen `components.css`, `tydenni_prehled_mobile.html` zůstal na GitHubu
starý — odhaleno standardní `git fetch` + `diff` kontrolou (ne věřením
"nahráno"), přesně podle zavedené disciplíny. Po opravě ověřeno
bajt-po-bajtu shodné. **Živé ověření na GitHub Pages** (2026-09-15):
`getComputedStyle` potvrdil `--font-body`/`--font-heading` skutečně
aplikované (Work Sans/Jost), `.today-btn` má `--brand-accent`
(`rgb(255, 89, 20)`) a nový `--radius-sm` (8px). **Past nalezená
cestou:** první test v prohlížeči ukázal starý vzhled i PO opravě
uploadu — způsobeno HTTP cache prohlížeče (`max-age=600`), ne chybou
nasazení; potvrzeno `fetch(..., {cache:"no-store"})` a znovunačtením
s cache-bustovaným URL parametrem, oboje ukázalo správný, nový obsah.
Skutečná data úkolů (karty osob/úkolů) nešlo ověřit vizuálně bez
GitHub tokenu (appka správně vyžaduje přihlášení) — token se nezadává
(bezpečnostní pravidlo), tenhle konkrétní vizuální detail tedy ověří
JK sám v appce.

Zbývají 4 soubory: `tydenni_dashboard_mobile.html`,
`sprava_ukolu_linked.html`,
`tydenni_dashboard_live_reload_local_linked.html`, `tydenni_prehled.html`
(desktopový dashboard/přehled dostanou při zapojování jinou léčbu —
husté kalendářní mřížky zůstávají beze změny tvaru, viz mockup a
poznámka v `components.css`).

### `tydenni_dashboard_mobile.html` zapojen na `components.css` + fonty (2026-09-15, 2. ze 5 souborů)

Stejná metodika jako u prvního souboru. Navíc oproti přehledu:
- `.fab-add` (plovoucí tlačítko nového úkolu) a `.mform-save-btn`
  (uložit v editačním/novém formuláři) přepnuty z `var(--accent)` na
  `var(--brand-accent)` — stejná logika jako `.today-btn`, jsou to
  skutečné primární CTA prvky téhle obrazovky. `.fab-add:active` teď
  používá `color-mix(in srgb, var(--brand-accent) 85%, black)` místo
  starého `var(--accent-hover)` — čistší než vymýšlet nový tmavší
  token jen pro jeden stav. `html.dark .fab-add` přepis smazán
  (`--brand-accent` je invariantní, nepotřebuje zvlášť tmavou verzi).
- `.person-row .side-btn.active-L` (přepínač strany L/P v Nastavení
  zobrazení) záměrně ZŮSTAL na `var(--accent)` (modrá) — je to stav
  výběru, ne CTA, stejné rozlišení jako u předchozího souboru.
- Tlačítka v detailu úkolu (`#modalDoneBtn`/`#modalEditBtn`/
  `#modalCancelBtn`) záměrně NEPŘEVEDENA na `.btn`/`components.css` —
  už správně používají `--accent-block-*`/`--danger-block-*` tokeny
  (beze změny hodnot), jen by získala jiný tvar/font, což nebylo cílem
  týhle konkrétní úpravy.
- **Retroaktivní oprava nalezená při tomhle souboru:** tlačítka/inputy
  nedědí font z `body` automaticky (UA výchozí chování) — bez
  `button, input, select, textarea { font-family: inherit; }` by
  zůstala na systémovém fontu i po zapojení Work Sans/Jost. Přidáno
  sem I doplněno zpětně do `tydenni_prehled_mobile.html` (1. soubor),
  který měl stejnou mezeru.

**Ověřeno:** vyváženost `{ }` v `<style>` (60/60) a `<script>`
(233/233) blocích zvlášť, počet `<script>` tagů beze změny (2), žádné
zbylé odkazy na staré třídy (`recurring-icon`/`multiday-badge`/`.spz`/
`querySelectorAll(".task")`). **Živě ověřeno na GitHub Pages**
(2026-09-15, cache-bustovaný URL rovnou napoprvé — poučení z minula
aplikováno): `--brand-accent` na `.today-btn` i `.fab-add`
(`rgb(255, 89, 20)`), font `Jost`/`Work Sans` aplikovaný, `theme.css`
2 pravidla / `components.css` 35 pravidel — obojí bez chyby parsování.
Zpětně opravený `tydenni_prehled_mobile.html` (font reset na
tlačítkách) ověřen zároveň, beze změny předchozích hodnot.

### `sprava_ukolu_linked.html` zapojen na `components.css` + fonty (2026-09-15, 3. ze 5 souborů)

Tenhle soubor je administrativní (tabulky, Kanban, formuláře) — žádné
kartové zobrazení jako u mobilních souborů, takže `.task-card`/
`.person-block` z `components.css` se sem NEAPLIKUJÍ (nemá to smysl,
stejná logika jako u hustých kalendářních mřížek desktopu). Rozsah
téhle úpravy byl proto užší, cíleně jen na:
- Font: `body { font-family:Inter,Segoe UI,Arial,sans-serif }` →
  `var(--font-body)`. Doplněn stejný `font-family:inherit` reset pro
  `button`/`.file-label`/inputy jako v mobilních souborech (stejná
  mezera, nalezená znovu).
- `.title-wrap h1`/`.panel-head h2` → `var(--font-heading)`.
- **`.primary`** (jediná hlavní CTA třída na stránce — "Uložit změny",
  "+ Přidat", "+ Přidat pravidlo", "Uložit" u zástupu, všechny ji už
  měly nastavenou) → `var(--brand-accent)`/`var(--brand-accent-ink)`.
  Díky tomu, že všechna tahle tlačítka sdílela jednu třídu, stačila
  JEDNA úprava a projevilo se to všude — přesně ten efekt, který JK
  chtěl od `theme.css` už dřív, teď funguje i pro tvar/barvu tlačítek.
- **Záměrně NEZMĚNĚNO** (zůstává `var(--accent)`, modrá): `.tab-btn.active`
  (výběr záložky, ne CTA — stejné rozlišení jako `side-btn.active-L`
  v mobilních souborech), `.fab-nav` (navigační odkaz na Dashboard/SPA,
  ne akce), `.pill` (dekorativní štítek "ALLDATBASE"), tlačítko "Zástup"
  a "Obnovit" u vozidla (sekundární administrativní akce, ne hlavní CTA
  stránky), debug panel (`#7c3aed`, zdokumentovaná výjimka z dřívějška).

**Ověřeno staticky před uploadem:** vyváženost `{ }` v celém souboru
(631/631), počet `<script>` tagů beze změny (4), žádný nový výskyt
rizikového `-*/` vzoru.

**Genuinní mezera nalezená AŽ při živém testu po uploadu:** `html.dark
.primary { background: var(--accent-strong); ... }` — samostatný
tmavý přepis, mimo hlavní `.primary` pravidlo, který jsem při prvním
průchodu přehlédl (grep hledal jen `.primary{`/`class="primary`, ne
`html.dark .primary`). Výsledek: v tmavém režimu bylo tlačítko
"Uložit"/"+ Přidat" pořád modré, ne oranžové. Odhaleno probe-elementem
(`document.createElement('button'); .className='primary'`) přímo na
živém webu s aktivním tmavým režimem — přesně proto se živé ověření
`getComputedStyle` dělá i po každém uploadu, ne jen statická kontrola
před ním. **Opraveno:** přepis smazán (`--brand-accent` je
invariantní jako `--accent-block-*`, žádnou zvláštní tmavou hodnotu
nepotřebuje). Vyváženost po opravě 630/630 (zpátky na původní počet).
**Opravená verze nahraná a živě ověřená** (2026-09-15) — probe test
potvrdil `--brand-accent` (`rgb(255, 89, 20)`) v OBOU režimech
(`html.classList.add('dark')` i bez). První pokus po nahrání ještě
ukázal starou modrou v tmavém režimu, ale `fetch(...,{cache:"no-store"})`
potvrdil, že server už měl opravený obsah — šlo o krátké zpoždění
šíření přes GitHub Pages CDN, ne o chybu; okamžité opakování ukázalo
správný výsledek v obou režimech.

### `tydenni_dashboard_live_reload_local_linked.html` zapojen na `components.css` + fonty (2026-09-15, 4. ze 5 souborů)

Hlavní pracovní obrazovka — sidebar + husté kalendářní mřížky (beze
změny tvaru, jak bylo plánováno). Rozsah stejný typ jako Správa úkolů
(font + skutečné CTA na `--brand-accent`), ale navíc konečně dořešeny
natvrdo zapsané "chrome" barvy pomocí nových tokenů z `theme.css`
v1.4.0:

- `#334155`→`--chrome-border`, `#64748b`→`--chrome-muted`,
  `#0b1222`→`--chrome-input-bg`, `#e2e8f0`→`--chrome-legend` (nové
  invariantní tokeny) — ale **jen v opravdovém sidebar/chrome
  kontextu** (`.move-btn`/`.hide-btn`, popisky v `.control-card`).
- `#475569`/`#94a3b8` v sidebaru → existující `--border-on-navy`/
  `--text-on-navy-muted` (teď teplé) — tohle byly ve skutečnosti
  UŽ DŘÍV zapomenuté převody na existující tokeny, ne nová mezera.
- **Genuinní nález cestou:** stejné hex hodnoty (`#334155`/`#e2e8f0`/
  `#475569`/`#94a3b8`/`#64748b`) se používaly i uvnitř modalu "Řešitelé"
  (`buildResiteleList()`, JS `rowStyle`/`nameStyle`/`btnStyle`) — ale
  TAM je to světlý panel (`--panel`), ne trvale tmavý sidebar chrome.
  Použití invariantních `--chrome-*` tokenů by tam bylo ŠPATNĚ (modal
  by v tmavém režimu zůstal napořád stejný, místo aby se přepnul).
  Opraveno na adaptivní tokeny (`--line-soft`, `--text`, `--line-medium`,
  `--text-muted`, `--text-faint`), ne na nové invariantní — přesně ta
  past, na kterou upozorňuje poučení u Dashboardu z minulé fáze
  (stejný hex, jiný kontext, jiný správný token).
- `.primary`/`#todayBtn`/`.add-task-btn:hover` → `--brand-accent`.
  Bare `button{}` (obecný styl, používá ho i needeklarované "Zavřít"
  v modalech) záměrně beze změny, ať se needeklarovaná tlačítka
  needěláně nezabarví — stejné rozlišení jako `.primary`-vs-bare-button
  ve Správě úkolů.
- **2 mezery ve specificitě nalezené a opravené PŘED nahráním (ne až
  živým testem, poučeno ze Správy úkolů):** `html.dark button, html.dark
  select, html.dark input {...}` (2 elementy + 1 třída) má vyšší
  specificitu než samotné `.primary` (1 třída) — potichu by přebilo
  oranžovou zpátky na `--navy-700` v tmavém režimu. Stejně
  `html.dark .add-task-btn {...}` (resting stav, 2 třídy+1 element) má
  vyšší specificitu než `.add-task-btn:hover` (2 třídy) — potichu by
  přebilo oranžový hover. Oba doplněny explicitním `html.dark .primary,
  html.dark #todayBtn {...}` a `html.dark .add-task-btn:hover {...}`.

**Ověřeno:** vyváženost `{ }` v `<style>` (237/237) i v celém souboru
(607/607, dřív 604/604 — +3 páry odpovídají přesně 3 novým pravidlům),
počet `<script>` tagů beze změny (4), žádný nový výskyt rizikového
`-*/` vzoru. **Nahráno a živě ověřeno v obou režimech** (2026-09-15) — probe test
potvrdil `--brand-accent` (`rgb(255, 89, 20)`) na `.primary`/`#todayBtn`
SHODNĚ ve světlém i tmavém režimu (obě specificitní opravy fungují),
font Work Sans/Jost aplikovaný. (První test po nahrání ještě ukázal
starý vzhled — opět jen zpoždění šíření přes GitHub Pages CDN,
okamžité opakování ukázalo správný výsledek — stejný vzorec jako u
předchozích dvou souborů.)

### `tydenni_prehled.html` zapojen na `components.css` + fonty (2026-09-15, 5. z 5, HOTOVO — celý TOP zapojen)

Poslední soubor — nejmenší/nejčistší ze všech (čistě read-only
nahlížecí obrazovka). Kontrola obou pastí z minulého souboru s
výsledkem "beze změny potřeba":
- **Světlé modaly** (`#displaySettingsModal`, person-row) už při
  minulém sjednocení palety správně používaly ADAPTIVNÍ tokeny
  (`var(--line-medium)`, `var(--text-muted)`, `var(--border-on-navy)`
  v `html.dark` přepisu) — žádná chrome-vs-modal past tady není,
  poučení z Dashboardu bylo tentokrát aplikované od začátku správně.
- **Specificita:** `.topbar button.primary` má už tak dost vysokou
  specificitu (2 třídy), aby přebilo `html.dark button` (1 třída + 2
  elementy) — žádný extra `html.dark .primary` přepis netřeba.
- **Genuinní zjištění:** `.primary` je v tomhle souboru MRTVÝ kód —
  žádný prvek v markupu tuhle třídu nepoužívá (`#todayBtn`/"Dnes" tu
  nemá žádnou zvýrazněnou CTA podobu, na rozdíl od mobilních souborů
  — vědomý rozdíl, tahle stránka je čistě read-only nahlížení, ne
  "founding" akce). Aktualizoval jsem barvu na `--brand-accent`
  stejně jako sourozenecké soubory, pro budoucí konzistenci, i když
  se teď nikde nevykreslí — bezriziková změna.
- Chrome literály (`#334155`→`--chrome-border`, `#64748b`→
  `--chrome-muted`) v topbaru — teď měly kam se převést díky novým
  tokenům z `theme.css` v1.4.0 (dřív explicitně zdokumentované jako
  "nemají invariantní ekvivalent", teď mají).

**Ověřeno:** vyváženost `{ }` v celém souboru (548/548, dřív 547/547 —
+1 pár odpovídá jedné nové `font-family:inherit` deklaraci), počet
`<script>` tagů beze změny (4), žádný nový výskyt rizikového `-*/`
vzoru. **Nahráno a živě ověřeno** (2026-09-15) — font Work Sans/Jost aplikovaný,
`theme.css`/`components.css` bez chyby parsování. Napoprvé bez CDN
zpoždění, na rozdíl od předchozích 3 souborů.

**Tímhle je fáze "zapojit firemní redesign (theme.css v1.4.0 +
components.css) do TOP" u všech 5 hlavních souborů KOMPLETNÍ.**
Zbývá jen: analogicky zvážit/nabídnout stejný redesign na SPA straně
(zatím žádné rozhodnutí), a případné doladění detailů podle zpětné
vazby JK po vyzkoušení v praxi.

### Vizuální kontrola živé appky (2026-09-15) — nález mimo 5 souborů

JK požádal o vizuální kontrolu přímo v appce, ne jen `getComputedStyle`
testy. Screenshoty (mobilní i "desktop" — Browser nástroj měl tentokrát
jen úzký viewport, takže sidebar+mřížka vedle sebe nešly ověřit,
jen svisle poskládané) na všech otestovaných stránkách ukázaly chrome/
topbar/tlačítka vizuálně v pořádku (teplá antracitová, oranžové CTA,
Jost nadpisy).

**Skutečný nález:** přihlašovací dialog na GitHub token
(`showTokenDialog()` v **`ft_loader.js`** — sdílený mezi VŠEMI 5
soubory, mimo rozsah dosavadní úpravy) měl pořád natvrdo zapsanou
starou modrou (`#1d4ed8`) na tlačítku "Uložit a pokračovat" a obecný
`font-family:sans-serif`, ne Work Sans/Jost. Je to úplně první
obrazovka, kterou vidí kdokoliv bez uloženého tokenu — vizuálně
nejnápadnější zbylá nekonzistence. **Opraveno:** `background:var(--brand-accent,
#1d4ed8)` / `color:var(--brand-accent-ink, white)` / `font-family:
var(--font-heading, sans-serif)` na tlačítku, `font-family:var(--font-body,
sans-serif)` na kartě dialogu, `font-family:inherit` na obou inputech.
Fallback hodnoty (druhý argument `var()`) zachovávají původní vzhled,
kdyby se dialog někdy zobrazil bez načteného `theme.css` (nemělo by
nastat, ale bezriziková pojistka).

Zbytek dialogu (bílé pozadí, `#6b7280`/`#d1d5db`/`#9ca3af` texty/okraje)
záměrně NEZMĚNĚN — dialog nikdy nepodporoval tmavý režim (vždy bílý),
to nebylo součástí zadání a nemá smysl měnit jen barvu textu bez
řešení pozadí zvlášť.

**Ověřeno:** vyváženost `{ }`/`( )` v celém `ft_loader.js` beze změny
(184/184, 509/509). **Nahráno a živě ověřeno** (2026-09-15) — tlačítko
"Uložit a pokračovat" má `rgb(255, 89, 20)`/`Jost`, napoprvé bez CDN
zpoždění.

**Limit vizuální kontroly, na který JK narazí sám:** appka vyžaduje
GitHub token pro zobrazení skutečných dat (karty úkolů, mřížka
Dashboardu) — token nezadávám (bezpečnostní pravidlo, credentials se
nikdy nezadávají za uživatele). Skutečný vzhled kartiček úkolů a
husté mřížky tedy zatím ověřil jen JK sám při běžném používání, ne
já vizuálně na živých datech.

**Zatím NEPROVEDENO (další krok):**
1. Žádný povinný — čekat na JK, jestli chce ještě něco doladit, nebo
   jestli se má nabídnout stejný redesign SPA straně.
2. Převést natvrdo zapsané "chrome" hex hodnoty (`#334155`, `#64748b`,
   `#0b1222`...) na nové `--chrome-*` tokeny — přesné namapování se
   dořeší až při zapojování KAŽDÉHO souboru, kde se vyskytují (zatím
   se v `tydenni_prehled_mobile.html` žádné takové nenašly).
3. Rozhodnout, jestli/kdy se SPA k `components.css` připojí — zatím
   TOP-only, žádné rozhodnutí zapsáno.
4. Zapsat i do `INTEGRACE.md` (Konvence č. 7) — provedeno souběžně s
   tímhle zápisem.

## ✅ Sjednocení barevné palety a designu TOP (2026-09-08 → 2026-09-15, HOTOVO)

**Dokončený úkol: sjednocení barevné palety a designu TOP (a analogicky SPA).**
JK chtěl, aby vizuální design TOP a SPA odpovídal jednotné (později firemní)
identitě — tenhle úkol je teď HOTOVÝ na straně TOP (všech 5 souborů
zapojeno na sdílený `theme.css`). Sekce zůstává nahoře jako kontext a
historie rozhodnutí pro budoucí práci na designu (např. až přijdou
skutečné firemní barvy) — podrobnosti viz "CO DĚLAT DÁL" níže a
changelog 2026-09-08 až 2026-09-15.

### Kontext a cíl

JK má firemní vizuální identitu (logo, barvy) k dispozici, ale **zatím ji
neposkytl** — rozhodnuto postupovat ve dvou fázích: (1) TEĎ sjednotit
STRUKTURU (jeden sdílený soubor s pojmenovanými proměnnými, žádná barva
napsaná napřímo v kódu) se SOUČASNÝMI barvami, (2) AŽ PŘIJDOU firemní
podklady, upraví se jen HODNOTY v jednom souboru, projeví se to všude
automaticky.

Klíčový požadavek JK, doslova: chce, aby **výměna jednoho souboru změnila
vzhled CELÉ appky včetně světlého i tmavého režimu** — ne jen pár základních
proměnných. To znamenalo převést KAŽDOU barvu v kódu (ne jen ~15 hlavních),
což vedlo k mnohem většímu rozsahu práce, než se původně čekalo.

### Co je hotové

1. **Kompletní audit 126 unikátních barev** napříč všemi 5 hlavními
   soubory TOP (Dashboard, Přehled desktop+mobil, Správa úkolů, Dashboard
   mobil) — extrahováno z `<style>` bloků I inline `style="..."` atributů.
2. **23 potvrzených konfliktů** — místa, kde STEJNÝ CSS vzor (stejný
   selektor + vlastnost) má RŮZNOU barvu v různých souborech. Vyřešeno
   podle většinového použití.
3. **Návrh `theme.css`** se všemi 126 barvami pojmenovanými a
   organizovanými do kategorií.
4. **Zadání předáno SPA straně** (Claude Code) přes `INTEGRACE.md`
   sekci 12 — aby prošli analogický proces ve vlastním kódu, se stejnou
   metodikou.
5. **SPA strana zareagovala 2026-09-11** — vzala TOP návrh v1.0.0 beze
   změny, doplnila vlastní sekci (barvy typů absence ŘD/PN/LÉKAŘ/VOLNO
   jako vlastní proměnné + 4 SPA-specifické tokeny), uložila jako
   kombinovanou v1.1.0.
6. **JK potvrdil/rozhodl všech 8 otevřených bodů** (5 TOP + 3 SPA) —
   viz Changelog 2026-09-11 níže pro kompletní seznam rozhodnutí. Dvě
   skutečné změny hodnot: sloučeny tři odstíny zelené do `--success`,
   sloučeno tlačítko `.danger` Správy úkolů do standardní
   `--danger-soft-alt`/`--danger-soft-border`.
7. **`theme.css` verze 1.2.0 nahráno do `Asbeel13/Esperanto` jako
   KANONICKÁ verze** (2026-09-11) — soubor `theme.css` v tomhle
   repozitáři (`TOP/theme.css`) je jeho lokální kopie, ověřená bajt po
   bajtu identická. **Zatím NENÍ zapojený do žádného souboru appky** —
   ani `<link>`, ani `sw.js`, ani nahrazené hex barvy. Plný obsah
   souboru (včetně historie rozhodnutí v hlavičce/patičce) je přímo v
   `theme.css`, nekopíruje se sem znovu.

### Důležité metodické poučení (2 chyby, které jsem udělal a opravil — NEOPAKUJ JE)

1. **Shlukování barev podle RGB podobnosti NEFUNGUJE** — mísí barvy s
   úplně jiným sémantickým významem jen proto, že jsou vizuálně blízké
   (např. barvu textu s pozadím úspěšného badge). Správný postup: hledat
   STEJNÝ CSS vzor (selektor+vlastnost) napříč soubory, ne podobnost barev.
2. **Při řešení konfliktu počítej většinu V RÁMCI TOHOTO KONKRÉTNÍHO
   KONFLIKTU, ne globální frekvenci barvy napříč celým kódem.** JK sám
   odhalil tenhle bug u bodu `.person-row .person-name` — globálně častá
   barva (`#e2e8f0`, 48× v celém kódu, ale v jiných nesouvisejících
   kontextech) vyhrávala i tam, kde v DANÉM konfliktu byla v menšině
   (1 soubor) oproti `#17324d` (3 soubory). Po opravě started proces dal
   správný výsledek automaticky.

### Vedlejší nálezy cestou

- Falešná pozitiva v regex extrakci: `#039` byl ve skutečnosti kus HTML
  entity `&#039;` (apostrof), ne barva — vyřazeno.
- 2 barvy použité JEN ve vývojářských debug nástrojích (`debugBtn`,
  debug panel ve Správě úkolů) — `#7c3aed`, `#f5f5f5` — navrženo vynechat
  z designového systému, nejsou součástí uživatelského UI.
- **3 mrtvé CSS proměnné** v Dashboardu — `--green` (#9acd5a),
  `--green-strong` (#8bc34a), `--yellow` (#f4ef49) — deklarované v
  `:root`, nikde v kódu nepoužité. Stojí za smazání ze zdrojového kódu
  při příští úpravě, ne jen vynechání z theme.css.
- **Tmavý režim byl nekonzistentní napříč soubory** — Dashboard/Přehled
  desktop/Správa úkolů měly jen `html.dark { color-scheme: dark; }` (jen
  nápověda pro nativní prvky prohlížeče) s roztroušenými pevnými
  přepisy pro každou komponentu zvlášť; Přehled mobil/Dashboard mobil
  místo toho přepisovaly `--bg` přímo v `html.dark {}`. Sjednoceno v
  novém `theme.css` přes centrální `html.dark {}` blok.
- **Priorita badžů byla vizuálně odlišná** — Dashboard/Přehled používaly
  syté barevné bloky (pro vyplnění buněk kalendáře), Správa úkolů
  pastelové badže s tmavým textem. **Rozhodnuto (JK): pastelový styl
  Správy úkolů se stane standardem VŠUDE pro badže/chipy** — syté bloky
  ale ZŮSTÁVAJÍ beze změny pro vyplnění kalendářních dlaždic (jiný účel,
  nebylo předmětem sjednocení).

### CO DĚLAT DÁL

**Sjednocení barevné palety TOP je HOTOVÉ (2026-09-08 → 2026-09-15).**
Obě fáze dokončeny: "sjednotit strukturu" (`theme.css` — jeden sdílený
soubor proměnných, kanonicky v `Asbeel13/Esperanto`) i "skutečně to
zapojit" (všech 5 HTML souborů TOP přepojeno na `theme.css`, žádná
barva napevno v kódu kromě pár zdokumentovaných výjimek — viz
Changelog 2026-09-08 až 2026-09-15 níže pro plný detail každého
souboru). Cestou nalezeny a opraveny: 1 kritická chyba (rozbitý CSS
komentář v `theme.css` shazoval celý tmavý režim, v1.3.1), několik
genuinních mezer v tokenech (v1.3.0/v1.3.2), a opakovaná třída chyb
z hromadné `sed` náhrady (světlá/tmavá hodnota prohozená uvnitř
`html.dark`, trvale tmavé prvky chrome dostaly proměnné měnící se s
režimem) — poučení zapsáno u Dashboardu a využito při posledním
souboru. `theme.css` doplněno i do `sw.js` (PWA cache seznam,
2026-09-15 — `CACHE_NAME` povýšen na `top-mobile-v2`, ať se stará
cache bezpečně smaže a nahradí novou i s `theme.css`). Zbývá jen:

1. Sledovat, jestli SPA strana (nebo JK) nezmění `theme.css` znovu —
   `git pull` v `Esperanto` před další prací na tomhle tématu, přesně
   podle Konvence č. 6.
2. Až JK poskytne skutečné firemní barvy — upravit HODNOTY v `theme.css`
   (ne strukturu), ověřit vizuálně, projeví se to automaticky ve všech
   5 souborech TOP (a analogicky v SPA). Zahrnuje i položku zaznamenanou
   jako "sloučit později" (`--today-outline` u SPA).

### Plný obsah `theme.css` — NEKOPÍRUJE SE SEM, ať nevznikne nekonzistence

Živý soubor je `TOP/theme.css` (a kanonicky `Esperanto/theme.css`) —
kompletní historie rozhodnutí (co bylo v1.0/1.1/1.2, co JK potvrdil/
sloučil a proč) je přímo v hlavičce a patičce souboru samotného. Řádek
navíc, co by se tu jen znovu opisoval, riskuje že se časem rozejde se
skutečným souborem — přesně to poučení, co je jinde v tomhle CLAUDE.md
zaznamenané jako Konvence č. 6.

## Co je TOP a pro koho

Systém plánování výroby a evidence úkolů pro **FILTRATION TECHNOLOGY s.r.o.**
(Nivnice). Hlavní uživatel a správce: **Jiří Kománek (JK)**, vedoucí výroby.
Tým: cca 15–17 techniků/řešitelů, evidovaných pod dvoupísmennými zkratkami
(RS, LR, JK, LJ, JaM, DH, MiH, MK, AMa, MŽ, PL, JuM, SP, NP, MM, JN, FCH...).

## Architektura — PŘEČTI SI TOHLE PRVNÍ

**Není tu žádný backend server.** Celá appka je sada statických HTML/JS
souborů hostovaných na **GitHub Pages**, a jako "databáze" slouží **GitHub
API** samotné (GitHub REST Contents API, čtení/zápis souboru `database.json`
v privátním repozitáři přes autentizované GitHub tokeny).

Tohle byla vědomá volba — bylo to probírané teoreticky (viz sekce "Zvážené a
zamítnuté / odložené alternativy" níže) a vyhovuje to velikosti týmu. Pokud tě
napadne "tohle by šlo líp s opravdovým backendem" — pravděpodobně jsme o tom
už mluvili. Nenavrhuj přechod na server, aniž bys nejdřív pochopil(a), proč
tahle volba padla a jaké to má limity (viz níže).

### Dva GitHub repozitáře

1. **`asbeel13/TOP`** (veřejný/kódový) — HTML/JS soubory appky, nasazené přes
   GitHub Pages na `https://asbeel13.github.io/TOP/`
2. **`asbeel13/top-data`** (privátní) — obsahuje `database.json` (jediná
   "databáze"), `users.json` (whitelist uživatelů), `activity.json`
   (indikátor "někdo edituje"), `backups/` (automatické zálohy), a
   `.github/workflows/backup.yml` (denní záloha v 18:00 UTC / 20:00 letního
   času, drží posledních 5 souborů)

### Soubory v repozitáři TOP

| Soubor | Role |
|---|---|
| `tydenni_dashboard_live_reload_local_linked.html` | **Dashboard** — hlavní pracovní obrazovka, editace, přidávání úkolů |
| `tydenni_prehled.html` | **Přehled** — desktop, čisté nahlížení (+ tlačítko Hotovo pro roli Operátor) |
| `tydenni_prehled_mobile.html` | **Mobilní přehled** — jednodenní zobrazení, PWA instalovatelná appka |
| `sprava_ukolu_linked.html` | **Správa úkolů** — administrace, filtry, tabulky, správa aut a opakujících se pravidel |
| `ft_loader.js` | Sdílená logika — načítání/ukládání GitHub dat, autentizace, business logika (rozpad vícedenních úkolů, generování opakujících se úkolů) |
| `manifest.json`, `sw.js`, `icons/*.png` | PWA konfigurace pro mobilní přehled (instalovatelnost na Android) |
| `config.js`, `index.html` | **Pravděpodobně legacy** ze starší verze (lokální soubor místo GitHub API) — ověř před úpravou, jestli se ještě používají |

Všechny čtyři hlavní HTML stránky **sdílí** `ft_loader.js` a **sdílí
localStorage klíč `ftDashboardPeopleLayout`** pro nastavení "kdo se zobrazuje,
na které straně, v jakém pořadí" (nastavitelné z Dashboardu i obou Přehledů).

## Datový model (`database.json`)

```
{
  "tasks": [ ... ],           // hlavní úkoly, viz pole níže
  "resitele": [ {zkratka, jmeno, prijmeni, vyrazen} ],  // vyrazen: bool, viz níže
  "auta": [ {popis, spz, zodpovedna, dostupnost, zarazeni} ],
  "auta_rezervace": [ {spz, datum, stav, poznamka} ],
  "opakovaci": [ {id, title, owner, typ, hodnota, aktivni, priority, note} ],
  "vyjimky": [ {id, datum, duvod} ],       // "tenhle den se pravidlo NEGENERUJE"
  "dokonceni": [ {id, datum, zaznamenoKym, zaznamenoKdy} ], // per-den dokončení opakujících se úkolů — ODDĚLENÉ od vyjimky!
  "users": [ ... ]  // POZOR: users.json je SAMOSTATNÝ soubor, ne pole v database.json
}
```

### Pole úkolu (task) — kompletní seznam (audit proveden, viz "Nástrahy" níže)

`id, title, priority, project, sales, waiting, state, createdDate,
plannedDate, doneDate, dueDate, owner, note, internalNote, auto, cancelled,
internalProject, subtask, durationDays, lastUpdated, activeDays, completedDays`

- `internalProject` — datový název pole beze změny, ale **UI popisek je
  "Dodatečné označení projektu"** (přejmenováno 2026-07-29, viz Changelog
  níže — dřív se v UI jmenovalo "Interní číslo projektu")
- `subtask` — checkbox "Podúkol" v Dashboardu i ve Správě úkolů (boolean).
  Přidáno do appky po původním 21-polím auditu a do 2026-08-05 chybělo v
  `tasksToJson()`/`loadFromRaw()` ve Správě úkolů → tiše se mazalo při
  KAŽDÉM uložení (viz Changelog níže). Opraveno, pole je teď součástí
  kompletního seznamu.
- `waiting` — pole "Čeká se na něco" bylo **odstraněno z UI**, ale zůstává v
  datech (zpětná kompatibilita, needitovatelné přes appku)
- `durationDays` + `activeDays` — vícedenní úkol s výběrem konkrétních dnů v
  týdnu (pole čísel 1=Po..7=Ne; chybí/prázdné = každý den)
- `completedDays` — pole ISO dat, které konkrétní dny vícedenního úkolu jsou
  označené hotovo (viz "Nástrahy" — tohle pole způsobilo vážný bug)
- ID úkolů ve formátu `*0501*` (číselná řada), `*ZC0001*` (zástupnost),
  `*EXC0001*` (konflikty při Excel migraci)

### `opakovaci` (pravidla opakování)

`typ`: `"weekly"` (hodnota 1–7 = den v týdnu, 1=Po), `"interval"` (hodnota =
počet dní), `"monthly"` (hodnota = den v měsíci). Generují se za běhu v
`ft_loader.js` (`generateRecurring()`), NEJSOU persistované jako jednotlivé
task záznamy — pokud existuje "zástup" (viz níže), TEN se persistuje jako
skutečný task se stejným ID jako pravidlo.

**ID (`RFT0xx`) se generuje AUTOMATICKY** při uložení nového pravidla
(`generateNextOpakovaciId()` ve Správě úkolů) — uživatel do pole ID
nezasahuje, jen vidí needitovatelný náhled. Pokud přidáváš jiné místo,
odkud lze zakládat opakující se pravidlo, použij tuhle funkci pro
generování ID, ne ruční textové pole.

## Systém uživatelů a rolí

**users.json** (v `top-data`) obsahuje whitelist: `{tokenHash, zkratka,
role, registeredAt}`. `tokenHash` = SHA-256 hash GitHub tokenu (NIKDY se
neukládá surový token). Žádná samoregistrace — JK dostane od uživatele
token, spočítá hash, přidá záznam ručně (skriptem).

### Tři role

| Role | GitHub oprávnění | Co vidí v appce |
|---|---|---|
| `planovac` | Read+Write | Plný přístup všude (Dashboard, Přehled, Správa úkolů) |
| `nahlizec` | Read-only | Jen nahlížení všude |
| `operator` | Read+Write (technicky STEJNÉ jako plánovač!) | Dashboard/Správa úkolů = přesměrování pryč; **jen v Přehledu** (desktop i mobil) tlačítko "✓ Hotovo" |

**KRITICKÁ BEZPEČNOSTNÍ POZNÁMKA:** Operátor potřebuje na GitHubu **stejné
technické oprávnění k zápisu jako Plánovač** — GitHub nerozlišuje "smí jen
změnit pole state" od "smí cokoliv", to je binární na úrovni celého souboru.
Omezení role Operátor je **čistě v UI appky**, ne skutečná bezpečnostní
hranice. Kdokoliv s tokenem Operátora a znalostí DevTools/curl by mohl appku
obejít. Tohle bylo vědomě odsouhlaseno uživatelem jako přijatelný kompromis.

Chybějící `role` pole ve starém záznamu = zpětně kompatibilní jako
`"planovac"`.

## Hlavní implementované funkce

- Vícedenní úkoly s výběrem konkrétních dnů v týdnu + per-den označování
  hotovo (`completedDays`)
- Opakující se úkoly (týdně/interval/měsíčně) + výjimky (negenerovat den) +
  **oddělené** dokončení jednotlivých výskytů (`dokonceni`)
- **"Zástup"** — rychlý mechanismus pro zastoupení někoho jiného u
  opakujícího se úkolu na určité období: vytvoří skutečný task se **stejným
  ID jako pravidlo** → `generateRecurring()` automaticky vynechá generování
  pro dny, které tenhle task pokrývá (deduplikace přes `id|datum` klíč)
- Správa aut — dostupnost (kontrola i přes přiřazení v tasks, ne jen
  rezervace), kategorie `zarazeni` (TFM/Provoz Nivnice/Administrativa) s
  barevným odlišením
- Nastavení zobrazení lidí (pořadí, L/P strana, skrytí) — sdílené přes
  localStorage napříč Dashboard/Přehled/Mobilní přehled, s tlačítkem
  "Obnovit tovární nastavení"
- Živý polling dat (5s interval, ETag/If-None-Match), indikátor "někdo
  právě edituje" (`activity.json`)
- Automatická denní záloha (GitHub Actions, rotace max 3 soubory)
- PWA pro mobilní přehled (manifest, service worker — cachuje JEN statickou
  kostru appky, NIKDY data z GitHub API)
- Filtry se persistují v localStorage napříč všemi stránkami/záložkami
- **Správa řešitelů** (vyřazení/obnovení/přidání nových) — vstup z
  Dashboardu, tlačítko "👥 Řešitelé". Vyřazený řešitel (`vyrazen: true` na
  jeho objektu v `resitele`) mizí z Dashboardu i Přehledu (kalendář i
  nastavení zobrazení) úplně, ale ve Správě úkolů jeho starší úkoly
  zůstávají (zkratka červeně). **Tohle je koncepčně JINÉ** než
  "nastavení zobrazení" (localStorage, osobní, jen kdo je vidět/pořadí) —
  vyřazení je sdílené v databázi, platí pro všechny, ovlivňuje i to, jestli
  se řešitel vůbec nabízí ve filtrech/dropdownech pro NOVÉ přiřazení.
- **Kanban zobrazení** ve Správě úkolů, záložka Databáze úkolů — tlačítko
  "📌 Kanban" přepíná mezi tabulkou a nástěnkou se sloupci podle stavu.
  Sdílí `filteredTasks` s tabulkou (stejné filtry, žádná zdvojená logika).
  Sloupce se generují DYNAMICKY z reálných hodnot `state` v datech (ne
  pevná sada) — viz Changelog 2026-08-05, důležité pro zabránění tichému
  mizení úkolů s neobvyklou hodnotou stavu.

## Konvence vývoje — DODRŽOVAT

1. **Před jakoukoliv netriviální změnou dat/logiky: stáhni si kopii živé
   databáze a otestuj na ní** (ne na vymyšlených datech) — regresní test
   porovnávající staré chování se novým na REÁLNÝCH datech.
2. **Kontroluj duplicitní ID** po každé change týkající se `tasks` pole.
3. **Ověřuj syntax** (`node --check`) po každé úpravě před nasazením.
4. **PRAVIDLO (potvrzeno JK 2026-08-12, definitivní):** u souborů
   appky (`*.html`, `ft_loader.js`, `manifest.json`, `sw.js` atd.)
   **vždy jen připrav a otestuj, nahrává VÝHRADNĚ uživatel** — i když
   je změna malá a dobře otestovaná, i když technicky mám zápisové
   oprávnění. **Přímý zápis smíš dělat jen do `CLAUDE.md` a
   `INTEGRACE.md`** (dokumentace, ne kód appky). Stalo se jednou
   (2026-08-11 při opravě `.prio-PX`), že jsem tohle rozlišení
   nedodržel — soubor kódu nahrál rovnou, bez zeptání. Nízké riziko v
   tom konkrétním případě, ale princip byl porušen bez svolení. **Nikdy
   to neopakuj u kódových souborů, ať je změna sebemenší.**
5. Testování přes Playwright + mock GitHub API routes je zavedený vzorec v
   celé historii vývoje — viz "Časté testovací pasti" níže.
6. **KRITICKÉ — synchronizace mezi chatem a Claude Code:** Chat (tahle
   konverzace) a Claude Code NEsdílí žádné společné úložiště — každý
   pracuje se svou vlastní poslední staženou kopií souborů. Pokud
   uživatel mezi sezeními použil Claude Code (nebo naopak), je nutné si
   **nejdřív stáhnout aktuální stav z GitHubu** (`asbeel13/TOP`), než se
   začne pracovat na čemkoliv dalším — jinak hrozí, že nová práce
   postavená na zastaralé kopii **tiše přepíše** mezitím provedené změny
   z druhé strany (stalo se to 2026-07-30, viz Changelog — zmizel filtr
   "Dodatečné označení projektu" přidaný přes Claude Code, protože další
   práce v chatu vycházela ze starší uložené kopie). Na začátku session,
   pokud si uživatel není jistý, jestli mezitím něco měnil jinde, zeptej
   se explicitně, nebo si stáhni čerstvou kopii pro jistotu.
7. **Integrace s projektem SPA — `INTEGRACE.md` v repozitáři
   `Asbeel13/Esperanto`:** stanoveno JK 2026-08-11. Cokoliv se týká
   rozhraní TOP↔SPA (formát dat, ID schéma, stav implementace, otevřené
   otázky, handoffy) se zapisuje **VŽDY do obou** — sem (`TOP/CLAUDE.md`)
   i do `INTEGRACE.md` — ne jen na jedno místo. **`INTEGRACE.md` je
   hlavní/rozhodující zdroj**, pokud by se obsah někdy rozešel. Přístup
   k `Esperanto` repu ověřen funkční (stejný token jako pro `top-data`
   a `TOP`, i zápis).

## Nástrahy a poučení z historie — ČTI POZORNĚ

### 1. Kritický bug: `completedDays` se tiše ztrácelo (VYŘEŠENO, ale pouč se z toho)

Když bylo přidáno pole `completedDays` (per-den dokončení vícedenních
úkolů), bylo přidáno do `ft_loader.js`, Dashboardu a Přehledu — ale
**zapomenuto ve Správě úkolů** (`sprava_ukolu_linked.html`). Ta má JEDINÉ
místo v celém systému, kde se **celé pole `tasks` znovu skládá z paměti**
(`tasksToJson()` + `loadFromRaw()`) — jakékoliv pole, které tam není
explicitně namapované, se PŘI JAKÉMKOLIV uložení (i úplně nesouvisejícím)
tiše smaže pro VŠECHNY úkoly najednou.

**Poučení pro budoucí nová pole na `task` objektu:** vždy zkontroluj a
uprav OBOJE — `tasksToJson()` i `loadFromRaw()` ve `sprava_ukolu_linked.html`.
Dashboard a Přehled (desktop i mobil) toto riziko NEMAJÍ — nikdy
nerekonstruují pole úkolů, jen najdou konkrétní záznam a mutují ho na
místě (`task.pole = hodnota`), což je bezpečný vzorec.

**Byl proveden kompletní audit** (všech 21 polí task objektu + auta/
opakovaci/vyjimky/dokonceni/resitele) — k datu psaní tohoto souboru je
systém čistý. Pokud přidáváš NOVÉ pole, přidej ho na OBOU místech ve
Správě úkolů rovnou.

### 2. Race condition: ověření whitelistu vs. kontrola oprávnění

`FTLoader.init()` musí **počkat**, až doběhne ověření tokenu proti
whitelistu (`resolveUserFromWhitelist`), **než** začne fetchovat data —
jinak `canActuallyWrite()`/`canMarkDone()`/`getUserRole()` mohou vrátit
špatný výsledek, protože běží dřív, než je role vůbec známá. Řešeno
řetězením přes Promise (`verifyPromise.then(() => fetchFromGitHub(...))`).

### 3. Duplicitní ID úkolů vznikají opakovaně

Když dva lidé založí nový úkol skoro současně bez mezitímního obnovení dat,
oba si vypočítají stejné "další volné" číslo. Stalo se to opakovaně
(`*0319*`, `*0434*`, `*0452*`, `*0485*`, `*0502*`, `*0507*`...). Řešení
zavedené s uživatelem: u kolize dvou RŮZNÝCH úkolů se druhý přečísluje na
nové volné číslo; u SKUTEČNÉ duplicity (stejný úkol zapsaný 2×) se jedna
kopie smaže. `*0463*`/`*0464*` zůstávají **záměrně** duplicitní na
výslovné přání uživatele — needuj tohle "opravovat".

### 4. CSS selektory — nebezpečí hromadné textové náhrady

Při sdílení CSS mezi dvěma modaly byla použita naivní náhrada
`"#modalA"` → `"#modalA, #modalB"`, což rozbilo složené selektory
(`#modalA .foo` → `#modalA, #modalB .foo`, syntakticky JINÝ význam — bare
`#modalA` s vyšší specificitou než `.class` přebilo `display:none`).
Bezpečná oprava: zdvojit CELÝ CSS blok (samostatná kopie pro každý modal),
ne slučovat čárkou.

### 5. Testovací pasti (Playwright), na které jsme opakovaně naráželi

- **Vždy mockovat i PUT dry-run permission probe** (`sha:
  "0000...0000"` → 409), jinak `canActuallyWrite()` selže a stránka se
  přesměruje na read-only obrazovku uprostřed testu
- **Vždy odstranit `#ftTokenDialog`** po `page.goto()`, jinak blokuje
  interakce
- Statický mock GET po uložení dat **nereflektuje** skutečně uložený
  obsah (mock vždy vrací stejná data) — po `reload()` se UI vrátí ke
  staré hodnotě v testu, i když PUT payload byl správný. To NENÍ bug
  appky, jen limit jednoduchého mocku — ověřuj vždy PŮVODNÍ PUT payload,
  ne stav po reloadu.
- `loadFromRaw` a některé další funkce jsou uzavřené uvnitř IIFE, nejsou
  globálně volatelné z Playwright `page.evaluate()` — netestuj je přímo,
  testuj přes veřejné UI interakce.

### 6. Fine-grained GitHub tokeny vyžadují explicitní výběr repozitáře

`github_pat_...` tokeny mají v "Repository access" nutně vybraný konkrétní
repozitář — pokud čtení/zápis vrací `404` (ne `403`), token pravděpodobně
vůbec nemá přístup k danému repozitáři, ne že by měl špatná oprávnění.
Diagnostika: `404` na GET = chybí repo access; `200`/`403` = repo access OK,
liší se jen úroveň oprávnění.

### 7. Copyright/citace při reprodukci commit zpráv apod. — neaplikuje se, je to interní data.

### 8. Sprava_ukolu_linked.html má DVĚ nezávislé místa, která staví dropdown řešitele u úkolu

`buildResitelSelect()` (naplní `#m_assignee` + `#filterAssignee`) a
samostatný blok přímo v `openTaskModal()` (řádky kolem `assigneeSel...`)
dělají **podobnou věc** — obě mají vlastní "pokud aktuální hodnota není v
seznamu, přidej ji zpět" logiku. `openTaskModal()`'s blok běží PO
`buildResitelSelect()` a **přebíjí** jeho verzi (na tohle jsme narazili
při implementaci vyřazování řešitelů — oprava jen v `buildResitelSelect()`
se navenek vůbec neprojevila). Pokud upravuješ chování dropdownu řešitele
u úkolu, over si OBĚ místa, ne jen jedno. Stálo by za zvážení do budoucna
tohle sloučit do jedné funkce, ale nebylo to prioritou.

### 9. Třída `can-write-only` (`!important`) NESMÍ na tlačítka s vlastní JS podmínkou viditelnosti

```css
.can-write-only { display: none !important; }
body.can-write .can-write-only { display: inline-block !important; }
```

Tahle třída je určená pro tlačítka, jejichž viditelnost závisí **jen**
na oprávnění k zápisu — nic jiného. Pokud ji dostane tlačítko, které MÁ
i VLASTNÍ dodatečnou podmínku řízenou přes JS (`el.style.display = "none"`
podle stavu konkrétního úkolu — např. "jen u opakujícího se", "jen u
nedokončeného"), `!important` **vždy vyhraje** nad JS inline stylem —
tlačítko se pak zobrazí VŽDY, když má `body` třídu `can-write`, bez
ohledu na to, co si JS "myslí". Appka navenek vypadá, že tlačítko
funguje (je vidět), ale interně nemá nastavená potřebná `dataset` pole
→ klik na něj tiše nic neudělá. Přesně tohle způsobilo, že "Zástup" a
"Hotovo" v Dashboardu dlouho nefungovaly (viz Changelog 2026-08-04).
**Pravidlo do budoucna:** tlačítko s vlastní task-specifickou podmínkou
viditelnosti NEDÁVEJ třídu `can-write-only` — kontrolu oprávnění zahrň
přímo do JS podmínky (`document.body.classList.contains("can-write")`).

### 10. Stejná byznys logika zkopírovaná do více souborů = stejný bug na více místech

Audit z 2026-08-04/05 (viz Changelog) našel funkci "označit úkol hotovým"
(`markTaskAsDoneFromModal`) nezávisle zkopírovanou do Dashboardu, Přehledu
desktop i Přehledu mobil — všechny tři hledaly úkol podle `t.id === id` bez
kontroly data, což u opakujícího se úkolu se "zástupem" mohlo omylem
označit hotovým špatný (starší) záznam se stejným id. Oprava musela proběhnout
identicky na **všech třech místech** zvlášť, protože žádná sdílená funkce
neexistuje. Je to stejný architektonický vzorec jako Nástraha č. 8 (dva
nezávislé buildery dropdownu), jen o úroveň výš — týká se celé business
logiky, ne jen jednoho UI prvku, a týká se tří souborů najednou, ne dvou
míst v jednom souboru.

**Poučení pro budoucí práci:** než zkopíruješ logiku z jednoho souboru do
dalšího (zvlášť cokoliv, co čte/zapisuje `raw.tasks`), zvaž, jestli nepatří
jako sdílená funkce do `ft_loader.js` — ušetří to budoucí "oprava na jednom
místě, bug přežívá na zbylých". Zatím to nebylo přesunuto (viz Doporučení
pro budoucí práci níže), jen opraveno na všech třech místech stejně.

## Zvážené a zamítnuté / odložené alternativy (neopakuj tuhle diskuzi zbytečně)

- **Mobilní responzivní design** (jedna appka, media queries) —
  zamítnuto ve prospěch **samostatné mobilní stránky**
  (`tydenni_prehled_mobile.html`), protože uživatel chtěl čistší kód i za
  cenu zdvojené údržby. **Při každé změně týkající se Přehledu explicitně
  zkontroluj, jestli se má promítnout i do mobilní verze** — uživatel na
  to sám upozorňuje, ale je to reálné riziko opomenutí.
- **Nativní Android aplikace** — zamítnuto jako neúměrné (měsíce práce
  navíc kvůli kompletnímu přepisu UI), PWA je dostatečný kompromis.
- **Cílová platforma pro mobil je výslovně Android** — uživatel se
  rozhodl iOS neřešit jako prioritu. Nicméně: od iOS 17 lze appku
  nainstalovat i v Chrome/Edge na iOS (tlačítko Sdílet → Přidat na
  plochu, ne automatický banner jako na Androidu) — push notifikace po
  instalaci ale zůstávají nedostupné (jen Safari 16.4+ to umí, Chrome na
  iOS ne). Viz Changelog níže — vizuální chyby na iOS/WebKitu se řeší
  jen když se objeví, ne proaktivně.
- **Vlastní HW server / plnohodnotný backend** — proběhla hlubší
  teoretická diskuze (viz níže), zůstává otevřená možnost do budoucna,
  motivovaná především chybějícími push notifikacemi (které bez serveru
  nejdou udělat spolehlivě).
- **Push notifikace bez serveru** — nejdou udělat spolehlivě (appka musí
  běžet na popředí/pozadí, žádné notifikace při zavřené appce).
- **Čitelnost malého textu v kartách Přehledu/Dashboardu (2026-09-23,
  podnět JaM) — analyzováno, JK s LJ rozhodli NIC NEMĚNIT:** ořezávání
  ani rolování nechtějí; místo toho psát krátké názvy úkolů, detaily do
  poznámky. Detail níže, ať se měření nemusí opakovat.

### Malé písmo v kartách úkolů — analýza 2026-09-23 (beze změny)

**Podnět:** přišel 2026-09-23 od **JaM** (předal JK) — v Přehledu
(desktop) jsou některé texty příliš malé na čtení (příklad: PL, pátek
18. 9. 2026, dva dlouhé úkoly v buňce).

**Rozhodnutí (JK po domluvě s LJ, 2026-09-23): NIC NEMĚNIT.** Analýza
ukázala, že čitelné písmo jde jen za cenu ořezávání textu, nebo rolování
obrazovky — **obě varianty nechtějí.** Místo toho platí **pravidlo pro
zadávání:** název úkolu psát **krátce**, všechno ostatní patří do
**poznámky**. Detaily se každý snadno dozví rozkliknutím úkolu (detail
na počítači i na mobilu); **mobilní verze text nezkresluje vůbec**
(karty pod sebou, nic se nezmenšuje). Pokud se k tématu někdo vrátí,
nejdřív připomenout tohle rozhodnutí — ne znovu navrhovat B/C.

**Jak se velikost skládá (`tydenni_prehled.html`):**
1. Základ podle počtu úkolů v buňce: 1 úkol `clamp(12px, 1.6vw, 20px)`,
   2 úkoly `clamp(12px, 1.2vw, 15px)`, 3+ `clamp(12px, 0.85vw, 13px)`.
2. × posuvník „velikost textu“ v topbaru (`--task-scale`, 50–150 %,
   localStorage `ftPrehledTaskFontScale`, jen Přehled).
3. `fitTaskText()` pak po 0,5 px zmenšuje, dokud se karta vejde do
   buňky — **dno 6 px**. Řádky jsou pevné (`grid-auto-rows: 1fr`,
   `height: 100%`) = celý týden vždy na jedné obrazovce, jediný způsob,
   jak přeplněnou buňku „vejít“, je zmenšit písmo. Posuvník to nespraví
   (po změně se zmenšování spustí znovu). Projekt/SPZ `0.9em`, štítky
   🔁/📅/👥 pevně 9 px. Dashboard má stejnou funkci se dnem 6 px
   (základ pevně 10 px, řádky už dnes podle obsahu, bez posuvníku).
- Změřeno: PL pátek 18. 9. = **6 px** (základ 15 px, text potřeboval
  148 px na 29 px místa; ani na 6 px se nevešel → navíc uříznutý).

**Zvažovaná varianta B** (řádky rostou podle obsahu
`grid-auto-rows: minmax(64px, auto)`, název max. 4 řádky + řádek s autem,
projekt 1 řádek, dno písma 9 px, celý název v `title` bublině) —
naprogramována lokálně, změřena na kopii živé DB (mock GitHub API),
**pak na přání JK zahozena, nic nenahráno**. Výsledky (Přehled, týdny
10.–30. 8. 2026, 283 karet):

| Okno | | Dnes | Varianta B |
|---|---|---|---|
| 1920×1080 | písmo | 6–20 px, 12 karet pod 9 px | 13–20 px, nic pod 9 px |
| | oříznutý název | 3 karty nevejdou ani při 6 px | 25 karet (21 úkolů, 9 %) |
| | výška týdne | vejde se (~103 %) | **až 2,2× okna → rolování** |
| 1366×768 | písmo | **114 karet pod 9 px (40 %)** | nic pod 9 px |
| | oříznutý název | 32 karet nevejde ani při 6 px | 18 % karet |
| | výška týdne | vejde se | až 4× okna |

- Oříznuté názvy by potřebovaly typicky 5–7 řádků. Velkou část tvořily
  svátky s dlouhým názvem („Státní svátek – Den obnovy samostatného
  českého státu / Nový rok“) opakované u každého člověka.
- Menší základní písmo (11 px) s rostoucími řádky pomohlo málo (2,2× →
  1,9× okna, 25 → 18 oříznutých).
- **Podstata:** buď se týden vejde na obrazovku a přeplněné buňky mají
  malé písmo, nebo je písmo čitelné a týden se roluje (B), případně se
  text ořezává (C) — všechno zároveň nejde. JK a LJ nechtějí ani
  rolování, ani ořez → zůstává dnešní stav + pravidlo krátkých názvů.
  (Kdyby se někdy přece jen vracelo: variantu „C“ — pevné řádky + dno
  9 px + ořez — je potřeba teprve správně změřit; první pokus měl chybu:
  ořez na 4 řádky proběhl dřív než zmenšení písma, takže zmenšování
  vůbec nenastalo.)
- Nevyzkoušeno: B pro Dashboard samotný (řádky tam rostou už dnes, B by
  jen zvedla dno na 9 px a omezila název na 4 řádky — nejspíš bez
  negativního dopadu).

**Poučení k měření v Browser panelu:** `fitAllTaskText()` běží přes
`requestAnimationFrame` — ve skrytém panelu / neaktivní kartě se
nespustí a měření pak ukazuje nezmenšená písma (první pokus proto
vycházel „původní verze nikdy pod 12 px“). V testu volat `fitTaskText`
ručně. Zmenšování po 0,5 px je pomalé (každý krok přepočítá layout) —
měřit po ~3–5 týdnech, jinak `javascript_tool` překročí 45 s.

### Otevřená teoretická diskuze: vlastní server

Uživatel má firemní HW server s vlastním správcem (péče o server vyřešena).
Odhad: cca 2–3 měsíce práce, PROTOŽE frontend by se **nemusel přepisovat od
nuly** (business logika a UI zůstávají, jen se změní zdroj dat z GitHub API
na vlastní REST/WebSocket API). Klíčová otevřená otázka, na kterou nebyla
odpověď: **kdo bude vyvíjet/dokončí migraci** (ne kdo bude server
provozovat — to je vyřešeno). Doporučeno postupné nasazení (nejdřív
backend+auth+notifikace, zbytek postupně), ne najednou.

## Nápady uživatele (JK) na budoucí rozvoj — jen zaznamenáno, neplánováno

Tohle jsou JK vlastní myšlenky, zmíněné 2026-08-05 jako věci k budoucímu
zvážení — zatím čistě poznámka, žádná analýza proveditelnosti ani
implementace. Až se k tomu bude přistupovat, projít to jako novou
funkci s vlastním návrhem/rozvahou (samostatná stránka vs. nástavba nad
stávající, testování na kopii dat atd.) — stejně jako u Kanbanu výše.

1. **Systém pro řízení výroby** — nástavba nad úkoly, umožňující řízení a
   sdružování úkolů a podúkolů do přehledných celků (JK to takhle
   popsal, bez dalších detailů zatím). Pole `subtask` na úkolu už
   existuje v datovém modelu (viz Changelog 2026-08-05, oprava č. 3),
   ale nese jen `true/false` — nepředstavuje žádnou skutečnou hierarchii
   nebo seskupení. Tohle by byla zásadně větší funkce.
2. **Evidence dovolených** — **AKTUALIZACE:** už není jen nápad, ale
   aktivní samostatný projekt **SPA (Správa Pracovních Absencí)**,
   vlastní repozitář, vlastní SQL databáze, vlastní Claude instance.
   Jednosměrná synchronizace SPA → TOP (schválená dovolená se zapíše do
   `tasks[]` jako task s `priority: "PX"`, ID prefix `SPA-`) — viz
   Changelog 2026-08-11 níže pro detaily prvního review handoffu.
3. **Spoluřešitelé i u opakujících se úkolů** (zapsáno 2026-09-21) —
   první verze spoluřešitelů (viz sekce "Spoluřešitelé úkolu" nahoře)
   se vědomě týká jen `tasks[]`, ne pravidel `opakovaci`. Až se k tomu
   bude přistupovat: pravidlo by dostalo vlastní `coOwners`,
   `generateRecurring()` (`ft_loader.js` ~ř. 196) by ho předávalo do
   výskytů, řešit i interakci se zástupem (zástup = task se stejným ID
   jako pravidlo — kdo zastupuje hlavního vs. spoluřešitele) a s
   odděleným dokončením v `dokonceni`.

## Doporučení pro budoucí práci (moje vlastní návrhy, neimplementované)

- **Vizuální upozornění na aktivní filtr** — když je ve Správě úkolů
  aktivní netriviální filtr (např. datum od-do), není to na první pohled
  vidět; uživatel na to jednou naletěl (myslel si, že úkol chybí, ve
  skutečnosti ho skrýval zapomenutý filtr). Navrhováno, neimplementováno.
- Filtr pro opakující se úkoly podle typu (týdně/interval/měsíčně) — byl
  implementovaný jako součást širší úpravy záložek ve Správě úkolů.
- Přeskládání dlaždic aut podle dostupnosti/abecedy/osoby — bylo zmíněno
  jako nápad na příště, pak realizováno (pořadí podle screenshotu).
- **Sdílená funkce pro "označit hotovo"** v `ft_loader.js` — viz Nástraha
  č. 10. Aktuálně tři nezávislé kopie (Dashboard, Přehled desktop, Přehled
  mobil), opravené 2026-08-05 identicky na všech třech místech. Přesun do
  jedné sdílené funkce by tuhle třídu chyb do budoucna vyloučil, ale
  vyžaduje opatrnou migraci (tři různé volající kontexty). Neimplementováno.
- **CSP hlavička** (`<meta http-equiv="Content-Security-Policy">`) jako
  druhá linie obrany proti XSS — appka je veřejná na GitHub Pages a token
  pro zápis leží v `localStorage`, viz Changelog 2026-08-05 (oprava XSS).
  Neimplementováno.
- ~~Kontrola duplicity ID i pro RUČNÍ editaci existujícího řádku v tabulce
  opakujících se pravidel~~ — **VYŘEŠENO 2026-08-05 jinak, než bylo
  navrženo:** místo validace na kolizi je pole ID u existujících pravidel
  teď needitovatelné (`readonly`), stejně jako už bylo u zakládání nových
  pravidel. Uživatel (JK) tohle řešení výslovně preferoval — jde tak
  nastavit jen automaticky, měnit se nedá vůbec.
- Zbývající neopravené nálezy z auditu 2026-08-04/05 (z 24 celkem, po
  vyřešení všech kritických/středních/drobných 2026-08-05 zůstávají
  vědomě neopravené jen tyhle 3, všechny nízké riziko, rozhodnutí JK):
  - **canMarkDone() permanentně cachuje `false` po jednom výpadku sítě**
    (`ft_loader.js`) — refresh stránky to řeší, přeskočeno.
  - **Krátké okno bez tlačítka Hotovo při prvním otevření modalu**
    (mobilní Přehled, těsně po načtení appky) — nízká pravděpodobnost,
    žádná ztráta dat, přeskočeno.
  - **`88vh`/`85vh` u modálů v mobilním Přehledu** — součást otevřeného
    iOS/WebKit vyšetřování z 2026-07-31, vědomě ponecháno nedotčené do
    potvrzení na reálném iPhonu (stejně jako předtím).
  Plný text původního reportu (24 nálezů) byl předán uživateli mimo tenhle
  repozitář, není tady uložený — jen výsledné rozhodnutí u každého bodu je
  zaznamenané v Changelogu níže (2026-08-05).

## Jak appka funguje prakticky (pro rychlou orientaci)

1. Uživatel otevře stránku → `FTLoader.init()` → pokud není token v
   localStorage, zobrazí dialog → token se ověří proti whitelistu (hash) →
   podle role se buď povolí, nebo přesměruje
2. Data se čtou z `top-data/database.json` přes GitHub Contents API,
   polling 5s s ETag (304 nepočítá do rate limitu, 5000 req/h na token)
3. Ukládání = PUT s SHA optimistickým zámkem (konflikt → nabídne reload)
4. `expandMultiDayTasks()` a `generateRecurring()` v `ft_loader.js`
   transformují surová data na "zobrazitelné" úkoly (jeden task record →
   více dlaždic v kalendáři)
5. Sprava úkolů je jediné místo s plnou administrací (tabulka, filtry,
   3 záložky: Databáze úkolů / Přehled aut / Opakující se úkoly)

## Než začneš cokoliv měnit

Zeptej se uživatele (JK), jestli má nějaké další preference ohledně
workflow, a **respektuj zavedený vzorec**: navrhni testovací plán → po
schválení otestuj na kopii dat → ukaž výsledky → teprve po schválení nahraj
finální verzi. Tenhle projekt má za sebou dlouhý vývoj s důrazem na
opatrnost u produkčních dat (živě používá cca 15+ lidí ve výrobě).

## Historie změn (changelog) — průběžně doplňovat

Hlavní vývoj probíhá v Claude.ai chatu (web/mobil/desktop appka, stejná
konverzace). Claude Code se používá příležitostně na celkovou kontrolu
projektu — tahle sekce se aktualizuje po každé takové relaci i po větších
změnách z chatu, aby Claude Code měl při příštím spuštění aktuální obrázek.

### 2026-07-29 — Přejmenování pole a nový filtr (provedeno přes Claude Code)

- **UI popisek** "Interní číslo projektu" → **"Dodatečné označení
  projektu"** (ve formuláři úkolu i v rychlém filtru). **Datové pole
  zůstává beze změny** (`internalProject` v JSON) — jde čistě o
  přejmenování v uživatelském rozhraní, žádný dopad na existující data.
- Do Správy úkolů přidán nový rychlý filtr **`quickInternalProject`**
  vedle filtru Projekt — hledá v poli `internalProject`, zapojený do
  perzistence filtrů (uloží/obnoví se stejně jako ostatní) i do
  "Vyčistit filtry".
- Ověřeno: syntax OK, žádná duplicitní ID, změna je čistě UI/kosmetická
  bez rizika pro existující data.

### 2026-07-29 — Správa řešitelů: vyřazení/obnovení/přidání nových (provedeno v chatu)

- Nové pole `vyrazen: true/false` na objektu řešitele v `resitele`.
  Chybí/`false` = aktivní (zpětně kompatibilní, ověřeno regresním testem).
- Nová sekce ve všech čtyřech souborech: vstup tlačítkem "👥 Řešitelé" v
  Dashboardu (pod "Obnovit tovární nastavení") → modal se seznamy
  aktivní/vyřazení + formulář pro přidání nového.
- **Vyřazený řešitel mizí úplně** z Dashboardu a z obou Přehledů (kalendář
  i nastavení zobrazení) — ve **Správě úkolů zůstává** viditelný u svých
  starších úkolů, jen zkratka červeně (`#dc2626`), a nenabízí se ve
  filtrech/dropdownech pro NOVÉ přiřazení (kromě zachování jako aktuální
  volby při editaci JEHO existujícího úkolu, ať se needitovaně nepřehodí).
- Objeven a opraven zásadní architektonický nedostatek: `getPeopleLayout()`
  v obou Přehledech (na rozdíl od Dashboardu) **neprofiltrovala UŽ
  ULOŽENÉ** rozložení proti aktuálně platným řešitelům — opraveno na
  všech třech místech (Dashboard, Přehled desktop, Přehled mobil) +
  `resetPeopleLayoutToDefault()` na obou Přehledech měla stejnou mezeru.
- Objevena a opravena redundance dvou nezávislých kódových míst pro
  dropdown řešitele u úkolu ve Správě úkolů — viz Nástraha č. 8 výše.
- Ověřeno kompletní sadou testů na kopii živé databáze (793 úkolů, 17
  řešitelů) — vyřazení, obnovení, přidání nového, zmizení z
  Dashboardu/Přehledu, zachování v tabulce Správy úkolů s červeným
  zvýrazněním, zachování řešitele v editačním dropdownu, regresní test
  zpětné kompatibility.

### 2026-07-29 — Oprava hromadění záložek při odkazech z Dashboardu do Správy úkolů

- **Problém:** tlačítka "✏️ Upravit", "🚫 Zrušit dnes" a "🗑️ Smazat" v
  detailu úkolu měla `target="_blank"` (dva jako HTML atribut, "Smazat"
  jako `window.open(url, "_blank")` v JS) — každé kliknutí otevřelo
  **novou** záložku se Správou úkolů, i když už jedna byla otevřená.
- **Oprava:** všechny tři teď používají stejné **pojmenované okno**
  `target="top_edit_window"` (resp. `window.open(url, "top_edit_window")`)
  — první klik otevře záložku, každý další klik (na kterékoliv ze tří
  tlačítek) tu samou záložku jen přenaviguje, nevytváří novou.
- **Konvence pro budoucí podobné odkazy:** pokud budeš přidávat DALŠÍ
  tlačítko v Dashboardu, které vede do Správy úkolů (nebo jinam), použij
  stejné jméno okna `top_edit_window` — ne `_blank`. Jinak se stejný
  problém (hromadění záložek) vrátí u nového tlačítka.
- Ověřeno testem: 3 po sobě jdoucí kliknutí na "Upravit" → jen 1 nová
  záložka (ne 3), a "Smazat"/"Zrušit dnes" prokazatelně sdílí tu samou
  záložku, ne každé svou vlastní.

### 2026-07-30 — Správa vozidel: vyřazení/obnovení/přidání nových (provedeno v chatu)

- Stejná logika jako u řešitelů, ale pro `auta`. Nové pole `vyrazen` na
  objektu vozidla. Sekce **zařazená na konec stránky "Přehled aut"** ve
  Správě úkolů (ne samostatná sekce/modal, na výslovné přání uživatele).
- Vyřazené vozidlo mizí z dlaždic přehledu i z nabídky pro NOVÉ úkoly
  (Dashboard i Správa úkolů), ale starší úkoly s tímto vozidlem zůstávají
  ve Správě úkolů zachované, s poznámkou "(vyřazen)" u SPZ ve sloupci Auto.
- Audit před implementací potvrdil: `auta` prochází systémem bezpečným
  přímým průchodem (`auta: auta`), stejně jako `resitele`/`opakovaci` —
  žádné riziko tichého mazání polí jako u `completedDays`. Přehled (desktop
  i mobil) auta vůbec nepoužívá, takže se jich tahle změna netýká.
- Narazili jsme znovu na STEJNÝ vzorec jako u Nástrahy č. 8 (dvě nezávislá
  místa stavějící dropdown, druhé přebíjí popisek prvního) — tentokrát u
  `m_auto` v `openTaskModal()`. Opraveno stejným způsobem.
- Ověřeno kompletní sadou testů na kopii živé databáze (793 úkolů, 21 aut).

### 2026-07-30 — Incident: ztráta filtru "Dodatečné označení projektu" (chat přepsal změnu z Claude Code)

- **Co se stalo:** Uživatel použil Claude Code k přejmenování pole a
  přidání filtru (viz záznam 2026-07-29 výše). O den později jsem v
  chatu implementoval Správu vozidel, ale vycházel jsem ze SVÉ starší
  uložené kopie `sprava_ukolu_linked.html`, která tuhle změnu ještě
  neobsahovala — moje nahrání ji tiše přepsalo/smazalo.
- **Náprava:** uživatel poslal starou verzi souboru (tu s filtrem),
  porovnal jsem ji se svou aktuální kopií, dohledal přesně 7 míst v kódu
  kde se liší (HTML pole, popisek, `els` reference, uložení/obnovení
  stavu filtru, filtrovací podmínka, vyčištění filtrů, listener), a
  ručně je přenesl zpět — beze ztráty čehokoliv z mezitímní práce v
  chatu (správa řešitelů, správa vozidel, oprava záložek).
- **Poučení zapsáno jako Konvence č. 6 výše** — před další prací vždy
  ověřit, jestli se mezitím něco nezměnilo na druhé straně (chat ↔
  Claude Code), a případně si stáhnout čerstvou kopii z GitHubu.

### 2026-07-31 — Tlačítko "Zrušit úkol" v editaci záznamu (Správa úkolů)

- Nové tlačítko `#modalCancelTaskBtn` v hlavičce editačního modalu
  (`openTaskModal`) — ruší **jen ten jeden konkrétně editovaný záznam**
  (podle `currentEditIndex`/`rowIndex`), nezávisle na stávajícím
  hromadném "🗑 Zrušit vybrané" (`deleteSelected()`, funguje podle
  zaškrtávacích políček — beze změny).
- Nová funkce `cancelSingleTask()` — najde úkol přes
  `tasks.find(t => t.rowIndex === currentEditIndex)`, ne podle pozice v
  poli (bezpečné i po filtrování/řazení tabulky).
- Tlačítko se zobrazuje jen u existujícího, ještě NEzrušeného úkolu —
  skryté u nového úkolu (nic k rušení) i u už zrušeného (nedává smysl).
- Ověřeno klíčovým testem: zrušení jednoho úkolu i se souběžně
  zaškrtnutými JINÝMI úkoly (simulace rozjetého hromadného výběru) —
  zrušil se prokazatelně jen ten editovaný, počet zrušených úkolů +1
  přesně. Regresní test na kompletní živé databázi (812 úkolů) bez chyb.

### 2026-07-31 — Automatické generování ID u opakujících se úkolů + oprava starých dat

- **Problém:** ID nových opakujících se pravidel (`RFT0xx`) se muselo
  zadávat ručně — vedlo to k reálným chybám v datech: překlepy (`RTF`
  místo `RFT` u 4 záznamů) a jedna kolize ID mezi dvěma RŮZNÝMI pravidly
  (`RFT015` použité pro čtvrteční i páteční variantu stejného úkolu).
- **Oprava kódu:** pole ID ve formuláři "Přidat pravidlo" je teď
  needitovatelné (`#newOp_id_display`, jen náhled) — skutečné ID se
  vypočítá až v okamžiku uložení přes `generateNextOpakovaciId()`
  (najde nejvyšší číslo ze VŠECH existujících ID bez ohledu na přesný
  prefix/formát, vrátí `RFT` + zero-padded číslo+1). Uživatel do ID už
  nijak nezasahuje.
- **Oprava starých dat v `top-data`:** přejmenováno 5 překlepů
  (`RTF022→RFT022`, `RTF024→RFT024`, `RTF25→RFT025`, `RTF027→RFT027`,
  `RTF028→RFT028`) a přečíslována kolize `RFT015` — čtvrteční varianta
  zůstala na `RFT015`, páteční přesunuta na nové `RFT029` (uživatel
  potvrdil, že jde o dvě odlišná pravidla, ne omylem duplicitní zápis).
- Ověřeno na reálných (v té době ještě nepořádkových) datech — generátor
  správně vrátil `RFT029` jako další volné číslo i s překlepy/duplicitou
  v datech. Po opravě dat v databázi ověřeno, že žádné duplicity ani
  RTF-tvary nezůstaly (28 pravidel celkem).

### 2026-07-31 — Vyšetřování špatného zobrazení mobilního přehledu na iOS/Chrome

- Uživatel nahlásil špatné zobrazení mobilní verze v Chrome na iOS.
  Zjištěno: Chrome na iOS **musí** (pravidlo Applu) používat WebKit engine
  (stejný jako Safari), ne vlastní Blink/Chromium engine — proto se může
  chovat jinak než Chrome na Androidu, i když jde o "stejný" prohlížeč.
- **Síťové omezení zjištěné na obou stranách:** ani tenhle chat, ani
  Claude Code (na uživatelově počítači) nemají přístup stáhnout si
  Playwright WebKit engine pro testování (`cdn.playwright.dev` a MS
  servery nejsou v allowlistu ani na jedné straně). **Vizuální testování
  na skutečném WebKitu tedy není momentálně možné ani z jedné strany** —
  jediná cesta je reálné zařízení (iPhone/iPad) a screenshot od
  uživatele/kolegy.
- **Provedena preventivní oprava** nejpravděpodobnějšího viníka:
  `body { min-height: 100vh }` → doplněno o `min-height: 100dvh`
  (progressive enhancement, starší prohlížeče použijí `vh` řádek beze
  změny). `100vh` na iOS/WebKitu nezohledňuje dynamicky se
  schovávající/objevující lištu prohlížeče, což typicky způsobuje
  ořezaný nebo poskakující obsah dole na obrazovce — `dvh` je novější
  jednotka řešící přesně tohle.
- **Nedokončeno/čeká na ověření:** oprava je preventivní, ne potvrzená
  jako řešení skutečné příčiny (nemohli jsme to vizuálně ověřit). Až
  přijde reálný screenshot z iPhonu, ověřit jestli se tím problém
  vyřešil, nebo jestli je příčina jinde (kandidáti k prozkoumání pak:
  `max-height: 88vh`/`85vh` v modalech na řádcích ~192 a ~242 — zatím
  záměrně nedotčené, riziko tam je nižší díky internímu scrollování).

### 2026-07-31 — Filtr "⏰ Po termínu" v Databázi úkolů (Správa úkolů)

- Nové tlačítko `#quickOverdueBtn` vedle "Vyčistit filtry" — přepínací
  (toggle), zčervená při aktivaci. Zapíná/vypíná se přes
  `toggleOverdueFilter()`, stav v proměnné `overdueFilterActive`,
  persistovaný stejně jako ostatní filtry (`saveSpravaFilterState`/
  `restoreSpravaFilterState`), vypne se i přes "Vyčistit filtry".
- **Logika (`isTaskOverdue()`):** primárně porovnává Datum požadovaného
  ukončení s dneškem; pokud není vyplněné, spadne na Plánovaný datum
  realizace. Úkol je "po termínu" jen když je datum OSTŘE starší než
  dnešek (ne "dnes nebo starší") — úkoly se dneškem jako termín se tedy
  ještě nepočítají jako pozdní.
- Kombinuje se přirozeně se všemi ostatními filtry (AND logika v
  `applyFilters()`) — žádné speciální vyřazení zrušených/dokončených
  úkolů v samotné funkci není potřeba, protože to už zajišťují stávající
  filtry "Zobrazit zrušené" a "Zobrazení" při současném použití.
- **~~DŮLEŽITÉ ZJIŠTĚNÍ~~ VYŘEŠENO 2026-08-04 (viz Changelog níže):** ve
  `sprava_ukolu_linked.html` se dřív názvy polí v PAMĚTI lišily od
  syrového JSONu (`planned`/`due`/`created`/`finished` vs.
  `plannedDate`/`dueDate`/`createdDate`/`doneDate`) — **teď už jsou
  sjednocené**, v paměti i v JSONu se používají STEJNÉ (dlouhé) názvy.
  `owner`/`assignee` duální alias zůstává beze změny (netýkalo se
  přejmenování). Tahle poznámka zůstává jen jako historický kontext, ne
  jako aktuální upozornění.
- Ověřeno testem: 5 scénářů datumové logiky (due v minulosti/budoucnosti,
  fallback na plán, bez obou dat), kombinace s filtrem Řešitel, vizuální
  aktivní stav, "Vyčistit filtry", perzistence přes reload, regresní test
  na kompletní živé databázi (829 úkolů).

### 2026-08-04 — Sjednocení názvů datumových polí ve Správě úkolů

- Na žádost uživatele ("nebylo by dobré tyto proměnné sjednotit") jsme
  přejmenovali v paměti appky `planned→plannedDate`, `due→dueDate`,
  `created→createdDate`, `finished→doneDate` napříč celým
  `sprava_ukolu_linked.html` (22 míst: `loadFromRaw`, `tasksToJson`,
  `applyFilters`, řazení, vykreslení tabulky, `taskData` v
  `saveTaskFromModal`). HTML input ID (`m_planned`, `m_due` atd.)
  záměrně ponechána beze změny — nebyla součástí zmatku.
- **Vědomě zvážené a zamítnuté rozšíření:** duální alias
  `owner`/`assignee` na tom samém poli jsme NEsjednocovali — je to jiný
  typ redundance (dva různé názvy pro stejnou hodnotu používané v
  různých kontextech kódu), ne nekonzistence mezi pamětí a JSONem. Pokud
  by se řešilo příště, jde o samostatné rozhodnutí.
- Ověřeno: syntax, žádná duplicitní ID, regresní test na kompletní živé
  databázi (829 úkolů) bez chyb, kompletní round-trip existujícího i
  nově vytvořeného úkolu se všemi 4 datumovými poli, filtr "Po termínu"
  a datumový rozsahový filtr (oba na tomhle mapování závislé) funkční
  beze změny.
- **Poznámka v datovém modelu výše aktualizována** — zjištění o
  rozdílných názvech je teď označené jako vyřešené/historické.

### 2026-08-04 — VYŘEŠENO: tlačítko "Zástup" v Dashboardu nefungovalo

**Historie vyšetřování** (ponecháno pro poučení o postupu diagnostiky):
Uživatel nahlásil, že tlačítko Zástup v detailu úkolu je vidět, ale klik
nic nedělá, žádná chyba v konzoli. Nepodařilo se to zreprodukovat žádným
automatizovaným testem (syntetická data, živá databáze, přímé volání
`openModal()`, simulace kliknutí na dlaždici) — appka se chovala
bezchybně ve všech mnou vytvořených scénářích. Řešilo se to postupně
přes uživatele v konzoli prohlížeče (F12): nejdřív ověření chyby v
konzoli (byla, ale nesouvisela — starý zápis z `activity.json` 409
konfliktu, zmizelo po vyčištění konzole), pak ověření stavu modalu
(`classList.contains('open')` → `false`), pak `dataset.ruleId` →
`undefined`, pak porovnání `els.modalSubstituteBtn.style.display`
(řekl 'none') se skutečně VIDITELNÝM tlačítkem — a přímý vizuální test
(`style.background = 'red'` → tlačítko na obrazovce fakt zčervenalo,
takže šlo o STEJNÝ element, ne o problém s jinou záložkou/oknem).

**Skutečná příčina:** `modalDoneBtn` i `modalSubstituteBtn` měly CSS
třídu `can-write-only`, která má pravidlo s `!important`:
```css
.can-write-only { display: none !important; }
body.can-write .can-write-only { display: inline-block !important; }
```
`!important` **přebilo** JS logiku, která tyhle konkrétní tlačítka
schovává podle VLASTNÍ podmínky (Zástup: jen platné opakující se
pravidlo; Hotovo: jen nedokončený úkol) — nezávisle na tom, jestli je
JS nastavil na `display:none`, CSS třída je stejně silou přepsala na
viditelné, jakmile měl `body` třídu `can-write`. Výsledek: tlačítko
Zástup se zobrazovalo **i u běžných jednorázových úkolů**, ale appka si
interně "myslela", že je schované, takže nikdy nenastavila
`dataset.ruleId` → klik spustil `openSubstituteModal(undefined)` →
`if (!rule) return;` → tiše nic. **Stejná chyba postihovala i "Hotovo"**
u už dokončených úkolů (jen o něco méně nápadně, protože `dataset.taskId`
mohl zůstat z předchozího úkolu, ne vyloženě `undefined`).

**Oprava:** odstraněna třída `can-write-only` z obou tlačítek, kontrola
oprávnění (`document.body.classList.contains('can-write')`) přesunuta
přímo do JS podmínky spolu s tou specifickou logikou pro dané tlačítko.

**Poučení pro budoucí práci — DŮLEŽITÉ:** třída `can-write-only`
(`display:none/inline-block !important`) se hodí jen pro tlačítka, která
mají **výhradně binární** viditelnost (jen podle oprávnění, nic jiného).
Pokud tlačítko potřebuje VLASTNÍ dodatečnou podmínku viditelnosti
řízenou přes JS inline `style.display` (jako "jen u opakujícího se
úkolu" nebo "jen u nedokončeného"), třída `can-write-only` se na něj
NESMÍ dávat — `!important` ji vždy přebije. Řešení: buď kontrolu
oprávnění zahrnout přímo do JS podmínky (jak je to teď), nebo použít
jinou CSS třídu bez `!important`.
- Ověřeno testy: přesný scénář z bug reportu (běžný úkol) → tlačítko
  správně schované; skutečný opakující se úkol → tlačítko funguje beze
  změny; uživatel bez oprávnění → obě tlačítka schovaná; Hotovo u
  dokončeného úkolu → správně schované; regresní test na živé databázi
  (851 úkolů) bez chyb. **Uživatel potvrdil, že po nasazení opravy
  tlačítko funguje.**

### 2026-08-04 — Skrývatelný boční panel v Dashboardu

- Tlačítko ◀ vedle nadpisu "Týdenní dashboard dílny" skryje celý boční
  panel (filtry, Lidé & sloupce, Řešitelé...) — `.app` grid
  (`grid-template-columns: 310px 1fr`) přechází na `0px 1fr` s CSS
  transition. Plovoucí tlačítko ▶ (fixed top-left, viditelné jen když je
  panel skrytý) ho zase vrátí.
- Stav se pamatuje v localStorage (`ftSidebarCollapsed`), přežije reload
  i zavření prohlížeče.
- Menší vizuální oprava cestou: plovoucí tlačítko ▶ zpočátku překrývalo
  nadpis "Týden 32" v hlavním obsahu — opraveno přidáním
  `padding-left: 56px` na `.main` specificky ve stavu `.sidebar-collapsed`.
- Ověřeno: syntax, žádná duplicitní ID, regresní test na živých datech,
  persistence přes reload, a že tlačítko Zástup (viz předchozí
  neuzavřená položka) funguje beze změny i po týhle úpravě — takže
  tahle změna vyloučena jako možná příčina toho problému.

### 2026-08-05 — Kompletní audit kódu + oprava všech 5 kritických nálezů (provedeno přes Claude Code)

Na žádost uživatele proveden systematický průchod celého projektu (`ft_loader.js`
+ všechny 4 hlavní HTML stránky) s cílem najít další instance devíti do té
doby zdokumentovaných tříd chyb (Nástrahy 1–9), po vzoru srpnového bugu s
`can-write-only`/`!important`. Audit našel **24 nálezů** (5 kritických, 10
středních, 9 drobných) + seznam mrtvého kódu; kompletní report byl předán
uživateli jako samostatný dokument (není součástí repozitáře). Uživatel
požádal o opravu všech 5 kritických nálezů, jednu po druhé, s testem po
každé opravě — zbylých 14 (střední/drobné) zatím **neopraveno**, viz
Doporučení pro budoucí práci výše.

**1) XSS v `addVyjimkaAuto`/`showVyjimkaConfirm`** (`sprava_ukolu_linked.html`)
— `id`/`datum` z URL parametrů (`?vyjimka=...&datum=...`, odkaz z
Dashboardu) se vkládaly do `innerHTML` bez `escapeHtml()`. Appka je veřejná
na GitHub Pages a token pro zápis do `top-data` leží v `localStorage` —
stačilo poslat ověřenému uživateli odkaz. Oprava: `escapeHtml()` na obou
místech, kde se `id`/`datum` vkládají do zprávy. Ověřeno přímým voláním v
konzoli: škodlivý payload (`<img onerror=...>`) se nespustil a zobrazil se
jako neškodný text, normální přidání/detekce duplicitní výjimky beze změny.

**2) "Hotovo" hledalo úkol jen podle `id`, bez data** — nezávisle stejná
chyba v Dashboardu, Přehledu desktop i Přehledu mobil (`markTaskAsDoneFromModal`
ve všech třech, viz nová Nástraha č. 10). U opakujícího se úkolu, který má
"zástup" na JINÉ datum (stejné `id`, jiný `plannedDate`), `raw.tasks.find(t
=> t.id === id)` mohl najít ten starý zástup záznam místo aktuálně
klikaného výskytu — kliknutí na Hotovo pak potichu označilo hotovým špatný
den/záznam. Oprava: hledání se teď u opakujících se výskytů dodatečně
ověřuje proti `plannedDate` (`rawTask.plannedDate !== plannedDate ⇒
považovat za "žádný task"`); u vícedenních a běžných úkolů beze změny
(raw záznam vícedenního úkolu má vlastní `plannedDate` = počáteční den,
proto se date-check aplikuje JEN pro opakující se výskyty). Ověřeno na
všech třech souborech identickou sadou 5 scénářů (běžný úkol, opakující se
bez konfliktu, opakující se se zástupem na JINÝ den — to je ten bug,
opakující se přesně v den zástupu, vícedenní úkol) — všech 15 běhů beze
změny očekávaného chování a bez regrese.

**3) Pole "Podúkol" (`subtask`) se tiše mazalo při každém uložení** —
přidáno do appky po původním 21-polím auditu (viz Nástraha č. 1) a
zapomenuto v `tasksToJson()`/`loadFromRaw()` ve Správě úkolů → smazalo se
pro VŠECHNY úkoly při jakémkoliv uložení. Navíc `#m2_subtask` v Dashboardu
(rychlé přidání úkolu) se nikdy nečetlo do `newTask` — hodnota byla čistě
dekorativní. Oprava: `subtask: !!t.subtask` doplněno do `tasksToJson()` i
`loadFromRaw()`, a `subtask: ...` doplněno do `newTask` v
`saveNewTaskFromModal()`. Ukládací strana (`tasksToJson`) ověřena přímým
voláním s syntetickým úkolem přes všech 22 polí najednou (subtask i
ostatních 18 kontrolovaných polí beze ztráty, legacy záznam bez `subtask`
defaultuje na `false`). Čtecí strana (`loadFromRaw`) ověřena JEN čtením
kódu — funkce je (dle Nástrahy k testovacím pastem výše) uzavřená v IIFE a
nejde zavolat přímo z konzole. Dashboardova oprava ověřena přímým voláním
`saveNewTaskFromModal()` — `subtask: true/false` se teď správně dostane do
uloženého záznamu.

**4) Pád vykreslení Dashboardu při prázdném poli Projekt** — `task.project
.toLowerCase()` (zvýraznění "Ford") bez ošetření `undefined`, jeden řádek
vedle správně ošetřeného `escapeHtml(task.project || "")`. Jakýkoliv úkol
bez vyplněného projektu v aktuálním týdnu by shodil `render()` pro úplně
všechny uživatele (volá se po každém pollu). Oprava: `(task.project ||
"").toLowerCase()`. Ověřeno vložením testovacího úkolu s `project:
undefined` do živých dat a voláním `render()` — bez pádu; zvýraznění
"Ford" i "ne-Ford" projektů ověřeno beze změny chování.

**5) `FALLBACK_DATA` — cca 110 kB reálných produkčních dat natvrdo v
Dashboardu**, viditelných i bez tokenu (veřejné GitHub Pages), vykreslených
před prvním živým načtením. Uživatel zvolil nahrazení prázdnou kostrou
(doporučená varianta z auditu). Oprava: `FALLBACK_DATA` nahrazeno
`{tasks: [], backlog: [], owners: [], generatedAt: null}` (stejný tvar
klíčů jako předtím), soubor se zmenšil o ~100 kB. Přidán viditelný
indikátor `setSyncStatus("Načítám data z GitHubu…")` hned na startu, ať
prázdný kalendář před prvním načtením nepůsobí jako chyba. Ověřeno: po
načtení appka nemá v `DATA.tasks` ani v HTML zdroji žádnou reálnou starou
položku (test na název `"VERA 3NINE"` z původního snapshotu), status se
správně zobrazí a po simulovaném příchodu živých dat (`applyData()` +
`render()`) appka funguje normálně.

**Souhrn ověření:** žádná z pěti oprav neprošla bez testu, všechny testy
proběhly přímým voláním appkových funkcí v prohlížeči (Chromium, ne
WebKit — viz stále nevyřešené omezení z 2026-07-31) s mockovaným
`FTLoader` (žádné skutečné zápisy na GitHub během testování). Soubory byly
po opravě lokálně otestované, ale **nenahrané na GitHub** — uživatel je
nahrává sám dle zavedeného workflow (Konvence č. 4).

### 2026-08-05 — Vyřešení zbylých 19 nálezů z auditu (10 středních + 9 drobných, provedeno přes Claude Code)

Navazuje na kritické opravy výše. Uživatel (JK) prošel zbylé nálezy
jeden po druhém a u KAŽDÉHO se rozhodl zvlášť — buď opravit (s testem),
nebo vědomě přeskočit. Otevřené body ze skipnutých nálezů jsou zapsané
výše v "Doporučení pro budoucí práci". Opraveno bylo 7 středních nálezů
a 4 drobné (+ 1 smazání mrtvého kódu), ve 3 souborech:

**Střední (opraveno):**
- `sprava_ukolu_linked.html`: fronta na uložení místo tichého zahození
  druhé rychlé akce (`_isSaving`/`_saveAgainRequested` — viz `saveWorkbook()`),
  ID opakujícího se pravidla uzamčeno proti editaci (viz Doporučení výše),
  smazán třetí křehký duplicitní builder `#filterAssignee` v
  `buildResitelSelect()` (jediný zdroj pravdy je teď `fillAssigneeFilter()`),
  sjednoceno UTC→lokální datum na **3** místech (červené zvýraznění po
  termínu, "DNES" u rezervací aut, dimování prošlých výjimek — třetí místo
  se objevilo až při testu, nebylo v původním reportu).
- `tydenni_dashboard_live_reload_local_linked.html`: dropdown "Zástup"
  (`openSubstituteModal`) teď filtruje vyřazené řešitele stejně jako
  sesterský builder, `resetPeopleLayoutToDefault()` odvozuje `owners`
  stejně jako `applyData()` (nemůže už vrátit vyřazeného řešitele zpět),
  `modalChips` escapovány.
- `tydenni_prehled.html`: `modalChips` escapovány.
- Pole "Podúkol" v rychlém přidání (Dashboard) — už vyřešeno vedlejším
  efektem kritické opravy č. 3, žádná další akce.

**Střední (vědomě přeskočeno):** `canMarkDone()` permanentní cache po
výpadku sítě, krátké okno bez Hotovo při prvním otevření modalu na
mobilu — oba zapsané výše v Doporučení pro budoucí práci s důvodem.

**Drobné (opraveno):**
- `tydenni_dashboard_live_reload_local_linked.html`: smazán celý mrtvý
  panel "Dílna a externisti" (`DATA.backlog` je v `ft_loader.js` navždy
  `[]`, nic ho nikdy neplnilo — HTML sekce, `els.backlog`, renderovací
  kód i CSS grid smazány/zjednodušeny na 1 sloupec); `.modal` dostal
  explicitní `z-index:10000` (byl bez z-indexu, `.fab-nav` s `9999` ho
  proto překrýval — plovoucí tlačítka šla proklikat skrz otevřený modál);
  `showReadOnlyRedirect` posunut na `10001`, ať zůstane nade vším.
- `tydenni_prehled.html`: jméno/zkratka osoby v hlavičce sloupce
  escapovány (`renderSide`); detail úkolu dostal `max-height:88vh` +
  `overflow:auto` jako **samostatné** pravidlo `#modal .modal-card` (NE
  úprava sdíleného `.modal-card` — viz Nástraha č. 4 o nebezpečí
  slučování selektorů), ať se dlouhá poznámka dá doscrollovat místo
  tichého oříznutí.

**Drobné (vědomě přeskočeno/ověřeno jako neproblém):** nesourodá výchozí
priorita P0/P3 (JK ověřil, že appka prioritu vždy vynucuje — fallback je
nedosažitelný), apostrof ve zkratce řešitele (riziko prakticky nulové),
`100vh` bez `dvh` v desktopovém Přehledu (nízká expozice, cílí na
desktop), mobil nesleduje živě systémový tmavý režim (kosmetické),
`88vh`/`85vh` u mobilních modálů (součást otevřeného iOS vyšetřování,
viz Doporučení výše).

Každá jednotlivá oprava byla otestovaná zvlášť (přímé volání funkcí v
prohlížeči, syntetická data, mockovaný `FTLoader` — stejná metoda jako u
kritických oprav).

**Ověření uploadu — poučení k zapsání:** Po dokončení všech oprav se
uživatel zeptal, jestli jsou soubory na GitHubu, s tím, že je sám
nahrál. Ověřil jsem to přes `git fetch` + bajt-po-bajtu porovnání
(`cmp`) lokálních souborů proti `origin/main` (POZOR: `git diff --stat`
samotné bylo na `tydenni_prehled.html`/`tydenni_prehled_mobile.html`
zavádějící — hlásilo obří diff, i když soubory byly ve skutečnosti
identické; `cmp`/`diff` napřímo je spolehlivější). První kontrola
odhalila, že `sprava_ukolu_linked.html` nebyl nahraný kompletně —
chyběly mu KONKRÉTNĚ oprava XSS a oprava mazání "Podúkol" (obě
kritické) plus všechny střední opravy pro ten soubor. Uživatel nahrál
znovu, druhá kontrola potvrdila shodu. **Poučení:** "uživatel řekl, že
nahrál" není totéž jako "je to na GitHubu" — u bezpečnostních/datových
oprav vždy ověřit přes `git fetch` + `cmp`, ne věřit jen ústnímu
potvrzení, obzvlášť když `git diff --stat` může být zavádějící.

**Stav k 2026-08-05:** všechny 4 upravené soubory (`sprava_ukolu_linked.html`,
`tydenni_dashboard_live_reload_local_linked.html`, `tydenni_prehled.html`,
`tydenni_prehled_mobile.html`) potvrzeny bajt-po-bajtu identické s
`origin/main` — kompletní audit (24 nálezů) je tímto uzavřený, se všemi
rozhodnutími zaznamenanými výše.

### 2026-08-05 — Kanban zobrazení v Databázi úkolů (provedeno v chatu)

- **Návrh:** stejná stránka, ne samostatná (na rozdíl od mobilního
  Přehledu) — Kanban je jen alternativní POHLED na tytéž filtrované úkoly,
  ne fundamentálně jiná datová sada, takže zdvojení filtrovací logiky by
  bylo čistě riziko bez přínosu (přesně poučení z incidentu s filtrem
  "Dodatečné označení projektu", 2026-07-30).
- Tlačítko "📌 Kanban"/"📋 Tabulka" vedle "Vyčistit filtry" v záložce
  Databáze úkolů. `renderCurrentView()` volá buď `renderTable()` nebo
  novou `renderKanban()` podle `kanbanViewActive` (persistováno v
  localStorage `ftKanbanViewActive`), obojí čte ze STEJNÉHO `filteredTasks`
  pole naplněného `applyFilters()`.
- Karty = úkoly, klik otevře stejný `editTask()`/`openTaskModal()` jako
  řádek tabulky. Přetažení karty mezi sloupci mění `task.state` (+
  `lastUpdated`; při přesunu DO "Dokončeno" nastaví `doneDate`+`percent:1`
  pokud chybí, při přesunu PRYČ z "Dokončeno" je vynuluje) a ukládá přes
  stávající `autoSaveIfPossible()` → `saveWorkbook()` frontu (bezpečné i
  při rychlém přetahování více karet za sebou).
- Zrušené úkoly (`task.cancelled`) se zobrazují ztlumené a nejdou
  přetáhnout (`draggable=false`), stejně jako v tabulce.

**Kritický nález během testování (oprava PŘED nasazením):** reálná data
obsahují **pátou hodnotu `state`** — `"Nezahájeno"` (27 úkolů), starší
záznam, který dnešní dropdown `#m_state` už nenabízí jako volbu, ale v
databázi existuje. Původní návrh s pevnými 4 sloupci (Nový/Probíhá/Čeká
se/Dokončeno) by tyhle úkoly TICHOU CESTOU vynechal ze zobrazení — objeveno
součtovým testem (počet karet v Kanbanu ≠ počet `filteredTasks`, rozdíl
přesně 27). **Oprava:** sloupce se generují dynamicky — 4 known stavy +
jakékoliv DALŠÍ hodnoty `state`, které se v `filteredTasks` skutečně
vyskytují (`[...new Set(...)].sort()`), takže žádná legacy/neobvyklá
hodnota stavu nikdy nezpůsobí tiché zmizení úkolu ze zobrazení. **Poučení
pro budoucí práci:** kdykoliv se staví NOVÉ zobrazení nad `tasks`/
`filteredTasks` se sloupci/kategoriemi odvozenými z nějakého pole (stav,
priorita, projekt...), nikdy nepředpokládej, že aktuální `<option>` volby
ve formuláři pokrývají VŠECHNY hodnoty, co se v reálných (často letitých)
datech vyskytují — over si to na živé databázi součtovým testem.

Ověřeno: syntax, žádná duplicitní ID, součet karet = `filteredTasks.length`
přesně (785, pak 882 po opravě), klik na kartu otevírá modal, přetažení
mění stav (i s korektním nastavením/mazáním `doneDate`), **kritický test
bezpečnosti dat** (kompletní JSON snapshot všech 882 úkolů před/po dvou
přetaženích — všech 881 ostatních záznamů bajt-po-bajtu beze změny),
filtry zužují Kanban stejně jako tabulku, zrušené úkoly nedraggable,
perzistence přes reload, přepínání záložek (Databáze/Auta/Opakující se) s
aktivním Kanbanem beze změny. Týká se VÝHRADNĚ `sprava_ukolu_linked.html`
— žádná jiná stránka nepotřebovala úpravu.

### 2026-08-06 — Vyčištění neplatných hodnot `state` v živé databázi

Přímý zásah do dat (`top-data/database.json`), žádná změna kódu.
Uživatel si všiml (screenshot z Kanbanu) hodnoty "Nezahájeno", která už
není v dropdownu `#m_state` nabízená — přesně nález z implementace
Kanbanu 2026-08-05. Při kontrole nalezena i třetí neplatná hodnota,
kterou uživatel nezmínil: "Blokováno".

- **"Nezahájeno" (33 úkolů)** → převedeno na `"Nový"`.
- **"Blokováno" (3 úkoly)** → převedeno na `"Nový"`. Zajímavé zjištění:
  všechny tři už měly `cancelled: true` (interní poznámky doslova
  obsahovaly "Zrušeno") — čistě zastaralá hodnota `state` na už
  zrušených záznamech, ne skutečně blokované aktivní úkoly.
- Ověřeno přímo na GitHubu po každém kroku — součet podle stavu sedí,
  `cancelled` potvrzeno `true` u všech tří "Blokováno" záznamů.
- Databáze teď obsahuje výhradně 4 platné hodnoty `state`: **Nový,
  Probíhá, Čeká se, Dokončeno** — přesně sadu, kterou appka v dropdownu
  nabízí.
- Počet úkolů mezi oběma kroky vzrostl (904→910) — normální souběžné
  používání appky kolegy mezi jednotlivými zásahy, ne chyba (data se
  před každou úpravou stahovala znovu čerstvá, nic nepřepsáno).
- **Kanbanův mechanismus dynamických sloupců** (viz Changelog výše) by
  i bez tohohle úklidu žádný úkol netratil ze zobrazení — tenhle úklid
  je tedy čistě kosmetický/preventivní pro budoucí přehlednost dat, ne
  oprava skutečné chyby v appce.

### 2026-08-10 — KRITICKÁ OPRAVA: sjednocení generování ID úkolů, přechod na časovou logiku

- **Uživatel si sám všiml a správně diagnostikoval příčinu** opakujících
  se duplicitních ID (viz Changelog 2026-08-08/09 čištění duplicit výše)
  — zeptal se přímo "nebude dobré udělat buffer, který bude naskládávat
  zakázky a sám přiřazovat ID?". Analýza potvrdila přesně tohle.
- **Kořenová příčina:** Dashboard (`generateNextIdNew()`) a Správa úkolů
  (`generateNextId()`) měly KAŽDÝ svou vlastní, nezávislou kopii logiky
  "nejvyšší číslo v datech + 1", počítanou z LOKÁLNÍ (potenciálně
  zastaralé) kopie dat v prohlížeči. Dva lidé zakládající úkol téměř
  současně (v Dashboardu i Správě úkolů, nebo dvě záložky téhož souboru)
  mohli nezávisle vypočítat STEJNÉ "další volné" číslo.
- **Oprava:** obě funkce nahrazeny jednou sdílenou
  `FTLoader.generateNextTaskId(existingTasks)` v `ft_loader.js`. Nová
  logika negeneruje ID podle POŘADÍ, ale podle ČASU vzniku —
  `Date.now()` zakódovaný do base36, formát `*Txxxxxxxx*`. Funkce navíc
  jako pojistku aktivně kontroluje kolizi proti známým ID a v
  nepravděpodobném případě shody připojí náhodný znak navíc.
- **Uživatel (JK) chytil důležitou mezeru v prvním návrhu:** s jen 6
  znaky base36 suffixu se časová část opakuje každých ~25 dní (36⁶ ms) —
  teoreticky umožňovalo kolizi napříč vzdálenějšími daty, i když by ji
  aktivní kontrola nejspíš odchytila jako záchrannou síť. **Opraveno na
  8 znaků** (36⁸ ms ≈ 89,4 roku) — perioda opakování teď přesahuje
  reálnou životnost projektu, kontrola kolize zůstává jako DRUHÁ vrstva
  obrany navíc, ne jako hlavní spoléhání.
- Staré ID (`*0001*` až `*NNNN*`) se nemění, jen NOVĚ zakládané úkoly
  dostávají nový formát. Nový prefix `*T` se nekříží s žádným
  existujícím vzorem (`*0`, `RFT`, `*ZC`, `*EXC`).
- Ověřeno: syntax na všech 3 souborech, formát nového ID, nekoliduje s
  909 reálnými úkoly, **klíčový test** — simulace přesně původního bugu
  (dvě nezávislé kopie dat generující ID téměř současně) → žádná
  kolize (na rozdíl od staré logiky), pojistka proti nucené kolizi
  funguje, skutečné vytvoření úkolu v obou souborech funguje, regresní
  test na kompletní živé databázi na všech 4 stránkách bez chyb.
- **Kontrolovat při budoucí práci:** žádný jiný kód v projektu neparsuje
  číslice z `task.id` (ověřeno greppem přes všechny soubory) — tahle
  změna je tedy izolovaná, nemá vedlejší dopady jinde.

### 2026-08-11 — Review handoff od SPA projektu (dovolená → task s prioritou PX)

- Nezávislý projekt **SPA (Správa Pracovních Absencí)** — vlastní
  repozitář, vlastní Claude instance, vlastní SQL databáze — připravil
  návrh jednosměrné synchronizace schválené dovolené do TOP: zápis do
  `tasks[]` jako skutečný task s `priority: "PX"` (hodnota už v TOP plně
  zapojená — barva, legenda, filtry), ID prefix `SPA-<entries.id>`.
  JK předal jejich handoff dokument, požádal o review z pohledu TOP.
- **Ověřil jsem jejich tvrzení přímo v živém kódu** (ne jen podle
  tohohle souboru): potvrzeno, že `priorityClass()` ve Správě úkolů
  nemá `.prio-PX` třídu (spadá do šedého `prio-P3` fallbacku) — jejich
  nález byl přesný. Potvrzeno, že VŠECHNA jejich navrhovaná pole
  (`id, owner, title, priority, plannedDate, durationDays, note, state,
  project, sales, waiting, dueDate, internalNote, internalProject,
  subtask, auto, cancelled, createdDate, lastUpdated`) jsou explicitně
  vyjmenovaná v `tasksToJson()`/`loadFromRaw()` — bezpečně přežijí
  round-trip i při editaci JINÉHO úkolu přes UI (Nástraha č. 1 by se na
  ně nevztahovala, protože všechna už appka "zná").
- **Jejich hlavní nález (sekce 5 jejich dokumentu) byl v okamžiku psaní
  správný, ale MEZITÍM zastaralý** — popisovali přesně tu starou
  `generateNextId()` logiku s parsováním číslic z ID, kterou nezávisle
  vyřešila oprava z 2026-08-10 výše (viz tam). Nová
  `FTLoader.generateNextTaskId()` neparsuje číslice ze STÁVAJÍCÍCH ID
  vůbec — jejich navrhované obcházení (base-26 kódování bez číslic) už
  není technicky nutné, `SPA-142` s číslicí je bezpečné.
- **Zjištěno při review:** v okamžiku psaní odpovědi ještě NEBYLY na
  GitHubu nahrané `sprava_ukolu_linked.html` a Dashboard s opravou ID
  (viz 2026-08-10) — jen `ft_loader.js`. Upozorněno, JK soubory
  donahrál týž den.
- **Doporučení dané SPA straně:** `activity.json` (indikátor "někdo
  edituje") NEnastavovat při automatizovaném zápisu — určený pro
  zdvořilostní upozornění mezi lidmi, ne pro automatizované procesy;
  SHA konflikt chrání data nezávisle na tomhle mechanismu.
- **Upozornění dané SPA straně, na které nemohli sami přijít:** nový
  Kanban (2026-08-06) umožňuje přetažení karty mezi sloupci stavu —
  pokud by někdo v TOP omylem přetáhl SPA-syncnutou kartu, další sync
  běh by změnu tiše přepsal zpět (stejný důsledek jako u ruční editace
  obecně, jen přes novou cestu).
- **Otevřeno, čeká na rozhodnutí JK:** má se `.prio-PX` CSS třída
  doplnit (kosmetika, nízké riziko)? Mají se SPA-syncnuté úkoly nějak
  skrývat/odlišovat ve Správě úkolů (tabulka/Kanban/filtry), nebo stačí,
  že existující filtr Priorita už PX nabízí?

### 2026-08-11 — Založen `INTEGRACE.md` (repozitář `Asbeel13/Esperanto`)

- Na žádost JK vznikl **samostatný sdílený dokument** pro rozhraní
  TOP↔SPA — ne uvnitř žádného z obou projektů, ale v novém, neutrálním
  repozitáři `Esperanto`, aby nepatřil ani jedné straně. Obsahuje
  kompletní dohodnutý kontrakt (mapování polí, ID schéma,
  synchronizační mechanismus), stav implementace, otevřené otázky,
  chronologickou historii mezi-projektových handoffů — vše, co bylo
  předtím jen v changelogu 2026-08-11 výše.
- **Pravidlo od JK: při aktualizaci cokoliv o integraci zapisovat VŽDY
  do obou míst** (sem i do `INTEGRACE.md`), `INTEGRACE.md` je
  rozhodující zdroj při rozporu — zapsáno jako Konvence č. 7 výše.
- Přístup k `Esperanto` repu ověřen — stejný token jako pro `top-data`/
  `TOP` funguje i tady (čtení i zápis potvrzen dry-run testem).

### 2026-08-11 — SPA-side Claude rozšířil `INTEGRACE.md`, doplněna sekce 7 (přehled TOP)

- SPA-side Claude na žádost JK rozšířil účel `INTEGRACE.md` — z čistě
  rozhraní TOP↔SPA na **hlavní centrální dokument o obou projektech**
  (aktuální stav, ne den-po-dni historie, ta zůstává ve vlastních
  `CLAUDE.md`). Přidal sekci 6 (kompletní přehled SPA — architektura,
  datový model, role, implementované funkce, stav).
- **Rozhodnutí JK zaznamenané SPA stranou, týká se mapování polí (sekce
  2):** `poznamka` ze SPA jde do `title` (formát `"<stav> - <poznámka>"`),
  ne do `note` (to zůstává vždy prázdné) — ať je vidět rovnou v přehledu
  úkolu bez nutnosti otevřít detail. Žádná změna kódu na TOP straně
  potřeba — `title` je běžné textové pole, delší obsah funguje bez úprav.
- Doplnil jsem **sekci 7 — obdobný ucelený přehled TOP** (architektura,
  datový model, role, implementované funkce, aktuální stav, backlog),
  ve stejné struktuře a hloubce jako sekce 6 od SPA, kondenzované z
  tohohle `CLAUDE.md`, ne kopie celého changelogu.
- Soubor teď 377 řádků, obě sekce (6 a 7) slouží jako rychlá orientace
  pro Claude instanci NEBO člověka, kdo do některého z projektů teprve
  vstupuje, bez nutnosti číst celou historii každého zvlášť.

### 2026-08-11 — TOP sync potvrzen funkční end-to-end; `.prio-PX` CSS doplněna

- **SPA strana potvrdila** (aktualizace `INTEGRACE.md`): JK vygeneroval
  a nastavil `TOP_SYNC_GITHUB_TOKEN`, restartoval SPA server, sync **je
  živý a funguje end-to-end** — 15 úkolů `*SPA<id>*` s `priority:"PX"`
  správně zapsáno do `top-data/database.json`, SPA-side Claude ověřil
  přímo přes GitHub API, JK potvrdil vizuálně v TOP Dashboardu.
- Sekce 4 `INTEGRACE.md` obsahovala **dva konkrétní požadavky pro TOP
  stranu**. Bod 1 měl explicitní souhlas JK ("ať se do toho pustí"),
  bod 2 byl výslovně označen jako "zatím žádná akce, JK se rozhodne
  podle zkušenosti" — proto se řešil jen bod 1.
- **Provedeno (bod 1):** přidána `.prio-PX{background:#fef9c3;
  color:#854d0e}` do `sprava_ukolu_linked.html`, `priorityClass()`
  rozšířena o `"PX"` v seznamu rozpoznávaných hodnot (dřív spadalo do
  `P3` šedého fallbacku). Stejná žlutá barva teď platí konzistentně v
  tabulce i v Kanban kartách (obě čerpají ze stejné funkce).
- Ověřeno: syntax, barva badge v tabulce i Kanbanu (`rgb(254, 249, 195)`
  — odpovídá zadané `#fef9c3`), regresní test na kompletní živé databázi
  (964 úkolů) — P0–P3 beze změny, žádné chyby. Nahráno přímo na GitHub.
- **Aktualizováno v obou dokumentech** (`INTEGRACE.md` i tady) podle
  Konvence č. 7 — bod 1 označen hotový, bod 2 zůstává explicitně otevřený.

### 2026-08-12 — Plovoucí tlačítko "Dovolené (SPA)" v Dashboardu i Správě úkolů

- Přidán třetí (Dashboard) / druhý (Správa úkolů) `.fab-nav` odkaz —
  `🏖️ Dovolené (SPA)`, vede na `http://192.168.0.4:3000/` (SPA server,
  **lokální síťová adresa** — bude potřeba upravit, až/pokud SPA zpřístupní
  server i zvenku internetu, viz `INTEGRACE.md` sekce 6.8/7.8 backlog).
- Pozice: Dashboard `bottom: 156px` (nad stávajícími dvěma, zachovává
  66px odstup), Správa úkolů `bottom: 100px` (upraveno na žádost
  uživatele z původních 90px, ať lépe sedí vizuálně nad "Zpět na rozvrh").
- Ověřeno: syntax obou souborů, vizuální kontrola screenshotem (žádné
  překrytí, čitelné), pozice potvrzeny přes `getComputedStyle`.
- **Připomínka dodržení Konvence č. 4:** tenhle soubor (kódové změny)
  nahrál na GitHub uživatel sám, já jsem jen připravil a otestoval —
  správně dodrženo tentokrát, na rozdíl od incidentu 2026-08-11.

### 2026-08-12 — Tlačítko "Dovolené (SPA)" i na `tydenni_prehled.html`

- Uživatel zvažoval teoreticky vložení SPA do pop-up/iframe okna přímo
  v rámci stránky — probráno, ale zamítnuto ve prospěch jednoduchého
  odkazu (stejný vzorec jako Dashboard/Správa úkolů). Poznámka pro
  budoucnost, kdyby se k tomu vrátil: **iframe varianta by narazila na
  reálné technické riziko** — SPA server pravděpodobně posílá
  `X-Frame-Options`/CSP hlavičku bránící vložení (běžná ochrana proti
  clickjackingu), a i kdyby ne, cookies pro přihlášení by se mezi
  hlavní stránkou a iframe nemusely sdílet (moderní prohlížeče čím dál
  přísněji blokují cross-origin cookie sdílení v iframe). Nebylo ověřeno
  u SPA strany, jen teoretická úvaha — pokud by se k tomu JK vrátil,
  nejdřív se zeptat SPA přes `INTEGRACE.md`, ne rovnou zkoušet.
- `tydenni_prehled.html` byl **první ze čtyř hlavních stránek BEZ
  jakéhokoliv `.fab-nav` tlačítka** — musel se přidat celý CSS blok
  (zkopírován z Dashboardu/Správy úkolů, tmavé `#0f172a` schéma
  odpovídající topbaru té stránky), ne jen nová instance existujícího
  stylu.
- Ověřeno: syntax, žádná duplicitní ID, vizuální screenshot (bez
  překrytí, konzistentní vzhled s ostatními stránkami).
- **Zapsáno i do `INTEGRACE.md`** (viz tam) — teď tři místa v TOP
  odkazují na lokální SPA adresu, ne dvě.

### 2026-08-12 — Favicon (ikona v záložce prohlížeče) na všech hlavních stránkách

- Uživatel si všiml, že v záložce prohlížeče chybí logo appky (viditelné
  jen jako obecná ikona dokumentu). Zjištěno: logo bylo dosud propojené
  jen přes PWA `manifest.json` (instalovatelnost mobilního přehledu),
  ne jako klasický `<link rel="icon">` favicon pro běžné prohlížení.
- Přidáno `<link rel="icon" type="image/png" sizes="192x192"
  href="icons/icon-192.png" />` do `<head>` Dashboardu, Správy úkolů a
  `tydenni_prehled.html` — stejná ikona, co appka už měla nahranou pro
  PWA účely, žádný nový soubor. Mobilní přehled ho měl už od dřívějška
  (PWA nastavení), netýkalo se ho.
- Ověřeno: syntax na všech třech souborech, a protože `fetch()` na
  `file://` protokolu má vlastní CORS omezení (nesouvisí se skutečnou
  dostupností souboru), ověřeno spolehlivěji přes `<img>` element —
  ikona se na všech třech stránkách správně načetla (192×192 px).
- Uživatel upozorněn, že prohlížeč může mít starou verzi v cache —
  doporučen tvrdý refresh po nahrání.

### 2026-08-13 — KRITICKÁ OPRAVA: automatické opakování ukládání nového úkolu po konfliktu

- Uživatel nahlásil: "zobrazení v dashboardu trvá dlouho a zadané úkoly
  se někdy ani nezaloží". Analýza rozdělila tohle na dvě NEZÁVISLÉ věci:
  1) polling (5s, `POLL_MS` v `ft_loader.js`) — ovlivňuje jen rychlost,
     jakou appka VIDÍ cizí změny, nesouvisí s vlastním ukládáním.
     **Uživatel se rozhodl polling neměnit** (jen opravit retry).
  2) skutečná příčina "úkol se nezaloží": konflikt (409) při zakládání
     NOVÉHO úkolu končil dialogem "klikni OK pro přenačtení dat" — po
     kliknutí OK appka data přenačetla, ale **needitovaně zahodila právě
     rozepsaný nový úkol a NEZKUSILA uložení znovu automaticky**.
     Uživatel snadno nabyl dojmu "OK = uloženo", zavřel formulář, a
     úkol nikdy nevznikl. **Zesíleno zavedením SPA synchronizace**
     (píše do stejného souboru každých 8s), takže kolize začaly být
     mnohem častější než dřív.
- **Oprava (Dashboard, `saveNewTaskFromModal`):** přepsáno na smyčku až
  3 pokusů — při konfliktu potichu přenačte data, přepočítá ID (přes
  bezpečný `FTLoader.generateNextTaskId()`, viz oprava z 2026-08-10) a
  zkusí uložit znovu, BEZ nutnosti manuálního zásahu uživatele.
  Tlačítko "Uložit" mezitím ukazuje "Souběžný zápis, zkouším znovu
  (X/3)…", ať uživatel vidí, že se něco děje.
- **Oprava (Správa úkolů):** nová funkce `saveNewTaskWithRetry()` se
  stejnou logikou, volaná jen pro NOVÉ úkoly (`currentEditIndex ==
  null`) — editace EXISTUJÍCÍCH úkolů zůstává beze změny přes stávající
  `autoSaveIfPossible()`/`saveWorkbook()`, protože se to netýkalo
  reportovaného problému a mělo by to vlastní architektonické otazníky
  (viz "Nevyřešeno/otevřeno" níže).
- **Vytažena sdílená `taskToRawFormat(t)`** ze Správy úkolů (dřív
  duplikovaná inline uvnitř `tasksToJson()`) — používá ji teď i
  `saveNewTaskWithRetry()`, ať nevzniknou dvě nezávislé kopie mapování
  polí (stejný vzorec nástrahy jako u dřívějšího dropdownu řešitele).
- Po vyčerpání všech 3 pokusů (trvalý konflikt) — jasná chybová hláška
  uživateli, ne tiché selhání.
- Ověřeno: syntax obou souborů, žádná duplicitní ID, **klíčový test**
  (409 na 1. pokusu → automatický 2. pokus → úspěch, ověřeno počtem PUT
  volání i obsahem uloženého úkolu) v obou souborech, integrita všech
  18 polí přes nový mechanismus, vyčerpání pokusů končí srozumitelnou
  hláškou, regresní test na kompletní živé databázi (1082 úkolů) na
  všech 4 stránkách bez chyb.
- **Nevyřešeno/otevřeno pro budoucí práci:** stejný typ konfliktu může
  nastat i u editace EXISTUJÍCÍCH úkolů (přes `autoSaveIfPossible()`/
  `saveWorkbook()`) a u dalších akcí v Dashboardu (označit hotovo,
  zástup, zrušit úkol...) — tahle oprava řešila cíleně jen zakládání
  NOVÝCH úkolů, protože přesně to uživatel popsal jako problém. Obecné
  řešení pro EDITACI existujících záznamů je architektonicky složitější
  (`saveWorkbook()` ukládá celý aktuální stav `tasks[]` najednou, ne
  jednu konkrétní změnu, takže "zkus to samé znovu" by mohlo přepsat
  souběžné změny JINÝCH záznamů od jiných lidí/SPA) — vyžadovalo by to
  sledovat KONKRÉTNÍ pending mutaci odděleně, ne jen plný snapshot.
  Pokud se ukáže jako reálný problém i tam, řešit zvlášť.

### 2026-08-21 — Rozšíření denní zálohy o `users.json`

- Uživatel se zeptal, jestli je zálohování vyřešené — ověřeno přímo přes
  GitHub API (ne z paměti): `.github/workflows/backup.yml` v `top-data`
  běží spolehlivě denně v 18:00 UTC, posledních 5 běhů úspěšných,
  obsah nejnovější zálohy platný JSON odpovídající aktuálním datům.
  Následně se domluvilo rozšíření na víc souborů.
- **Do zálohy přidán `users.json`** (whitelist tokenů a rolí — ztráta by
  znamenala nutnost znovu registrovat všechny uživatele). **Záměrně
  VYNECHÁN `activity.json`** — ověřen jeho obsah (`lastEditBy`,
  `lastEditAt`, `action`), je to čistě momentální "kdo právě edituje"
  indikátor přepisovaný při každé akci, žádná dlouhodobá hodnota,
  zálohovat by bylo zbytečné.
- Rotace (max 3 zálohy) teď běží odděleně pro `database_*.json` i
  `users_*.json` — každý typ souboru má svých vlastních posledních 3
  verzí, ne sdílený limit.
- **Workflow soubory v `top-data` (na rozdíl od `.html`/`.js` v repu
  `TOP`) spadají mimo Konvenci č. 4** — spravuje a nahrává je AI-Asistent
  přímo, stejně jako `users.json`/`database.json` editace. Nejde o
  appkový kód, na který se vztahuje pravidlo "nahrává jen uživatel".
- Ověřeno **skutečným ručním spuštěním** workflow (`workflow_dispatch`),
  ne jen kontrolou syntaxe — proběhlo úspěšně, `database.json` správně
  rotoval (smazal nejstarší ze 4, zbyly 3), `users.json` záloha nově
  vznikla s platným obsahem (9 uživatelů, správné role).

### 2026-08-21 — KRITICKÁ OPRAVA: tichá ztráta úkolu při rychlém zakládání dvou po sobě

- Uživatel nahlásil: založil dva úkoly, jeden ("Demontáž potrubí 102")
  se 100% zobrazil, upravoval u něj řešitele, pak oba **beze stopy
  zmizely** — musel je zadat znovu. Žádná chybová hláška.
- **Diagnostika přes git historii** (ne dohad): stáhnuty všechny
  commity `top-data` z rozhodného dne, filtrováno na ty dotýkající se
  `database.json`, a obsah souboru zkontrolován při KAŽDÉM z nich na
  přítomnost titulku "Demontáž potrubí 102". Úkol se objevil v commitu
  `66bf35f4` (06:56:24) jako `*TMT2LIFUG*` — a **o 34 sekund později**,
  v commitu `3371d033` (06:56:58, založení DALŠÍHO nového úkolu), byl
  pryč. Celkový počet úkolů zůstal stejný (1116→1116) — jeden úkol
  nahradil druhý.
- **Kořenová příčina, nalezená v `ft_loader.js`:** `saveToGitHub()` po
  úspěšném zápisu okamžitě aktualizuje `_lastSha` (proměnná používaná
  ke kontrole konfliktu), ale **lokální cache dat** (`localStorage`,
  čtená přes `getRawJson()`) se aktualizovala AŽ přes samostatný,
  asynchronní síťový požadavek (`reload()`/`fetchFromGitHub()`).
  Vznikla tím **časová mezera** — pokud v ní proběhlo DALŠÍ volání
  `saveToGitHub()` (např. rychlé založení druhého úkolu), `getRawJson()`
  vrátil ZASTARALÁ data bez prvního úkolu. Protože `_lastSha` už byl
  aktuální, GitHub zápis přijal jako platný (**žádný konflikt 409**) —
  tiše přepsal a ztratil první úkol, bez jakékoliv chybové hlášky.
- **Oprava:** `saveToGitHub()` teď aktualizuje `localStorage` cache
  (`DATA_KEY`) OKAMŽITĚ, synchronně jako součást stejné funkce, ne až
  přes pozdější `reload()`. Časová mezera tím mizí úplně — jakékoliv
  další volání `saveToGitHub()`, byť o milisekundy později, vidí
  správná, čerstvá data. Netýká se to Dashboardu ani Správy úkolů přímo
  — je to čistě oprava uvnitř `ft_loader.js`, obě stránky ji automaticky
  zdědí.
- **Ověřeno srovnávacím testem** (nejpřesvědčivější důkaz, jaký jsme
  zatím u jakékoliv opravy udělali): přesně stejný scénář (dva úkoly
  založené rychle po sobě, s korektně stavovým mock serverem
  reagujícím na SHA jako skutečný GitHub) spuštěný **dvakrát** — jednou
  se STAROU verzí `ft_loader.js`, jednou s OPRAVENOU:
  - Stará verze: úkol 1 zmizel, úkol 2 přežil (**přesně reprodukuje
    nahlášenou chybu**)
  - Opravená verze: oba úkoly přítomné
- Regresní test na kompletní živé databázi (1082 úkolů) na všech 4
  stránkách bez chyb, syntax OK.
- **Cesta k diagnostice stojí za zapamatování:** u příštích "něco
  záhadně zmizelo" hlášení je prohledání git historie commit-po-commitu
  (hledání konkrétního titulku/ID v obsahu souboru při každém commitu)
  mnohem spolehlivější než hádání z popisu příznaků — dovolilo to najít
  přesný 34sekundový interval a přesně ten pár commitů, co za to mohl.
- **Zapsáno i do `INTEGRACE.md`** — SPA má vlastní `topSync.js` popsaný
  jako "stejný vzorec jako `ft_loader.js`", takže může mít STEJNOU
  zranitelnost ve vlastním kódu. Doporučeno SPA straně zkontrolovat.

### 2026-09-06/07 — Nová stránka: `tydenni_dashboard_mobile.html`

- Uživatel chtěl mobilní verzi i pro Dashboard a Správu úkolů (zatím jen
  Přehled měl mobilní stránku). **Nejdřív proběhla čistě teoretická
  diskuze** (výslovně požádáno "nic zatím neprogramuj") — dobrý postup,
  který stojí za zopakování u podobně velkých funkcí příště.
- **Rozhodnutí č. 1:** 1:1 přenos obou složitých stránek na mobil by byl
  zbytečně rizikový a pracný — uživatel sám navrhl "osekané verze".
  Odsouhlasený rozsah pro Dashboard mobil: zobrazení plánu, rychlé
  založení úkolu, označení hotovo, **zjednodušená úprava přímo na
  místě** (ne přesměrování jinam) — bez správy řešitelů/aut (admin
  akce, vzácné, lepší na počítači).
- **Rozhodnutí č. 2:** stejný vzor jako mobilní Přehled — samostatná
  stránka (`tydenni_dashboard_mobile.html`), NE responzivní řešení v
  rámci existujícího Dashboardu. Konzistentní s dřívějším rozhodnutím
  u Přehledu (zdůvodnění: čistší kód, i za cenu zdvojené údržby).
- **Rozhodnutí č. 3 (kalendář na mobilu):** "jeden den po druhém" se
  šipkami/swipe (varianta A z nabízených 3), stejně jako Přehled mobil
  — konzistence navigačního vzoru, kterou uživatel už zná.
- **Rozhodnutí č. 4 (úprava na místě):** zjednodušeno na 6 polí (Název,
  Řešitel, Priorita, Stav, Plánovaný datum, Poznámka) — vynechána
  administrativní pole (Projekt, Prodejce, Auto, Interní poznámka,
  Interní označení projektu, Termín, Datum dokončení, Podúkol, Čeká se
  na), která nedávají smysl řešit narychlo z telefonu.
- **Bezpečnostní rozhodnutí, které JÁ navrhl a uživatel odsouhlasil:**
  Upravit/Zrušit se zobrazují JEN u běžných úkolů — ne u opakujících se
  nebo vícedenních. Tyhle mají složitější logiku (konkrétní výskyt, ne
  přímý záznam v `tasks[]`) a zjednodušená mobilní úprava by je mohla
  poškodit. Pro ně zůstává jen Hotovo (stejně jako už fungovalo v
  mobilním Přehledu), plná editace zůstává na počítači.

### Technická realizace

- Postaveno na `tydenni_prehled_mobile.html` jako základu — **znovu
  použito beze změny**: `applyDarkMode`/`initDarkMode`, `loadSavedDay`/
  `saveDayState`/`goToDay` (navigace, swipe), `addDays`/`toISO`/
  `fmtDayName`/`fmtDate`, `cardClass`/`escapeHtml`, PWA nastavení.
- **Upraveno:** `renderMobileDay()` (přidání "+" tlačítka, karty teď
  vedou do rozšířeného modalu), `openModal()` (nové tlačítko Upravit/
  Zrušit, podmíněná viditelnost podle typu úkolu a role).
- **Nové:** `openNewTaskModalMobile()`/`saveNewTaskMobile()` (rychlé
  založení), `openEditModalFromDetail()`/`saveEditedTask()`
  (zjednodušená úprava), `cancelTaskFromModal()` (zrušení),
  `buildAssigneeOptions()` (sdílený dropdown řešitelů pro oba formuláře,
  vyřazení automaticky nenabízeny).
- **Oprávnění:** stejná logika jako desktopový Dashboard (ne mobilní
  Přehled) — Operátor i Nahlížeč přesměrováni na mobilní Přehled,
  `_canWrite` řídí viditelnost všech zápisových akcí. Vlastní
  `showReadOnlyRedirectMobile()`, analogická desktopové verzi.
- **VŠECHNY tři nové zápisové funkce použily od začátku bezpečný
  automatický retry-při-konfliktu vzorec** (viz kritická oprava výše,
  2026-08-21) — ne starý vzorec s dialogem, který v `markTaskAsDoneFromModal()`
  (převzato beze změny z Přehledu) záměrně zůstal beze změny, protože
  nebyl součástí dnešního zadání. Stojí za zvážení sjednotit i tuhle
  funkci při příští práci na mobilních stránkách.
- Přidán reciproční odkaz — Dashboard mobil má 📅 na Přehled mobil,
  Přehled mobil má nově 📋 zpátky na Dashboard mobil.
- `sw.js` (PWA cache statické kostry) rozšířen o novou stránku.

### Ověřeno

Syntax obou upravených/nových souborů i `sw.js`, žádná duplicitní ID,
vizuální kontrola (screenshoty potvrzují správné rozložení karet,
barvy priorit, čitelnost topbaru se 4 ikonami), funkční test celého
cyklu založení/úpravy/zrušení úkolu, podmíněné zobrazení tlačítek
(běžný vs. opakující se úkol), **kritický test automatického retry po
konfliktu** (stejná rigoróznost jako u opravy 2026-08-21 — potvrzeno 2
PUT pokusy, úkol se nakonec uložil), regresní test na kompletní živé
databázi (1423 úkolů) bez chyb.

### 2026-09-08 — Oprava mezery v oprávnění na `tydenni_dashboard_mobile.html`

- Uživatel si vyžádal explicitní kontrolu, jestli má do mobilního
  Dashboardu přístup skutečně jen ten, kdo má oprávnění. **Kontrola
  odhalila reálnou mezeru**, ne planý poplach:
  1. Plovoucí tlačítko "+" bylo viditelné hned od načtení stránky,
     ještě PŘED dokončením ověření role/oprávnění (to trvá ~1–2,5 s,
     asynchronní volání `FTLoader.canActuallyWrite()`).
  2. Žádná ze čtyř zápisových funkcí (`openNewTaskModalMobile`,
     `saveNewTaskMobile`, `saveEditedTask`, `cancelTaskFromModal`,
     a zděděná `markTaskAsDoneFromModal`) si `_canWrite` neověřovala
     sama — spoléhaly čistě na to, že se k nim needitovaný uživatel
     vůbec nedostane přes UI.
- **Oprava, dvě vrstvy (defense-in-depth):**
  1. Tlačítko "+" teď `display:none` ve výchozím stavu, zobrazí se
     JEN po potvrzeném `_canWrite = true`.
  2. Všech pět zápisových funkcí teď má na úplném začátku explicitní
     `if (!_canWrite) { alert(...); return; }` — nezávisle na tom,
     jestli uživatel funkci vyvolal přes UI nebo jinak (např. přímým
     zavoláním z konzole).
- **Poučení pro budoucí mobilní/nové zápisové funkce:** viditelnost
  tlačítka v UI NIKDY nestačí sama o sobě jako ochrana — vždycky
  přidat kontrolu i uvnitř samotné funkce, co skutečně zapisuje.
  Tenhle vzorec (`if (!_canWrite) return`) by měl být první řádek
  KAŽDÉ nové zápisové funkce na mobilních stránkách od teď.
- Ověřeno: syntax, tlačítko "+" potvrzeně schované před ověřením role,
  přímé zavolání zápisové funkce bez oprávnění správně odmítnuto,
  oprávněný uživatel (Plánovač) funguje beze změny, regresní test na
  kompletní živé databázi (1423 úkolů) bez chyb.

### 2026-09-08/09 — ZAHÁJENO (nedokončeno): sjednocení barevné palety a designu

Viz kompletní kontext, metodika, poučení z chyb a plný návrh `theme.css`
v sekci **"⚠️ AKTUÁLNĚ ROZPRACOVÁNO"** hned na začátku tohoto souboru —
nekopíruje se sem znovu, ať nevznikne nekonzistence mezi dvěma kopiemi
v tom samém souboru. Stručně: audit 126 barev, 23 konfliktů vyřešeno,
návrh `theme.css` hotový, čeká na schválení JK před nahráním a zapojením
do skutečných souborů appky.

### 2026-09-11 — `theme.css` sjednocení dokončeno (fáze struktury), verze 1.2.0 nahraná jako kanonická

Navazuje na záznam výše. SPA strana doplnila 2026-09-11 vlastní sekci
(barvy typů absence ŘD/PN/LÉKAŘ/VOLNO jako vlastní proměnné, 4
SPA-specifické tokeny) do TOP návrhu v1.0.0 → kombinovaná v1.1.0. JK pak
prošel a rozhodl všech 8 otevřených bodů (5 TOP + 3 SPA):

- **Sloučit** tři skoro identické zelené (`--success`/`--success-alt`/
  `--success-id-text`) do `--success` — mimochodem opravuje reálnou
  nesrovnalost v živém kódu (tlačítko `.success` ve Správě úkolů mělo
  jinou zelenou ve světlém než v tmavém režimu).
- **Sloučit** tlačítko `.danger` Správy úkolů (`#fff4f4`/`#ffd7d7`, jediné
  použití, vypadalo jako překlep) do standardní `--danger-soft-alt`/
  `--danger-soft-border` používané všude jinde (Zrušit/Smazat, badge P0).
- Zbylých 6 bodů potvrzeno beze změny hodnot (mapování tří osiřelých
  `--dark-*` proměnných ověřeno přímo v živém kódu file:line citacemi,
  tmavé kalendářní dlaždice s barevným okrajem potvrzeny jako existující
  chování ne nová změna, `--text-faint-dark`→`--text-on-navy-faint`
  potvrzeno, barvy stavů SPA potvrzeny jako jen výchozí hodnota,
  `--today-outline` ponechána samostatná do příchodu firemních barev).

**Výsledek: `theme.css` verze 1.2.0 nahraná do `Asbeel13/Esperanto` jako
kanonická verze** — `TOP/theme.css` je lokální kopie, ověřená bajt po
bajtu identická. Detail všech rozhodnutí je v hlavičce/patičce
`theme.css` samotného a v `INTEGRACE.md` (sekce 5, záznam 2026-09-11) —
nekopíruje se sem potřetí. Historický plný CSS výpis verze 1.0.0 v
sekci "AKTUÁLNĚ ROZPRACOVÁNO" výše byl smazán jako zastaralý (živý
soubor je teď jediný zdroj pravdy).

**Stále NEPROPOJENO s appkou** — žádný `<link>`, žádné nahrazené hex
barvy, `sw.js` beze změny. Fáze "postupné zapojení do 5 HTML souborů" je
další, samostatný krok (viz "CO DĚLAT DÁL" výše), zatím nezačatý.

### 2026-09-14 — `theme.css` zapojen do `tydenni_prehled_mobile.html` (první ze 5 souborů TOP)

Zahájena fáze "skutečně zapojit" (viz "CO DĚLAT DÁL" výše). Vybrán
nejmenší z 5 souborů jako první. Odstraněn lokální `:root` blok (9
tokenů, shodné s theme.css po přejmenování `--p0..--px`→`--tile-p0..px`,
`--wait`→`--warn-block`, `--done`→`--success-block`), ~30 napevno
zapsaných barev nahrazeno `var(...)`, `html.dark` blok zredukován jen na
skutečně odlišné přepisy (zbytek řeší centrálně `theme.css`).

**Strojová kontrola všech reálných hex barev souboru proti `theme.css`**
(ne jen textová revize) odhalila další mezery v původním 126-barevném
auditu — přesně to riziko, na které jsme upozorňovali předem. Doplněno
`theme.css` v1.2.2 (`--tile-p0` chybělo v `html.dark`) a v1.3.0 (3 nové
sdílené tokeny, 3 vizuální neshody vyřešené JK — ikonka opakování,
badge vícedenní, `.chip` barvy — všechny tři se v tomhle souboru vizuálně
nepatrně změnily, schváleno; nový token `--tile-text` jen pro soubory
bez vlastní tmavé varianty). Dodatečně doplněno i chybějící
`--success-block` v `html.dark`. Kompletní detail viz hlavička
`theme.css` a `INTEGRACE.md` sekce 5.

**Ověřeno** živým `getComputedStyle` testem (workaround kvůli sandboxu
testovacího nástroje, který neumí načíst externí `<link>` pro lokální
soubory — vloženy skutečné hodnoty z theme.css jako dočasný inline
`<style>`, pak měřeno na reálném/syntetickém DOM): všech ~30 barev
světlého i tmavého režimu přesně sedí, včetně obou oprav a všech tří
schválených vizuálních změn. **Soubor nahraný JK, žádná další akce.**

### 2026-09-14 — KRITICKÁ OPRAVA: rozbitý CSS komentář v `theme.css` shazoval CELÝ tmavý režim

Po nahrání výše JK otestoval živě a nahlásil: tmavý/světlý režim v
mobilním přehledu se přepíná jen částečně, pozadí stránky se vůbec
neměnilo. Diagnostika přímo na `https://asbeel13.github.io/TOP/` přes
`document.styleSheets` (ne hádání) odhalila, že prohlížeč z celého 23kB
`theme.css` rozparsoval **jen JEDNO CSS pravidlo** (`:root`) — všechno
za ním, včetně celého bloku `html.dark {...}`, bylo tiše zahozeno jako
neplatná syntaxe. Proto fungovaly světlé barvy (jsou v `:root`, před
chybou), ale tmavý režim vůbec ne (byl celý za ní).

**Příčina:** text uvnitř komentáře popisující sloučené proměnné
(`--auto-pouzivane-*` hned následované `/--accent-soft*`) obsahoval
náhodně za sebou hvězdičku a lomítko — CSS komentáře se neumí zanořit,
takže tahle náhodná shoda ukončila komentář uprostřed věty, ne na
zamýšleném místě. **Oprava:** vložena mezera, žádná změna významu textu
ani hodnoty žádné proměnné. Ověřeno počtem otevíracích/zavíracích
značek komentáře v souboru (88/88, dřív 88/89 — jasný důkaz, že šlo
přesně o tenhle jeden problém, ne o něco dalšího).

Opraveno jako `theme.css` v1.3.1, nahráno do `Asbeel13/Esperanto` jako
kanonická verze (commit `bb9c6aa`). **`TOP/theme.css` čeká na nahrání
JK** — appkový soubor, Konvence č. 4. Zapsáno i do `INTEGRACE.md`
(sekce 5) s upozorněním pro SPA stranu — jejich `public/theme.css` je
bajt-po-bajtu stejná kopie, takže mohla mít STEJNOU chybu.

**Poučení pro budoucí úpravy `theme.css`:** v komentářích nikdy nepsat
hvězdičku bezprostředně před lomítkem (ani přes konec/začátek řádku) —
CSS to čte jako konec komentáře, i když to autor nezamýšlel. Chyba se
navenek neprojeví jako zjevná (appka dál "nějak" vypadá, protože vše
PŘED chybou v souboru projde beze změny) — jen se tiše ztratí všechno
ZA tím místem. Při jakékoliv budoucí podezřelé "nevysvětlitelné"
odchylce chování appky od `theme.css` je `document.styleSheets` →
počet `cssRules` rychlá a spolehlivá první kontrola, jestli se celý
soubor vůbec rozparsoval, jak měl.

**Dodatek:** JK opravenou verzi nahrál sám přímo na GitHub (na jeho
výslovnou žádost "můžeš to nahrát přímo na github" jsem ji ale nahrál
já — jednorázová výjimka z Konvence č. 4 pro tenhle konkrétní kritický
bug, ne změna pravidla natrvalo). Živě ověřeno na
`https://asbeel13.github.io/TOP/` — `theme.css` se teď parsuje přesně
na 2 pravidla (`:root` + `html.dark`), přepínání tmavého/světlého
režimu funguje. JK zároveň nahrál opravenou verzi i na SPA server
(`http://192.168.0.4:3000/theme.css`) — ověřeno stejným způsobem
(88/88 značek komentáře, appka se načítá).

### 2026-09-14 — `theme.css` zapojen do `tydenni_dashboard_mobile.html` (2. ze 5 souborů TOP)

Pokračování fáze "skutečně zapojit". Stejný postup jako u mobilního
přehledu: odstraněn lokální `:root` (9 tokenů, stejné přejmenování
`--p0..--px`→`--tile-p0..px` atd.), ~35 napevno zapsaných barev
nahrazeno `var(...)`, `html.dark` blok zredukován na 5 skutečně
nutných přepisů (zbytek řeší centrálně `theme.css`). Tři dřív schválené
vizuální změny (ikonka opakování, badge vícedenní, `.chip` barvy) i
sjednocení `--bg` tmavého režimu (#0b1220→#0f172a) aplikovány stejně
jako v prvním souboru.

**Strojová kontrola** (stejná metoda — porovnání každé barvy souboru
proti `theme.css`) odhalila **2 nové genuinní mezery**, obě u tlačítek
v modalu detailu úkolu ("Upravit", "Zrušit"): jejich SVĚTLÉ barvy
náhodou seděly s existujícími tokeny (`--tile-p2`, `--danger-soft-border`,
`--prio-p0-text`), ale jejich TMAVÉ barvy se od těchto tokenů
rozcházely — sdílení by tedy v tmavém režimu tiše změnilo vzhled.
Doplněny `theme.css` v1.3.2: `--accent-block-border`/`--accent-block-text`
(tlačítko Upravit) a `--danger-block-border`/`--danger-block-text`
(tlačítko Zrušit), hodnoty přesně podle skutečného kódu.

**Ověřeno** živým `getComputedStyle` testem (stejný injection workaround
jako u prvního souboru): všech ~28 kontrolovaných hodnot světlého i
tmavého režimu sedí přesně, včetně obou nových tokenů a jejich složité
"prohozené" kombinace hodnot v tmavém režimu tlačítek Upravit/Zrušit.
**Soubor zatím nenahraný** — čeká na JK (Konvence č. 4).

Zbývají 3 soubory: `sprava_ukolu_linked.html`,
`tydenni_dashboard_live_reload_local_linked.html`, `tydenni_prehled.html`.

**Dodatek:** JK nahrál oba soubory (`theme.css` v1.3.2 i
`tydenni_dashboard_mobile.html`) na GitHub, ověřeno bajt-po-bajtu a
živě na `https://asbeel13.github.io/TOP/` — `theme.css` se parsuje na
2 pravidla, přepínání režimu funguje, topbar/fab-add mají správné
barvy.

### 2026-09-14 — `theme.css` zapojen do `sprava_ukolu_linked.html` (3. ze 5 souborů TOP)

Tenhle soubor byl jiný než oba mobilní — měl **vlastní odlišnou
základní paletu** (`--bg:#f4f7fb`, `--text:#17324d`, `--muted:#6e7f92`,
`--line:#d9e3ef`, `--accent:#2f78ff`, `--accent-soft:#eaf2ff`,
`--danger:#dc2626`), ne jen jiná jména pro stejné hodnoty jako u
mobilních souborů. **JK rozhodl (2026-09-14): sjednotit na hodnoty
ostatních souborů** — vědomá, schválená vizuální změna CELÉ stránky
(jiné pozadí, tmavší text, jiná modrá/červená), ne tichá.

**Provedeno:**
- Lokální barevné proměnné smazány, zbyly jen 2 nebarevné
  (`--shadow`, `--radius`, stránce vlastní).
- Přejmenování beze změny hodnoty: `--muted`→`--text-muted`,
  `--line`→`--line-soft`, `--ok`→`--success` (zbytek už měl shodné
  jméno s theme.css).
- ~140 napevno zapsaných barev nahrazeno `var(...)` napříč celým
  souborem — jak v `<style>` bloku, tak v JS template literalech
  (dynamicky generované tabulky, badge, Kanban karty, formuláře
  Přehledu aut a Opakujících se pravidel).
- `html.dark` blok zredukován z 41 na 20 pravidel — většina se teď
  odvodí automaticky přes theme.css.
- 2 barvy vědomě ponechány beze změny: `#7c3aed`/`#f5f5f5`
  (vývojářský Debug panel, mimo návrhový systém, viz starší nález) a
  `#e2e8f0` (okraj kategorie vozidla "Provoz Nivnice" — žádný přesný
  ekvivalent v theme.css, nízké riziko, jedno použití).
- 3 nová beze-změny-vzhledu doplnění: `.tab-btn` tmavé pozadí `#111827`
  a `input:focus` tmavý okraj `#3b82f6` nemají přesný token, ponechány
  jako výjimky s komentářem.

**Vedlejší, žádoucí efekt sjednocení:** badge priority/stavu, Kanban
karty a "Zástup" tlačítko dřív v tmavém režimu NEMĚNILY barvu vůbec
(žádný `html.dark` přepis pro ně neexistoval) — teď se přepnou
automaticky, protože sdílené tokeny (`--prio-p0-bg` apod.) mají svou
tmavou variantu. Není to chyba, je to přirozený důsledek napojení na
sdílený systém — zmiňuji to jen pro úplnost, kdyby si JK všiml, že
Správa úkolů teď v tmavém režimu vypadá jinak i na místech, kde předtím
nikdy neměnila barvu.

**Ověřeno:** vyváženost závorek (630/630), počet `<script>` tagů beze
změny (4), žádná nedeklarovaná proměnná, a živý `getComputedStyle`
test (workaround na izolované stránce, ne na živé appce — appka
mezitím vlastním renderováním odpojuje testovací prvky z DOM, poučení
zapsáno níže) — ~30 hodnot světlého i tmavého režimu sedí přesně,
včetně schválených změn (modrá/zelená/červená) i zachovaných hodnot.
**Soubor zatím nenahraný** — čeká na JK.

**Poučení pro budoucí testování:** při `getComputedStyle` testu na
ŽIVÉ appce (ne na statickém souboru) nepřipojovat testovací elementy
do `document.body` — appka (FTLoader polling/render) může mezitím
`body` přerenderovat a testovací prvky nenávratně odpojit z DOM, což
u ancestor-selektorů (`html.dark .x`) tiše vrátí špatné (light) hodnoty,
protože odpojený uzel nemá cestu k `<html class="dark">`. Bezpečnější:
testovat na izolované/prázdné stránce (např. `theme.css` samotné jako
"stránka"), kam se natáhne jen `fetch()`-nutý theme.css text a vlastní
komponentní CSS, žádná cizí app logika.

Zbývají 2 soubory: `tydenni_dashboard_live_reload_local_linked.html`,
`tydenni_prehled.html`.

**Dodatek:** JK nahrál `sprava_ukolu_linked.html`, ověřeno bajt-po-bajtu
i živě (theme.css 2 pravidla, pozadí stránky/panelů správně #0f172a/
#1e293b v tmavém režimu).

### 2026-09-14 — `theme.css` zapojen do `tydenni_dashboard_live_reload_local_linked.html` (4. ze 5 souborů TOP) — 3 třídy chyb nalezeny a opraveny při vlastní kontrole

Tenhle soubor (hlavní Dashboard, ~800řádkový `<style>` blok) měl vlastní
lokální `:root`, ale na rozdíl od Správy úkolů se **skoro všechny
hodnoty přesně shodovaly** s `theme.css` (jen jiná jména u
`--muted/--orange/--blue/--blue-dark/--weekend/--person`, beze změny
hodnoty) — jen `--bg` mělo zanedbatelný rozdíl (#f4f6f8 vs. sdílené
#f0f2f5, sjednoceno bez zvláštního schvalování, na rozdíl od Správy
úkolů) a 3 proměnné (`--green`, `--green-strong`, `--yellow`) byly
potvrzeně mrtvý kód (žádné použití v souboru) — smazány, jak už dřív
navrhoval audit z 2026-08-05.

**Provedeno:** ~140 barev nahrazeno `var(...)`, `html.dark` blok
ponechán z většiny (tenhle soubor má na rozdíl od mobilních vlastní
odlišné tmavé hodnoty pro `.task .meta`/`.task .spz` — přesně jak
predikovala poznámka v `theme.css` v1.3.0, `.task .meta` zůstává
`var(--text)`/`var(--text-faint)` a `.task .spz` `var(--danger)`/
`var(--danger-block)`, NE `--tile-text` jako u mobilu).

**Při vlastní kontrole (před nahlášením JK) nalezeny a opravené 3
třídy chyb způsobené hromadnou `sed` náhradou** — zapisuji podrobně,
je to důležité poučení pro zbývající soubor:

1. **"Prohozená" barva mezi světlým/tmavým tokenem** (stejná chyba
   jako dřív u modalEditBtn/modalCancelBtn, tady poprvé v `html.dark`
   bloku): `html.dark .task.done { color: #bbf7d0; }` — `#bbf7d0` je
   SVĚTLÁ hodnota `--success-soft-border`, ne tmavá. Automatický skript
   namapoval podle prvního nalezeného zdroje bez ohledu na to, že šlo o
   pravidlo UVNITŘ `html.dark` — potřeba `--success-strong` (jehož TMAVÁ
   hodnota je `#bbf7d0`). Stejná chyba u `.task.p3` v tmavém režimu
   (namapováno na `--tile-text`/`--text-faint` místo `--tile-p3`/
   `--tile-p3-border`).
2. **Trvale tmavé prvky bočního panelu (sidebar) omylem dostaly
   proměnné, které se MĚNÍ s režimem** — `#sidebarExpandBtn:hover`,
   vstupní pole sidebaru, `.person-row .move-btn`/`.hide-btn` používaly
   barvy (`#334155`, `#64748b`), které v `theme.css` existují JEN jako
   tmavé varianty jiných tokenů (`--line-soft`, `--text-faint`) — skript
   je namapoval na tyhle proměnné, což by v SVĚTLÉM režimu stránky
   (sidebar je ale vždycky tmavý, nezávisle na režimu appky) tiše
   změnilo jejich vzhled. Opraveno zpět na doslovné hodnoty s
   komentářem — přesně stejná kategorie jako již dříve zdokumentované
   `--text-on-navy-*`/`--border-on-navy` (ty ale HODNOTU nemění nikdy,
   takže s nimi tenhle problém nehrozí).
3. **Barva sdílená mezi dvěma sémanticky nesouvisejícími místy** —
   `.people-list input[type=checkbox] { accent-color: #3b82f6; }`
   (barva zaškrtávátka, sidebar) dostalo omylem `var(--tile-p2-border)`,
   protože stejný hex používá i okraj tmavé dlaždice P2 — ve SVĚTLÉM
   režimu je ale `--tile-p2-border` průhledný, takže by zaškrtávátko
   ztratilo barvu. Vráceno na doslovnou hodnotu.

**Poučení pro poslední zbývající soubor (`tydenni_prehled.html`) i pro
budoucí práci obecně:** hromadná `sed` náhrada hex→proměnná je rychlá,
ale musí se PO KAŽDÉM takovém kroku zkontrolovat: (a) jestli hodnota
uvnitř `html.dark {}` bloku náhodou nedostala SVĚTLOU variantu jiné
proměnné se stejným hexem, (b) jestli natrvalo tmavé prvky (sidebar,
topbar chrome) nedostaly proměnnou, co se MĚNÍ s režimem, jen proto že
její SVĚTLÁ nebo TMAVÁ hodnota náhodou sedí. Bezpečné jsou jen
skutečně invariantní tokeny (`--text-on-navy-*`, `--border-on-navy`,
`--accent`, `--danger`, `--line-medium`...) — u těch tenhle problém
principiálně nemůže nastat.

**Ověřeno:** vyváženost závorek (604/604), žádná nedeklarovaná
proměnná, a `getComputedStyle` test na izolované stránce (theme.css
jako "stránka", ne živá appka) — po opravě všech 3 tříd chyb sedí
všechny kontrolované hodnoty přesně v obou režimech, včetně ověření,
že sidebar prvky jsou skutečně INVARIANTNÍ (stejná barva v obou
režimech, jak má být). **Soubor zatím nenahraný** — čeká na JK.

**Dodatek:** JK nahrál soubor, ověřeno bajt-po-bajtu i živě (pozadí
stránky/sidebaru správně #0f172a/#020617 v tmavém režimu).

### 2026-09-15 — `theme.css` zapojen do `tydenni_prehled.html` (5. z 5, HOTOVO — celá appka TOP zapojená)

Poslední soubor, stejná struktura jako Dashboard (sdílí historii —
"Přehled" i Dashboard vznikly z podobného základu). Na rozdíl od
Dashboardu se tentokrát VŠECHNY lokální proměnné přesně shodovaly s
`theme.css` (žádný rozdíl u `--bg` jako u Dashboardu, žádný mrtvý kód)
— jen jiná jména u `--person/--weekend/--blue/--blue-dark/--orange`.

**Poučeno z chyb nalezených u Dashboardu — tentokrát opraveno PŘED
nahromaděním, ne až při kontrole:** `.task.p3`/`.task.done` v
`html.dark` bloku dostaly rovnou správné tokeny (`--tile-p3`/
`--tile-p3-border`, `--success-strong`), ne ty, co by hromadná náhrada
namapovala automaticky. Sidebar-ekvivalent tady je topbar — `#64748b`/
`#334155` (bez invariantního protějšku v theme.css) zůstaly doslovně s
vysvětlujícím komentářem, `#cbd5e1`/`#94a3b8`/`#475569` (invariantní)
převedeny na proměnné bezpečně.

**Navíc:** `.legend` má neobvyklý, ale ZÁMĚRNÝ vzor — světlá barva
invariantní (`--text-on-navy-muted`), tmavá barva JINÁ
(`--text-faint`, přes samostatný `html.dark .legend` přepis) — tenhle
vzor zachován přesně, ne "opraven" na jednotný invariantní tón.

**Ověřeno:** vyváženost závorek (547/547), 4 `<script>` tagy beze
změny, žádná nedeklarovaná proměnná (`--task-scale` je runtime JS
proměnná, ne z theme.css — v pořádku), a `getComputedStyle` test na
izolované stránce — všechny kontrolované hodnoty světlého i tmavého
režimu sedí přesně napoprvé, včetně tří míst, která byla u Dashboardu
chybná. **Soubor zatím nenahraný** — čeká na JK.

**Tímhle je fáze "skutečně zapojit theme.css do appky" u TOP KOMPLETNÍ
— všech 5 souborů (`tydenni_prehled_mobile.html`,
`tydenni_dashboard_mobile.html`, `sprava_ukolu_linked.html`,
`tydenni_dashboard_live_reload_local_linked.html`,
`tydenni_prehled.html`) je zapojených a otestovaných.**

### 2026-09-15 — `theme.css` doplněn do `sw.js` (PWA cache seznam)

Poslední zbývající krok fáze "zapojit theme.css" — přidán `"theme.css"`
do `APP_SHELL` v `sw.js`, `CACHE_NAME` povýšen z `top-mobile-v1` na
`top-mobile-v2` (stávající `activate` handler už umí smazat starou
cache podle jména, takže je tohle jediné potřebné pro čistou výměnu).
Ověřeno: `node --check` nedostupný na tomhle stroji, ruční kontrola
vyváženosti závorek/hranatých závorek v pořádku (4/4, 1/1). **Soubor
zatím nenahraný** — čeká na JK.

**Tímhle je fáze "sjednocení barevné palety a designu TOP" úplně
uzavřená.** Jediné, co zbývá do budoucna: sledovat případné změny
`theme.css` od SPA strany (Konvence č. 6), a až JK poskytne skutečné
firemní barvy, upravit HODNOTY v `theme.css` — projeví se to
automaticky ve všech 5 souborech TOP i v SPA.

### 2026-09-16 — Sjednocení velikosti tří `.fab-nav` tlačítek v Dashboardu

JK nahlásil (screenshot z mobilu): tři plovoucí navigační tlačítka
("Dovolené (SPA)", "Týdenní přehled", "Správa úkolů") v
`tydenni_dashboard_live_reload_local_linked.html` měla viditelně
různou velikost.

**Příčina:** základní (>720px) pravidlo `.fab-nav` mělo `min-width:
220px; width: auto;` — šířka pilulky se tedy přizpůsobovala DÉLCE
textu (hlavně `.fab-sub` podnadpisu). Živě změřeno na
`https://asbeel13.github.io/TOP/` v šířce 800px: "Dovolené (SPA)"
238px, "Týdenní přehled" 220px, "Správa úkolů" 229px — reálný, i když
ne extrémní rozdíl. (Poznámka: v čistě mobilní šířce ≤720px se už
dřív používalo `width: calc(100% - 28px)`, což je samo o sobě shodné
pro všechny tři — pokud JK viděl výraznější rozdíl přímo na telefonu,
šlo pravděpodobně o okrajovou šířku/mód prohlížeče blízko 720px
hranice, ne o čistě úzký mobilní režim.)

**Oprava:** `min-width:220px; width:auto;` → pevné `width: 240px;`
(240px pokrývá i nejdelší potřebnou šířku beze zalomení textu,
ověřeno živě přímým přepočtem `getBoundingClientRect()` na živé
appce — všechny tři teď 240×64px, žádné zalomení podnadpisu na 2
řádky). Mobilní pravidlo (`calc(100% - 28px)` pod 720px) beze změny —
tam byla shoda už předtím.

**Ověřeno:** vyváženost `{ }` beze změny (607/607 — jen zkrácení 3
řádků na 1, žádná nová/odebraná složená závorka), živě přepočítáno na
`https://asbeel13.github.io/TOP/` v šířkách 800px i 375px (emulace
mobilu) — obě po zásahu ukazují identických 240×64px pro všechna tři
tlačítka, bez zalomení textu. **Soubor zatím nenahraný** — čeká na JK
(Konvence č. 4).

### 2026-09-17 — Sjednocení `sprava_ukolu_linked.html` se zbytkem TOP (barvy + vizuální styl komponent)

JK se zeptal, proč Správa úkolů nevypadá jako zbytek appky. Odpověď
vedla ke genuinnímu nálezu (ne jen k vysvětlení záměrného užšího
rozsahu z 2026-09-15): **`.fab-nav` tu zůstávalo modré**
(`background: var(--accent)`) i po firemním redesignu, zatímco
Dashboard/Přehled mezitím přešly na tmavou antracitovou
(`var(--navy-800)`). Živě ověřeno přes `getComputedStyle` —
`rgb(29, 78, 216)` na obou plovoucích tlačítkách, v OBOU režimech
(žádný `html.dark .fab-nav` přepis tu předtím nebyl). Šlo o zapomenutý
pozůstatek starší, samostatné výjimky ze sjednocení palety
2026-09-14 ("`.fab-nav` je navigační odkaz, ne akce, zůstává modré"),
který nikdo nerevidoval, když Dashboard/Přehled svoje `.fab-nav`
později (2026-09-15, firemní redesign) přebarvily na tmavou.

**Vedlejší nález cestou (jiný soubor, mimo dnešní zadání):**
`tydenni_prehled.html` má stejný typ `.fab-nav` (`background:
var(--navy-800); color: var(--panel);`), ale **bez** `html.dark
.fab-nav` přepisu, který Dashboard má. Živě ověřeno: v tmavém režimu
vychází `color: rgb(30, 41, 59)` (`--panel` tmavá hodnota) na pozadí
`rgb(38, 36, 33)` (`--navy-800`) — text je tam prakticky neviditelný
(oba odstíny tmavé). **Nahlášeno jako samostatný úkol** (spawn_task) —
mimo rozsah dnešního zadání (to bylo cíleně jen o Správě úkolů), čeká
na rozhodnutí/potvrzení.

JK po vysvětlení schválil širší zásah ("barvy + vizuální styl
komponent") — tři změny v `sprava_ukolu_linked.html`:

1. **`.fab-nav` sjednoceno** na stejný vzor jako Dashboard/Přehled:
   `background: var(--navy-800); color: var(--panel);`, hover
   `var(--navy-hover)`, nový `html.dark .fab-nav { background:
   var(--navy-700); color: var(--text); box-shadow: 0 4px 16px
   rgba(0,0,0,0.5); }` (text by jinak zmizel ve tmavém režimu, přesně
   nález popsaný výše u `tydenni_prehled.html`). Zároveň sjednocena i
   ŠÍŘKA (`min-width:220px;width:auto` → pevných `240px`, stejná
   oprava jako u Dashboardu 2026-09-16 výše) — tahle stránka má jen 2
   tlačítka, ale stejná logika platí.
2. **Kanban karty převedeny na `.task-card`/`.priority-tag`**
   (`components.css`) místo bespoke `.kanban-card`/`.badge`/`.kc-*`
   — teď mají stejný pruh+štítek vzhled jako karty v mobilním
   přehledu/dashboardu. Zachovány jen vlastnosti, které `.task-card`
   neřeší (byl navržen pro NEpřetahovací kartový seznam): `cursor:grab`,
   `.dragging`, `.cancelled` — jako scoped přepisy
   `.kanban-col-body .task-card...`, ne úpravou sdílené třídy samotné.
   V tmavém režimu karta zůstává o odstín tmavší než sloupec
   (`var(--bg)` vs. `var(--panel)`) — zachování původního vizuálního
   rozlišení kartička/sloupec, teď jen přes scoped `html.dark
   .kanban-col-body .task-card` přepis místo staré `.kanban-card`.
   `priorityClass()` (vrací `"prio-P0"`..`"prio-PX"` pro starý
   `.badge` v tabulce, beze změny) namapováno na malá písmena
   `"p0"`..`"px"`, která čekají `.priority-tag`/`.task-card` modifiery.
3. **Tlačítko "Nový úkol"** → `class="btn btn-secondary"` místo holého
   `<button>` — stejná třída jako sekundární tlačítka v mobilních
   souborech. `.success`/`.primary`/`.danger` (Uložit změny/modal
   Uložit/Zrušit úkol) beze změny — to je hotovo, ne v rozsahu.

**Vědomě NEZMĚNĚNO** (mimo schválený rozsah): tabulka Databáze úkolů
(`.badge prio-*`, husté řádky — jiný účel než karta), `.tab-btn.active`
(modrá, výběrový stav), `.success`/`.danger`/`.primary` tvar/radius,
ostatní holá tlačítka (Zavřít, Vyčistit filtry, Zástup...), Debug
tlačítko (`#7c3aed`, zdokumentovaná vývojářská výjimka).

**Ověřeno staticky:** vyváženost `{ }` v celém souboru (629/629, dřív
630/630 — čistý úbytek odpovídá zrušení víc starých pravidel, než
kolik přibylo nových), `( )` (1641/1641), žádný zbylý odkaz na
`.kanban-card`/`.kc-title`/`.kc-meta`/`.kc-overdue`.

**✅ Nahráno a živě ověřeno (2026-09-17):** JK nahrál `sprava_ukolu_linked.html`
zároveň s `theme.css`/`components.css`. `cmp` (ne jen `git diff --stat`,
viz poučení z 2026-08-05) potvrdil byte-po-bytu shodu se všemi třemi
lokálními soubory. `getComputedStyle` na živé stránce (transition
dočasně vypnuté kvůli přesnému měření) potvrdil `.fab-nav`: světlý
režim `#262421`/bílý text, tmavý režim `#322f2a`/`#e2e8f0` — přesně
plánovaná oprava čitelnosti. Šířka `.fab-nav` přesně `240px`. Tlačítko
"Nový úkol" má `class="btn btn-secondary"`. **Kanban karty
(`.task-card`/`.priority-tag`) se nedalo ověřit vizuálně** — appka bez
GitHub tokenu nemá žádná data (0 úkolů), token nezadávám (bezpečnostní
pravidlo) — skutečný vzhled karet s reálnými daty ověří JK sám.

**Dodatečný nález po nahrání — JK poslal screenshot:** aktivní záložka
(`.tab-btn.active` — "Databáze úkolů"/"Přehled aut"/"Opakující se
úkoly") zůstala na `var(--accent)` (klasická modrá `#1d4ed8`), zatímco
zbytek appky je po redesignu antracit+oranžová. Byla to vědomá výjimka
ze sjednocení palety 2026-09-14 ("modrá = stav výběru, ne CTA", stejné
rozlišení jako `.side-btn.active-L` v mobilních souborech) — vizuálně
ale teď trčí jako jediný sytě modrý prvek v jinak antracitové appce.
**JK se rozhodl (`AskUserQuestion`): přebarvit na tmavou antracitovou**
(ne na oranžovou, ne ponechat modrou). Provedeno: `.tab-btn.active` →
`var(--navy-800)`/bílý text (světlý režim), `html.dark .tab-btn.active`
→ `var(--navy-700)`/`var(--text)` (tmavý režim) — stejné tokeny a stejný
vzorec světlá/tmavá jako u `.fab-nav` výše, takže hodnoty jsou už
prokazatelně správné (ověřeno naživo u `.fab-nav`), není potřeba
duplikovat test. Ověřeno staticky: vyváženost `{ }` beze změny
(629/629), `( )` 1641→1642 (+1 pár odpovídá přesně jedné náhradě
`color:#fff`→`color:var(--text)` v tmavém pravidle). Žádná jiná
konfliktní deklarace `.tab-btn.active` v souboru (jen tahle dvě
pravidla). **Soubor zatím nenahraný** — čeká na JK (Konvence č. 4).

### 2026-09-17 — Audit napevno zapsaných barev ve `sprava_ukolu_linked.html` (na žádost JK) + 2 genuinní nálezy opraveny

JK požádal o kompletní průchod souboru na napevno zapsané barvy (hex,
`rgba()`, klíčová slova `white`/`black`...). Nalezeno a roztříděno:

- **5 už dřív zdokumentovaných výjimek** (beze změny, nízké riziko):
  `html.dark .tab-btn` pozadí `#111827`, tmavý focus okraj `#3b82f6`,
  Debug tlačítko + Debug panel (`#7c3aed`/`#f5f5f5`/`background:white`,
  vývojářský nástroj mimo návrhový systém), okraj kategorie vozidla
  "Provoz Nivnice" (`#e2e8f0`).
- **Stíny/překryvy `rgba(0,0,0,…)`** (13 výskytů) — čistě dekorativní
  efekty, stejný vzorec jako `--shadow` proměnná v `theme.css` samotném,
  netokenizují se ani jinde v appce — nejde o nekonzistenci.
- **4 genuinní, dosud nezapsané nálezy** — dva opraveny na žádost JK:
  1. `.tab-btn.active { color:#fff }` (světlý režim) → `var(--panel)` —
     stejný token, jaký používá `.fab-nav` pro totéž (bílý text na tmavém
     pozadí), literál byl pozůstatek vlastní nedávné úpravy z téhož dne.
  2. `showReadOnlyRedirect()` (obrazovka "Nemáš oprávnění k úpravám",
     zobrazí se needitovanému uživateli a přesměruje na Přehled) —
     vůbec nededila firemní typografii (`font-family:sans-serif`) a měla
     napevno `background:rgba(15,23,42,0.94)`/`color:white`. Opraveno na
     `background:color-mix(in srgb, var(--bg) 94%, transparent)`,
     `color:var(--text)`, `font-family:var(--font-body)` (+ nadpis
     `var(--font-heading)`), podnadpis `var(--text-on-navy-muted)` →
     `var(--text-muted)` (aby seděl k nově adaptivnímu pozadí místo
     natvrdo tmavého). `initDarkMode()` běží synchronně na začátku
     souboru, dřív než tahle obrazovka může nastat, takže `html.dark`
     třída je vždy správně nastavená předem — přechod na proměnné je
     bezpečný, obrazovka se teď chová stejně v obou režimech místo
     natvrdo tmavého vzhledu.
  3–4. (ponechány beze změny, nebyly součástí zadání) — `btnStyle` pro
     "Vyřadit" u vozidel (`background:white`, možná stejná past jako
     kdysi u modalu Řešitelé) a tlačítko "Obnovit" (`color:white` místo
     tokenu) ve `renderAutaManagementLists()`.

**Ověřeno staticky:** vyváženost `{ }` beze změny (629/629), `( )`
1642→1647 (+5 párů odpovídá přesně součtu nových `var()`/`color-mix()`
volání ve dvou opravách).

**✅ Nahráno a živě ověřeno (2026-09-17):** `cmp` potvrdil byte-po-bytu
shodu s GitHub Pages. `getComputedStyle` potvrdil `.tab-btn.active`
světlý režim `#262421`/bílá (`var(--panel)`) — beze změny vzhledu, jen
literál nahrazen tokenem. `showReadOnlyRedirect()` je uzavřená v IIFE
(needostupná z konzole, viz "Časté testovací pasti") — ověřeno replikací
přesného `cssText` řetězce na izolovaném prvku: `color-mix(in srgb,
var(--bg) 94%, transparent)` dává `rgb(15,23,42)` @ 94 % (identické se
starou `rgba(15,23,42,0.94)`), `var(--text)` dává `#e2e8f0`,
`var(--font-body)` se rozparsuje na `"Work Sans", Arial, Helvetica,
sans-serif` — obrazovka "Nemáš oprávnění" teď vizuálně vypadá stejně
jako předtím, ale je theme-aware a má firemní font.

### 2026-09-17 — Oprava vedlejšího nálezu: neviditelný text `.fab-nav` v `tydenni_prehled.html` v tmavém režimu

Navazuje na nález ze sekce výše (spawnutý jako samostatný úkol,
teď dokončený ve stejné konverzaci). `tydenni_prehled.html` má
stejné `.fab-nav` jako Dashboard (`background: var(--navy-800);
color: var(--panel);`), ale chyběl mu Dashboardův `html.dark .fab-nav`
přepis. V tmavém režimu je `--panel` tmavá (`#1e293b`) na stejně
tmavém `--navy-800` (`#262421`) — text tlačítka "Dovolené (SPA)" byl
prakticky nečitelný. Živě potvrzeno předem přes `getComputedStyle`
(`color: rgb(30, 41, 59)` na `background: rgb(38, 36, 33)`).

**Oprava:** doplněn identický `html.dark .fab-nav { background:
var(--navy-700); color: var(--text); box-shadow: 0 4px 16px
rgba(0,0,0,0.5); }` jako v Dashboardu — vloženo hned za mobilní
`@media` blok `.fab-nav`, před `html.dark button, html.dark select,
html.dark input` (ten cílí jen na `button`/`select`/`input`, `.fab-nav`
je `<a>`, takže tu na rozdíl od Dashboardu žádná specificitní past s
`.primary`/`#todayBtn` nehrozí).

**Ověřeno staticky:** vyváženost `{ }` v celém souboru (549/549, dřív
548/548 — +1 pár odpovídá přesně jednomu novému pravidlu). **Soubor
zatím nenahraný** — čeká na JK (Konvence č. 4), pak živé ověření
`getComputedStyle` v tmavém režimu na `https://asbeel13.github.io/TOP/`.

### 2026-09-17 — Kontrola kódu TOP (+ vazby na SPA): 18 nálezů, opraveny 2 nejzávažnější

JK zadal průchod celého kódu TOP s ohledem na propojení se SPA
(`topSync.js`). Výsledek: seznam 18 nálezů (2 vysoké, 7 středních, 9
nízkých) předaný JK v konverzaci; JK schválil opravu bodů 1 a 2, zbytek
zatím neopraven (viz "Neopravené nálezy" níže).

**1) `tydenni_prehled.html` — 110 kB reálných produkčních dat natvrdo v
kódu (VYSOKÁ, opraveno).** `FALLBACK_DATA` na řádku 562 obsahovalo 252
skutečných úkolů (snapshot z 2026-04-20, včetně názvů zakázek a
poznámek) — veřejně čitelné na GitHub Pages bez tokenu. Je to totožný
nález jako kritická oprava č. 5 z auditu 2026-08-05, která ale byla
provedena **jen v Dashboardu**; Přehled zůstal přehlédnutý. Nahrazeno
prázdnou kostrou `{"tasks": [], "backlog": [], "owners": [],
"resitele": [], "generatedAt": null}` (stejné klíče, stejný tvar jako v
Dashboardu). Soubor se zmenšil ze 156 kB na 44 kB. Ověřeno: žádný
výskyt reálných dat (`grep "VERA 3NINE"` = 0), syntaxe OK (načtení v
prohlížeči bez `SyntaxError`), CRLF konce řádků zachované, diff proti
HEAD = přesně 1 změněný řádek (+ už čekající `.fab-nav` oprava výše).
**Past cestou:** první náhrada přes `awk` v Git Bash tiše odstranila
VŠECHNY `\r` (CRLF → LF v celém souboru, `git diff` hlásil 1119 změněných
řádků) — obnoveno přes `perl -pi -e 's/\r?\n/\r\n/'`. **Poučení:** po
hromadné textové náhradě přes unixové nástroje na těchhle CRLF souborech
vždy zkontrolovat `file` / počet `\r` a `git diff --numstat`, ne jen
obsah změněného řádku.

**2) `sprava_ukolu_linked.html` — editace v modalu mohla přepsat JINÝ
úkol (VYSOKÁ, opraveno).** `loadFromRaw()` přidělovalo `rowIndex = i+1`
podle POZICE v `tasks[]` a přepočítávalo ho při každém příchodu nových
dat (polling 5 s, storage event z jiné záložky). Na `rowIndex` přitom
odkazuje `currentEditIndex` otevřeného modalu, `cancelSingleTask`,
Kanban drag i zaškrtnutí řádků. Pokud se během otevřeného modalu změnilo
pořadí pole, `saveTaskFromModal` udělalo `Object.assign` (včetně ID!) na
úplně jiný úkol — tiše, bez chyby. **SPA sync pořadí mění pravidelně:**
odfiltruje `*SPA` úkoly a připojí je na konec, takže každý TOP úkol
založený po posledním syncu se posune o počet SPA úkolů. Oprava:
- Nová `taskIdentityKey(t)` = `JSON.stringify(taskToRawFormat(t))` —
  otisk obsahu v normalizovaném tvaru (nezávislý na pozici i na tom, kdo
  soubor naposledy uložil).
- `loadFromRaw()` si před přepsáním `tasks` uloží mapu otisk → předchozí
  objekty; každý nově načtený úkol se spáruje s předchozím stavem a
  převezme jeho `rowIndex` **a** `selected` (zaškrtnutí teď přežije
  reload — dřív se resetovalo při každém pollu). Nový nebo cizím zásahem
  změněný úkol dostane nové, dosud nepoužité číslo (`max+1`, roste
  monotónně). Interní `_key` se nikam neukládá (`taskToRawFormat`
  vyjmenovává pole explicitně, viz Nástraha č. 1).
- `saveTaskFromModal` a `cancelSingleTask`: pokud úkol s `currentEditIndex`
  už v paměti není (= mezitím ho někdo jiný upravil/smazal), zobrazí
  srozumitelný `alert` a NEuloží nic — dřív se změna buď tiše zahodila
  (`if (existing)` bez else, ale `autoSaveIfPossible()` proběhlo), nebo
  se zapsala do cizího úkolu. Tohle je zároveň první skutečná detekce
  konfliktu při editaci existujícího úkolu (viz "Nevyřešeno" u
  2026-08-13 — plný snapshot v `saveWorkbook()` zůstává beze změny).
- Dva zástupy za stejné pravidlo (stejné `id`, jiné datum) dostávají
  odlišné `rowIndex` — otisk zahrnuje `plannedDate`.

Ověřeno: vyváženost `{ }` 633/633, `( )` 1674/1674; syntaxe načtením v
prohlížeči (bez `SyntaxError`, skript doběhl až k `FTLoader.init`).

**Srovnávací test stará vs. nová verze (na žádost JK, stejná metoda
jako u kritické opravy 2026-08-21):** z opraveného souboru i z verze na
GitHubu (`git show HEAD:...`) vyrobena testovací kopie, kde je
`<script src="ft_loader.js">` nahrazen inline STAVOVÝM mockem
(`getRawJson()` vrací kopii "serveru", `saveToGitHub()` do něj zapíše a
zaloguje PUT, `__externalChange()` simuluje příchod cizí změny přes
polling), `localStorage` nahrazen in-memory shim (data: URL ho nemá),
`alert`/`confirm` zachytávané. Scénář: otevřený modal na úkolu C
(`rowIndex 4`) → SPA sync přeskládá `tasks[]` (`*SPA7*` na konec) a
přibude nový úkol D → uložení "C UPRAVENO" → pak modal na A, kolega
mezitím A upraví, uložit "A MOJE VERZE".

| | Stará verze (HEAD) | Opravená verze |
|---|---|---|
| Po přeskládání `rowIndex 4` ukazuje na | **D** (`*T999*`) | C (`*T123*`) |
| Uložený `tasks[]` | `*0001* *0002* *T123* *T123* *SPA7*` — **D zmizel, `*T123*` je 2×** | jen `*T123*` má nový název, ostatní 4 beze změny |
| Zaškrtnutí B po pollu | ztraceno | zachováno |
| Cizí úprava A + moje uložení | **tiše přepsáno** na "A MOJE VERZE", žádné varování | odmítnuto (alert), žádný PUT, v DB zůstala kolegova verze |

Stará verze tedy chybu přesně reprodukuje (ztráta úkolu D + duplicitní
ID — stejná třída následku jako incident 2026-08-21), opravená ne.
Testovací kopie byly jen dočasně ve složce TOP (prohlížeč v Claude Code
nepustí skripty u souborů mimo projekt) a jsou smazané; mock
(`mock_ftloader.js`) + shim zůstaly ve scratchpadu session — postup
(perl náhrada `<script src>` za inline mock) je snadno zopakovatelný.
**Oba soubory zatím nenahrané** — čeká na JK (Konvence č. 4).

**3) `ft_loader.js` — ověření role z whitelistu se po prvním úspěchu už
nikdy neopakovalo (STŘEDNÍ, opraveno — druhé kolo, JK schválil).**
`init()` volalo `resolveUserFromWhitelist()` jen když v localStorage
chyběl příznak `ftUserVerified === "true"` — výsledek prvního ověření
tak platil napořád. Změna role (Plánovač → Operátor/Nahlížeč) nebo
vyřazení uživatele z `users.json` se v už ověřeném prohlížeči nikdy
neprojevily, dokud si uživatel sám nesmazal localStorage. Oprava:
ověření běží při KAŽDÉM startu stránky (cena = 1 GET `users.json`
navíc); při síťové chybě `resolveUserFromWhitelist()` příznaky nemění,
takže poslední známý stav zůstává (žádný výpadek přístupu offline).
Navíc nový příznak `_verifyDone` — polling nezačne stahovat
`database.json`, dokud ověření nedoběhne, ať první `onData` (kde
Dashboard/Správa úkolů rozhodují o roli) nikdy neběží se zastaralou
rolí. Vyváženost `{ }` 186/186, `( )` 511/511 (+2 páry = přesně dva nové
callbacky). Týká se VŠECH 5 stránek (sdílený soubor).

**4) Správa úkolů — filtr "Řešitel" se nikdy neobnovil po reloadu
(STŘEDNÍ, opraveno — druhé kolo).** `restoreSpravaFilterState()` běžela
hned na začátku `loadFromRaw()`, kdy `#filterAssignee` (v HTML prázdný
`<select>`) ještě neměl žádné `<option>` — nastavení `value` na
neexistující option ho vrátí na `""`, a následné `applyFilters()` →
`saveSpravaFilterState()` tu prázdnou hodnotu zapsalo zpět, takže se
uložený filtr přepsal při každém načtení stránky. Ostatní filtry
(Stav, Priorita…) mají options staticky v HTML, proto fungovaly.
Oprava: blok obnovení přesunut až ZA `fillAssigneeFilter()` (pořád jen
jednou, `_filtersRestoredOnce`), před `applyFilters()`.

**Srovnávací test 3 + 4 (stejná harness jako u bodu 2):** pro
`ft_loader.js` samostatná stránka s inline kopií souboru, `fetch`
nahrazen mockem (`users.json`/`database.json`/`activity.json` z paměti,
přepínače síťová chyba / "visící" požadavek), `hashToken` v testovací
kopii nahrazen `"HASH-" + token` (data: URL nemá `crypto.subtle`).
Výchozí stav localStorage: token, `ftUserVerified="true"`,
`ftUserRole="planovac"`; v `users.json` mezitím role `operator`.

| Scénář | Stará verze (HEAD) | Opravená verze |
|---|---|---|
| Role po startu / při prvním `onData` | `planovac` / `planovac` — **`users.json` se vůbec nestáhl** | `operator` / `operator`, pořadí `GET users.json` → `GET database.json` |
| Uživatel vyřazen z whitelistu | zůstává `verified=true`, `planovac` | `verified=false`, role `null` |
| Síťová chyba při ověření | — | poslední známý stav zachován (`planovac`, verified) |
| Ověření "visí" 5,6 s | — | polling `database.json` neproběhl (jen `GET users.json`) |
| Správa úkolů: uložený filtr Řešitel = `DH`, po načtení | value `""`, uloženo `""`, zobrazeny oba úkoly (RS i DH) | value `DH`, uloženo `DH`, zobrazen jen úkol DH |

Testovací kopie opět dočasně ve složce TOP, po testu smazané. **Soubory
zatím nenahrané** — čeká na JK (Konvence č. 4): k původní sadě přibyl
`ft_loader.js`.

**5) Správa úkolů — každý poll překreslil tabulky Aut/Opakujících se
úkolů/Výjimek/Dokončení, i když se data vůbec nezměnila (STŘEDNÍ,
opraveno — třetí kolo, JK schválil).** `loadFromRaw()` volalo
`renderAutaTable()`/`renderOpakovaciTable()`/`renderVyjimkyTable()`/
`renderDokonceniTable()` bezpodmínečně při KAŽDÉM přenačtení dat —
polling 5 s, a hlavně SPA sync (zapisuje do `tasks[]` každých ~8 s),
který se téhle části dat vůbec netýká. Přepsání `innerHTML` smazalo
rozepsané formuláře ("Přidat pravidlo", "Rezervace", "Nové vozidlo") i
neuloženou inline editaci existujícího pravidla (input má jen
`onchange`, ne `oninput` — text bez opuštění pole zmizel). Oprava: čtyři
nové proměnné (`_lastRawAuta`/`_lastRawOpakovaci`/`_lastRawVyjimky`/
`_lastRawDokonceni`) drží `JSON.stringify` syrových dat z PŘEDCHOZÍHO
volání `loadFromRaw`; render se spustí, jen když se odpovídající pole
oproti minule skutečně liší. `renderOpakovaciTable()` čte i `resitele`
(dropdown Řešitel u pravidla), proto je součástí jejího klíče.
Manuální akce (Přidat/Smazat/Vyřadit/Zaškrtnout aktivní…) volají
`render*` přímo mimo `loadFromRaw` a fungují beze změny.

**6) Duplicitní ID u "zástupu" — `find(t => t.id === id)` bez ohledu na
datum mohl zapsat/otevřít ŠPATNÝ záznam (STŘEDNÍ, opraveno — třetí kolo).**
`openSubstituteModal`/`saveSubstituteModal` nekontrolují kolizi — dva
zástupy za STEJNÉ opakující se pravidlo v různých obdobích dostanou
STEJNÉ `id` (rovné id pravidla). Dřívější oprava (2026-08-05) srovnávala
`rawTask.plannedDate !== plannedDate`, ale jen když byl klikaný výskyt
`recurring: true` — u vícedenního zástupu (`isMultiDay`, ne `recurring`)
se vůbec neaplikovala, takže `markTaskAsDoneFromModal` ve všech 4
souborech (Dashboard, Přehled desktop, oba mobily) mohlo zapsat
`completedDays` do prvního nalezeného záznamu se stejným id, ne do
klikaného. Stejně tak Dashboardovo "✏️ Upravit"/"🗑 Smazat" (odkaz
`sprava_ukolu_linked.html?id=...`) otevřelo/smazalo první nalezený.

Oprava: nová sdílená `FTLoader.findRawTaskForOccurrence(rawTasks, id,
plannedDate)` v `ft_loader.js` — mezi všemi kandidáty se stejným id
vybere ten, jehož SKUTEČNÝ rozsah dní (respektuje `durationDays`/
`activeDays`, stejná logika jako už existující
`getMultiDayOccurrenceDates`) klikaný den opravdu obsahuje. Nahrazuje
dřívější ad-hoc kontrolu ve všech 4 `markTaskAsDoneFromModal`. Dashboard
navíc posílá `&datum=` v odkazu Upravit (a `dataset.plannedDate` u
Smazat); `sprava_ukolu_linked.html` má novou `findTaskForOccurrence(id,
datum)` (stejný princip, nad vlastním `tasks` polem) použitou v
`handleUrlParams()` pro `urlId` i `deleteId` větev — bez data (starší
odkaz) padá zpátky na první nalezený jako dřív, žádná regrese.

**Srovnávací test (stejná harness jako u bodů 1–4, mock rozšířen o
skutečnou implementaci `getMultiDayOccurrenceDates`/
`findRawTaskForOccurrence`, ne stub):** dva zástupy `RFT015` (Z1: od
2026-09-01, 5 dní; Z2: od 2026-09-20, 5 dní), kliknuto "Hotovo" na
2026-09-22 (3. den Z2).

| | Stará verze (HEAD) | Opravená verze |
|---|---|---|
| `completedDays` zapsáno do | **Z1** (`09-01`, špatný záznam) | Z2 (`09-20`, správný záznam) |

Ověřeno na všech 4 souborech (Dashboard, Přehled desktop, mobilní
Přehled, mobilní Dashboard) — opravená verze všude zapsala do Z2, stará
HEAD verze (testováno na Dashboardu jako reprezentativním vzorku,
zbylé 3 mají identickou kopii kódu) do Z1. `findTaskForOccurrence` ve
Správě úkolů samostatně ověřena: den `09-22` → Z2, den `09-02` → Z1, bez
data → první nalezený (Z1, zpětná kompatibilita). Bod 5 ověřen srovnáním
proti HEAD stejně jako u bodu 1–4 (SPA-sync-like změna `tasks[]` beze
změny auta/pravidel → stará verze formuláře smaže, opravená ne; skutečná
změna auta → obě verze re-renderují, opravená správně). Žádné chyby v
konzoli na žádné z testovaných stránek. Testovací kopie opět dočasně ve
složce TOP, po testu smazané.

**Soubory zatím nenahrané** — čeká na JK (Konvence č. 4): k sadě přibyly
`tydenni_dashboard_live_reload_local_linked.html`, `tydenni_prehled.html`,
`tydenni_prehled_mobile.html`, `tydenni_dashboard_mobile.html` (jen
lookup fix) a znovu `ft_loader.js`/`sprava_ukolu_linked.html`.

### 2026-09-17 — Kontrola kódu TOP: dokončeny zbylé nálezy 7–18 (čtvrté kolo)

JK zadal opravu všech zbylých nálezů z kontroly kódu (viz předchozí tři
kola výše). Nález č. 8 (SPA strana, zkratka/sync trigger) byl vyřešen
samostatně už dřív týž den — viz `INTEGRACE.md`. Tady zbylých 11 bodů
(7, 9–18), rozdělené mezi SPA (`topSync.js`) a TOP.

**7) `topSync.js` — sync bez horní hranice + `lastUpdated` vždy nové
(SPA strana, STŘEDNÍ, opraveno).** `selectSchvaleneProSync` teď má
`AND e.datum_do >= date('now', ?)` s novou proměnnou
`TOP_SYNC_RETENTION_DAYS` (výchozí 14 dní grace period po konci
dovolené — zdokumentováno v `.env.example`). `vytvorUkol()`'s
`lastUpdated` teď bere `radek.schvaleno_kdy` (přidáno do SELECTu),
fallback na `new Date().toISOString()` jen pro starší řádky bez tohohle
pole. Modifikátor pro `date()` sestaven v JS (`` `-${RETENTION_DAYS}
days}` ``) a poslán jako jeden bound parametr, ne skládán uvnitř SQL
řetězcem — jednodušší a bez rizika implicitní konverze typů.

**9) `ft_loader.js` — `updatedBy`/committer bral neověřenou hodnotu
(NÍZKÁ, opraveno).** `saveToGitHub()` četlo přímo
`localStorage.getItem(USER_KEY)` (= cokoliv napsané do dialogu při
zadání tokenu) místo veřejně exponovaného `FTLoader.getCurrentUser()`,
který správně upřednostňuje whitelistem ověřenou `ftResolvedUser`.
Opraveno na `getCurrentUserFromConfig()` (stejná funkce, kterou uvnitř
volá `getCurrentUser()`).

**10) `sw.js` (NÍZKÁ, opraveno).** `APP_SHELL` doplněn o `components.css`
(obě mobilní stránky ho od 2026-09-15 načítají, cache verze povýšena na
`top-mobile-v3`). Fetch handler: cachuje se jen `response.ok` (dřív se
ukládaly i 404/500 odpovědi jako "poslední dobrá" verze); `catch` větev
teď vrací `cached || new Response(..., {status:503})` místo
`caches.match(...)`, které bez shody vrací `undefined` a shodí celý
fetch TypeErrorem.

**11) Správa úkolů `openSubstituteModal` nabízela i vyřazené řešitele
(NÍZKÁ, opraveno).** Doplněn `.filter(r => !r.vyrazen)`, stejně jako
Dashboardova vlastní kopie modalu měla už od auditu 2026-08-05.

**12) `checkAutoWarning` nevylučovala zrušené úkoly (NÍZKÁ, opraveno).**
Doplněno `!t.cancelled &&` do conflict-checku, stejně jako sesterská
`getAutoDostupnostDen()` už měla.

**13) Kanban/editace: přesun pryč z "Dokončeno" nemazal `completedDays`
(STŘEDNÍ, opraveno).** U vícedenního úkolu dřív dokončeného po
jednotlivých dnech (Dashboard "Hotovo") `expandMultiDayTasks()` v
`ft_loader.js` bere `dayDone` (z `completedDays`) přednostně před
`task.state` — takže by TOP appka pořád ukazovala všechny dny jako
hotové, i když přetažení karty mimo sloupec "Dokončeno" (nebo změna
stavu v editačním modalu) mělo úkol viditelně "znovuotevřít". Oprava v
`kanbanDrop()` i `saveTaskFromModal()`: při přechodu na jiný stav než
"Dokončeno" se `completedDays` vyprázdní, pokud předtím něco obsahovalo.
(`percent` zůstává beze změny — ověřil jsem, že to pole TOP task schéma
vůbec nemá, `taskToRawFormat()` ho nikdy neserializuje; jde o vědomě
odstraněné pole z UI, ne o bug, viz komentář "m_percent odstraněno" u
modalu.)

**14) Dashboard — jméno/zkratka v hlavičce řádku bez `escapeHtml`
(NÍZKÁ, opraveno).** `renderScheduleForSide()`'s `personCell.innerHTML`
teď escapuje `person`/`PEOPLE_LABELS[person]`, stejně jako to už
Přehled dělal (audit 2026-08-05 opravil jen tam).

**15) Dashboard — zápisové funkce bez vnitřní kontroly oprávnění
(STŘEDNÍ, opraveno).** Tlačítka "👥 Řešitelé"/"↺ Obnovit tovární
nastavení" dostala `class="can-write-only"` (bezpečné podle Nástrahy
č. 9 — žádná vlastní JS podmínka viditelnosti navíc). Pěti zápisovým
funkcím (`saveResiteleChange`, `addNewResitel`, `markTaskAsDoneFromModal`,
`saveSubstituteModal`, `saveNewTaskFromModal`) přidána `if
(!document.body.classList.contains("can-write")) { alert(...); return;
}` jako první řádek — stejný vzor jako mobilní Dashboard (2026-09-08).

**16) Mrtvý kód odstraněn (NÍZKÁ, opraveno).** Dashboard: smazány
`XLSX_FILE`/`LOCAL_WATCH_INTERVAL_MS`/`normalizeOwner`/`excelDateToISO`/
`parseBool` (nikde v souboru dál nepoužité — grep ověřen) a `<script
src=".../xlsx@0.18.5/...">` (~1 MB knihovna se stahovala, ale appka
`XLSX.*` nikdy nevolala). Přehled: stejně `XLSX_FILE`/
`LOCAL_WATCH_INTERVAL_MS` + stejný xlsx script tag. **Vědomě
NEODSTRANĚNO:** `index.html`/`config.js` — `config.js` je AKTIVNĚ
používaný fallback (`ft_loader.js` čte `window.FT_CONFIG?.token`), ne
mrtvý kód, můj původní nález byl v tomhle bodě nepřesný. `index.html`
(starý OAuth redirect, `ft_pendingToken` potvrzeně nikým nečtený,
soubor odnikud neodkazovaný) je pravděpodobně skutečně mrtvý, ale
mazání celého souboru je jiná kategorie rizika než úprava kódu uvnitř
— ponecháno na tvém rozhodnutí, ne provedeno automaticky.

**17) `showReadOnlyRedirect` — natvrdo barvy/`sans-serif` (NÍZKÁ,
opraveno).** Opraveno v Dashboardu i mobilním Dashboardu. **Ne** stejným
vzorem jako Správa úkolů (`--bg`/`--text`, theme-aware) — místo toho
invariantní `--navy-900`/`--text-on-navy-softer`/`--text-on-navy-muted`
tokeny (obrazovka zůstává záměrně VŽDY tmavá, jako trvalý sidebar/chrome
koncept, který Správa úkolů nemá; mobilní verze už `--text-on-navy-muted`
částečně používala, což byl signál pro tenhle záměr). `rgba(15,23,42,…)`
byla navíc stará cool-slate barva z doby PŘED firemním redesignem
2026-09-15 — nahrazením `--navy-900` (teplá antracitová) se obrazovka
sjednotila s barvou zbytku chrome, ne jen "opravil hardcoded kód".

**18) `ft_loader.js` — `init()` mazal sdílenou cache (NÍZKÁ, opraveno).**
`localStorage.removeItem(DATA_KEY)` bezpodmínečně při každém `init()`
(historicky jednorázová migrace špatného kódování, dávno vyřešená)
nahrazeno kontrolou — cache se maže, jen když `JSON.parse` selže
(skutečně poškozená). Otevření druhé záložky appky tím přestává mazat
platnou, čerstvou cache první záložky.

**Ověření (Node.js nedostupné pro SPA stranu, browser harness pro
TOP):** bod 7 — simulace `vytvorUkol()`'s `lastUpdated` logiky jako čistý
JS (bere `schvaleno_kdy`, fallback na `now()`), SQL syntaxe `date('now',
?)` standardní/dobře zdokumentovaná, nespuštěno živě (žádné SQLite
odsud). Body 9, 18 — mock `FTLoader`/`fetch`, ověřeno: `committer.name`
teď "JK" (ověřená zkratka) místo "cokoliv" (dialog); platná cache z
"druhé záložky" přežije `init()` beze změny, poškozená (`{neplatny
json` se smaže. Bod 10 — `sw.js` spuštěn v mockovaném service-worker
prostředí (`self`/`caches`/`fetch` mocky, syntetické `install`/`fetch`
eventy): `components.css` v `APP_SHELL`, 200 odpověď se cachuje, 404 NE,
offline+necachováno vrací `Response{status:503}` (ne `undefined`),
offline+cachováno vrací cachovaný obsah. Body 11–15 — scénáře na
mockované Správě úkolů/Dashboardu (vyřazený řešitel v nabídce zástupu,
varování jen u aktivního konfliktu, `completedDays` prázdné hned po
Kanban dropu i po uložení modalu — synchronně, než async
save/reload cokoliv přepíše, XSS payload v jménu řešitele escapovaný v
`personCell.innerHTML`, tlačítka `can-write-only` `display:none`/
`inline-block` podle třídy na `body`, všech pět zápisových funkcí
zavolaných přímo bez `can-write` vrátí alert a `putsAttempted: 0`).
Bez chyb v konzoli na žádné testované stránce. Vyváženost `{ }`/`( )`
sedí ve všech upravených souborech (TOP i `topSync.js`). Testovací
kopie dočasně ve složce TOP, po testu smazané.

**Soubory zatím nenahrané** — čeká na JK (Konvence č. 4): k sadě
přibyl `sw.js`. SPA strana (`topSync.js`, `.env.example`) vyžaduje
restart SPA serveru, žádná DB migrace.
### 2026-09-18 — KRITICKÁ OPRAVA: appka přestala číst `database.json` (soubor přerostl limit GitHub Contents API)

Souvisí s novou funkcí sync státních svátků ze SPA (`topSync.js`, viz
`Esperanto/INTEGRACE.md` sekce 5) — po prvním syncu (+620 úkolů:
35 dovolené + 585 svátků) JK nahlásil v TOP appce `Chyba načtení:
Unexpected end of JSON input`. Appka přestala načítat data úplně.

**Kořenová příčina:** `top-data/database.json` přerostl ~1 MB — GitHub
Contents API nad tuhle hranici v běžné JSON odpovědi na GET pole
`content`/`encoding` vůbec nevrací (jen `sha`/`size`/`download_url`).
`fetchFromGitHub()` čekalo `data.content` bezpodmínečně — dostalo
`undefined`, `atob(undefined...)` resp. navazující dekódování skončilo
prázdným/neplatným řetězcem, `JSON.parse()` na tom spadl přesně s
"Unexpected end of JSON input". Potvrzeno přímo — JK stáhl
`database.json` lokálně, velikost 1,26 MB.

**Souběh příčin, ne jen svátky:** appka měla i PŘED svátky už 1530+
produkčních úkolů, takže soubor byl blízko hranice sám o sobě — sync
svátků byl spouštěč, ne jediná příčina. Bez zásahu by appka na stejnou
zeď časem narazila i bez týhle nové funkce.

**Postup řešení (týž den, s JK průběžně):**
1. **Okamžitá SPA-side oprava** (`topSync.js`) — `nactiSoubor()` dostal
   fallback na `Accept: application/vnd.github.raw+json`, když
   `content` v odpovědi chybí (funguje do 100 MB); `ulozSoubor()`
   přepnut z odsazeného na kompaktní `JSON.stringify()`. Po nasazení
   JK appka zase naběhla — soubor klesl na 882 kB.
2. **JK se zeptal, jak řešit limit dlouhodobě** — probráno teoreticky:
   (a) stejná oprava čtení i v TOP `ft_loader.js` [tenhle zápis], (b)
   zúžit okno svátků (provedeno na SPA straně, 3→2 roky, 585→390
   úkolů), (c) archivace starých dokončených úkolů TOP (nezadáno), (d)
   rozdělení `database.json` na víc souborů (nezadáno), (e) dlouhodobě
   opustit GitHub API jako databázi (viz "Otevřená teoretická diskuze:
   vlastní server" výš — tenhle limit je druhý, nezávislý důvod).
3. **Tahle oprava (TOP strana), provedena AŽ PO potvrzení JK, že
   souběžná relace na TOP skončila** (běžela od dřívějška, viz
   changelog výš) — bezpečnostní opatření proti kolizi na
   rozpracovaném `ft_loader.js`.

**Provedeno v `ft_loader.js`:**
- **`fetchFromGitHub()`** — stejný vzorec jako SPA `nactiSoubor()`:
  když `data.content` chybí, druhý dotaz na stejnou URL s hlavičkou
  `Accept: application/vnd.github.v3.raw` (v3-verze raw typu, ať
  odpovídá zbytku souboru, který používá `application/vnd.github.v3+json`
  jinde — `headers()` helper spreaduje `extra` jako poslední, takže
  tohle bezpečně přebije výchozí `Accept`). Řeší čtení nad 1 MB do
  100 MB.
- **`saveToGitHub()`** — **genuinní nález cestou, nebyl v původním
  zadání:** psalo `JSON.stringify(json, null, 2)` (odsazeně), stejná
  chyba, co byla v SPA `ulozSoubor()` PŘED opravou. Bez tohohle by
  první další uložení z appky (odkudkoliv) zase nafouklo soubor zpátky
  nad 1 MB, i po SPA-side i TOP-side opravě čtení — kompaktní zápis
  (`JSON.stringify(json)`) je proto nutná součást řešení, ne
  volitelná kosmetika. `users.json`/`activity.json` čtení (`data.content`
  na dalších 2 místech v souboru) záměrně NEDOTČENO — malé soubory,
  nikdy nepřiblíží se 1 MB, oprava by tam byla zbytečná.

**Ověřeno staticky:** vyváženost `{ }` (194/194) a `( )` (555/555) v
celém `ft_loader.js`. **NE živě** — appka vyžaduje GitHub token,
token nezadávám (bezpečnostní pravidlo). **Soubor zatím nenahraný** —
čeká na JK (Konvence č. 4), pak živé ověření že appka normálně načítá
(a že další uložení z appky drží soubor kompaktní, ne že se zase
nafoukne).

**✅ Nahráno a bajtově ověřeno (2026-09-18)** — `git fetch` +
`diff` proti `origin/main` potvrdil shodu.

**Doplňkový audit na žádost JK** ("zkontroluj TOP i SPA, ať tu není
skript, co by databázi znovu nafoukl"): grep přes celý repozitář
potvrdil, že `saveToGitHub()` je JEDINÉ místo, které do
`database.json` zapisuje — volané ze všech 5 HTML stránek, žádná
vlastní kopie zápisové logiky jinde. Jediný další odkaz na
`database.json` je `debugGitHub()` (Správa úkolů), čistě diagnostický
GET bez zápisu. Žádný zbylý `JSON.stringify(..., null, 2)` v
repozitáři. Stejný audit na SPA straně (`topSync.js` jediné místo
mluvící s GitHub API) zapsán v `Esperanto/INTEGRACE.md` sekce 5,
záznam 2026-09-18 — **incident uzavřen.**
