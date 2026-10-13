# CLAUDE.md — Projekt TOP (Týdenní operační plán)

Tento soubor je persistentní kontext pro Claude Code. Přečti si ho na začátku
každé relace — shrnuje architekturu, rozhodnutí a nástrahy z dlouhého vývoje
tohoto projektu (stovky iterací v Claude.ai chatu). Cílem je, abys nemusel(a)
nic z tohoto znovu objevovat od nuly.

Podrobný průběh změn (nasazení, testy, incidenty) je v `HISTORIE_ZMEN.md` —
čti ho, když dohledáváš, proč něco vypadá tak, jak vypadá. Nové záznamy o
nasazení a testech patří tam; sem jen to, co mění pravidla, datový model
nebo aktuální stav.

## Platná rozhodnutí JK

- GitHub a nasazení provádí výhradně JK; před každou další aktivní změnou se
  JK výslovně zeptat na svolení. Kód appky Claude jen připraví a otestuje
  (Konvence č. 4).
- Barvy jen přes proměnné v `theme.css`, tvar komponent přes `components.css`
  (načíst po `theme.css`, kanonicky v `Esperanto`). `var(--accent)` jako text
  na tmavém pozadí nepoužívat — nemá tmavou variantu.
- Auto smí mít ve stejný den víc lidí: kolize se jen hlásí (u nové kolize
  dotaz před uložením), nikdy neblokuje.
- Řízení výroby: programuje se jen etapa, kterou JK výslovně schválí; etapy
  1–5 nasazeny, etapa 6 (zpětné přiřazení) se nedělá (`RIZENI_VYROBY_navrh.md`).
- Spoluřešitelé (`coOwners`) jen u `tasks[]` — u opakujících se pravidel zatím
  ne, u `*SPA` úkolů nikdy (sync je přepíše).
- Svátky TOP nepočítá; jediný zdroj jsou úkoly SPA `*SPA-HOL-YYYY-MM-DD*`
  (kontrakt v `Esperanto/INTEGRACE.md`, ten je rozhodující).
- Zamítnuté, bez nového důvodu neotevírat: pojistky proti duplicitnímu ID
  a „Hotovo nikdy na zrušený“; „kdo zrušil den“ u výjimek.

## Ověřené postupy

- Nahrání ověřuj `git fetch` + `cmp` proti `origin/main` (`git diff --stat`
  bývá zavádějící) a SHA-256 souboru z GitHub Pages s `cache:"no-store"`;
  Pages i HTTP cache (`max-age=600`) můžou pár minut ukazovat starou verzi.
- Soubory appky mají CRLF; `sed`/`awk` v Git Bash je převedou na LF — po
  úpravě zkontroluj `git diff --numstat`, oprava `perl -pi -e 's/\r?\n/\r\n/'`.
- V komentářích `theme.css` nepiš `*` těsně před `/` — ukončí komentář a
  prohlížeč zahodí zbytek souboru (tak se jednou ztratil celý tmavý režim).
- `database.json` má přes 1 MB: čtení přes `Accept: application/vnd.github.v3.raw`,
  zápis vždy kompaktní `JSON.stringify(json)` bez odsazení.

## Co je TOP a pro koho

Systém plánování výroby a evidence úkolů pro **FILTRATION TECHNOLOGY s.r.o.**
(Nivnice). Hlavní uživatel a správce: **Jiří Kománek (JK)**, vedoucí výroby.
Tým: cca 15–17 techniků/řešitelů, evidovaných pod dvoupísmennými zkratkami
(RS, LR, JK, LJ, JaM, DH, MiH, MK, AMa, MŽ, PL, JuM, SP, NP, MM, JN, FCH...).

## Architektura

**Není tu žádný backend server.** Celá appka je sada statických HTML/JS
souborů hostovaných na **GitHub Pages**, a jako "databáze" slouží **GitHub
API** samotné (GitHub REST Contents API, čtení/zápis souboru `database.json`
v privátním repozitáři přes autentizované GitHub tokeny).

