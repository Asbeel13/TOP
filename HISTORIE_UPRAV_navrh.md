# Historie úprav úkolů — návrh a průběh implementace

**Stav (2026-09-23):** JK obnovil práci. **Krok 1 (zápis) NASAZEN** —
JK nahrál `ft_loader.js` sám dřív, než byl hotový krok 2 (commit
`490d173`, 18:21; GitHub i Pages bajtově shodné s ověřenou verzí).
Historie se tedy už sbírá, prohlížet ji půjde až po kroku 2.
**První ostrý zápis ověřen:** `top-data/history/2026-09.json` vznikl
18:37:37 (úklid duplicit, 4× `smazan`), commit historie 1 s po commitu
databáze. Dvě uložení 18:28/18:29 do historie NEpřišla — stránka Správy
byla otevřená od 17:57, tedy se starým loaderem v paměti (po Ctrl+F5 už
OK). Pozn.: `t` bere čas z PC uživatele (u JK ~20 s za časem GitHubu).
**Krok 2 (zobrazení) HOTOVÝ lokálně 2026-09-23, NENAHRANÝ — čeká na JK**
(JK: "pokračuj krokem 2" po ukázaném náhledu). Jen
`sprava_ukolu_linked.html`:
- Tlačítko `#modalHistoryBtn` "🕘 Historie" v hlavičce modalu (jen u
  existujícího úkolu s ID a jen když loader má `readHistoryMonth` —
  stará verze z HTTP cache → tlačítko skryté). Panel `#m_history` na
  konci formuláře, druhé kliknutí zavře, otevření jiného úkolu resetuje.
- Měsíce od `createdDate` (nejdřív `HISTORY_START_MONTH = "2026-09"`)
  po aktuální, od nejnovějšího; na začátku 3 měsíce, pak "Zobrazit
  starší (měsíc)". Uzavřené měsíce v paměti, aktuální se stahuje vždy
  znovu. Výsledek, který dorazí po přepnutí na jiný úkol, se zahodí.
- Filtr: `e.id === task.id`; `opak_*` se nezobrazují; u sdíleného ID
  (zástupy za pravidlo) jen záznamy k `plannedDate` úkolu (i přes
  `ch.plannedDate`).
- Štítky: Založen / Změna / Hotovo / Hotový den / Zrušen / Obnoven /
  Smazán, barvy jen z existujících proměnných theme.css
  (`--accent-soft`, `--chip-bg`, `--success-soft`, `--danger-soft`,
  `--warn-soft` + text), nic nového v theme.
- Test mockem (kopie živé DB + skutečný `history/2026-09.json` jako
  výchozí stav): úprava/spoluřešitel+auto/Hotovo → 3 řádky se správnými
  starými → novými hodnotami; nový úkol → "Založen řešitel RS, na
  2. 10., P1"; úkol bez historie → "Zatím žádné záznamy…"; nový
  úkol/stará verze loaderu → tlačítko skryté; GET 500 → chybová hláška
  v panelu; rychlé přepnutí úkolu → nic se nevykreslí; simulovaný
  prosinec → 3 měsíce + "Zobrazit starší (září)" → doplní září;
  zástupy → správně jen své datum. Světlý i tmavý režim zkontrolován
  snímkem.
**Krok 2 NASAZEN** (`2e9b1cd`, 18:50, GitHub i Pages bajtově shodné).

### Rozšíření: historie i v Dashboardu (JK 2026-09-23) — NASAZENO 2026-09-24 (`2d7434d`)
JK k omezení níže (sloupec "Zrušil / kdy" u výjimek ve Správě): **zatím ne.**
JK: "jen Dashboard na počítači" (mobilní dashboard ani Přehledy NE);
"u opakovaných úkolů nemusí být podrobná historie, jen kdo dal Hotovo,
smazat, zástup".
- **Zobrazení přesunuto do `ft_loader.js`** (`toggleTaskHistory(panel,
  task, ctx)`, `resetTaskHistory(panel)`, `ctx = { tasks, ruleIds }`) —
  jedna kopie pro Správu i Dashboard (poučení z 3 rozcházejících se
  kopií kontroly aut). Správa má už jen tenké napojení; tlačítko se
  ukáže jen když loader funkci má (stará verze z cache → skryté).
