# Phase 3 evidence — Client presentation, lifecycle and handbook

Track 20261027-roster-wave-4, Phase 3 (covers FR-5 client half, FR-7, FR-8,
NFR-6 — AC-5 client, AC-7, AC-8). Depends on Phase 1 + Phase 2, both verified.

## Goal

The three new lines (Embercub/fire, Mossboar/plant, Mistkit/water) render and
play client-side with full lifecycle parity, and the handbook openly lists the
three fire-triangle recipes. Client surfaces read the sim catalog generically
(`getSpecies`/`getBranch`), so no production client code hardcodes species —
this phase is branch data + test pins.

## The six new branch defs (`branch-catalog/discoveries.ts`)

Same effective-stat budget as every earlier line (juvenile 11, champion 22,
HP counted double). Offense mirrors a Wave-3 offense boost pair, defense a
Wave-3 defense pair. Accent hues sit in the line's own element family and
clash with none of the 24 existing branch hues.

| id | species | favors | signature | why this signature is free | hue |
| --- | --- | --- | --- | --- | --- |
| `ember_rusher` | embercub | atk, spd | `cinder_shot` (fire 10/85) | Fire catalog has 8 specials; the embercub kit carries the other 6 + the starter pair (`cinder_dive`, `pyre_wall`), leaving `spark` + `cinder_shot`. Offense takes the heavier. | 26 |
| `soot_warden` | embercub | hp, def | `spark` (fire 6/100) | Same subtraction; defense takes the reliable one. | 8 |
| `briar_charger` | mossboar | atk, spd | `bramble_dart` (plant 12/75) | Plant catalog has 8; the mossboar kit embeds the starter pair (`thorn_charge`, `bramble_guard`), leaving `seed_shot` + `bramble_dart`. Offense takes the heavy. | 115 |
| `moss_warden` | mossboar | hp, def | `seed_shot` (plant 6/100) | Same subtraction; defense takes the reliable one. | 100 |
| `mist_courser` | mistkit | atk, spd | `splash_bolt` (water 12/75) | Water catalog has 8; the mistkit kit embeds the starter pair (`riptide_rush`, `tide_aegis`), leaving `bubble` + `splash_bolt`. Offense takes the heavy. | 210 |
| `foam_warden` | mistkit | hp, def | `bubble` (water 6/100) | Same subtraction; defense takes the reliable one. | 222 |

Copy is one sentence each, house voice, no stat names:
Ember Rusher "Hit first and leave only warm pawprints behind." / Soot Warden
"Curl around the coals and let the night burn itself out." / Briar Charger
"Burst from the thicket before the leaves finish shaking." / Moss Warden
"Settle into the moss and let every charge break on you." / Mist Courser
"Ride the spray in fast and be gone before it settles." / Foam Warden
"Float easy in the foam and let the tide do the shouting."

## Files touched (one line each)

- `packages/sim/src/branch-catalog/discoveries.ts` — six new branch defs
  above; header comment six → nine forms. (In-scope deviation per brief.)
- `packages/sim/src/branch-catalog/catalog.ts` — "twenty-four" → "thirty"
  comment only; the spread already picks up the new defs.
- `packages/sim/src/branches.test.ts` — CONTRACT +6 rows (identity, lean,
  boosts, signature, hue); count pin 24 → 30. Generic budget/signature
  tests cover the new forms with no edits (own-element specials, not in
  kit, globally unique signatures, distinct hues — verified by
  construction).
- `apps/client/src/species-roster.test.ts` — NEW_LINES +3
  (embercub/Embercub/18, mossboar/Mossboar/110, mistkit/Mistkit/205);
  champion-forms table +6; reveal map +3; offense map +3. The crest-glyph
  uniqueness pin became "one glyph per element, shared by sibling lines"
  (nine lines over six elements forces sharing; intent preserved).
  Population-note / reward-tier tables enumerate reward lines only —
  untouched.
- `apps/client/src/move-fx.test.ts` — kit-resolves table +3 ids. No FX
  entries added: every new kit row is existing vocabulary, so each resolves
  to its element-true shot with a defined (default or authored) body.
- `apps/client/src/handbook.test.ts` — recipe table +3 rows, sentences
  derived from `recipeLine` over ELEMENTS order (fire, plant, water, …):
  "Breed Fire with Plant." / "Breed Plant with Water." /
  "Breed Fire with Water."
- No per-line handbook copy added: no species-specific discovery copy
  exists beyond the auto table (only test-file mentions), so there was no
  voice to mirror — P3.T2.2 is a verified no-op.