Tohle byla vědomá volba pro velikost týmu (viz "Zvážené a zamítnuté /
odložené alternativy"). Přechod na vlastní server JK rozhodl jako samostatný
projekt TOP 2.0 (viz "Vlastní server — TOP 2.0"); v TOP 1 se backend nenavrhuje.

### Dva GitHub repozitáře

1. **`asbeel13/TOP`** (veřejný/kódový) — HTML/JS soubory appky, nasazené přes
   GitHub Pages na `https://asbeel13.github.io/TOP/`
2. **`asbeel13/top-data`** (privátní) — obsahuje `database.json` (jediná
   "databáze"), `users.json` (whitelist uživatelů), `activity.json`
   (indikátor "někdo edituje"), `backups/` (automatické zálohy), a
   `.github/workflows/backup.yml` (denní záloha v 18:00 UTC / 20:00 letního
   času, drží poslední 3 zálohy `database.json` i `users.json`, každý zvlášť)

### Soubory v repozitáři TOP

| Soubor | Role |
|---|---|
| `tydenni_dashboard_live_reload_local_linked.html` | **Dashboard** — hlavní pracovní obrazovka, editace, přidávání úkolů |
| `tydenni_dashboard_mobile.html` | **Mobilní Dashboard** — den po dni, rychlé založení, Hotovo, zjednodušená úprava běžných úkolů |
| `tydenni_prehled.html` | **Přehled** — desktop, čisté nahlížení (+ tlačítko Hotovo pro roli Operátor) |
| `tydenni_prehled_mobile.html` | **Mobilní přehled** — jednodenní zobrazení, PWA instalovatelná appka |
| `sprava_ukolu_linked.html` | **Správa úkolů** — administrace, filtry, tabulky, správa aut a opakujících se pravidel |
| `vyroba.html` | **Řízení výroby** — projekty, Kanban, šablony, Gantt, kalendář |
| `ft_loader.js` | Sdílená logika — načítání/ukládání GitHub dat, autentizace, business logika (rozpad vícedenních úkolů, generování opakujících se úkolů) |
| `theme.css`, `components.css` | Barevné proměnné a sdílené třídy komponent (kanonicky v `Esperanto`) |
| `manifest.json`, `sw.js`, `icons/*.png` | PWA pro obě mobilní stránky (instalovatelnost na Android) |
| `tests/` | Offline testy pro `node --test` (`task-shift.test.cjs`) |
| `config.js`, `index.html` | Legacy: `config.js` žádná stránka nenačítá, `index.html` nic neodkazuje. Smazat jen se svolením JK |

Všech šest stránek načítá `ft_loader.js`. Oba Dashboardy a oba Přehledy
**sdílí localStorage klíč `ftDashboardPeopleLayout`** pro nastavení "kdo se
zobrazuje, na které straně, v jakém pořadí".

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
  "sablony": [ ... ],  // šablony projektů výroby; vznikne prvním uložením, upravuje jen příznak `sablony`
  "users": [ ... ]  // POZOR: users.json je SAMOSTATNÝ soubor, ne pole v database.json
}
```

### Pole úkolu (task) — kompletní seznam (audit proveden, viz "Nástrahy" níže)

`id, title, priority, project, sales, waiting, state, createdDate,
plannedDate, doneDate, dueDate, owner, coOwners, note, internalNote, auto,
cancelled, internalProject, subtask, durationDays, lastUpdated, activeDays,
completedDays, vyroba`

- `internalProject` má v UI popisek **„Dodatečné označení“**, `project`
  **„Označení“**; datové názvy polí se nemění.
- `coOwners` — pole zkratek spoluřešitelů (hlavní řešitel zůstává v `owner`,
  prázdné pole se neukládá).
- `vyroba` — objekt modulu Řízení výroby (projekt/podúkol, fáze, položky,
  `sablonaId`), detail v `RIZENI_VYROBY_navrh.md`.
- `subtask` — checkbox "Podúkol" v Dashboardu i ve Správě úkolů (boolean).
  Přidáno do appky po původním 21-polím auditu a do 2026-08-05 chybělo v
  `tasksToJson()`/`loadFromRaw()` ve Správě úkolů → tiše se mazalo při
  KAŽDÉM uložení (viz `HISTORIE_ZMEN.md`). Opraveno, pole je teď součástí
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
role, registeredAt, opravneni}`. `opravneni` jsou volitelné příznaky
(`"projekty"` = zápis v Řízení výroby, `"sablony"` = úprava šablon), čte je
`FTLoader.hasOpravneni()`. `tokenHash` = SHA-256 hash GitHub tokenu (NIKDY se
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
  pevná sada) — viz `HISTORIE_ZMEN.md`, 2026-08-05, důležité pro zabránění
  tichému mizení úkolů s neobvyklou hodnotou stavu.
