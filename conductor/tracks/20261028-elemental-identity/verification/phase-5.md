# Phase 5 — Electric identity (8 new rows + `electric.ts`)

- Track: `20261028-elemental-identity`, Phase 5
- Date: 2026-10-28
- Branch: `feat/20261028-elemental-identity` (base `d9caf6c7` per brief)
- Result: **verified** — primary ran the gate and captured lab evidence
  (see Primary evidence below). One biome-format fix on the pins
  (`0df74ef2`); no behavior change.

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
- [x] **Primary on handoff:** staged + committed per task (`13eb5170`
  P5.T1, `68fefcc0` P5.T2, `d768a0b2` P5.T3, `0df74ef2` biome format), ran
  `bun run verify && bun run build` (exit 0), captured P5.T3 lab
  screenshots (Storm Hound `storm_hound` vs Tide Axolotl, far, 1×, seeded;
  explicit `setViewportSize` 1280×800 desktop / 390×844 phone).

## Verification

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static+unit+determinism | `bun run verify` | 0 | types clean (464 client files), 3445 pass / 1 skip / 0 fail, biome clean, determinism gate OK |
| build | `bun run build` | 0 | client bundle builds; lab chunk still split |
| visual (lab) | primary captured | done | 32 frames in verification/phase-5/, spot-reviewed |

## Primary evidence (P5.T3 lab capture)

- 32 Move-Lab frames in `verification/phase-5/`: 8 moves × travel/impact ×
  desktop (1280×800) / phone (390×844). Attacker Storm Hound
  (`storm_hound`), defender Tide Axolotl (electric→water SE), far range,
  1× pace, seeded particles. Anchors: travel = projectile-staged +500ms,
  impact = impact-staged +100ms.
- Reads: gigavolt travel = huge yellow-white charge orb swelling at the
  hound (beam charge); ion_wall impact = arc-tendril barrier ring erupting
  on the foe (barrier rule); storm_surge travel = bright bolt-stream in
  flight (beats overlap at the anchor — structural 3-shot stagger pinned in
  tests); static_jolt phone travel = crackle at the hound with halo ring,
  legible at 390px width.
- Commits: `13eb5170` P5.T1 electric.ts, `68fefcc0` P5.T2 registry,
  `d768a0b2` P5.T3 pins, `0df74ef2` biome format fix.

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
