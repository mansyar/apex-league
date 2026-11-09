# Continuous Arena Battle

Replaces the discrete action-gauge clock with a fixed-step, continuous-time and
continuous-space simulation, and moves cup and spar onto it.

## What changed

- **Fixed 20 ms step.** Integer-only arithmetic, millimetre positions as
  3-vectors with `y` pinned to 0, FNV-1a state hash over the whole fight state.
  Repeat resolution is byte-identical.
- **Free movement.** Fighters close, retreat and strafe at a speed derived from
  `spd`, with acceleration, deceleration, arena bounds and a bounded turn rate.
- **Authored frame data.** All 49 catalog moves carry startup / active /
  recovery in ms, reach in mm, projectile speed, poise damage, stamina cost and
  a height band.
- **Contact geometry.** Bodies have radius and height; melee sweeps a per-step
  sector with edge-to-edge reach and one blow per swing; projectiles sweep a
  segment against a capsule.
- **Commitment.** No cancel after startup ends; a startup hit cancels, a
  recovery hit counters, and overlapping active frames trade.
- **Poise and stamina.** A break opens a timed punish window; stamina gates
  attacks and dodges and regenerates only when nothing is held.
- **Hit reactions.** Mass-scaled knockback along the blow line with hitstun,
  decay, fence clamping and an observable pin.
- **Real-time controller.** Six verbs on a fixed cadence with commitment locks;
  the coach's tactic maps onto an engagement profile.
- **Dense playback.** A flat `Int16Array` of nine fields per side per step drives
  the client, with floor-arc startup telegraphs and reduced-motion support.
- **Telemetry.** `bun run telemetry` measures engagement distance, exchange
  rate, idle share, distinct positions and cap share; CI enforces the bounds.
- **Legacy freeze.** The gauge clock and step playback are replay-only, pinned by
  a freeze test; `SIM_VERSION` is 2 and mismatched ghosts are skipped.

## What this does not do

Verticality, blocking, ring-out, player input and a full balance re-tune stay
out. The animation vocabulary is still the old one: the fight moves correctly
before it reads correctly. Both are recorded in the spec as follow-ups.

## Verification

- `bun run verify` — typecheck across four packages, 3,801 tests / 354 files,
  Biome clean, voxel determinism gate byte-identical
- `bun run build` — 398 modules
- `bun run telemetry` — 14 matchups, eight bounds green
- Track review returned BLOCK on one High defect (the strike window was gated one
  step ahead, so every swing lost its final active step); fixed and pinned in
  Phase R1.
