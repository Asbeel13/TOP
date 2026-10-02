# Řízení výroby — návrh modulu (TOP)

**Stav (2026-10-01):** Etapa 1 včetně opravy `completedDays` NASAZENA
a ověřena (`8531e16`, `761dec7`). **Etapa 2 (stránka modulu
`vyroba.html`) NASAZENA a ověřena (`d8ffaae`, 2026-09-30)** (sekce 12).
**Etapa 3 (správa šablon) NASAZENA a ověřena (`a93fdb1`, 2026-10-01)**
(sekce 12). Etapy 4–6 jen na nový výslovný pokyn JK.

Průvodní dokument modulu (JK 2026-09-29: „bude to větší modul,
informace držet v samostatném souboru“). V `TOP/CLAUDE.md` je jen
odkaz sem.

## Jak s dokumentem pracovat

- **Sekce 3 „Potvrzeno JK“** = platí, neotvírat znovu bez nového důvodu.
- **Sekce 6 „Návrhy k rozhodnutí“** = úvahy a doporučení Claude; platí
  až po potvrzení JK (pak se označí ✅ a odkáže na sekci 3). Čísla
  návrhů se nepřečíslovávají, ať odkazy platí.
- **Sekce 7 „Otevřené otázky“** = co je potřeba vyjasnit.
- **Sekce 9 „Průběh“** = chronologický zápis kol brainstormingu.
- **Sekce 10 „Náčrt“** = odkaz a popis náčrtu obrazovek, **sekce 11
  „Technický koncept“** = datový model, dotčené soubory, etapy.
- **Pojmy:** hlavní celek je **projekt** = **hlavní úkol** s podúkoly
  (JK, kola 3 a 4). Slovo „zakázka“ zůstává jen pro doklady z PROFITu
  (výrobní zakázka VY/VZ, obchodní PO, servisní SZ). Viz slovníček
  (sekce 8).
- Podklady od JK: `C:\Users\komanek\Desktop\Brainstorming.docx` (kolo 1,
  včetně 2 snímků z dříve zkoušeného nástroje).

## 1. Cíl modulu

Mít ucelený přehled o komplexních akcích složených z mnoha dílčích
úkolů: v jaké fázi je každý projekt a jaké podúkoly k fázím patří.
Podúkoly se promítají konkrétním lidem do týdenního plánu TOP.

**Hlavní náplní je řízení toku výroby** (výrobní zakázky), ale modul má
být **obecně použitelný** — „výrobek“ může být cokoliv: zařízení, rám,
výkres, oprava, servis, stavba haly (JK, kolo 2).

## 2. Jak dnes probíhá výrobní zakázka (popis JK, kolo 1)

Výrobou se rozumí výroba produktů: hydrogenerátory, hydraulické
agregáty, filtrační jednotky, ale i rámy a držáky. Samotná výroba dílů
je externí (objednávky služeb), u nás probíhá montáž, test, kontrola,
dokumentace a expedice.

| # | Krok | Kdo |
|---|---|---|
| 1 | Na základě nabídky přijde objednávka zákazníka, backoffice založí obchodní zakázku (PO) v PROFITu, JK dostane e-mail | backoffice |
| 2 | Založení výrobní zakázky (VY/VZ) | JK |
| 3 | Kontrola dílů na skladě; doobjednání materiálu a externích služeb (objednávky vydané VO) | JK |
| 4 | Tisk výrobní průvodky, předání na dílnu | JK |
| 5 | Montáž mechanická | dílna |
| 6 | Montáž elektrická | dílna |
| 7 | Test funkčnosti | dílna |
| 8 | Vyplněná průvodka zpět k JK; výstupní kontrola, štítky (logo, výrobní štítek), fotodokumentace včetně vnitřku rozvaděče | JK |
| 9 | Dokumenty (když jde k zákazníkovi): CE prohlášení, revize, el. schéma, uživatelský manuál, dodací list, případně další | JK |
| 10 | Příprava k přepravě (paleta, balení, štítek dopravce), expedice | skladník |

## 3. Potvrzeno JK

### Kolo 1 (2026-09-29)

1. **Uživatelé:** upravuje JK (vedoucí výroby), ostatní mají jen náhled.
2. **Co plánovat:** fáze výroby a dílčí úkoly jednotlivých fází. Z
   modulu se generují úkoly, které se promítnou do týdenního plánu TOP
   k jednotlivým lidem.
3. **Kapacity:** jen lidé. Strojní kapacitu firma nemá (výroba dílů
   externě).
4. **Identifikace:** hlavní číslo = výrobní zakázka **VY nebo VZ** z
   PROFITu. Další pole pro **PO, VO a SZ** — u každého může být **víc
   čísel**. Vyplňuje JK ručně. (Rozšířeno — viz 3.16, 3.19, 3.21.)
5. **Bez napojení na PROFIT** (bylo by složité). Propojení jen přes
   společné číslo.
6. **Co to NENÍ:** sklad, fakturace, náhrada PROFITu. Modul má
   zjednodušit a ucelit přehled o komplexních úkolech.
7. **Zobrazení:** musí umět **Ganttův diagram** a **Kanban** (+ kalendář,
   3.23).
8. **Navazuje na to, co v TOP už je:** pole Projekt, Dodatečné označení
   projektu, Podúkol (u podúkolu chybí vazba na hlavní úkol).

### Kolo 2 (2026-09-29)

9. **Univerzálnost:** modul slouží pro jakoukoliv složitou akci
   (výroba, oprava, servis, stavba, výkres…); hlavní náplní zůstává tok
   výroby.
10. **Jeden systém, nic nezdvojovat** (návrh 6.1 A): podúkol projektu je
    běžný úkol TOP. Úprava v TOP se hned projeví v modulu výroby a
    naopak.
11. **Nová pole na úkolu jsou v pořádku**, pokud jsou potřeba; mohou
    být upravitelná jen ze strany modulu výroby, ne z týdenního plánu.
12. **Kanban ve dvou úrovních:**
    - přehled všech projektů podle toho, jak jsou daleko: nové /
      rozpracované / zamrzlé / hotové (obdoba dnešních stavů úkolů
      Nový / Probíhá / Čeká se / Dokončeno),
    - Kanban úkolů jednoho projektu.
13. **Řady čísel v PROFITu:**
    - **VY** — výrobní čísla zařízení (zpravidla s motorem/čerpadlem),
    - **VZ** — rámy, konstrukce, polotovary (bez motoru/čerpadla, nebo
      nejde o celou jednotku),
    - **SZ** — servisní zakázky; v PROFITu se na ně zapisují všechny
      náklady spojené s opravami a servisy,
    - z kola 1: **PO** obchodní zakázka, **VO** objednávka vydaná
      (materiál, externí služby), **NA** nabídka.

### Kolo 3 (2026-09-29)

14. **Šablony postupu** (návrh 6.2) — ano.
15. **Položky k odškrtnutí pod úkolem** (návrh 6.3) — ano.
16. **Vnitřní ID projektu + číslo z PROFITu nebo volný název jako
    údaj** (návrh 6.8) — ano.
17. **Stav projektu nastavuje JK ručně + ukazatel postupu počítaný z
    úkolů** (návrh 6.9) — ano.
18. **Kanban úkolů v projektu: sloupce = stav úkolu, řádky = fáze**
    (návrh 6.10) — ano.
19. **Žádné vnořování projektů.** JK doslova: „Nadřazený bude projekt.
    Jeden úkol, který je hlavní a vše dílčí jsou podúkoly. Informace o
    návaznosti na PROFIT stačí tak, že to všechno bude popsáno v
    hlavním úkolu (projektu).“ → např. rám VZ pro zařízení VY je součást
    téhož projektu (podúkoly), číslo VZ se uvede u projektu.

### Kolo 4 (2026-09-29)

20. **Projekt = hlavní úkol** (výklad 6.6 potvrzen, ale JK to nechce
    nazývat „zvláštním“ úkolem): využije se stávající logika — hlavní
    úkol má pod sebou řadu podúkolů; podúkol = úkol označený jako
    podúkol **a vázaný k hlavnímu úkolu** (tahle vazba je jediné, co
    dnes chybí a doplní se).
21. **Čísla z PROFITu** (PO, VO, VY, VZ, SZ) nese strukturovaně hlavní
    úkol. Podúkol je může mít jako **doplňkovou informaci** ve
    **stávajících polích** (Projekt, Dodatečné označení projektu) —
    ručně, podle potřeby JK a konkrétního úkolu. Nic se do podúkolů
    automaticky nekopíruje.
22. **Projekt se v týdenním plánu nezobrazuje jako dlaždice** (návrh
    6.13); projekty se ukazují v Kanban přehledu modulu výroby.
23. **Náčrt obrazovek — ano.** Modul výroby má mít navíc **kalendářní
    zobrazení ve stejném stylu jako SPA** (viz 6.16).
24. **Celý TOP bude v budoucnu převeden na databázi PostgreSQL** — už
    při vývoji modulu s tím počítat (viz 6.15).

### Kolo 5 (2026-09-29, zpětná vazba k náčrtu verze 1)

25. **Náčrt sedí** — rozvržení i vzhled (JK: „Celkově velmi dobrá
    práce“). Ke kartě projektu v přehledu žádné připomínky.
26. **Přehled projektů: stav se mění přetažením karty** (drag & drop)
    mezi sloupci — viz 6.18.
27. **Vlastní šablony:** zakládat nové a upravovat stávající, nejspíš
    na vlastní stránce — viz 6.17.
28. **Obrazovka 6 (týdenní plán): možnost nastavit, kteří uživatelé se
    zobrazují** — upřesnit, viz 6.19.
29. **Kalendář: barva štítku podle projektu** (jako v náčrtu).
30. **Stávající pole „Projekt“ se v UI přejmenuje na „Označení“**
    (datové pole `project` beze změny, stejně jako přejmenování
    2026-07-29) — viz 6.14.

