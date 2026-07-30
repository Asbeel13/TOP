# CLAUDE.md — Projekt TOP (Týdenní operační plán)

Tento soubor je persistentní kontext pro Claude Code. Přečti si ho na začátku
každé relace — shrnuje architekturu, rozhodnutí a nástrahy z dlouhého vývoje
tohoto projektu (stovky iterací v Claude.ai chatu). Cílem je, abys nemusel(a)
nic z tohoto znovu objevovat od nuly.

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
internalProject, durationDays, lastUpdated, activeDays, completedDays`

- `internalProject` — datový název pole beze změny, ale **UI popisek je
  "Dodatečné označení projektu"** (přejmenováno 2026-07-29, viz Changelog
  níže — dřív se v UI jmenovalo "Interní číslo projektu")
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

## Konvence vývoje — DODRŽOVAT

1. **Před jakoukoliv netriviální změnou dat/logiky: stáhni si kopii živé
   databáze a otestuj na ní** (ne na vymyšlených datech) — regresní test
   porovnávající staré chování se novým na REÁLNÝCH datech.
2. **Kontroluj duplicitní ID** po každé change týkající se `tasks` pole.
3. **Ověřuj syntax** (`node --check`) po každé úpravě před nasazením.
4. Uživatel obvykle **sám nahrává soubory na GitHub** (kopíruje z výstupu) —
   ověř, jestli chce, abys nahrával přímo (token na `top-data` MÁ zápis i do
   `TOP`, ověřeno, ale je to zásadní změna workflow, ptej se první).
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

## Zvážené a zamítnuté / odložené alternativy (neopakuj tuhle diskuzi zbytečně)

- **Mobilní responzivní design** (jedna appka, media queries) —
  zamítnuto ve prospěch **samostatné mobilní stránky**
  (`tydenni_prehled_mobile.html`), protože uživatel chtěl čistší kód i za
  cenu zdvojené údržby. **Při každé změně týkající se Přehledu explicitně
  zkontroluj, jestli se má promítnout i do mobilní verze** — uživatel na
  to sám upozorňuje, ale je to reálné riziko opomenutí.
- **Nativní Android aplikace** — zamítnuto jako neúměrné (měsíce práce
  navíc kvůli kompletnímu přepisu UI), PWA je dostatečný kompromis.
- **Vlastní HW server / plnohodnotný backend** — proběhla hlubší
  teoretická diskuze (viz níže), zůstává otevřená možnost do budoucna,
  motivovaná především chybějícími push notifikacemi (které bez serveru
  nejdou udělat spolehlivě).
- **Push notifikace bez serveru** — nejdou udělat spolehlivě (appka musí
  běžet na popředí/pozadí, žádné notifikace při zavřené appce).

### Otevřená teoretická diskuze: vlastní server

Uživatel má firemní HW server s vlastním správcem (péče o server vyřešena).
Odhad: cca 2–3 měsíce práce, PROTOŽE frontend by se **nemusel přepisovat od
nuly** (business logika a UI zůstávají, jen se změní zdroj dat z GitHub API
na vlastní REST/WebSocket API). Klíčová otevřená otázka, na kterou nebyla
odpověď: **kdo bude vyvíjet/dokončí migraci** (ne kdo bude server
provozovat — to je vyřešeno). Doporučeno postupné nasazení (nejdřív
backend+auth+notifikace, zbytek postupně), ne najednou.

## Doporučení pro budoucí práci (moje vlastní návrhy, neimplementované)

- **Vizuální upozornění na aktivní filtr** — když je ve Správě úkolů
  aktivní netriviální filtr (např. datum od-do), není to na první pohled
  vidět; uživatel na to jednou naletěl (myslel si, že úkol chybí, ve
  skutečnosti ho skrýval zapomenutý filtr). Navrhováno, neimplementováno.
- Filtr pro opakující se úkoly podle typu (týdně/interval/měsíčně) — byl
  implementovaný jako součást širší úpravy záložek ve Správě úkolů.
- Přeskládání dlaždic aut podle dostupnosti/abecedy/osoby — bylo zmíněno
  jako nápad na příště, pak realizováno (pořadí podle screenshotu).

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
