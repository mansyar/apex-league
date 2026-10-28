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

## Fix round — true body motion + pass-through (P5.F1–P5.F4)

Vision-verified strips of the Phase 5 rows all failed FR-7/AC-6 (webms in
`.conductor/runs/20261028-fire-move-identity/`: `charge-far.webm`,
`dive.webm`, `lance.webm`): the charge stood static on its home side while
a ring appeared on the defender (the old `dashBody` staging never
translated the attacker — `impulse()` only kicks the squash spring), the
dive read as tunnel/teleport + ground eruption, and the lance bloomed on
contact with no beam through.

### Mechanism

- `apps/client/src/move-fx/moves.ts` — two optional, row-driven schema
  fields (absent everywhere else, so other elements are byte-identical):
  `transit?: { reach: number; lift?: number }` (fraction of the live
  attacker→target gap closed at the transit peak, plus an optional
  vertical arc peak) and `arrival.beyond?: number` (exit offset past the
  target along the attack axis).
- `apps/client/src/steps/fire.ts` — the transit block runs at the end of
  the launch action, after the recoil posture (so it composes instead of
  being overwritten): a sine lunge-and-return over
  `[release, 1]`, directed per-frame at the live target position (far-range
  safe; coincident fallback is the attacker's inward axis), paced by the
  action clock, deterministic (no clock/RNG; same tick → same path), and
  dampened ×0.4 under reduced motion exactly like `impulse`. Offset-only:
  the step prelude zeroes offsets every step and the sine returns to 0 at
  `t = 1`, so later steps are unaffected. A row-authored charge wreath
  keeps swelling at the mouth line while the body crosses (the orb
  re-anchors to the group position every frame) and clears on the return;
  non-transit rows keep the exact release-time clear. `arriveSpecial`
  shifts the burst past the defender when `beyond` is set (lanes stay
  lateral). A zero-shot row with `beyond > 0` fires one piercing streak
  from the mouth through to the exit point (size rides the arrival burst,
  life 450, `moveId` threading) in both the ranged and point-blank paths —
  the row's `shots` stay `[]`; the streak is the beam, not a shot.
- `apps/client/src/move-fx/looks.ts` — one `MOVE_SHOT_LOOK` entry so the
  streak renders as a flat molten needle (deviation 1 below).
- `apps/client/src/move-fx/moves/fire.ts` — `flame_charge`:
  `transit: { reach: 0.55 }` (P5.F1); `cinder_dive`:
  `transit: { reach: 0.85, lift: 1.3 }` (P5.F2); `pyre_lance`:
  `arrival.beyond: 1` with the contact flash kept small (P5.F3).

### Pins (red → green, one commit per task)

- Red: `c26e05a` — schema fields plus the fix-round suite in
  `fallback.test.ts` (8 failing: transit displacement/return-home,
  same-tick determinism, gap-fraction scaling, ×0.4 reduced dampening,
  other elements' dash/beam rows untouched, lance overshoot + exit burst,
  lance beam count).
- `fc6d949` (P5.F1): transit mechanism + charge row (charge pins green).
- `27bca14` (P5.F2): dive row (arc pins green).
- `b2fc1b1` (P5.F3): beyond-shift + beam + needle look (lance pins green;
  file-level suite 45 pass / 0 fail on the first attempt).

### Deviations

1. **`looks.ts` touched** (outside the brief's Touches): one
   `MOVE_SHOT_LOOK.pyre_lance` needle entry. `spawnProjectile` resolves
   geometry only through `lookFor(element, moveId)`, so there is no other
   way to give the pass-through streak its piercing read; row-scoped, and
   every other element's beam resolves exactly as before.
2. **Gigavolt pin corrected**: the "other elements stay put" pin first
   asserted every compressed burst lands on the defender, but the
   untouched beam's mouth pop legitimately stays at the attacker — the pin
   now asserts the arrival reaches the defender and nothing exits past it.
3. **Zero-shot launch test updated to the beam contract**: a zero-shot row
   with an exit offset fires exactly one beam projectile; charge/dive stay
   at zero. (Pinned red in the red commit, green in P5.F3.)
4. **`look-override.test.ts` touched** (outside the brief's Touches): the
   FR-1 fallthrough pin allowlists every row with a `MOVE_SHOT_LOOK`
   entry, so `pyre_lance` joined the skip list with a needle-resolves
   assertion — the same pattern as the Phase 2–3 opt-ins. Without it the
   new override trips the "rows without an override keep the element
   default" identity (caught by `verify`, fix attempt 1 of 2).

### Verification

- `bun test apps/client/src/move-fx/moves/fallback.test.ts` → **45 pass,
  0 fail**.
- `bun run verify && bun run build` → first full run failed only on the
  look-override fallthrough identity (new `pyre_lance` entry — deviation
  4, fix attempt 1 of 2); second run: `check` clean (466 client files),
  full suite **3494 pass / 0 fail**, then biome failed only on the
  pre-existing untracked root helpers `setup.js`/`trigger-*.js`
  (present before this fix round, outside this track's scope — left
  untouched; my six files were formatted with `bunx biome check --write`,
  fix attempt 2 of 2). The determinism gate and `build` were not reached.
  Final gate status is recorded in the report below: implementation
  complete, full suite green, `verify` blocked on those stray files.

GIF re-capture stays with the primary (recipe: Move Lab draconic vs
bovine, charge at FAR, dive/lance at close, 1×, seeds 11/23) — AC-6 is
GIF-gated and cannot be verified from pins alone.
