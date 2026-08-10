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