- **Styly do `components.css` v1.1.0** (kopie v Esperantu synchronní,
  INTEGRACE.md sekce 5 záznam 2026-09-23). `.history-btn` má
  `width:auto` — Dashboard dává všem `<button>` 100 %.
- **Zápis rozšířen o výjimky:** `opak_zrusen` (+ `duvod`) /
  `opak_obnoven` — "Zrušit dnes" = přidání výjimky. Úpravy pravidel
  pořád NE.
- **Dashboard:** tlačítko `#modalHistoryBtn` v detailu, panel
  `#modalHistory` pod poznámkami, `#modal .modal-card` dostal
  `max-height:90vh; overflow:auto`. Zobrazovací kopie (den vícedenního,
  kopie spoluřešitele) → historie původního záznamu přes
  `findRawTaskForOccurrence`. Opakovaný výskyt → "Historie výskytu":
  jen `opak_*` + založení/zrušení zástupu k datu; úkol se stejným ID
  jako pravidlo má štítek "Zástup". SPA úkoly → bez tlačítka (i ve
  Správě).
- **Omezení:** zrušený den opakovaného úkolu z kalendáře zmizí → jeho
  detail (a tím "kdo zrušil") v Dashboardu nejde otevřít. Záznam se
  zapisuje, panel ho umí ukázat — nahlášeno JK.
- Test mockem (kopie živé DB + živý `history/2026-09.json`): Hotovo
  běžného, kopie spoluřešitele i originálu, den vícedenního (i z jiného
  dne téhož úkolu), opakovaný Hotovo, zrušený den s důvodem, zástup
  ("Zástup řešitel RS, na 19. 10., P0"), jiný den pravidla prázdný,
  stará verze loaderu / SPA úkol → bez tlačítka; Správa po přesunu beze
  změny chování (vč. živých záznamů `*0408*`); `components.css` celý
  rozparsován (52 pravidel), `/* */` v pořádku; světlý i tmavý režim
  snímkem.

Další: krok 3 (zpětné doplnění z commitů `history/import-git.json`).

### Doplněná rozhodnutí JK (2026-09-23)
- **Auto (SPZ)** — sledovat i starou → novou hodnotu: ANO.
- **Změny opakujících se pravidel a výjimek** — ZATÍM NE, jen úkoly
  (dokončení opakujícího se úkolu `opak_hotovo` ano, to je zadání).

### Krok 1 — co je v `ft_loader.js` (sekce "Historie úprav úkolů")
- Výchozí stav pro rozdíl = **`_base = { sha, str }` v paměti loaderu**
  (ne localStorage cache jak bylo v návrhu níž — ta se při plné kvótě
  tiše neuloží). Nastavuje se ve `fetchFromGitHub`, po úspěšném
  `saveToGitHub` a v synchronizaci záložek (`storage` event). Použije se,
  jen když `_base.sha === _lastSha` → rozdíl je přesně to, co dané
  uložení změnilo (GitHub přijme zápis jen při shodě SHA).
- Formát oproti návrhu upraven: `ch` jen u state/owner/coOwners/
  plannedDate/priority/auto; hotové dny vícedenního úkolu jako
  `dny` / `dnyZpet` (jen přidané/odebrané dny, ne celý seznam 2×);
  `zalozen`/`smazan` nesou `n` (název) a `ch` s výchozími hodnotami;
  navíc akce `opak_hotovo_zruseno` (Správa → smazání dokončení).
- Prázdné hodnoty (`undefined`/`null`/`""`/`false`/`[]`) = shodné,
  `lastUpdated` se ignoruje.
- Párování duplicitních ID: nejdřív úplná shoda obsahu, pak
  `plannedDate`, pak pořadí. **Bez kroku "úplná shoda" dalo uložení
  Správy BEZ jediné změny 6 falešných záznamů** (živá data mají
  `*0463*`/`*0464*` 2× se stejným ID i datem, jeden zrušený).
- Pojistka: > 200 záznamů z jednoho uložení → jeden `hromadna_zmena`
  s `pocet`.
- Zápis: fronta (sekvenčně), GET měsíce (404 → nový soubor), PUT se
  `sha`, při 409/422 znovu, max 3×; chyba jen `console.warn`.
