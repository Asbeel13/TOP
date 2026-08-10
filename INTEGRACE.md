# INTEGRACE.md — TOP ↔ SPA, sdílený předávací dokument

**Účel tohohle souboru:** jediné místo, kde se zaznamenává vše, co se
týká **rozhraní mezi TOP a SPA** — ne vnitřní vývoj kteréhokoliv z
projektů (ten zůstává ve vlastním `CLAUDE.md` každého projektu), ale
konkrétně **styčný bod mezi nimi**: dohodnutý formát dat, stav
implementace na obou stranách, otevřené otázky, historie
mezi-projektových handoffů.

**Kdo to čte:** Claude instance pracující v TOP i Claude instance
pracující v SPA by měly tenhle soubor znát a **aktualizovat ho
společně s jakoukoliv změnou, která se týká druhé strany** — ne až
zpětně přes JK, ale rovnou jako součást práce na integraci.

**Vztah k vlastním `CLAUDE.md` obou projektů:** Každý projekt si ve
svém `CLAUDE.md` může mít vlastní changelog o integraci (jak jsme to
dělali dosud), ale **konkrétní aktuální stav kontraktu** (formát polí,
ID schéma, otevřené otázky) patří sem, ne duplicitně na dvou místech.
Odkazujte sem z vlastních `CLAUDE.md`, nekopírujte obsah.

---

## 1. Cíl integrace

Jednosměrná synchronizace: **SPA → TOP**. Schválená dovolená ze SPA
(Správa Pracovních Absencí, samostatný absenční systém) se má objevit
v TOP jako viditelný záznam u příslušné osoby na příslušný den/dny.
TOP je čistě příjemce — žádný zápis zpět z TOP do SPA.

Rozhodnuto s JK 2026-08-10.

## 2. Dohodnutý kontrakt (aktuální stav — MĚNIT JEN PO DOHODĚ OBOU STRAN)

### Zdrojová data (SPA strana)

SPA `entries` tabulka, řádky se `status = 'schvaleno'` a vyplněnou
`zkratka` (nové pole na SPA `users`, ručně vyplňuje administrátor SPA
jen u těch ~15–17 uživatelů ze ~50, kteří existují i v TOP; formát
stejný jako TOP `resitele[].zkratka`):

```
{ zkratka, datum_od (YYYY-MM-DD), datum_do (YYYY-MM-DD),
  typ (název state_type: ŘD/PN/LÉKAŘ/VOLNO, admin-editovatelný v SPA),
  poznamka (nullable) }
```

### Cílová data (TOP strana) — mapování polí

Každá schválená dovolená se zapíše jako skutečný záznam do `tasks[]`
v `top-data/database.json`:

| pole `task` v TOP | hodnota | poznámka |
|---|---|---|
| `id` | `SPA-<entries.id>` | Číslice v ID jsou OD 2026-08-10 bezpečné — TOP už neparsuje čísla z ID (viz bod 4) |
| `owner` | SPA `zkratka` | musí odpovídat TOP `resitele[].zkratka` |
| `title` | název stavu (Volno/PN/ŘD/Lékař) | ze SPA `state_types.nazev` |
| `priority` | `"PX"` | plně zapojená hodnota v TOP (barva, legenda, filtry) |
| `plannedDate` | SPA `datum_od` | |
| `durationDays` | `(datum_do − datum_od) v dnech + 1` | žádné `activeDays` omezení = každý den v rozsahu |
| `note` | SPA `poznamka`, pokud vyplněná | |
| `state` | `"Nový"` | |
| `project`, `sales`, `waiting`, `dueDate`, `internalNote`, `internalProject`, `subtask`, `auto` | prázdné/`false` | |
| `cancelled` | `false` | |
| `createdDate` / `lastUpdated` | timestamp synchronizace | |

**Ověřeno TOP stranou 2026-08-11:** všechna tahle pole jsou explicitně
vyjmenovaná v `tasksToJson()`/`loadFromRaw()` ve Správě úkolů — bezpečně
přežijí i editaci JINÉHO úkolu v TOP (viz TOP `CLAUDE.md`, Nástraha č. 1
pro kontext, proč tohle vůbec bylo potřeba ověřovat).

