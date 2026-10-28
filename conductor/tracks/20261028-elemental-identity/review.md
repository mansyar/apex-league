# Review: Elemental Identity Pass

- **Track:** `20261028-elemental-identity`
- **Type:** `feature`
- **Branch:** `feat/20261028-elemental-identity`
- **Range:** `751443c7fab78dfb83410e71211c94e2b0394e49..b4cc94f0`
- **Date:** `2026-10-28`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track delivers all 48 bespoke move rows with element shape language, verb
pins, decoupled wind parts, a DEV-only Move Lab, and green gates throughout.
The read-only review found no Critical, High, or Medium issues — only four Low
doc/hygiene nits (two stale comments, one dead requirement reference, one
repeated color literal), all mechanical and fixed in Phase R1.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun run verify` (types + `bun test` + biome + determinism gate) | pass | 3454 pass / 1 skip / 0 fail; gate byte-identical |
| coverage | none configured | n/a | workflow gate is `none` |
| lint | `biome check` (inside verify) | pass | clean |
| typecheck | `bun run check` (inside verify) | pass | all packages clean |
| build | `bun run build` | pass | exit 0; lab split to own chunk; pre-existing chunk-size warning only |
| visual | Move Lab captures per phase | pass | 204 catalog + 12 fallback + 12 grayscale PNGs, console clean |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P1.T3 | `move-fx/moves/fallback.test.ts`, `verification/phase-1.md` | covered |
| FR-2 | P2.T1–P7.T1 | `fallback.test.ts` AC-1 pins, `movelab/catalog.test.ts` | covered |
| FR-3 | P5.T1 | `fallback.test.ts` electric pins | covered |
| FR-4 | P7.T2 | `move-fx.test.ts` no-shared-parts + determinism pins | covered |
| FR-5 | P1.T2 | `fallback.test.ts` verb-family pins | covered |
| FR-6 | P1.T1.3 | `fx/fx-data.test.ts` goldens | covered |
| FR-7 | P8.T1, P8.T2 | `verification/phase-8.md` + PNG catalog | covered |
| FR-8 | P1.5.T1–T3, P8.T4 | `movelab/*.test.ts` (catalog/steps/isolation/phone) | covered |
| NFR-1 | P1, P8.T3 | `module-size.test.ts` green | covered |
| NFR-2 | P8.T3 | determinism gate green; no sim files in diff | covered |
| NFR-3 | P8.T3 | `SAVE_VERSION` 25 pinned; no save files touched | covered |
| NFR-4 | P1 | hues via `ui/element.ts`; no new deps | covered |
| NFR-5 | P8.T3 | no `PLAYBACK_BEATS` edits; console-clean captures | covered |
| NFR-6 | P1.5.T1, P8.T4 | `isolation.test.ts`; lab in own bundle chunk | covered |
| AC-1 | P2.T3–P7.T3 | all-48 bespoke pins per element | covered |
| AC-2 | P8.T2 | grayscale readability pass, `verification/phase-8.md` | covered |
| AC-3 | P2.T3–P7.T3 | verb spot-check pins per element | covered |
| AC-4 | P8.T3 | verify + build green, desktop/phone catalog | covered |
| AC-5 | P8.T3 | size tests green, no save bump, no new deps | covered |
| AC-6 | P1.5.T4, P8.T4 | lab triggers all moves; no lab code in prod bundle | covered |

## Findings

### Critical

- none

### High

- none

### Medium

- none

### Low

- **F1 — Stale vine_lash header comment**
  - **File:** `apps/client/src/move-fx/moves/plant.ts:140-144`
  - **What:** Two stacked header comments describe different verbs (tier-1
    "quick snap that clings" vs tier-2 "whip-crack three-streak rake"); the
    first is stale from the P4 rework and contradicts the shipped
    simultaneous-rake body.
  - **Why:** Stale doc misleads the next reader about the verb; the code (3
    simultaneous shots, slash recoil, snap ring) matches only the second
    comment.
  - **Fix:** Delete the first comment block, keep the whip-crack header.
  - **Requirement:** FR-2
  - **Test gap:** none
  - **Status:** fixed in Phase R1
- **F2 — pyre_wall header contradicts guard-targeting rule**
  - **File:** `apps/client/src/move-fx/moves/fire.ts:214-217`
  - **What:** Header says "self-targeted barrier … no enemy contact frame"
    while the spec edge case and all five sibling guards document a
    foe-targeted eruption at the enemy with the normal contact read — and the
    code paths are identical (0 shots arriving at side.target).
  - **Why:** Contradictory docs invite a future "fix" that reintroduces the
    reverted SELF_TARGETED experiment.
  - **Fix:** Reword to "a foe-targeted barrier eruption — no projectile, no
    shove … exactly like tide_aegis" to match siblings and spec.
  - **Requirement:** FR-2
  - **Test gap:** none
  - **Status:** fixed in Phase R1
- **F3 — Dead requirement reference in barrel comment**
  - **File:** `apps/client/src/move-fx/moves.ts:88`
  - **What:** Comment cites "(spec FR9)" but the spec defines FR-1..FR-8 only.
  - **Why:** Dead requirement reference; trivial doc drift.
  - **Fix:** Change to "(spec FR-2)".
  - **Requirement:** none
  - **Test gap:** none
  - **Status:** fixed in Phase R1
- **F4 — Dust tint literal repeated 17x**
  - **File:** `apps/client/src/move-fx/moves/earth.ts:28` (+14 more sites),
    `apps/client/src/move-fx/moves/fallback.ts` (2 sites)
  - **What:** `"#9c8f7d"` repeated literally instead of a shared constant.
  - **Why:** Duplication invites drift; centralizing keeps the NFR-4
    hue-hygiene story crisp (neutral grit, not an element hue — no contract
    change).
  - **Fix:** Export `EARTH_DUST_TINT` from `moves/fallback.ts` and reference
    it at all 17 sites; no behavior change.
  - **Requirement:** NFR-4
  - **Test gap:** none (existing pins cover values; constant is behavior-preserving)
  - **Status:** fixed in Phase R1

## Overrides

- none

## Plan compliance

- Every phase P1–P8 has a `Result`, `Checkpoint`, and `Evidence`; all tasks
  `[x]` with gate exits and frame counts recorded.
- `Touches` respected in every phase; recorded deviations hold on re-check
  (`fxFor` fallthrough at `moves.ts:125-131`, `steps/fire.ts` element
  threading, earth `flash:false` preservation via spread, P1.5 barrier-target
  revert + spec amendment, P7 `streak`/`streaks` parts, merged T1+T2 commits in
  P5/P6/P7 as single-file rewrites).
- No dropped tasks. Volume strategy for this large review: per-phase file
  groups + cross-phase checks (part decoupling, guard rule, bundle split).
- Process note (non-blocking): workflow prescribes phase-squash on
  acceptance; phases landed as 2–4 task commits each. History is legible and
  conventional — accepted as-is, no rewrite.

## Out of scope

- O1: Electric in-flight core/trail remain generic `orb` geometry; arc-tendril
  identity is parametric (sway 2.2, charge orb, spider arrivals). A future
  tendril-trail family would make FR-3 geometric — candidate follow-up, not a
  defect.
- O2: `ELEMENT_BURST` fallback table diverges from bespoke row overrides;
  harmless (row values win in `bursts.ts:184-185`). A one-line
  fallback-only comment would prevent future "corrections" — left for the
  author, not filed.
- O3: PNG evidence accepted on primary attestation (reviewer inspected code +
  tests, not images).

## Debt

- none (review.issues.enabled is false; no findings deferred — all four Low
  findings fixed in Phase R1).

## Doc sync

`pending` — no product/tech-stack/save-schema changes in this track; sync step
confirms `product.md` roadmap, `product-guidelines.md`, and `tech-stack.md`
need no update.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 4 | 0 (R1 appended) |
| 2 | PASS | 0 | 0 | 0 | 4 | 4 |