- Exportováno: `buildHistoryEvents` (testy), `readHistoryMonth` (pro
  krok 2 — zobrazení).

### Test kroku 1 (2026-09-23, mock GitHub API + kopie živé DB, 1 612 úkolů)
Přes skutečné funkce stránek, ne zkratky:
- Správa: uložení bez změn → **0 záznamů** (DB zápis proběhl); úprava
  v modalu, Kanban, Hotovo, zrušit, obnovit, hromadně Hotovo (2
  záznamy), nový úkol, řešitel + spoluřešitel + auto, zrušení dokončení
  opakovaného — vše správná akce, pole i staré → nové hodnoty.
- Dashboard: Hotovo, Hotovo dne vícedenního (už hotový den → 0
  záznamů, správně; poslední den → `hotovo`), opakovaný, zástup, nový
  úkol se spoluřešitelem. Mobilní dashboard: úprava, úprava přes kopii
  spoluřešitele (hlavní řešitel se nezměnil), zrušení, nový úkol.
  Přehled: Hotovo u duplicitního ID, den vícedenního. Mobilní přehled:
  opakovaný.
- Odolnost: výpadek historie (500) → úkol uložen, žádný alert, jen
  warn; 2× 409 → zapsáno 3. pokusem; 3× 409 → vzdá to, úkol uložen;
  2 rychlá uložení → oba záznamy; cizí změna načtená pollingem se do
  mé historie NEpřipíše; cizí změna nenačtená → 409, historie nic;
  změna z jiné záložky (storage event) → zapsána jen moje změna;
  250 změn → 1 souhrnný záznam.
- Výkon: rozdíl 1 612 úkolů ~9 ms.
- **Vedlejší nález (mimo historii, neopraveno):**
  `findRawTaskForOccurrence` nevynechává zrušené úkoly — Hotovo u
  `*0463*` (2× stejné ID i datum, jeden zrušený) označilo ZRUŠENOU
  kopii. V živých datech jen 3 takové úkoly (`*0463*`, `*0464*`
  2026-07-23, `*TMTJXVNFJ*` 2026-09-04) → nahlášeno JK.
- **Omezení mocku (ne chyba appky):** po založení úkolu ve Správě mock
  nevyvolá překreslení (stejné SHA), takže další uložení Správy úkol v
  testu "smazalo". Ověřeno v git historii `top-data`: od 2026-09-03
  desítky případů "Nový úkol X" → do minuty "Uloženo" stejným
  uživatelem a úkol vždy přežil → reálný GitHub se chová jinak.
  (Jediná ztráta 2026-09-02 `*TMTJKZWG2*` je ze stejné doby jako chyba
  s `rowIndex` opravená 2026-09-17.)

---

## Původní návrh (2026-09-22)

Až se k tomu bude vracet: přečíst celý soubor, ověřit, že čísla řádků
a měření jsou pořád aktuální, a začít krokem 1 (viz konec).

## Zadání JK

V TOP vidět historii úprav jednotlivých úkolů: **kdo úkol založil, kdo
ho změnil, kdo dal hotovo, kdo ho smazal/zrušil.** Otázka zněla i na
náročnost a dopad na velikost databáze.

## Změřená četnost úprav (2026-09-22)

Z historie commitů `top-data` (stažena jen historie bez obsahu souborů,
`git clone --filter=blob:none`). Za 30 dní **1 391 uložení z appky**
(~46 denně), bez synchronizace ze SPA:

| Zpráva commitu | Počet / 30 dní |
|---|---|
| „Uloženo uživatelem X“ (Správa úkolů — NEVÍ SE, který úkol) | 589 |
| „Nový úkol *ID* přidán uživatelem X“ (+ z mobilu) | 456 |
| „Úkol *ID* označen jako hotový uživatelem X“ | 254 |
| „Dokončení RFTxxx … zaznamenáno uživatelem X“ (opakující se) | 50 |
| „Den YYYY-MM-DD úkolu *ID* označen jako hotový uživatelem X“ | 40 |
| „Úkol *ID* upraven z mobilu uživatelem X“ | 2 |
| Sync ze SPA (pro srovnání, do historie nepatří) | 109 |

