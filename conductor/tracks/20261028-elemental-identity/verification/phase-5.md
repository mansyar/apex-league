# Phase 5 — Electric identity (8 new rows + `electric.ts`)

- Track: `20261028-elemental-identity`, Phase 5
- Date: 2026-10-28
- Branch: `feat/20261028-elemental-identity` (base `d9caf6c7` per brief)
- Result: **blocked** — implementation + test pins written and self-reviewed;
  task commits and `bun run verify && bun run build` could not run because
  the `shell` tool returns `permission denied` in this session. The primary
  owns the commit + verification run on handoff.

## Tasks

- [x] **P5.T1: New `apps/client/src/move-fx/moves/electric.ts`** — 8 rows in
  sim-catalog order (`static_jolt`, `volt_dash`, `arc_shot`, `storm_bolt`,
  `ion_dart`, `gigavolt`, `storm_surge`, `ion_wall`), all in arc-tendril
  grammar (gravity 4 / sway 2.2, charge-orb windups, spider-outward
  arrivals, no tint overrides — hue stays single-sourced). Every shot
  `life` ≥ 620ms per the Phase 4 capture lesson (travel anchor at +500ms).
  Verbs: `volt_dash` via `dashBody`, `gigavolt` via `beamBody`,
  `storm_surge` via `volleyFanBody` (staggered 0.30/0.43/0.56 beats vs the
  chips' single snap), `ion_wall` via `barrierBody` (no shots, shove 0,
  ring arrival — foe-targeted barrier rule). Covers FR-2, FR-3.
  → `apps/client/src/move-fx/moves/electric.ts` (new, ~7 KB — under the
  12 KB module cap)
- [x] **P5.T2: Registry wiring** — `ELECTRIC_FX` imported and spread into
  `MOVE_FX` in element order (fire/water/plant/electric/earth/wind),
  following the plant/fire pattern. No other registry changes. Covers FR-3.
  → `apps/client/src/move-fx/moves.ts` (2-line diff)
- [x] **P5.T3: Test pins** — `fallback.test.ts` extended: unauthored-spot
  list drops `static_jolt`/`ion_wall` (now bespoke; earth/wind spots
  remain); new AC-1 pin (all 8 resolve bespoke, none the electric
  fallback) and AC-3 verb pins (`ion_wall`: 0 shots / shove 0 / ring;
  `volt_dash`: kick and shove ≤ −0.6; `storm_surge`: 3 shots;
  `gigavolt` + `storm_bolt`: charge defined; `static_jolt`: 1 shot, no
  charge). All pins use dot access (`MOVE_FX.static_jolt`) with
  throw-narrowing, no `!`/`as`. Covers AC-1, AC-3.
  → `apps/client/src/move-fx/moves/fallback.test.ts`
- [ ] **Primary on handoff:** stage + commit per task
  (`feat(move-fx): ...`), run `bun run verify && bun run build`, capture
  P5.T3 lab screenshots (Storm Hound `storm_hound` vs Tide Axolotl, far,
  1×, seeded; explicit `setViewportSize` 1280×800 desktop / 390×844 phone).

## Verification

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static+unit+determinism | `bun run verify` | not run | shell denied in this session |
| build | `bun run build` | not run | shell denied in this session |
| visual (lab) | primary captures | pending | P5.T3 screenshots after handoff |

## Deviations

None — all changes inside the brief's Touch map
(`moves/electric.ts`, `moves.ts`, `moves/fallback.test.ts`, this report).

## Notes

- Design follows the fire/water/plant row shapes 1:1 (chip/dart/workhorse/
  charged-bolt/beam/volley/guard), so the verb reads stay consistent across
  elements; electric distinctness comes from the grammar (high sway 2.2,
  charge orbs, spider arrivals, no rings except the guard).
- `volleyFanBody("electric")` shots already carry `life: 620`, satisfying
  the ≥600ms lesson without override; `dashBody`'s 500ms shot and
  `beamBody`'s arrival were overridden (`volt_dash` shot 620ms,
  `gigavolt` arrival 14 puffs / 1.8 size / 560ms / flashGrow 3.4).
- `ion_wall` mirrors `tide_aegis`/`bramble_guard` exactly (barrier body +
  raised pose, ring arrival, shove 0) — no self-cast staging, no sim change.
