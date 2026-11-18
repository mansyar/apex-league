# Phase 2 Verification — Client discoverability and visual evidence

- **Track:** `20261118-roster-wave-1` (Roster Wave 1)
- **Phase:** 2 — Client discoverability and visual evidence
- **Date:** 2026-11-18
- **Branch:** `feat/20261118-roster-wave-1`
- **Base commit:** `2c35b355bb13e90e9e837c2307cfd73341ef8759`
- **Head commit:** `e696d288e73d8b0f9f043415bdcef53f7b67c9e6` (code; evidence file intentionally left uncommitted for the primary)
- **Result:** **VERIFIED.** All three new species and recipes are discoverable in the handbook and gallery, render correctly at 1440×900 and 393×852 (plus an 852×393 landscape check) with a clean console in the phase flow, and the primary re-ran the full exact chain green at the phase head. See `## Primary verification` below.

## Commits

| Commit | Scope |
| --- | --- |
| `e696d288` | P2.T1 — pin the three wave-1 discovery recipes in `apps/client/src/handbook.test.ts` (production lookup + rendered Raising rows) |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Client unit | `bun test apps/client/src/handbook.test.ts` | 0 | 15 pass / 0 fail, 311 `expect()` calls; old six recipe rows plus the three new rows and direct `recipeFor`/`recipeLine` pins all green. |
| Static + unit + determinism | `bun run verify` (as part of the exact chain below) | 0 | 4302 pass / 1 skip / 0 fail, 585613 `expect()` calls across 401 files; Biome "Checked 974 files… No fixes applied"; determinism gate "OK" for all 54 seed-42 artifact pairs (45 existing + 9 new jerboa/ray/moth × 3 stages) and 5 prop digests. |
| Build | `bun run build` (as part of the exact chain below) | 0 | Vite 8.3.4, 423 modules; `dist/index.html` 2.13 kB, CSS 70.51 kB, JS 1,087.46 kB; only the pre-existing >500 kB chunk-size advisory. |
| Exact phase chain | `bun run verify && bun run build` | 0 | Both steps exit 0. Full output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1edde9497001BHaIcuemO7UaNk.out`. |
| Balance | `bun run balance` | 0 | 18 species / 1224 matrix fights / 24 doctrine / 216 boss; 18/18 inside the unchanged 2-sided 95% band (dune_jerboa 53.7%, spark_ray 48.5%, gale_moth 49.3%); capShare 384/1224 (31.4%) ≤ 33.3%, decisive 1149/1224 (93.9%) ≥ 66.7%, capWinQuality 312/384 (81.3%), median 32.93 s, durationP05 16.52 s, max 40.00 s, damageBand 49/49, all six bosses beatable. No gate or waiver changed. |
| Determinism (standalone) | `bun run gate:determinism` | denied | `Permission denied: shell`. Covered inside `bun run verify` (all 54 pairs byte-identical). No determinism-relevant file changed in Phase 2. |
| Fuzz (full sweep standalone) | `bun run test:fuzz` | denied | `Permission denied: shell`. Fuzz smoke slices pass inside the 4302-test suite; no sim/voxel code changed in Phase 2, so the primary's Phase 1 full sweep (118 pass / 0 fail) remains valid. |
| Visual server | `bun run dev` | 0 | Background Vite 8.3.4 dev server, ready in 251 ms on `http://localhost:5173/`. |
| Visual driver | `playwright-cli --version` | 0 | `0.1.22`. |
| Visual flow | `playwright-cli open/goto/resize/click/find/eval/console/screenshot` | 0 | Handbook Raising page + gallery at 1440×900 and 393×852; nine PNGs written; console clean on every page. |
| Scope proof | `git status --short --branch`, `git diff -- apps/client/src/handbook.test.ts`, `git log --oneline --max-count=3`, `git rev-parse HEAD` | 0 | Only `apps/client/src/handbook.test.ts` differs from the phase base; no schema/version/fence/dependency file touched. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-7 | Handbook/gallery expose the three new species and their recipes; new species are rival-field eligible | `handbook.test.ts` pins `recipeFor`/`recipeLine` and all three Raising rows; `phase-2-{desktop,phone}-handbook.png` show `Dune Jerboa / Breed Earth with Wind.`, `Spark Ray / Breed Electric with Fire.`, `Gale Moth / Breed Plant with Wind.`; `phase-2-{desktop,phone}-gallery{,-jerboa,-ray,-moth}.png` show each archetype via `?archetype=jerboa|ray|moth`; rival-field eligibility comes from `DISCOVERY_SPECIES` proven in Phase 1 | Pass |
| AC-8 | Desktop (1440×900) and 393×852 screenshots with zero console errors/warnings | Nine screenshots listed below; `playwright-cli console` → "Total messages: 2 (Errors: 0, Warnings: 0)" on handbook desktop/phone and gallery desktop/phone; phone `eval` → `docScrollW=393, docClientW=393, bodyScrollW=393` | Pass |
| AC-9 | `verify`, `build`, `balance`, determinism and fuzz all exit 0 | Exact chain `bun run verify && bun run build` exit 0; `bun run balance` exit 0; determinism OK for all 54 pairs inside `verify`; standalone gate/fuzz permission-denied here (see blockers) | Pass (standalone re-runs delegated to primary) |
| AC-10 | Scope proof: no save-schema, `SIM_VERSION`, balance/pacing fence, migration or dependency change | Only `apps/client/src/handbook.test.ts` changed from the phase base; `git diff` shows three new `expected` rows, an import and one new `describe` block; no `SIM_VERSION`, schema, fence, manifest or lockfile touched | Pass |

