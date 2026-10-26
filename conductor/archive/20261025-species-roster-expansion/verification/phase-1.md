# Phase 1 — Species data, kits & reward seam

- **Track**: 20261025-species-roster-expansion (Species Roster Expansion)
- **Phase**: 1
- **Date**: 2026-10-25
- **Branch**: `feat/20261025-species-roster-expansion`
- **Base**: `421a9d4e` · **Head**: `541a9ebe` (commits `02fdaf71`, `d1d5e509`, `f7e5ba9e`, `541a9ebe`)
- **Result**: **verified** — all Phase 1 tasks implemented, TDD-proven, and
  committed green (2687 pass / 1 pre-existing skip / 0 fail). The one
  mid-phase design decision (champion-form signature moves) was resolved by
  the user on 2026-10-25 (Option 1, kit-row signatures) — see the Addendum.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (TDD red) | `bun test packages/sim/src/species.test.ts` | 1 | 25 pass / **28 fail** — the new SpeciesDef, gating, and branch pins fail before implementation (failing-first as briefed) |
| unit | `bun test packages/sim/src/species.test.ts packages/sim/src/branches.test.ts packages/sim/src/module-size.test.ts` | 1 | 77 pass / 1 fail — all species+branch pins green; `branches.ts` measured **13692 B (1404 B over the 12288 B cap)** → split along its data/behavior seam |
| unit | `bun test packages/sim/src/{species,branches,module-size}.test.ts` (re-run) | 0 | 78 pass / 0 fail after the `branch-catalog.ts` split |
| unit | `bun test --check --parallel=4 --timeout 120000` | 1 | 2654 pass / 13 fail — two classes: `grantLeagueRewards` stamped a tier once **per species** (fixed: stamp once per tier); queue-content pins expected the three-species roster (updated) |
| unit | `bun test --check --parallel=4 --timeout 120000` | 1 | 2660 pass / 7 fail — remaining: queue-content pins + the boss-signature invariant (the design blocker) |
| unit | `bun test packages/sim/src/reward-catchup.test.ts` | 0 | 14 pass / 0 fail — the retroactive catch-up suite (written failing-first, then green) |
| determinism (probe) | `$env:APEX_SPECIES_REPORT = "1"; bun test packages/sim/src/battle/species-roster.balance.test.ts` | 1 (pre-pin) | full matrix printed; every fresh-gate violation is exactly a type-chart-advantage cell → pinned per the suite's own documented precedent; pins recorded |
| determinism (probe) | `bun test packages/sim/src/battle/species-roster.balance.test.ts` | 0 | 6 pass / 0 fail with all pins recorded |
| **verification (exact, final)** | `bun test --check --parallel=4 --timeout 120000` | **0** | **2681 pass / 7 skip (1 pre-existing + 6 parked branch suites) / 0 fail — 2688 tests, 211 files** |