### Kolo 6 (2026-09-29)

31. **Obrazovka 6 je jen výřez stávajícího Dashboardu** — výběr
    zobrazených lidí zůstává podle dnešního chování Dashboardu, nic se
    nemění (6.19).
32. **Šablony upravuje jen JK** (6.17).
33. **Pojistky při přetahování projektů — ano** (6.18). Navíc: když JK
    potvrdí přesun do „Hotový“, **všechny podúkoly se označí jako
    hotové**.
34. **„Dodatečné označení projektu“ → v UI „Dodatečné označení“**
    (datové pole `internalProject` beze změny, 6.14).

### Kolo 7 (2026-09-29, k technickému konceptu)

35. **Projekty v modulu zakládá a upravuje zatím jen JK**, v budoucnu i
    další lidé → oprávnění jako příznak u uživatele, oddělený od
    šablon (6.17, 11.2).
36. **Položky k odškrtnutí odškrtává zatím jen JK** (v modulu);
    technik u svého podúkolu v týdenním plánu až v budoucnu.
37. **Při uzavření projektu se automaticky odškrtnou i položky**
    podúkolů (JK: „Ano, podúkoly automaticky odškrtnout, když je hlavní
    úkol uzavřen“ — navazuje na 3.33, kde se podúkoly označí hotové).
38. **Etapy 11.4 v navrženém pořadí** (Gantt před kalendářem) —
    souhlas.

### Kolo 8 (2026-09-29)

39. **Podúkoly bez data se v Backlogu Dashboardu nezobrazují** (panel
    „Nezařazené / bez plánovaného data“ ani počítadlo „Backlog mimo
    týden“) — jsou vidět jen v modulu (11.3).

Formát čísel v PROFITu: 2–4 písmena + dvojčíslí roku + pořadové číslo
(4–6 číslic podle délky písmen), např. PO26001123, VY26000012,
VO26000156.

### Snímky z dříve zkoušeného nástroje (Brainstorming.docx)

- **Kanban:** řádek za každou zakázku (např. FT-SOE-4) s ukazatelem
  postupu (90 %), sloupce podle stavu úkolu (Nezahájeno / Probíhá /
  Hotovo). Karta úkolu: název, řešitel (avatar), datum od–do; pod
  kartou vnořená položka („Hadice DN19 – mají přijít 49. KT“,
  počítadlo 1/1).
- **Kalendář (měsíc):** úkoly zakázky jako pruhy přes více dní (Montáž
  zařízení 3.–4. 11., Test zařízení 5.–6. 11., Zaskladnění 7. 11.).

JK: většina zkoušených programů se nakonec neosvědčila.

## 4. Zjištění z dat TOP (read-only kopie živé DB, 2026-09-25)

- 1 605 úkolů (bez SPA), zhruba 97 naplánovaných úkolů týdně, 17
  řešitelů + externí firmy jako „řešitel“ (FLAP, Sitel, Lang…).
- **Improvizovaná hierarchie:** 19 úkolů má v poli Projekt (výjimečně v
  Dodatečném označení) ID jiného úkolu = nadřazeného; i dvouúrovňové
  řetězce (`*0275*` → `*0264*` → `*0263*`). Checkbox Podúkol je použitý
  jen 4×. Většina těchto vazeb NENÍ výroba (opravy, stavební úpravy) —
  potvrzuje potřebu univerzálnosti (3.9). Lidé tedy už dnes intuitivně
  používají model „hlavní úkol + podúkoly“ (3.20).
- Pole Projekt míchá: čísla dokladů (PO 63×, VY 15×, VO 13×, VZ 12×,
  SZ 7×, NA 6×, TFMC 6×), zákazníky, kategorie („Provozní“ 150×,
  „Stavba nové haly“) a ID úkolů. Dodatečné označení nese většinou
  zákazníka.
- Produktová označení v názvech úkolů: FT-OH-800/600/400/200, FT-VZ-16,
  FT-EOC-10, FT-PZ-80/230, FT-RO-40/150, FT-SOE-4 …

## 5. Omezení z historie TOP, která musí návrh respektovat

- **Velikost `database.json`** (738 kB k 2026-09-25; při ~1,26 MB appka
  přestala číst — incident 2026-09-18). Nová data co nejúsporněji,
  případně v samostatném souboru v `top-data` (precedent: `history/`).
- **Nástraha č. 1:** každé nové pole na úkolu musí do
  `taskToRawFormat()` i `loadFromRaw()` ve Správě úkolů, jinak se při
  uložení čehokoliv smaže všem úkolům.
- **Nástraha č. 10:** logika sdílená víc stránkami patří do
  `ft_loader.js`, ne do kopií v jednotlivých souborech.
- **Zápis = celý soubor + SHA zámek;** do `database.json` zapisuje i
  SPA sync. Každý další soubor = vlastní SHA a vlastní konflikty.
- **Dvě kopie téhož záznamu jsou riziko** — zkušenost se SPA: sync
  přepisuje své úkoly a ruční změny v TOP se ztrácí (proto 6.1 A).
- **Historie úprav** sleduje vybraná pole úkolu (`HISTORY_KEY_FIELDS`)
  — u nových polí (vazba na hlavní úkol/fázi) zvážit, jestli je
  sledovat.
- **Oprávnění jsou jen v UI** (role planovac/nahlizec/operator) —
  „upravuje jen JK“ se dá zajistit rolí, ne skutečnou bezpečnostní
  hranicí.
- Mobilní verze jsou samostatné stránky — u každé změny zvážit, jestli
  se týká i mobilu.
- **Vícedenní úkoly se v `ft_loader.js` rozpadají na dlaždice po dnech**
  (`expandMultiDayTasks`) a všechny pohledy počítají úkoly nad
  `DATA.tasks` — hlavní úkol (3.22) se do toho nesmí dostat.

## 6. Návrhy k rozhodnutí (Claude)

### 6.1 Podúkol projektu = běžný úkol TOP — ✅ potvrzeno (3.10)

Podúkol JE normální úkol v `tasks[]`, jen nese vazbu na hlavní úkol (a
fázi). Hotovo, přesun data nebo změna řešitele kdekoliv v TOP se v
modulu projeví hned, nic se nesynchronizuje. Zamítnutá varianta B =
vlastní kopie úkolů v modulu synchronizovaná do `tasks[]` (jako SPA).

### 6.2 Šablony postupu — ✅ potvrzeno (3.14)

**Šablona** = předpřipravený postup (fáze, úkoly, položky k
odškrtnutí), který se při založení projektu zkopíruje, aby se nemusel
pokaždé psát znovu a nic se nezapomnělo. Úpravy v konkrétním projektu
šablonu nemění.

Příklad — šablona „Zařízení (VY)“ podle procesu ze sekce 2 (řešitelé a
délky jsou jen ilustrace):

| Fáze | Úkoly (výchozí řešitel, délka) | Položky k odškrtnutí |
|---|---|---|
| Příprava | Kontrola skladu (JK) · Objednat materiál a služby (JK) · Tisk průvodky (JK) | — |
| Montáž | Montáž mechanická (dílna, 2 dny) · Montáž elektrická (dílna, 1 den) | — |
| Test | Test funkčnosti (dílna, 1 den) | — |
| Kontrola a dokumenty | Výstupní kontrola (JK) · Dokumentace (JK) | štítky, fotky, CE, revize, el. schéma, manuál, dodací list |
| Expedice | Balení a expedice (skladník) | — |

Další šablony podle potřeby: „Rám / konstrukce (VZ)“ (kratší, bez
elektro a CE), „Oprava / servis (SZ)“, „Výkres“ a **„Prázdná“** (bez
šablony, všechno ručně — např. stavba haly).

Po založení projektu vzniknou podúkoly **bez data**; JK jim postupně
dá řešitele a datum a tím se objeví v týdenním plánu. U konkrétního
projektu jde podúkol přidat, smazat nebo přejmenovat.

### 6.3 Úkol vs. položka k odškrtnutí — ✅ potvrzeno (3.15)

- **Podúkol** = práce pro konkrétního člověka na konkrétní den → objeví
  se v týdenním plánu jako dnes.
- **Položka** = drobnost k odškrtnutí, patří **pod podúkol** (jako na
  snímku „Hadice DN19 – mají přijít 49. KT“ pod „Montáž zařízení“) → v
  plánu není samostatná dlaždice, jen počítadlo u úkolu (např.
  „Dokumentace 3/7“).

### 6.4 Kanban — ✅ rozhodnuto (3.12)

Přehled všech projektů podle stavu + Kanban úkolů jednoho projektu
(podoba viz 6.10).

### 6.5 Gantt bez automatického přeplánování (první verze)

Gantt = řádek projektu → rozbalit na fáze → podúkoly; pruhy podle
`plannedDate` + `durationDays`, čára „dnes“, požadovaný termín
projektu. **Bez** automatických závislostí (posun montáže neposouvá
test) — to je výrazně složitější, zvážit až podle zkušenosti z provozu.

### 6.6 Projekt = hlavní úkol v seznamu úkolů TOP — ✅ potvrzeno (3.20)

Projekt není samostatný druh záznamu, ale **hlavní úkol** v `tasks[]`
(označený jako hlavní); podúkoly na něj odkazují jeho ID.

Výhody:
- Využije existující pole: název, řešitel (= zodpovědný za projekt),
  priorita, **stav** (Nový / Probíhá / Čeká se / Dokončeno = stavy
  projektu z 3.12), termín, poznámky.
- **Vnitřní ID (3.16) = ID úkolu** `*T…*`, generuje se stejně jako dnes.
- Historie úprav, Správa úkolů a filtry fungují pro projekt hned.
- Dnešní pole Podúkol dostane smysl; 19 improvizovaných vazeb (sekce 4)
  už dnes odkazuje právě na ID úkolu.

