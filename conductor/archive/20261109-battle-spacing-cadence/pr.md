# Spacing, cadence and blow weight

Stacked on #65 (continuous arena battle). This track fixes what the engine got
mechanically right but felt wrong: creatures stood inside each other, swung
non-stop, and hit for numbers nobody could read.

## What changed

**Spacing.** Preferred range is now derived from the creature's own reach edge
(`reachMm + own radius + opponent radius`, band 0.5-1.0 above it) instead of a
fixed 450-650 mm, which was inside the sum of body radii. Retreat fires below
0.6x preferred range and keeps retreating until preferred range is reached,
rather than oscillating in place. Tactic overlays follow the same scale.

**Cadence.** `DECISION_MS` 120 → 240. Recovery is scaled by SPD against
`RECOVERY_REFERENCE_SPD`, so faster creatures genuinely recover faster — attack
speed is now a derived stat rather than an absence.

**Stamina.** Regen 20/s → 2/s with a 3-point cheapest attack, so sustained output
is bounded at roughly one attack per 1.5 s instead of being effectively free.

**Blow weight.** `BLOW_WEIGHT = 2` applied to damage, the whole frame cycle
(startup, active and recovery, so the telegraph and the window scale together),
poise damage and stamina cost, with `KNOCKBACK_PER_POISE` divided by the weight so
the shove is unchanged. A basic strike now takes 2.6-3.2% of a pool.

**Honest labels.** The kit panel advertised `Cooldown 1` from `MoveDef.cooldown`,
which the continuous engine never reads. It now shows `Recovery <n> ms` from the
authored frame data, and shows nothing where no frame row exists.

**Fight inspector.** `bun run trace --seed N --check` replays one seeded fight
headless and prints a header (stats, HP pool, kit, engagement profile), a per-step
log (positions, gap, phase, HP, stamina, poise, every strike/shot/dodge/pinned
event) and a summary with the final state hash. `--check` asserts the invariants —
`y === 0`, HP inside the pool, bodies inside the arena, all-integer values,
identical replay — and exits non-zero naming the broken one. Registered in
`workflow.md` so phase agents are expected to prove a battle claim with trace
output instead of a screenshot.

## Measured, before → after

| | Before | After |
| --- | --- | --- |
| Median engagement distance | 539 mm | 807-942 mm |
| Time spent in contact | 54.8% | 12.9% |
| Attack rate (pooled) | 3.78/s | 0.66/s |
| Damage per basic blow | 1.2% of pool | 2.6-3.2% |
| Median fight | 25.3-40.0 s (cap-bound) | 38.56 s |
| Decided at the cap | 42.9% | 42.9% |

## Known debt, deliberately not papered over

- **Fight length is bimodal.** 6 of 14 sample fights end under 25 s and 6 reach
  the 40 s cap; the median is an artefact of the two clumps. Cause: specials deal
  22-27% of a pool while basics deal 3%, so one landing heavy special decides a
  fight. Fixing it means compressing the power column, which is balance work.
- Pooled attack rate sits at 0.33/s against a 0.45-0.55/s target. KO fights reach
  it; capped fights sit at 0.30/s.
- Cap share is above the one-in-three target (the telemetry gate enforces the
  spec's one-in-two ceiling, and a test pins the one-in-three miss so it fails
  the moment a balance pass fixes it).
- Stat unification was deferred to the balance track: the arena shows a scaled HP
  pool while the setup panel shows raw stats, and `BLOW_WEIGHT` multiplies damage
  after the ATK term.

## Verification

`bun run verify` exit 0 (3,837 pass / 1 skip / 0 fail, biome clean, voxel
determinism gate byte-identical), `bun run build` exit 0 (399 modules),
`bun run telemetry` exit 0 with all 13 bounds ok, and `bun run trace --check`
green across five seeds covering KO, cap and dodge outcomes.