## Verification

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000` | blocked — shell permission-denied; primary to run |

No production-code drift introduced outside the branch catalog; all edits
are data + pins. Module caps untouched (no new modules).

## AC table (pending-primary)

| AC | Status | Note |
| --- | --- | --- |
| AC-5 (client) hatch → train → two branch forms per new line | pending-primary | Branch defs + contract pins added; suite run owns the verdict |
| AC-7 handbook/plates/detail/battle render + open recipes | pending-primary | Recipe rows pinned; render surfaces read the catalog generically |
| AC-8 copy ≤2 sentences, single-sourced | pending-primary | New lines are one sentence each; handbook copy derives from the lookup |

## Deviations

- `packages/sim/src/branch-catalog/discoveries.ts` (+ `branches.test.ts`
  CONTRACT, `catalog.ts` count comment): in-scope deviation declared by the
  brief — Phase 1 added no champion forms, so P3.T1 required them.
- `species-roster.test.ts` glyph pin reworked from cross-line uniqueness
  to per-element identity: forced by NEW_LINES +3 over six elements
  (fire/plant/water repeat); brief's own NEW_LINES extension necessitates it.

## Rework round 1 — boss signature overlaps (FALLBACK)

Primary's suite run: 3402 pass, 1 skip, 1 FAIL —
`bosses.test.ts:120` "never wields a form-exclusive special of a species
the boss is not". Five of the six new signatures are kit rows of boss
species, producing 8 new shared-signature overlaps.

PREFERRED re-pick was computed and is impossible — zero surviving free
specials per element under the brief's subtraction (catalog minus existing
signatures minus boss-species kits minus own kit):

- Fire (8 specials): existing signatures take `cinder_dive`, `pyre_wall`
  (fire_drake), `pyre_lance`, `flame_charge` (cindermoor). The remaining
  `spark`, `cinder_shot`, `blaze_bolt`, `flare_dart` are ALL in the
  fire_drake boss-species kit. Survivors: 0.
- Plant (8): signatures take `thorn_charge`, `bramble_guard`
  (plant_ox), `root_quake`, `spore_burst` (fernstag). The remaining
  `seed_shot`, `thorn_volley`, `bramble_dart`, `vine_lash` are ALL in the
  plant_ox kit. Survivors: 0.
- Water (8): signatures take `riptide_rush`, `tide_aegis`
  (water_axolotl), `maelstrom`, `tide_shot` (reefclaw). The remaining
  `bubble`, `foam_volley`, `splash_bolt`, `mist_spray` are ALL in the
  water_axolotl kit. Survivors: 0.

(Under the loadout-only reading the test actually enforces, only
`cinder_shot` survives anywhere — still fewer than 2 per element, so the
conclusion is identical.)

FALLBACK applied: signatures unchanged, `bosses.test.ts` allowlist
extended with 8 new entries + comments in the exact existing style
(`// <boss_species> wields <form>'s (<line>) signature, a kit row.`).
All six pre-existing entries are byte-identical; new lines sit in the
BOSSES/loadout order `toEqual` requires: `koda/spark`,
`hesse/seed_shot`, `marlow/bubble`, `marlow/splash_bolt`,
`delmar/bubble`, `fenn/spark`, `thessa/seed_shot`,
`thessa/bramble_dart`. `cinder_shot` (ember_rusher) needed no entry —
no boss loadout wields it. The all-signatures-distinct invariant
(30 branches, 30 unique signatures) still holds by construction.
Touched additionally: `packages/sim/src/bosses.test.ts` (allowlist only).

## Primary verification

- Working tree review: 8 files, all inside phase scope + 2 accepted
  deviations (branch-catalog branch defs — required by P3.T1, declared
  in-scope by the brief; bosses.test.ts allowlist — fallback fix below).
- Suite round 1: 1 fail (bosses.test.ts:120 — 5 of 6 new signatures are
  starter-kit rows bosses wield: 8 new overlaps). Rework round 1: the
  subagent proved zero genuinely-free fire/plant/water specials exist
  (primary independently verified against moves.ts: every non-kit
  special is claimed or boss-carried; only cinder_shot is free) and
  recorded the 8 overlaps as allowlist entries with comments in the
  exact existing style. Per the 2026-10-25 recorded decision (kit-row
  overlaps are legitimate), this is the Wave-consistent fix.
- Glyph-pin rework accepted: 9 lines over 6 elements makes cross-line
  uniqueness impossible; per-element consistency + cross-element
  distinctness is the correct invariant.
- New accent hues audited distinct: 26/8 (fire vs 12/2), 115/100
  (plant vs 140/105), 210/222 (water vs 200/230).
- `bun test --check --parallel=4 --timeout 120000`: exit 0 (3403 pass, 1 skip, 0 fail).
- `bun run verify`: exit 0 (typechecks, biome, determinism gate).
- `bun run build`: exit 0.
- Squash: 9ed5c037 (single commit on phase base bf1d2165).