- Spoluřešitelé, historie úprav (`top-data/history/YYYY-MM.json`,
  `HISTORIE_UPRAV_navrh.md`), kontrola kolize aut (`FTLoader.getAutoConflicts`,
  při nové kolizi dotaz před uložením), společné Hotovo
  (`FTLoader.markTaskDone`), přesun jednodenního úkolu (přetažením v
  Dashboardu na počítači, tlačítkem v mobilním Dashboardu), mobilní
  Dashboard, modul Řízení výroby (`vyroba.html`).

## Konvence vývoje

1. **Před jakoukoliv netriviální změnou dat/logiky: stáhni si kopii živé
   databáze a otestuj na ní** (ne na vymyšlených datech) — regresní test
   porovnávající staré chování se novým na REÁLNÝCH datech.
2. **Kontroluj duplicitní ID** po každé change týkající se `tasks` pole.
3. **Ověřuj syntax** po každé úpravě: `node --check`; když Node není
   nainstalovaný, načti stránku v prohlížeči a ověř každý inline `<script>`
   přes `new Function()`.
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
5. **Test na skutečných stránkách:** stránka v prohlížeči (dočasný localhost
   server) s mockem GitHub API vloženým před `ft_loader.js` (podvržený
   `users.json` s hashem testovacího tokenu, DB v `sessionStorage`, PUT
   zachycený) nad kopií živé DB — žádný skutečný token ani zápis. Pasti viz
   Nástraha č. 5.
6. **Synchronizace mezi nástroji:** na TOP se pracuje z víc míst (Claude
   Code, Claude.ai chat, ChatGPT), která nesdílí úložiště. Před prací ověř,
   že lokální kopie odpovídá GitHubu (`git fetch`, `git status`) — práce na
   zastaralé kopii tiše přepíše změny odjinud (2026-07-30 tak zmizel filtr
   ve Správě úkolů). Když si JK není jistý, jestli něco měnil jinde, zeptej se.
7. **Integrace s projektem SPA — `INTEGRACE.md` v repozitáři
   `Asbeel13/Esperanto`:** stanoveno JK 2026-08-11. Cokoliv se týká
   rozhraní TOP↔SPA (formát dat, ID schéma, stav implementace, otevřené
   otázky, handoffy) se zapisuje **VŽDY do obou** — sem (`TOP/CLAUDE.md`)
   i do `INTEGRACE.md` — ne jen na jedno místo. **`INTEGRACE.md` je
   hlavní/rozhodující zdroj**, pokud by se obsah někdy rozešel. Přístup
   k `Esperanto` repu ověřen funkční (stejný token jako pro `top-data`
   a `TOP`, i zápis).

## Nástrahy a poučení z historie

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

### 5. Testovací pasti s mockem GitHub API

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
"Hotovo" v Dashboardu dlouho nefungovaly (viz `HISTORIE_ZMEN.md`, 2026-08-04).
**Pravidlo do budoucna:** tlačítko s vlastní task-specifickou podmínkou
viditelnosti NEDÁVEJ třídu `can-write-only` — kontrolu oprávnění zahrň
přímo do JS podmínky (`document.body.classList.contains("can-write")`).

### 10. Stejná byznys logika zkopírovaná do více souborů = stejný bug na více místech

Audit z 2026-08-04/05 (viz `HISTORIE_ZMEN.md`) našel funkci "označit úkol hotovým"
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
místě, bug přežívá na zbylých". **2026-09-25 přesunuto:**
`FTLoader.markTaskDone` / `markDoneFromButton` — všechny 4 stránky
(vč. mezitím přibylého mobilního Dashboardu) volají jen tohle, viz
„Společná funkce Hotovo“ v `HISTORIE_ZMEN.md`.

## Zvážené a zamítnuté / odložené alternativy (rozhodnuté — otevírat jen s novým důvodem)

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
  iOS ne). Viz `HISTORIE_ZMEN.md` (2026-07-31) — vizuální chyby na iOS/WebKitu se řeší
  jen když se objeví, ne proaktivně.
- **Vlastní server / backend** — řeší se jako TOP 2.0 (viz níže), ne v TOP 1.
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

### Vlastní server — TOP 2.0