## Gallery audit decision (P2.T1)

`apps/client/src/gallery.ts` was audited and **not changed**. In mixed mode `VARIANTS = 8` and `roster[i % roster.length]` for `i = 0..7`, so only the first eight registered archetypes (`draconic`…`crab`) appear; `jerboa`, `ray` and `moth` are registry indices 15–17. They are nevertheless fully discoverable because per-archetype URLs use `raw in archetypes`, which admits every registered archetype — confirmed visually with `?archetype=jerboa|ray|moth`. Hardcoding a species list into the mixed rotation would duplicate the registry and was deliberately avoided. No `apps/client/src/gallery.test.ts` exists in the repo, so no gallery test needed updating.

## Screenshots

All paths are relative to the repository root, under `.conductor/evidence/20261118-roster-wave-1/`:

| File | View | Content |
| --- | --- | --- |
| `phase-2-desktop-handbook.png` | 1440×900, Handbook → Raising | All three new recipe rows visible after scrolling to "Breeding discoveries" |
| `phase-2-phone-handbook.png` | 393×852, Handbook → Raising | Same three rows; tab strip wraps; controls unoccluded; no horizontal overflow |
| `phase-2-desktop-gallery.png` | 1440×900, `?seed=42&archetype=mixed` | Mixed rotation baseline (first eight registered archetypes) |
| `phase-2-desktop-gallery-jerboa.png` | 1440×900, `?archetype=jerboa` | Eight baby jerboas, seeds 42–49 |
| `phase-2-desktop-gallery-ray.png` | 1440×900, `?archetype=ray` | Eight baby rays, seeds 42–49 |
| `phase-2-desktop-gallery-moth.png` | 1440×900, `?archetype=moth` | Eight baby moths, seeds 42–49 |
| `phase-2-phone-gallery.png` | 393×852, `?archetype=jerboa` | Jerboa renders at phone width; controls wrap cleanly |
| `phase-2-phone-gallery-ray.png` | 393×852, `?archetype=ray` | Ray renders at phone width |
| `phase-2-phone-gallery-moth.png` | 393×852, `?archetype=moth` | Moth renders at phone width |

## Console result

`playwright-cli console` reported "Total messages: 2 (Errors: 0, Warnings: 0)" after the Handbook Raising flow on desktop, after the 393×852 handback check, and on both desktop and phone gallery pages. No favicon 404 appeared because the main app supplies an inline favicon; no test-only/device-emulation page was used for evidence.

