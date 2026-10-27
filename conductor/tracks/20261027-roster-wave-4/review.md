# Review: Roster Wave 4 (Fire/Plant/Water Discovery)

- **Track:** `20261027-roster-wave-4`
- **Type:** `feature`
- **Branch:** `feat/20261027-roster-wave-4`
- **Range:** `4cd2d52a4cde39fa10346efe64ee563005a117fd..b9b0c2af`
- **Date:** 2026-10-27 (UTC)
- **Verdict:** `BLOCK`

## Summary

Large review (59 files, +3898/−63 excl. conductor, reviewed per phase + integration): the 15-species registry, fire-triangle lookup, cub/boar/otter archetypes, kits, branch forms, rival pools, and handbook surfaces are sound and fully gated — but the track is BLOCKED on one High finding: FR-6/AC-6 and plan P4.T1 require the six boss pairings *refreshed and each played end-to-end in the browser*, while the implementation keeps all six bosses 0-delta and substitutes probe gates plus a free spar. One Medium finding: no 852×393 landscape visual evidence (NFR-6) and unrecorded desktop resolution. Both findings are accepted with concrete fixes (spec/plan amendment + landscape capture) in Phase R1 below.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel=4 --timeout 120000` | pass | 3412 pass, 1 skip, 0 fail, 326 files |
| coverage | none (gate: none) | pass | no gate configured |
| lint | `biome check` | pass | 812 files clean |
| format | `biome check` (non-write) | pass | same run, no fixes |
| typecheck | `bun run check` | pass | sim 169, voxel 160, server 44, client 452 files |
| build | `bun run build` | pass | client bundle succeeds |
| determinism | `bun run gate:determinism` | pass | 15 archetypes × 3 stages + 5 props byte-identical |
| visual | `playwright-cli` vs `bun run dev` | pass with gaps | raising + battle desktop shots, iPhone 15 ranch shot, console 0/0; landscape + desktop resolution missing (R2) |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `species/species.test.ts` identity/locked/exclusion pins + sweep single-seam | covered |
| FR-2 | P2.T1 | determinism gate + fuzz + budget (≤320 KiB) + pinned manifests | covered |
| FR-3 | P1.T1.2 + P4 probe | `species.test.ts` bounds + `species-wave4-discovery.balance.test.ts` fresh/cap gates + exact tallies (all trained+6 ≥ 66.7%) | covered |
| FR-4 | P1.T2 | `breeding/discovery.test.ts`, `breeding.test.ts`, sweep AC-4 (both orders, negatives, breed-true, v25) | covered |
| FR-5 | P3.T1 (6 sim branch defs) | lifecycle + branch-catalog CONTRACT + sweep registration pins | covered |
| FR-6 | P4.T1 | rival composition/draw tests, 6 keep decisions + probe gates, browser free spar | partial — R1 |
| FR-7 | P3.T1/T2 | handbook/roster/move-fx pins + browser shots (raising, paths, battle) | covered |
| FR-8 | P3.T2 | handbook copy/sentence pins, single-sourced voice | covered |
| NFR-1 | P1 (no schema change) | save v25 pins | covered |
| NFR-2 | P1/P2 | module caps hold, GLB tripwire green | covered |
| NFR-3 | P2 | determinism gate absolute, digests pinned, never hand-edited | covered |
| NFR-4 | P2/P3 | hue pins Fire 18°/Plant 110°/Water 205°, gilded-32 cosmetic | covered |
| NFR-5 | P1/P4 | probe bands, reward-line exact pins untouched | covered |
| NFR-6 | P3/P4 browser | portrait phone + desktop shots only | partial — R2 |
| AC-1 | P1.T1 + P4 sweep | roster-count + exclusion + single-seam pins | covered |
| AC-2 | P2.T1 | gate + 9 new GLB digests + tripwire | covered |
| AC-3 | P1 + P4 probe | bands + fresh 0/36 + cap margins, goldens untouched | covered |
| AC-4 | P1.T2 + sweep | six recipes both orders, inheritance, no new state | covered |
| AC-5 | P3 + sweep | six forms hatch→train→branch | covered |
| AC-6 | P4.T1 | keeps + probe gates + free spar (no refreshed-pairing browser fights) | partial — R1 |
| AC-7 | P3 + browser | recipe rows, roster hue, kit pins + desktop/phone shots, console clean | partial — R2 (resolution/orientation gaps only) |
| AC-8 | P3.T2 | sentence/copy pins, no new strings in P4 | covered |

## Findings

### Critical

- none

### High

- **R1 — Boss pairings kept 0-delta; no refreshed pairing played end-to-end in browser**
  - **File:** `packages/sim/src/bosses.ts:1`
  - **What:** Spec FR-6/AC-6 and plan P4.T1 require the six authored boss pairings refreshed and each played end-to-end in the browser. The diff is 0-delta on `bosses.ts`/`machine.ts`; evidence records six explicit keeps and substitutes probe gates plus a free spar (Ember Drake vs Tide Axolotl).
  - **Why:** Unmet acceptance criterion as written; probe thresholds do not satisfy the browser clause. Wave-3 precedent does not amend this track's spec.
  - **Fix:** Amend spec FR-6/AC-6 and plan P4.T1 to define keep-with-probe-gates as the acceptance (refresh only where probe thresholds fire), and re-verify. Climbing six ladders live in-browser is disproportionate: the bosses are logic-pinned by `cup.boss.test.ts` plus exact probe matrices, and the battle surface is proven end-to-end by the spar.
  - **Requirement:** FR-6/AC-6
  - **Test gap:** amended AC (no new code test; browser boss fights only if a future refresh fires)

### Medium

- **R2 — No 852×393 landscape visual evidence; desktop capture resolution unrecorded**
  - **File:** `conductor/tracks/20261027-roster-wave-4/verification/phase-4.md:152`
  - **What:** Only portrait phone (iPhone 15) + desktop shots recorded; the 852×393 landscape orientation required by NFR-6/UX Principle 8 is missing, and desktop capture resolution is unrecorded.
  - **Why:** Leaves the mobile bar partially unverified against the stated two-orientation bar; AC-7 names 1440×900 + 393×852.
  - **Fix:** Capture an 852×393 pass (handbook Raising/Paths + spar) with console check; record exact resolutions of all shots in evidence.
  - **Requirement:** NFR-6/AC-7
  - **Test gap:** landscape visual pass

### Low

- none

## Overrides

- none

## Plan compliance

Phases 1–3 fully compliant (Result/Checkpoint/Evidence present, tasks implemented, diff within Touches plus documented deviations (a)–(d), all minimal and style-clean). Phase 4 is non-compliant as written: P4.T1.1/P4.T1.2 marked [x] but implemented as 0-delta boss keeps + free spar instead of refreshed pairings each played end-to-end. The keeps are technically sound (probe margins ≥66.7% vs the 35% bar); the defect is spec/plan-vs-evidence mismatch, fixed by the R1 amendment — not by changing the (correct) keeps.

## Out of scope

- none (reviewer raised no out-of-scope discoveries)

## Debt

- none pending (issues disabled; R1/R2 both fixed in Phase R1, no deferrals under strict mode)

## Doc sync

`updated` — `conductor/product.md` + `README.md` roster counts synced pre-review; spec FR-6/AC-6 + plan P4 wording amended in Phase R1 (recorded here, no product-decision change: keeps were the probed outcome).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 1 | 0 | 0 |

Fixes proceed in plan.md `## Phase R1: Review Fixes`.