Co je nutné ošetřit:
- Hlavní úkol se **nesmí rozpadnout na dlaždice** v kalendáři týdenního
  plánu ani se **započítat do počítadel** úkolů (3.22).
- Nová pole na hlavním úkolu (příznak hlavního úkolu, typ/šablona,
  čísla VY/VZ/SZ, PO[], VO[], seznam fází) a na podúkolu (vazba na
  hlavní úkol, fáze, položky) → Nástraha č. 1 ve Správě úkolů.
- Kanban ve Správě úkolů musí hlavní úkol od běžných úkolů odlišit.

Šablony nejsou úkoly — malý samostatný seznam (v `database.json` nebo
ve vlastním souboru, rozhodne se s datovým modelem). Objem projektů
(desítky ročně) je z hlediska velikosti `database.json` zanedbatelný.

### 6.7 Existující data

Úkoly s VY/VZ/SZ v poli Projekt a 19 improvizovaných vazeb by šlo po
spuštění nabídnout k převedení na hlavní úkol + podúkoly (jednorázově,
s potvrzením JK). Ne automaticky.

### 6.8 Identifikace projektu — ✅ potvrzeno (3.16, 3.21)

- Každý projekt má **vnitřní ID** = ID hlavního úkolu (generované,
  uživatel ho needituje); podúkoly se odkazují tímhle ID.
- **Hlavní označení** = číslo z PROFITu (VY/VZ/SZ), nebo volný název,
  když číslo není. Je to jen údaj → překlep jde opravit bez rozpojení
  podúkolů.
- K tomu PO[], VO[], SZ[] (víc hodnot, 3.4) strukturovaně na hlavním
  úkolu. Na podúkolu jen volitelně ručně ve stávajících polích (3.21).

### 6.9 Stav projektu — ✅ potvrzeno (3.17)

- Stav (Nový / Probíhá / Zamrzlý / Hotový) nastavuje JK ručně.
- Vedle toho **ukazatel postupu** z podúkolů (hotové / všechny).
- Modul může upozornit na nesoulad (všechny podúkoly hotové, projekt
  pořád „Probíhá“), ale sám stav nemění.

### 6.10 Kanban úkolů v projektu — ✅ potvrzeno (3.18)

Sloupce = stav úkolu (Nový / Probíhá / Čeká se / Dokončeno), **řádky =
fáze** projektu. Přetažení karty mění stav úkolu stejně jako dnešní
Kanban ve Správě úkolů.

### 6.11 Projekt v projektu — ✅ rozhodnuto (3.19): ne

Jedna úroveň: projekt (hlavní úkol) → fáze → podúkoly → položky.
Související věci (rám VZ pro zařízení VY) jsou podúkoly téhož projektu.

### 6.12 Pole upravitelná jen z modulu výroby

Vazbu podúkolu na hlavní úkol a fázi upravuje jen modul výroby (3.11).
Ve Správě úkolů a v Dashboardu se jen zobrazí (štítek projektu + odkaz
„Otevřít projekt“), needituje se. Správa úkolů je musí při uložení
zachovat (Nástraha č. 1).

### 6.13 Projekt v týdenním plánu — ✅ potvrzeno (3.22)

Hlavní úkol se v týdenním plánu (Dashboard, Přehled, mobil)
nezobrazuje jako dlaždice. V plánu jsou jen podúkoly, každý s malým
štítkem projektu (např. „📁 VY26000012“). Hlavní úkol se nezapočítává
do počítadel úkolů.

### 6.14 Kolize názvu „Projekt“ — ✅ rozhodnuto (3.30)

Stávající textové pole úkolu `project` dostane v UI popisek
**„Označení“** (datové pole beze změny) a zůstává ručně vyplnitelné i
u podúkolů (3.21). „Projekt“ pak v celé appce znamená jen hlavní úkol.

Místa s popiskem „Projekt“ (grep 2026-09-29): Správa úkolů — rychlý
filtr `quickProject` (ř. ~613), sloupec tabulky (~630), pole v modalu
`m_project` (~787), nápověda k mapování sloupců (~648); Dashboard —
nový úkol `m2_project` (~1068); mobilní Dashboard — nový úkol
`nt_project` (~463).

Sousední pole „Dodatečné označení projektu“ (`internalProject`,
Správa ~614 a ~788) → v UI **„Dodatečné označení“** (3.34, datové pole
beze změny).

### 6.15 Příprava na PostgreSQL (nové po kole 4 — zásady pro návrh)

Celý TOP se v budoucnu převede na PostgreSQL (3.24). Modul výroby se
proto navrhne tak, aby jeho data šla převést do tabulek bez
předělávání:

- **Každý záznam má stabilní jedinečné ID** (budoucí primární klíč) —
  hlavní úkol, fáze, položka, šablona. Při založení hlavního úkolu
  ověřit, že jeho ID je jedinečné.
- **Vazby jen přes ID** (podúkol → ID hlavního úkolu, podúkol → ID
  fáze) = budoucí cizí klíče. Nikdy přes název, pořadí v poli nebo
  číslo z PROFITu (to se může opravit).
- **Opakující se údaje jako seznam objektů s vlastním ID a pořadím**
  (čísla dokladů, fáze, položky) → přímo převoditelné na podřízené
  tabulky, např. `projekt_doklad(projekt_id, typ, cislo)`,
  `faze(id, projekt_id, poradi, nazev)`, `polozka(id, ukol_id, poradi,
  text, hotovo, kdo, kdy)`.
- **Neukládat odvozené hodnoty** (postup %, počty) — počítat. Ruční
  doplňkové zápisy JK do stávajících polí (3.21) nejsou kopie, ale
  samostatný údaj.
- **Pevné číselníky** pro stav, typ projektu, typ dokladu (budoucí enum
  nebo číselníková tabulka).
- **Data jako ISO `YYYY-MM-DD`**, časové značky ISO s časovou zónou.
- **Pravidla mazání předem** (co se stane s podúkoly při smazání nebo
  zrušení hlavního úkolu) = budoucí `ON DELETE`.
- **Logika modulu oddělená od úložiště** — čtení a zápis přes datovou
  vrstvu (`ft_loader.js`), aby se při přechodu vyměnila jen ta
  (GitHub JSON → API nad PostgreSQL), ne celý modul. Odpovídá úvaze v
  `CLAUDE.md` („frontend by se nemusel přepisovat od nuly“).

Známé překážky převodu CELÉHO TOP (mimo rozsah modulu, jen pro
přehled; modul je nesmí rozšiřovat): nejedinečné `id` úkolů (zástupy
sdílí ID s pravidlem opakování), pole uvnitř úkolu (`coOwners`,
`completedDays`, `activeDays`), výskyty opakujících se úkolů generované
za běhu, SPA sync zapisující přímo do JSON (týká se i
`Esperanto/INTEGRACE.md`).

### 6.16 Kalendář modulu výroby ve stylu SPA (nové po kole 4)

Styl SPA (`public/app.js` `renderCalendarBody`, `styles.css`
`.calendar-grid`): měsíční mřížka Po–Ne, 7 týdnů (1 před, 4–5 v
měsíci, 1 po), šipky ←/→ a název měsíce, víkendy a státní svátky
podbarvené, dnešek orámovaný, minulé dny zašedlé, záznamy jako barevné
štítky v buňce dne, nahoře dlaždice se souhrnem. V modulu výroby:
štítky = podúkoly projektů (barva podle projektu nebo stavu), vícedenní
podúkol ve všech svých dnech, filtr projekt / řešitel, souhrn nahoře
(např. rozpracované projekty, podúkoly tento týden, po termínu).
Barva štítku = barva projektu (3.29).

### 6.17 Správa šablon — ✅ potvrzeno (3.27, upravuje jen JK 3.32)

Vlastní záložka modulu **„Šablony“** (vedle Přehled / Gantt /
Kalendář), náčrt obrazovka 7:
- Vlevo seznam šablon (název, počet podúkolů, u kolika projektů
  použita). Vpravo editor: název, popis, **„nabízet automaticky pro
  čísla“** (VY/VZ/SZ/nenabízet — podle předpony čísla se šablona
  předvybere v dialogu Nový projekt), fáze a v nich podúkoly (název,
  výchozí řešitel nebo „doplnit při plánování“, délka ve dnech, položky
  k odškrtnutí). Pořadí fází a podúkolů přetažením za úchyt.
- **Nová šablona** prázdná, **Duplikovat** existující, **Vytvořit ze
  stávajícího projektu** (a v detailu projektu tlačítko **„Uložit jako
  šablonu“**) — převezme fáze, podúkoly (bez dat a stavů) a položky.
- **Změna šablony se projeví jen u nově zakládaných projektů**, už
  založené projekty se nemění (projekt si při založení šablonu
  zkopíruje, 6.2).
- „Prázdná“ je systémová — nejde upravit ani smazat.
- Smazání šablony, podle které už vznikly projekty: projekty zůstanou
  (mají vlastní kopii), u projektu zůstane jen název šablony jako údaj.
- PostgreSQL (6.15): tabulky `sablona`, `sablona_faze`,
  `sablona_ukol`, `sablona_polozka` — v JSON jako seznam šablon, každá
  s vnořenými fázemi / podúkoly / položkami, vše s vlastními ID a
  pořadím.
- Upravuje jen JK (3.32). Technicky navrženo příznakem u uživatele v
  `users.json`, ne zkratkou „JK“ natvrdo v kódu — jde pak předat
  zástupci bez úpravy programu. Dva oddělené příznaky:
  `"opravneni": ["projekty", "sablony"]` — „projekty“ (zakládání a
  úpravy projektů, 3.35) půjde později dát dalším lidem, aniž by
  dostali i šablony. Jen UI omezení, stejně jako role (sekce 5).

### 6.18 Přetahování projektů mezi stavy — ✅ potvrzeno (3.26, 3.33)