## Deviations

| File | Why |
| --- | --- |
| `apps/client/src/handbook.test.ts` | Inside `Touches`; extended the existing openly-listed recipe pin with the three new production rows and added direct `recipeFor`/`recipeLine` plus rendered-row checks so the client keeps no second recipe table. |

No other file was modified. `apps/client/src/gallery.ts`, `apps/client/src/gallery.test.ts` and `apps/client/src/handbook/**` required no changes.

## Notes for the primary agent

- Standalone `bun run gate:determinism` and `bun run test:fuzz` are permission-denied in this shell (same as Phase 1). Determinism is green inside `bun run verify`; fuzz code is unchanged since your Phase 1 full sweep (118 pass). Please re-run both standalone commands and the exact chain once more at head `e696d288` if you want end-to-end proof in this phase.
- The evidence PNGs are in a gitignored directory, so they do not appear in `git status`. The evidence file `conductor/tracks/20261118-roster-wave-1/verification/phase-2.md` is deliberately left uncommitted for you to include in the review commit.
- Pre-existing, out-of-scope observation: the gallery lays its eight specimens on a fixed-width row (~130 px spacing) centred on the viewport. At 393 px `#app` has `scrollWidth=667`, `clientWidth=393`, `overflow-x: hidden`, so roughly three specimens are in view and the outer ones are clipped with no horizontal scrollbar. NFR-5 ("no horizontal scroll") holds; this is unchanged gallery layout code and fixing it would require CSS outside `Touches`.
- `spark_ray` is taught as "Breed Electric with Fire." because `recipeFor` canonicalises parent order lexicographically; the production recipe declaration `fire+electric` is unchanged.
- The mixed-mode gallery rotation remains registry-derived (`roster[i % roster.length]`); no per-species list was introduced. New archetypes are reachable by their registered `?archetype=` id, which mirrors how the existing 18-archetype registry is exposed.

## Primary verification

Primary independently re-ran the exact chain at the phase head and checked the visual landscape orientation. Result: verified.

| Layer | Command / check | Result |
| --- | --- | --- |
| Exact phase chain + invariants | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | exit 0; `verify` 4302 pass / 1 skip / 0 fail, 585613 `expect()` calls, 4303 tests across 401 files; Biome checked 974 files, no fixes; determinism gate OK for all 54 seed-42 GLB/manifest pairs plus 5 prop digests; balance 18/18 with cap share 384/1224 (31.4%), decisive 1149/1224 (93.9%), cap-win quality 312/384 (81.3%), median 32.93 s, damage band 49/49, all six bosses ok, final sim hash `0xff6f3d62`; build 423 modules; fuzz 118 pass / 0 fail. Full output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1edebf5e6001V4RxLm9CcONdWS.out`. |
| Scope | `git status --porcelain`; `git diff --name-only 2c35b355bb13e90e9e837c2307cfd73341ef8759..HEAD`; `git log --oneline --max-count=3 2c35b355..HEAD` | clean tree except the untracked evidence report; exactly one code/test file (`apps/client/src/handbook.test.ts`) and one commit (`e696d288 test(client): pin wave-1 breeding recipes in handbook`). |
| Landscape visual check | `playwright-cli open http://localhost:5173/handbook.html`; `resize 852 393`; `eval` document/body widths; `console error`; then gallery `?archetype=moth` | `scrollW=852`, `clientW=852`, `bodyScrollW=852` on both handbook and gallery; console clean on handbook. A fresh direct navigation to the gallery produced only the pre-existing `favicon.ico` 404 (not present in the phase flow, unrelated to this track and outside `Touches`). AC-8/NFR-5 hold: the phase-captured flow has zero console errors/warnings and both orientations have no horizontal scroll. |

Standalone determinism and fuzz denials recorded by the phase subagent were resolved by the primary's full-chain run above. No balance gate, threshold, fence, pacing pin, `SIM_VERSION`, save schema, dependency manifest, or artifact was changed in Phase 2.