**Aktualizace 2026-09-29 (JK):** celý TOP bude v budoucnu převeden na
databázi **PostgreSQL** — už při vývoji nových věcí s tím počítat
(jedinečná ID, vazby přes ID, žádné odvozené/zdvojené údaje, logika
oddělená od úložiště). Konkrétní zásady sepsané pro modul výroby v
`RIZENI_VYROBY_navrh.md`, sekce 6.15 (včetně známých překážek převodu
celého TOP: nejedinečná `id` u zástupů, pole uvnitř úkolu, SPA sync
přímo do JSON). Termín ani postup převodu zatím nejsou určené.

**Aktualizace 2026-10-02 (JK): zahájena teoretická příprava TOP 2.0**
(PostgreSQL, firemní server, mobil odkudkoliv, účty a budoucí rozcestník
s Keycloakem). Vše k TOP 2 je v samostatné lokální složce
`AI/TOP-V2 - Týdenní Operační Plán` (`CLAUDE.md`, `TOP2_navrh.md`),
mimo tento veřejný repozitář. Programovat se začne až na výslovný pokyn
JK; TOP 1 do té doby běží beze změny.

## Nápady uživatele (JK) na budoucí rozvoj — jen zaznamenáno, neplánováno

Tohle jsou JK vlastní myšlenky, zmíněné 2026-08-05 jako věci k budoucímu
zvážení — zatím čistě poznámka, žádná analýza proveditelnosti ani
implementace. Až se k tomu bude přistupovat, projít to jako novou
funkci s vlastním návrhem/rozvahou (samostatná stránka vs. nástavba nad
stávající, testování na kopii dat atd.) — stejně jako u Kanbanu výše.

1. **Systém pro řízení výroby** (**od 2026-09-25 v návrhu, viz
   `RIZENI_VYROBY_navrh.md`**) — nástavba nad úkoly, umožňující řízení a
   sdružování úkolů a podúkolů do přehledných celků (JK to takhle
   popsal, bez dalších detailů zatím). Pole `subtask` na úkolu už
   existuje v datovém modelu (viz `HISTORIE_ZMEN.md`, 2026-08-05, oprava č. 3),
   ale nese jen `true/false` — nepředstavuje žádnou skutečnou hierarchii
   nebo seskupení. Tohle by byla zásadně větší funkce.
2. **Evidence dovolených** — **AKTUALIZACE:** už není jen nápad, ale
   aktivní samostatný projekt **SPA (Správa Pracovních Absencí)**,
   vlastní repozitář, vlastní SQL databáze, vlastní Claude instance.
   Jednosměrná synchronizace SPA → TOP (schválená dovolená se zapíše do
   `tasks[]` jako task s `priority: "PX"`, ID prefix `SPA-`) — viz
   `HISTORIE_ZMEN.md`, 2026-08-11, pro detaily prvního review handoffu.
3. **Spoluřešitelé i u opakujících se úkolů** (zapsáno 2026-09-21) —
   první verze spoluřešitelů (viz „Spoluřešitelé úkolu“ v `HISTORIE_ZMEN.md`)
   se vědomě týká jen `tasks[]`, ne pravidel `opakovaci`. Až se k tomu
   bude přistupovat: pravidlo by dostalo vlastní `coOwners`,
   `generateRecurring()` (`ft_loader.js` ~ř. 196) by ho předávalo do
   výskytů, řešit i interakci se zástupem (zástup = task se stejným ID
   jako pravidlo — kdo zastupuje hlavního vs. spoluřešitele) a s
   odděleným dokončením v `dokonceni`.

## Doporučení pro budoucí práci (otevřené návrhy, neimplementované)

- **CSP hlavička** (`<meta http-equiv="Content-Security-Policy">`) jako
  druhá linie obrany proti XSS — appka je veřejná na GitHub Pages a token
  pro zápis leží v `localStorage`, viz `HISTORIE_ZMEN.md`, 2026-08-05
  (oprava XSS). Neimplementováno.
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
  zaznamenané v `HISTORIE_ZMEN.md` (2026-08-05).

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
schválení otestuj na kopii dat → ukaž výsledky → po schválení připrav
finální verzi, kterou nahraje JK (Konvence č. 4). Tenhle projekt má za sebou
dlouhý vývoj s důrazem na opatrnost u produkčních dat (živě používá cca 15+
lidí ve výrobě).