Celkem 6 027 commitů od 2026-07-15. **Nejčastější typ („Uloženo
uživatelem X“) neříká, kterého úkolu se týkal** → z Gitu se historie
jednotlivých úkolů spolehlivě zpětně sestavit nedá, je potřeba vlastní
záznam.

## Odhad velikosti

Jeden záznam kompaktně ~80 B, např.
`{"t":"2026-09-22T10:15","u":"JK","a":"zmena","f":["state"]}`.

| Úroveň detailu | Za měsíc | Za rok |
|---|---|---|
| kdo / kdy / akce / **která pole** | ~110 kB | ~1,3 MB |
| + **stará → nová hodnota** u klíčových polí | ~200 kB | ~2,5 MB |

Pro srovnání `database.json` má 713 kB (po přechodu svátků na sdílený
úkol, 2026-09-22).

## Kam historii ukládat — rozhodnuto

- **NE do `database.json`** (k úkolům): přerostl by 1 MB zhruba za
  měsíc a rostl dál; každý otevřený prohlížeč si ho po každé změně stahuje
  celý (polling 5 s) — zdražil by se celý provoz kvůli údaji, který
  otevře málokdo. Riziko nafouknutí DB se řešilo v incidentu 2026-09-18.
- **ANO samostatné měsíční soubory `history/YYYY-MM.json` v `top-data`:**
  hlavní databáze ani polling se nezmění, historie se stahuje až při
  otevření, po měsících jde archivovat/mazat.

## Rozhodnutí JK (2026-09-22)

| Otázka | Rozhodnutí |
|---|---|
| Úroveň detailu | JK bez preference → **doporučená varianta:** kdo/kdy/akce/pole + stará → nová hodnota u stavu, řešitele, spoluřešitelů, data a priority; u textů (název, poznámka) jen „změněno“ |
| Spolehlivost zápisu | **Nejdřív úkol, pak historie** („best effort“) — při výpadku přesně mezi zápisy se může ztratit 1 záznam historie, úkol se uloží vždy |
| Kde zobrazit | **Jen ve Správě úkolů** (sekce „Historie“ v modalu úkolu) |
| Zpětné doplnění z commitů | **Ano, co jde** (kdo založil, kdo dal hotovo) |
| Jak dlouho držet | Nerozhodováno výslovně → **napořád** (měsíční soubory, staré jde kdykoli smazat) |

## Návrh řešení

### Formát záznamu

```json
{"t":"2026-10-01T09:12:40Z","u":"JK","id":"*T1AB2C3D4*","d":"2026-10-02","a":"zmena",
 "f":["state","plannedDate","note"],"ch":{"state":["Nový","Probíhá"],"plannedDate":["2026-10-01","2026-10-02"]}}
```

- `t` čas (ISO), `u` zkratka (ověřená přes whitelist,
  `getCurrentUserFromConfig()`), `id` ID úkolu, `d` datum (rozlišení
  zástupů se stejným ID), `a` akce, `f` změněná pole, `ch` stará → nová
  hodnota u klíčových polí.
- Akce: `zalozen`, `zmena`, `hotovo`, `den_hotovo` (vícedenní,
  `completedDays`), `zrusen` (`cancelled` false→true), `obnoven`
  (true→false), `smazan` (zmizel z `tasks[]`), `opak_hotovo`
  (přírůstek v `dokonceni` — opakující se úkol, `id` = ID pravidla).
- Soubor: `{ "version": 1, "events": [ … ] }`, měsíc podle času události.
- **Úkoly ze SPA (`*SPA…` — dovolená, svátky) se NEZAPISUJÍ** (sync je
  přepisuje, zahltily by historii).

### Zápis — jediné místo: `saveToGitHub()` v `ft_loader.js`

Audit 2026-09-18 potvrdil, že VŠECHNY zápisy TOP jdou přes
`saveToGitHub()` (5 stránek, žádná vlastní kopie zápisové logiky).

1. **Diff před/po:** stav PŘED = cache načtených dat (`DATA_KEY`
   v localStorage — aktualizuje se až na konci úspěšného uložení, na
   začátku `saveToGitHub()` tedy drží stav před změnou; stránky pracují
   s vlastní kopií z `getRawJson()`). Stav PO = `json` předaný k uložení.
   Z rozdílu se odvodí události → **není potřeba upravovat desítky
   obsluh tlačítek v 5 souborech**, a zachytí se i nejasná „Uloženo
   uživatelem X“ ze Správy (diff pozná, co se skutečně změnilo, i při
   hromadné úpravě víc úkolů).