V přehledu projektů změní přetažení karty stav hlavního úkolu (stejně
jako dnešní Kanban ve Správě úkolů mění `state` úkolu; změna se zapíše
do historie úprav, protože `state` je sledované pole). Návrh pravidel:
- **Do „Zamrzlý“** → krátký dotaz na důvod (volitelný text); důvod se
  ukáže na kartě (jako v náčrtu „čeká na vyjádření zákazníka…“).
- **Do „Hotový“, když nejsou hotové všechny podúkoly** → potvrzení
  („3 podúkoly nejsou hotové — uzavřít projekt a označit je jako
  hotové?“). **Po potvrzení se všechny nedokončené podúkoly označí
  jako hotové** (3.33) — stav Dokončeno + datum dokončení, zrušené
  podúkoly se vynechají; odškrtnou se i jejich položky (3.37); hlavní
  úkol i podúkoly jedním uložením.
- **Z „Hotový“ zpět** → jen změna stavu, podúkoly beze změny.
- Stav se mění jen u hlavního úkolu; podúkoly mají vlastní stavy
  (mění se v detailu projektu nebo v týdenním plánu).

### 6.19 Výběr zobrazených lidí — ✅ rozhodnuto (3.31): beze změny

Obrazovka 6 v náčrtu je výřez **stávajícího** Dashboardu. Ten už dnes
umí „Lidé & sloupce“ — kdo se zobrazuje, pořadí, strana L/P, skrytí;
nastavení je v prohlížeči (`ftDashboardPeopleLayout`) a sdílí ho
Dashboard i oba Přehledy. Pokud jde o nové zobrazení v modulu výroby
(kalendář, Gantt), šlo by tam přidat výběr lidí stejným způsobem, nebo
rovnou převzít stejné nastavení. **JK (kolo 6): jde o výřez Dashboardu,
nic se nemění — Dashboard se chová jako dnes.**

## 7. Otevřené otázky

**Kola 2–4 — zodpovězeno** (viz 3.9–3.24).

**Kolo 5 — zodpovězeno** (viz 3.25–3.30).

**Kolo 6 — zodpovězeno** (viz 3.31–3.34).

**Kolo 7 — zodpovězeno** (3.35–3.38) kromě bodu o Backlogu, JK se
doptal, co to je.

**Kolo 8 — zodpovězeno** (3.39). Pro etapy 1 a 2 nezbývá žádná
otevřená otázka; čeká se na pokyn JK k programování.

**Později:**
- V budoucnu: úpravy projektů i pro další lidi (příznak `projekty`,
  3.35) a odškrtávání položek technikem u vlastního podúkolu v
  týdenním plánu (3.36).
- Správa účtů: TOP dnes nemá žádnou obrazovku pro uživatele —
  `users.json` (hash tokenu, zkratka, role) se upravuje ručně skriptem.
  Příznaky `projekty`/`sablony` se proto zatím zapíšou ručně stejně.
  Obrazovka pro správu účtů = samostatné téma mimo modul (JK se ptal
  2026-09-29; souvisí i s budoucím PostgreSQL).
- Proces na jednom skutečném příkladu: kdo dělá mechanickou a
  elektrickou montáž a test (stejný člověk?), typické délky, kde se
  nejčastěji čeká a jak dlouho.
- Kdo spravuje šablony — vyřešeno v kole 5: vlastní stránka v modulu
  (3.27, 6.17); zbývá, kdo kromě JK smí (kolo 6).
- Víc kusů v jednom projektu (množství > 1) — jedna sada úkolů, nebo za
  každý kus?
- Evidovat u VO očekávané datum dodání (aby Gantt ukázal čekání na
  materiál)?
- Je číslo VY zároveň číslo na výrobním štítku zařízení?
- Průvodka: z PROFITu, nebo vlastní šablona? Tisknout z modulu?
- Fotodokumentace a dokumenty: jen odkaz na síťovou složku (GitHub
  není vhodné úložiště fotek)?
- Náhled pro ostatní: i na mobilu?
- Využít dovolené ze SPA pro kontrolu dostupnosti lidí při plánování?
- Projekt pro zákazníka vs. na sklad — liší se postup (dokumenty,
  expedice)?
- Zapsat plán převodu na PostgreSQL i do `Esperanto/INTEGRACE.md`
  (týká se SPA syncu)?

## 8. Slovníček (pracovní)

- **Projekt** = **hlavní úkol** — hlavní celek modulu: výroba zařízení,
  rámu, oprava, servis, stavba, výkres… Pod ním podúkoly (3.20). Nese
  čísla z PROFITu (3.21).
- **Zakázka** — jen doklad v PROFITu: výrobní (VY/VZ), obchodní (PO),
  servisní (SZ).
- **Šablona** — předpřipravený postup (fáze, podúkoly, položky),
  kopíruje se při založení projektu (6.2).
- **Fáze** — etapa projektu (např. Příprava, Montáž, Test…).
- **Podúkol** — běžný úkol TOP označený jako podúkol a vázaný na hlavní
  úkol; má řešitele a datum, je v týdenním plánu.
- **Položka** — drobnost k odškrtnutí pod podúkolem, v plánu jen jako
  počítadlo (6.3).
- **Označení** — nový UI popisek stávajícího pole `project` (dřív
  „Projekt“), volný text, ručně (3.30).

## 9. Průběh brainstormingu

- **2026-09-25** — JK zahájil práci na modulu; Claude nastudoval
  projekt a data (sekce 4) a navrhl strukturu zadání.
- **2026-09-29** — Kolo 1: JK poslal `Brainstorming.docx` (sekce 2 a 3).
  Založen tento dokument, položeny otázky kola 2.
- **2026-09-29** — Kolo 2: JK potvrdil univerzálnost, jeden systém
  (6.1 A), Kanban ve dvou úrovních, vysvětlil řady VY/VZ/SZ (3.9–3.13).
  Upřesněny návrhy 6.2 a 6.3, přidány 6.8–6.12, položeny otázky kola 3.
- **2026-09-29** — Kolo 3: JK potvrdil 6.2, 6.3, 6.8, 6.9, 6.10; projekty
  se nevnořují, nadřazený je vždy projekt = hlavní úkol s podúkoly
  (3.14–3.19). Přidány 6.6, 6.13, 6.14; položeny otázky kola 4.
- **2026-09-29** — Kolo 4: JK potvrdil projekt = hlavní úkol (bez
  označení „zvláštní“), čísla PROFITu strukturovaně na hlavním úkolu +
  ručně volitelně v podúkolech, projekt ne v týdenním plánu, náčrt ano
  + kalendář ve stylu SPA, budoucí převod TOP na PostgreSQL
  (3.20–3.24). Přidány 6.15 a 6.16. Hotový náčrt obrazovek, verze 1
  (sekce 10), položeny otázky kola 5.
- **2026-09-29** — Kolo 5: JK s náčrtem spokojen; přetahování projektů,
  vlastní šablony, výběr zobrazených lidí, kalendář podle projektu,
  „Projekt“ → „Označení“ (3.25–3.30). Náčrt verze 2 (+ obrazovka
  Šablony), přidány 6.17–6.19, položeny otázky kola 6.
- **2026-09-29** — Kolo 6: obrazovka 6 beze změny, šablony jen JK,
  pojistky přetahování ano + při uzavření projektu označit všechny
  podúkoly hotové, „Dodatečné označení“ (3.31–3.34). Sepsán technický
  koncept (sekce 11), ověřeno v kódu: `parseDatabase`, `markTaskDone`,
  `renderBacklog`, `taskToRawFormat`/`tasksToJson`, SPA `topSync.js`.
  Položeny otázky kola 7.
- **2026-09-29** — Kolo 7: projekty zatím upravuje jen JK (později
  další), položky zatím jen JK, při uzavření projektu se odškrtnou i
  položky, etapy odsouhlaseny (3.35–3.38). Otázka na Backlog upřesněna
  (kolo 8).
- **2026-09-29** — Kolo 8: podúkoly bez data ne do Backlogu (3.39).
  Koncept etap 1 a 2 bez otevřených otázek, čeká se na pokyn k
  programování.
- **2026-09-29** — JK: „Koncept schválen, programuj etapu 1“. Etapa 1
  hotová lokálně a otestovaná (sekce 12), čeká na nahrání. Nalezena
  existující chyba s `completedDays` ve Správě (sekce 12).
- **2026-09-29** — JK nahrál etapu 1 (`8531e16`, ověřeno GitHub i
  Pages) a schválil opravu `completedDays` v rámci etapy 1 — hotová
  lokálně (i stejná chyba v Kanbanu), otestovaná proti nasazené verzi,
  čeká na nahrání `sprava_ukolu_linked.html`.
- **2026-09-29** — JK nahrál opravu (`761dec7`, 13:45), ověřeno GitHub
  i Pages. **Etapa 1 uzavřena.**
- **2026-09-29/30** — Souběžně ChatGPT: posun úkolu na další pracovní
  den (`612b2ac`) a tlačítka v detailu Dashboardu (`db6e6a2`); ověřeno
  mockem, že modul nerozbíjí. JK: s etapou 2 počkat na jejich nasazení.
- **2026-09-30** — JK: „Programuj etapu 2“. Stránka `vyroba.html` +
  datová vrstva v `ft_loader.js` + odkazy z Dashboardu a Správy hotové
  lokálně a otestované (sekce 12); oprávnění JK v `users.json`
  (`37c92c1`); JK nahrál (`d8ffaae`), ověřeno GitHub i Pages.
- **2026-09-30** — Doplněk čitelnosti v tmavém režimu (`962ce20`).
- **2026-10-01** — JK: „Programuj etapu 3“. Správa šablon (záložka
  Šablony, „Uložit jako šablonu“) hotová lokálně a otestovaná (sekce
  12); JK nahrál (`a93fdb1`), ověřeno GitHub i Pages.