### Addendum run (decision applied, 2026-10-25)

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `bun test packages/sim/src/bosses.test.ts packages/sim/src/branches.test.ts packages/sim/src/species.test.ts packages/sim/src/module-size.test.ts` | 1 → 0 | first run flagged `koda wielding flame_charge` under a too-strict foreign-signature check; refined to the decision's spirit (a move wielded as the boss's OWN species' kit row is not form-exclusive against it) → 95 pass / 0 fail |
| **verification (exact, final)** | `bun test --check --parallel=4 --timeout 120000` | **0** | **2687 pass / 1 skip (the pre-existing baseline skip) / 0 fail — 2688 tests, 211 files** |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 (sim) | `ALL_SPECIES` holds 9 species — fernstag (plant, Silver), reefclaw (water, Gold), cindermoor (fire, Legend) exist | `species.test.ts`: `REWARD_SPECIES` pinned `[electric_hound, fernstag, wind_falcon, reefclaw, earth_tortoise, cindermoor]`; identity/element/archetype/temperament/kit pins per species | ✅ |
| AC-3 (sim) | New species competitively viable; probe-tuned stat spreads; existing goldens stay green | `battle/species-roster.balance.test.ts`: fresh gate (0% on every chart-neutral/disadvantaged cell), cap gate (≥35% vs every boss, exact tallies pinned), identity gate (cap vectors distinct from every starter's), final-rival pins; suite-wide run green — no golden re-baselined anywhere | ✅ |
| AC-4 (sim) | Species unlock at their reward tiers; pre-claimed tiers catch up retroactively | `species.test.ts` obtainableSpecies gating per tier + locked-species refusal; `reward-catchup.test.ts` (7 tests): catch-up eggs for pre-claimed tiers, idempotent repeat boots, tier-ordered queue merge, purity, fresh-save no-op | ✅ |
| AC-5 (sim) | Hatch → train → branch-evolution parity with the same mechanism as existing species | hatch parity + training-program parity green (`reward-catchup.test.ts`); branch-evolution parity green: the six branch-form suites un-skipped and passing (`species.test.ts`: two champion branches per new line — frond_lasher/spore_warden, whirlpool_claw/tide_sentinel, pyre_colossus/ember_bank — with budgets 11/22 HP-doubled, element-matched signatures outside each species' own kit), boss invariant re-scoped per the user decision and green | ✅ |
| NFR-1 | Module caps (12 KB sim) | `module-size.test.ts` green; `branches.ts` split into `branch-catalog.ts` (data) + `branches.ts` (behavior/re-exports) to stay under cap | ✅ |
| NFR-5 | Save stays v25 — no schema/migration change | no `schema.ts`/`migrate.ts` edit; the catch-up reuses `claimedTiers` + `pendingRewards` as-is | ✅ |

## Tuned numbers (recorded per the brief)

| Species | Tier | Element | Temperament | statBounds hp/atk/def/spd | Kit (rows 1-4 = default loadout row) |
| --- | --- | --- | --- | --- | --- |
| fernstag "Whistlefern" (archetype `frond`) | silver | plant | obedient | hp [70,84] · atk [8,12] · def [8,11] · spd [10,14] | seed_shot, thorn_volley, vine_lash, thorn_charge, bramble_dart, bramble_guard |
| reefclaw "Coral Claw" (archetype `crab`) | gold | water | slow | hp [86,100] · atk [10,13] · def [12,14] · spd [4,7] | bubble, mist_spray, foam_volley, riptide_rush, splash_bolt, tide_aegis |
| cindermoor "Moor Cinder" (archetype `smolder`) | legend | fire | rush | hp [84,98] · atk [11,14] · def [9,12] · spd [6,8] | spark, flare_dart, cinder_shot, cinder_dive, blaze_bolt, pyre_wall |

All three kits recompose their element's existing 8-move vocabulary (six of
eight, distinct from the same-element starter's kit; no new moves —
`moves.test.ts`'s CATALOG length 48 pin untouched). Stat envelopes sit
inside the extremal pins the existing suite enforces (falcon still fastest/
frailest; tortoise still bulkiest/slowest).

Probe tuning notes: the shared starter elements put the type chart into the
boss cells (plant>water, water>fire, fire>plant), so the earth/wind probe's
"lose every boss duel fresh" band cannot hold verbatim. Every violating
cell is exactly a chart-advantaged cell; the probe pins those cells exactly
and demands 0/36 everywhere else, following the suite's own documented
exemption precedent (the tortoise mirror cell). Final-rival cells outside
the flat 15–90% band (untrained mirror disadvantage; the +4/+6 clamp sweep
where the rival clamps to untrained bounds) are pinned with `lo/hi`
overrides, again mirroring the tortoise precedent.

## Addendum — decision (user, 2026-10-25)

The user decided **Option 1: kit-row signatures** — a champion branch form's
`signatureMove` may be a kit row another species carries in its kit, and the
boss invariant is scoped to its spirit: **a boss never wields a form-
exclusive special of a species it is not** (a move wielded as the boss's own
species' kit row is not form-exclusive against it, even when a later line's
champion form claims that row as its signature).

Applied as commit `541a9ebe` ("feat(sim): champion branch forms for the new
species lines"):

1. The six parked branch defs were re-applied verbatim to
   `branch-catalog.ts` (the parked picks needed no adjustment — none is in
   its own species' kit): fernstag → frond_lasher (sig `root_quake`,
   hue 140) / spore_warden (sig `spore_burst`, hue 105); reefclaw →
   whirlpool_claw (sig `maelstrom`, hue 200) / tide_sentinel (sig
   `tide_shot`, hue 230); cindermoor → pyre_colossus (sig `pyre_lance`,
   hue 12) / ember_bank (sig `flame_charge`, hue 2). Budgets stay 11/22
   HP-doubled; the catalog is eighteen forms and `branches.test.ts`'s
   CONTRACT pin was extended to match.
2. The six parked `species.test.ts` suites were un-skipped and pass (two
   champion branches per line, favors/budgets/signature-element pins).
3. `bosses.test.ts`'s invariant was re-scoped to the decision: per-species
   signature sets, global uniqueness still asserted, and a boss loadout
   fails only when it wields another species' signature **that is not
   already the boss's own kit row**. `bosses.ts` data needed no change —
   every colliding pick is a kit row of the wielding boss's own species.
4. All gates green: final verification 2687 pass / 1 pre-existing skip /
   0 fail; the module-size cap holds (`branch-catalog.ts` ~10 KB with the
   eighteen forms, `branches.ts` ~5 KB).

The parked artifact `.conductor/evidence/phase-1-pending-branch-defs.md`
stays as the historical record of the blocked state and the decision
options.

## Evidence paths

- `conductor/tracks/20261025-species-roster-expansion/verification/phase-1.md` (this file)
- `.conductor/evidence/phase-1-pending-branch-defs.md` (parked provisional branch defs + decision framing + re-application steps)
- `packages/sim/src/battle/species-roster.balance.test.ts` (probe + pins; report mode `APEX_SPECIES_REPORT=1`)

## Deviations

- `packages/sim/src/branch-catalog.ts` (new) + `packages/sim/src/branches.ts` (split) — `branches.ts` exceeded the 12 KB module cap once the roster grows; split along its existing data/behavior seam, public surface unchanged via re-exports.
- `packages/sim/src/branches.ts`, `packages/sim/src/branches.test.ts` — outside the literal Touches list but required by the FR-5 parity goal (champion branch forms for the new lines).
- `packages/sim/src/bosses.test.ts` — invariant re-scoped per the user-approved design decision (Option 1, kit-row signatures, 2026-10-25); `bosses.ts` data unchanged.
- `packages/sim/src/save/storage.ts` — one-line boot-seam hook (`loadBoot` now runs `reconcileLeagueRewards`); the pure logic lives in `cupRewards.ts` (in Touches).
- `.conductor/evidence/phase-1-pending-branch-defs.md` — parked artifact (allowed location).

## Notes

- `grantLeagueRewards` fix worth knowing: with two species per reward tier, the tier claim stamp must be pushed once per tier (per-species stamping duplicated `claimedTiers` entries); eggs queue per species.
- The catch-up's delivery check scans pendingRewards, ranch creature, stable, and Hall of Fame (via `retireeRecord`-shaped records — note it takes a **state**, not a creature).
- Suggested Phase-1 completion path once the signature decision lands: applied as `541a9ebe` — parked defs re-applied, six suites un-skipped, boss invariant re-scoped; no other file touched.
- `branchesSave.test.ts` lives under `packages/sim/src/save/` (my earlier explicit-file bun test invocation did not match it; the full-suite runs cover it — green).

## Primary verification

- **Date**: 2026-10-25 · **By**: Conductor primary (independent of the subagent report)
- **Tree**: clean before acceptance; `git log 421a9d4e..HEAD` = exactly the 7 expected commits (`02fdaf71` T1, `d1d5e509` T2, `f7e5ba9e` T3, `efb9ec12` evidence, `541a9ebe` decision addendum, `68c9b97b` evidence addendum, `92ecc89c` primary lint fix) — squash guard passed.
- **Diff vs Touches**: `git diff --name-only 421a9d4e..HEAD` matches the report's 12 code/test files + evidence file. Deviations all recorded and accepted: `branch-catalog.ts` cap split (public surface unchanged), `branches.ts`/`branches.test.ts` (FR-5 parity goal), `bosses.test.ts` (user-sanctioned invariant re-scope, 2026-10-25), `save/storage.ts` (one-line `loadBoot` hook; pure logic in Touches).
- **Primary fix attempt 1**: the primary ran `bun run verify` → exit 1 (biome: 3 format errors + 1 unused import + 1 import-sort). Fixed via `biome check --write` on the three files, manual removal of the unused `TrainingProgram` type import, import sort in `branches.ts` → committed as `92ecc89c` (format/import-only; no behavior change).
- **Gates on the final tree**: `bun run test:phase` → exit 0, 2688 tests / 211 files / 0 fail (1 pre-existing skip); `bun run verify` → exit 0 (typecheck, Biome clean, determinism gate OK — new-line GLB digest pinning is Phase 2 scope by plan); `bun run build` → exit 0 (pre-existing >500 kB chunk advisory only).
- **AC evidence check**: AC-1/AC-3/AC-4/AC-5(sim) each backed by named test suites in this evidence file; NFR-1 (module caps green) and NFR-5 (save v25, no schema edit) confirmed by the report and tree diff.
- **Result**: **phase accepted**.