2. **Párování úkolů:** podle `id`; u skupin se stejným `id` (zástupy)
   podle `plannedDate`, zbytek v pořadí. POZOR: změna `plannedDate` u
   unikátního ID se musí vyhodnotit jako `zmena`, ne jako smazání +
   založení — proto primárně jen `id`, datum až pro duplicitní ID.
3. **Zápis historie až PO úspěšném uložení úkolu**, na pozadí ve frontě
   (sekvenčně, neblokuje UI): GET `history/YYYY-MM.json` (neexistuje →
   založit) → připojit události → PUT se `sha`; při 409 znovu (max 3×).
   **Selhání historie nikdy nesmí shodit ani zablokovat uložení úkolu**
   (jen `console.warn`).
4. Počet commitů v `top-data` se zdvojnásobí (~1 400 → ~2 800/měsíc) —
   technicky bez problému.

### Zobrazení — Správa úkolů

- V modalu úkolu sekce „Historie“, načte se až na kliknutí.
- Stáhne měsíce od `createdDate` úkolu po dnešek (+ `import-git.json`),
  načtené měsíce drží v paměti; u starých úkolů „zobrazit starší“ až na
  vyžádání (každý měsíc ~110–200 kB).
- Seznam: čas · kdo · akce · detail (stará → nová hodnota).

### Zpětné doplnění z commitů

- Jednorázově z ~6 000 commitů od 2026-07-15, jen ze **zpráv commitů**
  (bez stahování obsahu): „Nový úkol … přidán“, „… označen jako hotový“,
  „Den … úkolu … hotový“, „Dokončení RFTxxx … zaznamenáno“ → čas + kdo.
- Uložit do jednoho souboru `history/import-git.json` (~300 kB odhad),
  záznamy označit `"src":"git"` — oddělený soubor = žádné slučování s
  živě zapisovanými měsíci.
- Úpravy přes Správu („Uloženo uživatelem X“) zpětně NEJDOU.
- Na stroji není Node/Python → skript v Bash/awk nebo v prohlížeči.
  Soubor nahraje do `top-data` JK (konvence: kód i data nahrává JK).

## Úskalí a rizika

1. **Dva soubory nejdou uložit atomicky** (Contents API = 1 soubor / 1
   commit) → zvolen „best effort“ (viz rozhodnutí). Atomická alternativa
   = Git Data API (blobs → tree → commit → update ref, 5 požadavků).
2. **Souběh zápisu do stejného měsíčního souboru** — retry na 409, při
   ~46 zápisech/den vzácné.
3. **Není to nezfalšovatelný audit** — záznam zapisuje prohlížeč, kdo má
   zápisový token a DevTools, může historii upravit. Stejný kompromis
   jako role Operátor (viz „Systém uživatelů a rolí“ v `CLAUDE.md`).
4. **Stará stránka + nový `ft_loader.js` (HTTP cache 10 min)** — zápis je
   v loaderu, stránky nic nevolají → bez rizika pádu; zobrazení ve
   Správě jistit `FTLoader.xxx ? … : …` jako u spoluřešitelů.
5. **Po `saveToGitHub()` se stránka sama nepřekreslí** (`fetchFromGitHub`
   končí na `sha === _lastSha`) — zjištěno při testu spoluřešitelů,
   pro historii nevadí, jen pro testovací mock.

## Kroky implementace (až se na to přijde)

1. **Zápis historie** v `ft_loader.js` (diff + fronta zápisů). Test
   mockem GitHub API (`mock_github.js`, vzor ze spoluřešitelů — musí
   umět i `history/*.json`) na kopii živé DB: všechny typy uložení na
   všech 5 stránkách (nový úkol, úprava v modalu, Hotovo, den hotovo,
   opakující se hotovo, zrušení, Kanban, hromadné akce Správy, zástup).
2. **Zobrazení** ve Správě úkolů.
3. **Zpětné doplnění** z commitů (`import-git.json`).

Kroky 1 + 2 nahrát společně — po kroku 1 se historie začne sbírat, ale
bez kroku 2 nejde prohlížet.