## 10. Náčrt obrazovek

**Verze 1 (2026-09-29):** https://claude.ai/artifact/BbwnSjfYXTSLR2LFv4zZA6
(soukromý Artifact typu Design — plátno se 6 obrazovkami; sdílet jde
přes menu Share). Statický náčrt, data smyšlená, vzhled podle TOP
`theme.css` (Jost / Work Sans, akcent #FF5914, světlý i tmavý režim).
V režimu Play fungují odkazy mezi obrazovkami a několik ovládacích
prvků.

1. **Přehled projektů (Kanban)** — sloupce Nový / Probíhá / Zamrzlý /
   Hotový (3.12). Karta: typ (VY/VZ/SZ/Jiné), hlavní označení, název,
   zodpovědný, termín, aktuální fáze, postup x/y, doklady PROFIT.
   Ukázky: projekt po termínu, projekt bez čísla PROFIT (Hala 105),
   upozornění na nesoulad (vše hotovo, stav Probíhá — 6.9), zamrzlý
   projekt s důvodem.
2. **Detail projektu** — hlavička hlavního úkolu (ID `*T…*`, stav,
   zodpovědný, termín, šablona, postup, doklady PO/VO/VZ/SZ, poznámka)
   + Kanban podúkolů: řádky = fáze, sloupce = stav (6.10). Podúkol bez
   data, podúkol s položkami k odškrtnutí (rozbalený checklist).
3. **Gantt** — projekt → fáze → podúkoly, pruhy podle stavu, termín
   jako kosočtverec, přesah po termínu červeně, čára „dnes“, víkendy a
   svátky; první projekt jde sbalit/rozbalit.
4. **Kalendář ve stylu SPA** (6.16) — 7 týdnů, víkendy, svátky, dnešek,
   minulé dny zašedlé, štítky podúkolů barvou projektu, dlaždice
   souhrnu nahoře; filtr Projekt funguje.
5. **Nový projekt ze šablony** (6.2) — výběr šablony (VY / VZ / SZ /
   Výkres / Prázdná) mění náhled „Co se vytvoří“; podúkoly jde
   vyřadit; typ se odvodí z předpony čísla (zkusit napsat SZ…).
6. **Podúkoly v týdenním plánu a ve Správě úkolů** — dlaždice podúkolů
   se štítkem projektu, hlavní úkol v plánu není (3.22); ve Správě
   úkolů hlavní úkol + podúkoly jako řádky, pole „Projekt“ ručně
   (3.21), nový sloupec „Hlavní úkol“ jen ke čtení (6.12, 6.14).

**Verze 2 (2026-09-29, po kole 5)** — stejný odkaz:
- Obrazovka 1: karty projektů jdou přetáhnout do jiného sloupce (v
  režimu Play), podnadpis to říká.
- Nová záložka **Šablony** ve všech obrazovkách modulu a nová
  **obrazovka 7 — Šablony postupu** (6.17): seznam šablon, editor fází
  a podúkolů (výchozí řešitel, délka, položky), úchyty pro přetažení,
  „Nová šablona“, „Duplikovat“, „Vytvořit ze stávajícího projektu“.
  V Play jde přepínat šablony a psát do polí.
- Obrazovka 2: tlačítko „Uložit jako šablonu“.
- Obrazovka 5: odkaz „Spravovat šablony“.
- Obrazovka 6: sloupec „Projekt“ → „Označení“ (3.30).

## 11. Technický koncept (2026-09-29; kola 7 a 8 zodpovězena)

Pořád jen na papíře — popisuje, JAK by se modul postavil, aby JK mohl
rozhodnout o pokynu k programování. Ověřeno proti kódu k 2026-09-29
(čísla řádků se budou posouvat).

### 11.1 Datový model

Vše modulové na úkolu je v **jednom objektu `vyroba`**. Důvod:
Správa úkolů skládá úkoly znovu ze seznamu polí (Nástraha č. 1) —
takhle se do `taskToRawFormat()`/`loadFromRaw()` přidá jediné pole a
budoucí rozšíření modulu už Správu úkolů nebudou měnit.

**Hlavní úkol (projekt)** — běžný úkol v `tasks[]`:

```json
{ "id": "*TMV3K2P1A*", "title": "Hydraulický agregát FT-PZ-80",
  "owner": "JK", "state": "Probíhá", "priority": "P1",
  "dueDate": "2026-10-16", "plannedDate": "", "note": "…",
  "vyroba": {
    "druh": "projekt",
    "typ": "VY",
    "oznaceni": "VY26000123",
    "doklady": [ { "id": "d1", "typ": "PO", "cislo": "PO26001357" },
                 { "id": "d2", "typ": "VO", "cislo": "VO26000311" } ],
    "faze": [ { "id": "f1", "nazev": "Příprava" },
              { "id": "f2", "nazev": "Montáž" } ],
    "sablona": "Zařízení (VY)",
    "duvodZamrazeni": ""
  } }
```

**Podúkol** — běžný úkol v `tasks[]`, stávající `subtask: true` +
vazba:

```json
{ "id": "*TMV3K2P7F*", "title": "Montáž mechanická", "owner": "RS",
  "state": "Probíhá", "plannedDate": "2026-09-29", "durationDays": 2,
  "subtask": true, "project": "",
  "vyroba": {
    "druh": "podukol",
    "projekt": "*TMV3K2P1A*",
    "faze": "f2",
    "poradi": 1,
    "polozky": [ { "id": "p1", "text": "Hadice DN19 – mají přijít 40. KT",
                   "hotovo": false, "kdo": "", "kdy": "" } ]
  } }
```

- **Doplněno při etapě 3 (2026-10-01):** projekt nově nese i
  `vyroba.sablonaId` (ID šablony, ze které vznikl — počítání použití;
  `vyroba.sablona` = název zůstává jako údaj i po přejmenování / smazání
  šablony). Projekty z etapy 2 ID nemají → použití se u nich počítá podle
  názvu. Klíč `sablony` v database.json vznikne až prvním uložením
  šablony (do té doby výchozí šablony z kódu); prázdný seznam = JK
  smazal všechny (už se nevrací výchozí). Systémová „Prázdná“ se
  neukládá. Šablona: `{ id, nazev, popis, predpona, faze: [{ id, nazev,
  ukoly: [{ id, nazev, resitel ("" = doplnit při plánování), dny,
  polozky: [{ id, text }] }] }] }`.
- **Doplněno při etapě 2 (2026-09-30):** `vyroba.zamrazenoOd` (datum
  zamrazení, jen ve stavu „Čeká se“), `vyroba.zrusenoSProjektem` na
  podúkolu (zrušen spolu s projektem → při obnovení projektu se obnoví
  s ním). Podúkol bez řešitele má `owner: "Nezařazeno"` — stejná
  konvence jako Správa úkolů (ta prázdnou hodnotu při každém uložení
  přepisuje na „Nezařazeno“); modul bere „Nezařazeno“ i „“ jako „bez
  řešitele“. PostgreSQL: `projekt.zamrazeno_od`, řešitel NULL.
- **Stav projektu = stávající `state`** (Nový / Probíhá / Čeká se /
  Dokončeno), v modulu zobrazený jako Nový / Probíhá / Zamrzlý /
  Hotový. Žádná nová hodnota — Kanban ve Správě úkolů i úklid dat z
  2026-08-06 zůstávají platné.
- **Termín projektu = `dueDate`**, hlavní úkol nemá `plannedDate`
  (není práce na konkrétní den).
- **`project` (UI „Označení“) a `internalProject` zůstávají volné** —
  nic se do nich automaticky nekopíruje (3.21).
- **Šablony** — nový klíč `sablony` v `database.json` (ověřeno:
  `tasksToJson()` ve Správě i SPA `topSync.js` ostatní klíče
  zachovávají):

```json
"sablony": [ { "id": "S1", "nazev": "Zařízení (VY)", "popis": "…",
  "predpona": "VY",
  "faze": [ { "id": "sf1", "nazev": "Příprava",
    "ukoly": [ { "id": "su1", "nazev": "Kontrola skladu",
                 "resitel": "JK", "dny": 1, "polozky": [] } ] } ] } ]
```

- **Převod na PostgreSQL (6.15):** `ukol` (+ `parent_id` → `ukol.id`,
  `faze_id`), `projekt` (1:1 s hlavním úkolem: typ, oznaceni, sablona,
  duvod_zamrazeni), `projekt_doklad`, `projekt_faze` (poradi = pořadí
  v poli), `ukol_polozka`, `sablona` + `sablona_faze` + `sablona_ukol`
  + `sablona_polozka`; číselníky stav, typ projektu, typ dokladu.
  Každý záznam už v JSON nese vlastní ID → převod bez přečíslování.
- **Velikost:** hlavní úkol ~0,5 kB navíc, podúkol ~0,1–0,3 kB navíc
  (+ položky), šablony jednotky kB. Při desítkách projektů ročně
  desítky kB za rok — vedle dnešních 738 kB zanedbatelné (sekce 5).

### 11.2 Co se v TOP změní

| Soubor | Změna |
|---|---|
| `ft_loader.js` | `parseDatabase()`: hlavní úkoly vyřadit ze zobrazovacích dat → nejsou v týdenním plánu, v Backlogu ani v počítadlech na žádné ze 4 stránek (JEDNO místo). Podúkolům přidat jen pro zobrazení označení projektu (neukládá se, jako `primaryOwner` u spoluřešitelů). Nové sdílené funkce modulu (Nástraha č. 10): založení projektu ze šablony, uzavření projektu (hlavní úkol + všechny podúkoly jedním uložením, 3.33), změna stavu, položky. Ukládá se dál přes `saveToGitHub()` → historie úprav a SHA zámek fungují beze změny. |
| `sprava_ukolu_linked.html` | `vyroba` do `taskToRawFormat()` i `loadFromRaw()` (Nástraha č. 1). Popisky „Označení“, „Dodatečné označení“ (6.14). Sloupec „Hlavní úkol“ jen ke čtení + odkaz do modulu, štítek „Projekt“ u hlavního úkolu. Zrušení hlavního úkolu → nabídnout zrušení nedokončených podúkolů. |
| Dashboard, Přehled, oba mobily | Štítek projektu na dlaždici/kartě podúkolu (jištěné proti staré `ft_loader.js` z cache). Dashboard + mobilní Dashboard: popisek „Označení“ u nového úkolu. Jinak beze změny (3.31). |
| **nový** `vyroba.html` | Stránka modulu: záložky Přehled / Gantt / Kalendář / Šablony + detail projektu + dialog Nový projekt. Styly z `theme.css` + `components.css` (+ případně nové sdílené třídy do `components.css`). |
| `users.json` (top-data) | Příznaky oprávnění `projekty` a `sablony` (6.17, 3.35) — zatím jen u JK. |
| SPA `topSync.js` | **Beze změny** — přepisuje jen `*SPA` úkoly, ostatní pole i klíče nechává (ověřeno 2026-09-29, ř. ~282). |

Mobilní verze modulu zatím není v plánu (náhled pro ostatní na mobilu =
otázka „Později“).

### 11.3 Pravidla, která z modelu plynou

- **Podúkoly bez data a Backlog Dashboardu:** Backlog dnes ukazuje
  VŠECHNY nenaplánované úkoly (`renderBacklog`, ř. ~1819, max. 80) a
  počítadlo „Backlog mimo týden“. Projekt ze šablony = 5–9 podúkolů
  bez data najednou → Backlog by se rychle zaplnil. **Rozhodnuto:
  nezobrazovat (3.39).** Filtr na stejném místě jako vyřazení hlavních
  úkolů v `parseDatabase()`, jen pro podúkoly bez `plannedDate` — jakmile
  podúkol dostane datum, objeví se v týdenním plánu jako dnes.
- **Zrušení hlavního úkolu** → nabídnout zrušení nedokončených
  podúkolů. **Smazání** (jen úklidovým skriptem) → podúkoly zůstanou
  „bez projektu“, modul je ukáže jako osiřelé (budoucí `ON DELETE SET
  NULL`).
- **Zrušený podúkol** se nepočítá do postupu projektu.
- **Uzavření projektu** (3.33) využije stávající logiku Hotovo
  (`markTaskDone` — u vícedenního podúkolu stačí stav Dokončeno,
  dlaždice všech dnů se pak ukážou jako hotové).
- **Jedinečnost ID** hlavního úkolu hlídá `generateNextTaskId()` (už
  dnes kontroluje kolize).
- **Historie úprav:** změny v `vyroba` se zapíšou jako „Změna“
  (sledované pole `state` u přetahování projektů se zapisuje už dnes);
  u položek zvážit vlastní popisky v historii.

### 11.4 Etapy (návrh)

Každá etapa samostatně nasaditelná, otestovaná mockem GitHub API na
kopii živé databáze, nahrává JK (Konvence č. 4).

1. **Datový základ ve stávajících stránkách** — `vyroba` ve Správě
   úkolů (Nástraha č. 1), vyřazení hlavních úkolů z týdenního plánu,
   štítek projektu na podúkolech, přejmenování popisků. Bez dat modulu
   se chování appky nemění (stejný postup jako spoluřešitelé, kroky
   1–3).
2. **Stránka modulu — jádro:** přehled projektů (Kanban + přetahování
   s pojistkami), detail projektu (hlavička, doklady, fáze, podúkoly,
   Kanban podle fází, položky), nový projekt ze šablony. Šablony zatím
   připravené předem podle sekce 6.2.
3. **Správa šablon** (jen JK) + „Uložit jako šablonu“.
4. **Gantt.**
5. **Kalendář ve stylu SPA.**
6. **Volitelně: převod existujících dat** (19 ručních vazeb, úkoly s
   VY/VZ/SZ v poli Označení) — jednorázově, s potvrzením JK (6.7).

## 12. Implementace

Každá etapa jen na výslovný pokyn JK (programuje se jen schválená
etapa). Kódové soubory nahrává výhradně JK (Konvence č. 4).

### Etapa 3 — správa šablon (2026-10-01, NASAZENA a ověřena — `a93fdb1`)

**✅ Nahráno JK 2026-10-01 08:56, commit `a93fdb1` (2 soubory)** —
`git fetch` + `cmp`: `ft_loader.js` i `vyroba.html` bajtově shodné s
otestovanou verzí; GitHub Pages (stažení bez cache): SHA-256 obou sedí.
Nasazená `vyroba.html` bez tokenu: načte se bez chyb v konzoli, záložky
Přehled projektů / Šablony, `FTLoader.vyroba.saveSablona` /
`deleteSablona` / `sablonaFromProject` / `sablonaUsage` /
`canEditSablony` / `isSystemSablona` k dispozici, 5 výchozích šablon,
přihlašovací dialog. Klíč `sablony` v database.json vznikne až prvním
uložením šablony. **✅ JK ověřil v appce s reálnými daty (2026-10-02):
„úprava šablony funguje“.**

JK: „Programuj etapu 3“. Podle 6.17 (schváleno v kolech 5–7).

**Soubory (2):**
- **`vyroba.html`** — nová záložka **Šablony** (`vyroba.html#sablony`):
  - Vlevo seznam šablon: název, předpona (VY/VZ/SZ), počet podúkolů,
    „použito u N projektů“, systémová „Prázdná“ poslední. Tlačítka
    „+ Nová šablona“ a „Ze stávajícího projektu“ (výběr projektu).
  - Vpravo editor: název, „Nabízet automaticky pro čísla“ (VY/VZ/SZ/
    nenabízet; upozornění, když stejnou předponu má jiná šablona — pak
    se předvybere ta výš v seznamu), popis; fáze a v nich podúkoly
    (název, výchozí řešitel / „doplnit při plánování“, počet dní,
    položky — rozbalí se pole „každá položka na řádek“). Pořadí fází i
    podúkolů **přetažením za úchyt ⠿** (podúkol i do jiné fáze) nebo
    šipkami ↑↓; přidat / odebrat fázi (s podúkoly → dotaz) i podúkol.
  - Uložit šablonu / Zahodit změny / Duplikovat / Smazat (u použité
    šablony dotaz připomene, že projekty mají vlastní kopii). Neuložené
    změny hlídá dotaz při přepnutí šablony, odchodu ze záložky i
    zavření stránky. „Prázdná“ jen ke čtení.
  - Detail projektu: tlačítko **„Uložit jako šablonu“** — návrh šablony
    z projektu (fáze, nezrušené podúkoly bez dat a stavů, řešitel jako
    výchozí, délka, položky neodškrtnuté; podúkoly bez fáze → fáze
    „Ostatní“) se otevře v editoru, JK ho upraví a uloží.
  - Dialog Nový projekt: odkaz „Spravovat šablony“.
  - Upravuje jen držitel příznaku **`sablony`** (u JK v `users.json` od
    `37c92c1`); ostatní vidí šablony jen pro čtení. Oprávnění projektů a
    šablon jsou oddělená (3.35).
- **`ft_loader.js`** — `FTLoader.vyroba.saveSablona` / `deleteSablona`
  (čerstvé čtení + SHA zámek + až 3 pokusy jako u projektů; oprávnění
  `sablony`; otisk šablony při otevření editoru → když ji mezitím
  změnila jiná záložka, nic se neuloží), `sablonaFromProject`,
  `sablonaUsage`, `canEditSablony`, `isSystemSablona`. Kontroly při
  uložení: název (povinný, jedinečný, ne „Prázdná“), názvy fází a
  podúkolů, počet dní 1–60, řešitel ze seznamu a nevyřazený (stávající
  vyřazený u šablony zůstat smí). ID existujících částí se zachovají,
  nové dostanou vlastní. Uložení beze změny nic nezapíše. `getSablony`
  bere uložený seznam i prázdný; `createProject` ukládá `sablonaId`.

**Test** (podvržené GitHub API, čerstvá kopie živé DB 762 kB, okno
1600×1000, světlý i tmavý režim):
- Výchozí šablony v seznamu, „Zařízení (VY)“ použita u 1 projektu
  (skutečný VY26000014 podle názvu).
- Úprava výchozí VY: přejmenování podúkolu, řešitel RS, 2 položky,
  přetažení „Test funkčnosti“ do fáze Montáž, odebrání prázdné fáze,
  nová fáze s podúkolem → `sablony` v DB = 4 výchozí (bez Prázdné),
  ID nezměněných částí zachována, nové části s vlastními ID, žádný úkol
  nezměněn. Uložení beze změny → 0 zápisů.
- Nová šablona (název „výkres“ odmítnut jako duplicitní, fáze bez názvu
  odmítnuta), předpona VZ s upozorněním na shodu; Duplikovat → „(kopie)“;
  Smazat kopie.
- „Ze stávajícího projektu“ i „Uložit jako šablonu“ z detailu skutečného
  projektu (5 fází, 10 podúkolů s řešiteli a položkami) → uloženo.
- Neuložené změny: přepnutí na Přehled → dotaz; „Zpět“ zůstane na
  šablonách s rozpracovanou kopií, „Zahodit“ odejde.
- Nový projekt VY26000999: předvybrána upravená VY, projekt má fázi
  Lakování, „Test funkčnosti“ v Montáži s položkami, RS u montáže,
  `sablonaId: "S-VY"`; počet použití 1 → 2.
- Souběh: jiná záložka změní šablonu → uložení odmítnuto, 0 zápisů;
  „Zahodit změny“ ukáže aktuální stav.
- Bez příznaku `sablony` (jen `projekty`): šablony jen pro čtení, bez
  „Uložit jako šablonu“, projekty dál upravitelné; přímé volání odmítnuto.
- Uložení jiného úkolu ve Správě úkolů klíč `sablony` zachová beze změny.
- V konzoli jen očekávané hlášky ověřování (duplicitní název, fáze bez
  názvu, souběh), žádný požadavek na skutečný GitHub. `{}`/`()`/`[]`
  vyvážené, CRLF, bez BOM, žádná barva natvrdo (`--accent` se jako text
  nepoužívá — poučení z `962ce20`).

**Nahrání:** `ft_loader.js` + `vyroba.html` najednou. Se starou
`ft_loader.js` z HTTP cache (až 10 min) záložka Šablony jen napíše
„Obnov stránku (Ctrl+F5)“, přehled a detail projektů fungují dál.

### Etapa 2 — stránka modulu (2026-09-30, NASAZENA a ověřena — `d8ffaae`)

**✅ Nahráno JK 2026-09-30 15:03, commit `d8ffaae` (4 soubory)** —
`git fetch` + `cmp`: všechny 4 bajtově shodné s otestovanou verzí;
GitHub Pages (stažení bez cache): SHA-256 všech 4 sedí (15:05).
Nasazená `vyroba.html` bez tokenu: načte se bez chyb v konzoli,
`FTLoader.vyroba` s 5 výchozími šablonami, přihlašovací dialog. Skutečná
data (projekt, přetahování) ověří JK v appce — token se nezadává.

JK: „Programuj etapu 2“ (po nasazení posunu úkolu od ChatGPT `612b2ac`
a úpravy tlačítek `db6e6a2` — etapa 2 na nich staví).

**Soubory (4):**
- **nový `vyroba.html`** — stránka modulu (jen počítač, mobil zatím ne):
  - **Přehled projektů** = Kanban Nový / Probíhá / Zamrzlý / Hotový (+
    sloupec pro neznámý stav, aby nic tiše nezmizelo). Karta: typ
    (VY/VZ/SZ/Jiné), hlavní označení (bez čísla název), název,
    zodpovědný, termín, aktuální fáze, postup x/y, doklady; štítek „Po
    termínu N dní“ / „Hotovo d. m.“; upozornění „všechny podúkoly hotové“
    (6.9) a „Zamrzlé od … : důvod“. Filtry: hledání (číslo, název,
    doklady, ID), typ, zodpovědný, jen po termínu, starší hotové (Hotový
    jinak jen posledních 30 dní), zrušené; pamatují se v prohlížeči.
  - **Přetažení karty = změna stavu** s pojistkami 6.18: do Zamrzlý dotaz
    na důvod (volitelný), do Hotový potvrzení se seznamem nehotových
    podúkolů → všechny nezrušené podúkoly Dokončeno + odškrtnou se
    položky (3.33, 3.37), jedním uložením; z Hotový zpět jen stav
    hlavního úkolu (doneDate pryč, podúkoly beze změny).
  - **Detail projektu** (`vyroba.html#projekt=<ID>`, odkazovatelný):
    hlavička (typ, označení, stav — výběr se stejnými pojistkami, ID,
    zodpovědný, termín, priorita, šablona, založeno, postup, doklady,
    poznámka, důvod zamrazení), upozornění (nesoulad, po termínu, N
    podúkolů bez data), Historie (společný panel z `ft_loader.js`),
    Upravit projekt, Zrušit / Obnovit projekt (volitelně i nedokončené
    podúkoly — navrh 11.3), Upravit fáze (přejmenovat, pořadí, přidat,
    odebrat → podúkoly „Bez fáze“).
  - **Kanban podúkolů**: řádky = fáze (+ „Bez fáze“), sloupce = stav;
    přetažení mění stav i fázi (Dokončeno → doneDate, odchod z Dokončeno
    → doneDate a completedDays pryč — stejně jako Kanban ve Správě).
    Karta: řešitel / „bez řešitele“, dny / „bez data“, položky ☑ x/y —
    rozbalí seznam a odškrtává se přímo (kdo + kdy). „+ Podúkol“ v každé
    fázi.
  - **Dialog podúkolu**: název, fáze, stav, řešitel, priorita, datum,
    počet dní, upřesnění, položky (přidat / přejmenovat / odebrat /
    odškrtnout), Zrušit / Obnovit, Historie, odkaz do Správy úkolů (pro
    auto, spoluřešitele, dny v týdnu — modul je zachová). Datum bez
    řešitele nejde (v plánu by se u nikoho neukázal).
  - **Nový projekt ze šablony**: šablona (předvybere se podle předpony
    označení VY/VZ/SZ, dokud ji uživatel nezmění), označení, název,
    zodpovědný (výchozí přihlášený), termín, priorita, doklady (typ se
    doplní z předpony), poznámka, náhled „Co se vytvoří“ se zaškrtávátky
    (podúkoly jde vyřadit). Stejné označení u jiného projektu → dotaz.
  - Jen náhled bez oprávnění (pruh nahoře, nic nejde přetáhnout ani
    uložit). Stará `ft_loader.js` z HTTP cache → hláška „Obnov stránku“.
  - Barvy jen z `theme.css`, hlavička trvale tmavá jako sidebar
    Dashboardu, tmavý režim sdílený s ostatními stránkami.
- **`ft_loader.js`** — datová logika modulu na jednom místě
  (`FTLoader.vyroba.*`, Nástraha č. 10): výchozí šablony (Zařízení VY,
  Rám/konstrukce VZ, Oprava/servis SZ, Výkres, Prázdná — podle 6.2,
  řešitelé a délky jako návrh; úpravy šablon = etapa 3, klíč `sablony` v
  database.json zatím nevzniká), `createProject`, `updateProject`,
  `setProjectState`, `setProjectCancelled`, `savePhases`, `saveSubtask`,
  `moveSubtask`, `setSubtaskCancelled`, `setItemDone` + výpočty
  (postup, aktuální fáze, typ z označení). **Každá změna = čerstvé čtení
  + cílená úprava podle ID + `saveToGitHub`** (SHA zámek, historie); při
  409 až 3 pokusy nad čerstvými daty (cizí změny zůstanou); při
  nejasném výsledku zápisu žádné slepé opakování. U úprav z dialogu
  (projekt, podúkol, fáze) kontrola otisku: když úkol mezitím upravil
  někdo jiný, nic se neuloží a přijde hláška. Oprávnění:
  `getUserOpravneni()` / `hasOpravneni()` z nového pole `opravneni` v
  `users.json` (6.17); zápis smí jen plánovač s příznakem `projekty`.
  ID fází / dokladů / položek jedinečná (čas + pořadí + náhoda, 6.15).
  Drobnosti: `generateNextTaskId` přejde po 50 kolizích na dvouznakovou
  příponu (víc úkolů v jedné milisekundě nesmí zacyklit smyčku);
  popisky historie „projekt“ → „označení“, „dodatečné označení“, nové
  „údaje projektu (výroba)“.
- **`tydenni_dashboard_live_reload_local_linked.html`** — čip „📁 Projekt …“
  v detailu podúkolu je odkaz na detail projektu (okno
  `top_vyroba_window`); nové plovoucí tlačítko „🏭 Řízení výroby“.
- **`sprava_ukolu_linked.html`** — u hlavního úkolu „📁 Projekt <označení>“,
  u podúkolu „↳ projekt <označení>“ (tabulka i Kanban, odkaz do modulu,
  jen ke čtení — 6.6, 6.12); plovoucí tlačítko „🏭 Řízení výroby“.
  Uložení beze změny (`vyroba` už zachovává z etapy 1).

**Test** (podvržené GitHub API, čerstvá kopie živé DB 748 kB / 1 687
úkolů, dočasný lokální server, okno 1600×1000, světlý i tmavý režim):
- Založení projektu přes dialog (VY, 1 podúkol vyřazen): +9 úkolů,
  ostatních 1 687 beze změny, fáze s novými ID, doklady normalizované
  (`po26001357` → PO, `VO 26000311` → VO), commit „Projekt … založen ze
  šablony …“, 9 záznamů historie. Předvýběr šablony podle předpony i s
  mezerou („vz 26000050“ → VZ).
- Podúkol: datum bez řešitele odmítnuto; řešitel + datum + 2 dny + stav
  + nová položka → změněn jen ten podúkol; v Dashboardu se ukáže u RS na
  2 dny se štítkem a odkazem na projekt, hlavní úkol ani podúkoly bez
  data v plánu nejsou; `DATA.tasks` Dashboardu i počítadla bajtově
  shodné s nasazenou verzí.
- Položka odškrtnutá z karty (kdo JK, kdy ISO čas), přetažení podúkolu do
  jiné fáze a do Dokončeno (doneDate), fáze přejmenovat / přesunout /
  odebrat / přidat (podúkoly odebrané fáze → „Bez fáze“).
- Projekt: Zamrzlý — „Zpět“ nic nezmění, s důvodem → stav Čeká se, důvod
  + „Zamrzlé od“ na kartě; Hotový — potvrzení se seznamem 7 nehotových
  → 7 podúkolů Dokončeno, 10 položek odškrtnuto, žádný jiný úkol
  nezměněn; zpět do Probíhá — změní se jen hlavní úkol. Zrušení s
  nedokončenými podúkoly (2) → zmizí z přehledu, obnovení vrátí i je.
- Souběh: kolega mezitím upraví otevřený podúkol → „mezitím upravil
  někdo jiný“, 0 zápisů; 409 při zápisu → 2. pokus nad čerstvými daty,
  kolegova změna jiného úkolu zachována.
- Bez příznaku `projekty`: pruh „Jen náhled“, žádné přetahování ani
  tlačítka, dialog jen ke čtení, přímé volání funkce odmítnuto, 0 zápisů.
- Správa úkolů: značky projektu v tabulce i Kanbanu; uložení jiného úkolu
  zachová `vyroba` u všech, historie zapíše jen ten úkol. **Nález
  cestou:** Správa mění prázdného řešitele na „Nezařazeno“ → modul
  zapisuje rovnou „Nezařazeno“ (jinak by první uložení ve Správě
  zapsalo falešnou změnu řešitele u každého nepřiřazeného podúkolu).
  Zbývá jen `waiting: false`, které Správa doplňuje všem úkolům
  (i z Dashboardu) — historie ho nepočítá jako změnu.
- Žádné JS chyby nového kódu (v konzoli jen zbytky ranního testu a
  záměrně zablokovaný `sw.js`), žádný požadavek na skutečný GitHub.
  `{}`/`()` vyvážené, CRLF, bez BOM, žádná barva natvrdo. Řádek, podle
  kterého testy ChatGPT (`tests/task-shift.test.cjs`) upravují
  `ft_loader.js`, zůstal beze změny (testy samotné nešly spustit —
  chybí Node.js).

**Oprávnění:** ✅ JK schválil 2026-09-30 — do `users.json` (top-data)
doplněno u JK `"opravneni": ["projekty", "sablony"]` (commit `37c92c1`,
jen tento záznam, ostatní beze změny, ověřeno na GitHubu). Ostatní
uživatelé mají modul jen jako náhled (záměr 6.17). Nasazená
`ft_loader.js` pole zatím ignoruje, načte ho až verze z etapy 2.

**Doplněk po nasazení (JK 2026-09-30, screenshot z tmavého režimu) —
✅ NAHRÁNO `962ce20`, GitHub i Pages ověřeny:** modré upozornění „N
podúkolů nemá datum“ bylo v tmavém režimu nečitelné (`--accent` nemá
tmavou variantu, na `--accent-soft` splývá). Teď červený text jako
upozornění na kolizi auta (`--auto-kolize`, bez pozadí). Stejná chyba u
štítku stavu „Probíhá“ v detailu → `--prio-p2-bg`/`--prio-p2-text`
(světlý režim beze změny). **Poučení pro další etapy:** `var(--accent)`
nepoužívat jako barvu textu na tmavém pozadí — v tmavém režimu je stejná
jako ve světlém.

**Záměrně mimo etapu 2 / otevřené:** správa šablon (etapa 3), Gantt (4),
kalendář (5); ve Správě úkolů se při zrušení hlavního úkolu zatím
nenabízí zrušení podúkolů (v modulu ano); Přehled (desktop i mobil) a
mobilní Dashboard odkaz do modulu nemají; mobilní verze modulu není.

### Etapa 1 — datový základ (2026-09-29, NASAZENO a ověřeno včetně opravy completedDays — HOTOVO)

JK: „Koncept schválen, programuj etapu 1“.

**✅ Nahráno JK 2026-09-29 13:35, commit `8531e16` (6 souborů)** —
`git fetch` + `cmp`: všech 6 bajtově shodných s otestovanou verzí;
GitHub Pages (stažení bez cache): SHA-256 všech 6 sedí.

**Doplněk etapy 1 — oprava `completedDays` (JK: „oprav to ještě do
etapy 1“), ✅ NAHRÁNO JK 2026-09-29 13:45, commit `761dec7` (jen
`sprava_ukolu_linked.html`) — GitHub bajtově shodný, Pages ověřeny
13:46 (SHA-256 všech 6 souborů etapy 1 sedí):** viz „Vedlejší nález“ níž — `saveTaskFromModal()`
i `kanbanDrop()` teď mažou odškrtnuté dny JEN při odchodu Z
„Dokončeno“ (rozhoduje původní stav `wasDone`, uložený před změnou).
Kanban měl stejnou chybu (přetažení Probíhá → Čeká se mazalo dny).
Test proti nasazené verzi `8531e16` (mock, čerstvá kopie živé DB, dva
testovací vícedenní úkoly):

| Scénář | Nasazená verze | Opravená |
|---|---|---|
| S1 okno: jen poznámka u rozpracovaného (1 den odškrtnut) | dny smazány ✗ | zachovány ✓ |
| S2 okno: Dokončeno → Probíhá | smazány | smazány (záměr, nález č. 13) |
| S3 okno: poznámka u hotového | zachovány | zachovány |
| S4 Kanban: Probíhá → Čeká se | dny smazány ✗ | zachovány ✓ |
| S5 Kanban: Dokončeno → Nový | smazány | smazány (záměr) |
| S6 okno: rozpracovaný → Dokončeno | zachovány | zachovány |

Uložení všech 1 685 živých úkolů bajtově shodné s nasazenou verzí,
žádné JS chyby, žádný požadavek na skutečný GitHub; `{}` beze změny,
`()` +3 páry (podmínky `wasDone`), CRLF, bez BOM.

**Změny (6 kódových souborů):**
- `ft_loader.js` (+33/−1): `isProjectTask()` / `isProjectSubtask()`
  (exportováno jako `FTLoader.*`). V `parseDatabase()` se ze
  zobrazovacích dat vyřadí hlavní úkoly projektů a podúkoly bez
  `plannedDate` (3.22, 3.39); podúkoly dostanou jen pro zobrazení
  `projektOznaceni` / `projektNazev` (neukládá se). `allTasks` beze
  změny.
- `sprava_ukolu_linked.html` (+20/−6): `vyroba` v `taskToRawFormat()`
  i `loadFromRaw()` přes novou `cloneVyroba()` (hluboká kopie, ne
  sdílený odkaz). Popisky „Označení“ / „Dodatečné označení“ — rychlý
  filtr, sloupec tabulky, modal, žlutý pruh aktivního filtru.
- `tydenni_dashboard_live_reload_local_linked.html` (+23/−5): štítek
  `📁 <označení>` na dlaždici podúkolu (`.project-badge`, stejný styl
  jako štítek sdíleného úkolu), čip „📁 Projekt … · název“ v detailu,
  „Bez projektu“ → „Bez označení“ (detail, Backlog), hledání „Hledat
  úkol / označení / ID“, popisky nového úkolu „Označení“ a **„Dodatečné
  označení“ — dřív „Interní číslo projektu“, přejmenování z 2026-07-29
  se do Dashboardu nikdy nepromítlo**.
- `tydenni_prehled.html` (+16/−2): štítek, čip, „Bez označení“.
- `tydenni_prehled_mobile.html` (+5/−1) a `tydenni_dashboard_mobile.html`
  (+6/−2): štítek jako `.meta-tag` s novou ikonou `ICON_FOLDER`, čip v
  detailu, „Bez označení“; mobilní Dashboard popisek „Označení“ u
  nového úkolu.
- Beze změny: `theme.css`, `components.css`, `sw.js`, SPA.
- Se starou `ft_loader.js` z HTTP cache stránky nespadnou: čtou jen
  vlastnost `projektOznaceni` (chybí → štítek se neukáže). Správa
  nepoužívá žádnou novou funkci loaderu.

**Test** (podvržené GitHub API + čerstvá kopie živé DB, 747 kB, 1 685
úkolů; dočasný lokální server, stránky z pracovní kopie i z HEAD vedle
sebe):
- **A) Regrese bez dat modulu:** všech 5 stránek — `DATA.tasks` (2 225
  zobrazovaných úkolů) bajtově shodné s HEAD, stejná počítadla, Backlog
  i dlaždice. Správa úkolů — `tasksToJson()` všech 1 685 úkolů bajtově
  shodné s HEAD.
