# Phase 5 — Body-First Dash Trio: verification evidence

Track: `20261028-fire-move-identity` · Phase: `phase-5-body-first-dash-trio`

## Goal

Rework the three body-first Fire dash rows so the attacker — not a shot —
shows the hit: zero-shot `flame_charge`, `cinder_dive`, `pyre_lance`, with a
launch-path interpreter change so zero-shot launches still stage the kick and
muzzle pop. Guards stay untouched.

## Commits (one per task; P5.T4 split red → green)

| Task | Commit | Description |
|------|--------|-------------|
| P5.T4 (red pins) | `7290cb6` | TDD pins in `fallback.test.ts` — trio describe, failing red |
| P5.T1 | `56787cf` | `flame_charge` zero-shot crossing body hit |
| P5.T2 | `08b8e1a` | `cinder_dive` zero-shot vertical crater |
| P5.T3 | `0c50cd4` | `pyre_lance` zero-shot pass-through streak |
| P5.T4 (green) | `15c90ba` | launch-path zero-shot kick + muzzle staging in `steps/fire.ts` |
| P5.T4 (evidence) | (this file) | green pins + this evidence doc |

## Files changed

- `apps/client/src/move-fx/moves/fallback.test.ts` — `FIRE_TRIO` pins
  (trio motion-first/distinct-landings, flame_charge, cinder_dive,
  pyre_lance, launch kick+muzzle / guards-silent probes via a
  `driveTrioMove` fake-IO harness driving the real `fireSpecial`).
- `apps/client/src/move-fx/moves/fire.ts` — the three rows:
  - `flame_charge`: `shots: []`, wind `0.34`, charge wreath
    (`charge: { rate: 0.5, hold: 1.1 }`), nose-gap muzzle
    (`puffs: 6, flashGrow: 3.0, sway: 1.6`), head-down drive pose,
    forward-driving bloom arrival, shove `-0.6`.
  - `cinder_dive`: `shots: []`, explicit `muzzle: undefined` (drops the
    fire fallback body's inherited muzzle so no pilot fake projectile
    flies), wind `0.58`, head-down coil pose held through recoil, ring
    down-slam arrival (`puffs: 14, size: 2.0, gravity: 6`), shove `-0.7`.
  - `pyre_lance`: `shots: []`, beam charge kept (`spread` off
    `beamBody`), tight driftless muzzle flash
    (`puffs: 5, size: 0.7, life: 280, gravity: 0, sway: 0,
    flashGrow: 3.4`), beam-line triplet arrival
    (`lanes: [-0.18, 0, 0.18]`, `puffs: 9, life: 380, gravity: 0,
    sway: 0, flashGrow: 3.6`), shove `-0.6`.
- `apps/client/src/steps/fire.ts` — launch-path zero-shot block: at the
  release beat, stage `fx.kick`, clear the wreath when `fx.charge` is set,
  and pop `fx.muzzle` at the attacker's mouth. Guarded by `!compressed`
  because guards land through the compressed impact path and must stay
  silent (they inherit a muzzle from the fire fallback body).
- `apps/client/src/move-fx.test.ts` — removed `cinder_dive` from the
  "each new attack form" 1-shot-forms list (deviation, see below).

## Deviations

1. **Brief path typo**: the brief names
   `apps/client/src/move-fx/steps/fire.ts`; the real interpreter is
   `apps/client/src/steps/fire.ts`. Fixed there (smallest necessary
   change; same file intent).
2. **`move-fx.test.ts` forms-list edit**: `cinder_dive` was a listed
   1-shot attack form (`kick < -0.5`, `shots.length === 1`,
   `shove <= -0.5`) but is now zero-shot, so its entry was removed.
   The other forms' assertions are untouched.
3. **Explicit `muzzle: undefined` on `cinder_dive`**: required because the
   fire element fallback body injects a muzzle that `dashBody` spreads
   inherit — without the override the "pilot minimized/removed" goal
   would silently fail.
4. **P5.T4 committed as two commits** (pins-red, then fix + evidence)
   to respect the no-amend rule; the report `notes` record the mapping
   to brief tasks.

## Verification

- `bun test apps/client/src/move-fx/moves/fallback.test.ts apps/client/src/move-fx.test.ts apps/client/src/steps/fire.test.ts`
  → **67 pass, 0 fail** (was 5 failing red before the rows + fix).
- `bun run verify && bun run build` → **exit 0** (full gate: typecheck
  clean, 3486 pass / 0 fail, biome clean, determinism gate OK, client
  build OK). First `verify` run failed only on biome import-order /
  formatting in the new pins file; fixed with one `bunx biome check
  --write` on that file (fix attempt 1 of 2 used), then the full gate
  passed.

No product/design decisions were required; no blockers.