### Synchronizační mechanismus (SPA strana)

`src/lib/topSync.js` v SPA repu — GitHub Contents API, stejný vzorec
jako `ft_loader.js` v TOP (`GET .../contents/database.json` → sha,
`PUT` se `sha` jako optimistickým zámkem, retry 3× na 409). Debounced
8s. Vypnuto dokud JK nenastaví `TOP_SYNC_GITHUB_TOKEN` (fine-grained
PAT, jen repo `top-data`, Contents: Read/write).

Při každém běhu: načte `database.json`, odfiltruje z `tasks[]` všechny
položky s `id` začínajícím na `SPA-` (= předchozí běh), vygeneruje
čerstvý seznam ze všech aktuálně schválených SPA záznamů se zkratkou,
vloží zpět, uloží. Plný přepis jen SPA-prefixovaných položek, zbytek
`tasks[]` (produkční data TOP) nedotčen. Idempotentní.

**Důsledek, který obě strany musí mít na paměti:** pokud někdo
SPA-syncnutý task ručně upraví/smaže/přetáhne v Kanbanu přímo v TOP,
příští sync běh (do ~8s po další změně v SPA) ho přepíše zpátky podle
SPA. SPA je jediný zdroj pravdy pro tahle konkrétní data.

`activity.json` (indikátor "někdo edituje" v TOP) se automatizovaným
zápisem NEnastavuje — určený pro zdvořilostní upozornění mezi lidmi,
ne pro automatizované procesy.

## 3. Stav implementace

| Strana | Co | Stav |
|---|---|---|
| SPA | `topSync.js` — čtení/zápis přes GitHub API | Hotovo, funkční |
| SPA | Pole `zkratka` na `users`, ruční vyplnění administrátorem | Hotovo |
| TOP | `FTLoader.generateNextTaskId()` — bezpečné i s číslicemi v cizích ID | Hotovo, nahráno 2026-08-10 |
| TOP | `.prio-PX` CSS třída ve Správě úkolů (kosmetika, PX badge šedý místo žluté) | **Otevřeno, čeká na rozhodnutí** |
| — | `TOP_SYNC_GITHUB_TOKEN` nastavený a synchronizace zapnutá | **Otevřeno, čeká na JK** |

## 4. Otevřené otázky — čeká na rozhodnutí

1. **Zobrazovat SPA-syncnuté úkoly v Kanbanu/tabulce/filtrech Správy
   úkolů stejně jako běžné úkoly, nebo je nějak odlišit/skrýt?**
   TOP strana poznamenává: filtr Priorita v TOP už dnes nabízí PX jako
   volbu, takže základní zobrazení/skrytí jde bez nové funkce. Čeká na
   JK, jestli chce víc.
2. **Má se přidat `.prio-PX` CSS třída?** Nízké riziko, kosmetická
   oprava. Čeká na potvrzení, kdo to udělá (TOP strana nabídla).
3. **Má `poznamka` ze SPA opravdu jít do `note`?** (Otázka od SPA
   strany, TOP se k tomu zatím nevyjádřil — interní poznámka ze SPA
   nemusí být určená pro zobrazení v TOP.)

## 5. Historie handoffů mezi projekty

### 2026-08-11 — První handoff: SPA → TOP review žádost

SPA-side Claude připravil návrh (dovolená jako task s `priority: "PX"`),
TOP-side Claude ověřil proti živému kódu, opravil jeden zastaralý
technický závěr (ID kolize — viz bod 2 výše, "Cílová data"), potvrdil
zbytek, odpověděl na otevřené otázky. Detailní průběh téhle konkrétní
výměny je zaznamenaný zpětně v **TOP `CLAUDE.md`, changelog 2026-08-11**
a v **SPA `CLAUDE.md`** (každá strana svým pohledem) — tenhle soubor
vznikl až POTÉ, staré záznamy se sem retroaktivně nekopírují, jen se na
ně tímhle odstavcem odkazuje.

*(Budoucí handoffy zapisujte přímo sem, chronologicky, oběma stranami.)*