- **B) S testovacím projektem** (2 hlavní úkoly — jeden i s datem na 5
  dní; 4 podúkoly — vícedenní s položkou, se spoluřešitelem, bez data,
  osiřelý; 1 běžný úkol bez data): hlavní úkoly ani podúkol bez data
  nejsou v plánu, Backlogu ani počítadlech na žádné stránce (Dashboard
  118/106 proti HEAD 123/108 — přesně o vyřazené); štítek u podúkolů i u
  kopie spoluřešitele; osiřelý podúkol bez štítku; Hotovo (běžný úkol i
  den vícedenního) zachová `vyroba` a zapíše historii.
- **Nástraha č. 1 živě:** uložení JINÉHO úkolu ve Správě zachová
  `vyroba` u všech, ostatních 1 685 úkolů beze změny. Kontrola: HEAD
  Správa `vyroba` smaže u všech → test chybu opravdu chytá. Úprava
  podúkolu v modalu Správy i z mobilu (otevřená z kopie spoluřešitele)
  zachová `vyroba` i hlavního řešitele.
- Žádné JS chyby (jediná hláška = záměrně zablokovaná registrace
  `sw.js` na testovacím serveru), žádný požadavek na skutečný GitHub.
  CRLF, bez BOM, vyváženost závorek beze změny vzoru.
- Po testu smazáno: kopie DB, kopie HEAD, dočasný `TOP/.claude/
  launch.json`, úložiště testovacího prohlížeče.

**Nahrání:** všech 6 souborů najednou. Pořadí nehraje roli — v produkci
zatím žádná data modulu nejsou, viditelně se změní jen popisky.
**Správa úkolů s `vyroba` musí být nasazená dávno před tím, než etapa
2 založí první projekt** (stará Správa z cache by `vyroba` při uložení
smazala u všech úkolů).

**Vedlejší nález (existující chyba mimo etapu 1 — JK: opravit v rámci
etapy 1, OPRAVENO lokálně, viz výš):** `saveTaskFromModal()` ve Správě (ř. ~1683) kontroluje po
`Object.assign` už NOVÝ stav. U vícedenního úkolu, který není
Dokončeno a má odškrtnuté dny (`completedDays`), se tyto dny smažou
při KAŽDÉM uložení modalu — i když se mění jen poznámka. Ověřeno i na
HEAD. Pochází z opravy 2026-09-17 (nález č. 13), která měla mazat jen
při přechodu Z „Dokončeno“. Týká se i budoucích vícedenních podúkolů.
