# Historie úprav úkolů — návrh (NEDOŘEŠENO, odloženo)

**Stav:** návrh hotový, části rozhodnutí potvrdil JK 2026-09-22,
**implementace odložena** („teď to řešit nebudeme“). Nic se zatím
neimplementovalo, v kódu ani v `top-data` není žádná změna.
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
