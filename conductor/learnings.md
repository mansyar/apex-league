# Conductor Learnings — 3D Scene & Animation

Hard-won lessons from building the Living Ranch presentation track
(`living_ranch_20261010`, 2026-10-10). Each item captures the *why*, not
just the what, so future tracks don't rediscover it the slow way.

## 1. Rig units: voxel builds are grid units, not world units

`buildCreatureGroup` nests everything inside an inner group that carries a
tiny world scale. A direct child's `position` (e.g. `body @(28.00, 27.11)`)
is in **voxel grid units**; its world position is ~20× smaller
(`(1.26, 1.22)`). Consequences:

- **Never mutate child positions with world-unit values.** Subtracting a
  world-unit offset from a grid-unit position shifts the mesh by ~1/20th of
  what you intended — silent, invisible, maddening (this produced a
  multi-round "the pivot arcs" chase with three wrong fixes).
- **Re-anchor the rig by wrapping it in an identity-scale holder.** Measure
  the whole-creature visual center with `Box3().setFromObject(inner)`,
  put the inner group inside a fresh `THREE.Group()`, and set
  `inner.position.set(-center.x, 0, -center.z)` — the inner position is in
  the *parent's* space (identity → true world units). All motion code then
  drives the holder. The rig's internal scale contract is untouched.

## 2. Part pivots ≠ the visual center

Anchoring the rotation axis at a part's `getWorldPosition()` (its pivot) or
even its local bounding-box center is not the same as pivoting around the
creature's visible mass. Measure, don't assume: dump the rig
(children names + positions, whole-group bounding box) to the console once
and read the numbers before writing the anchor.

## 3. Turning reads as "arc" unless the pivot is anchored AND the legs freeze

Two distinct bugs both presented as "the creature moves in a half circle":

- An off-origin rotation axis swings the body around a distant point
  (fix: learnings 1–2).
- Full stride amplitude during an in-place pivot makes the creature
  *march while spinning* — the swinging feet sweep visible arcs
  (fix: the walk machine reports a `pivoting` flag; the scene keeps the
  gait amplitude at 0 while pivoting so legs go still during the turn).

The final motion model is **turn-then-walk**: pivot at `TURN_SPEED` until
the yaw error is under `TURN_THRESHOLD` (0.12 rad), then stride a straight
line with yaw locked. Never translate while misaligned (no crab-walking).

## 4. Debugging rendering: give the user in-scene evidence

Browser screenshots from the automation pipeline served **stale compositor
frames** — number traces said one thing, my captures showed another, and
the user's eyes a third. What finally aligned everyone:

- **Drop diagnostic meshes into the scene** (tiny marker cubes: white =
  travel path samples, blue = pivot origin). The user sees the ground
  truth in their own window; no capture pipeline involved.
- **Console telemetry** — per-frame position logs, one-time rig dumps
  (`[rig] pivot=… visualCenter=…`, children layout, bounding box) pinpoint
  unit systems and anchor errors in a single page load.

## 5. Facing conventions: confirm live, don't derive

The mesh's rest-facing was *assumed* to be −z; it is actually **+z**, so
`heading(dx, dz) = atan2(dx, dz)` — no π flip. A camera-dependent visual
world plus a doubled offset made the早期 flip look correct for a while.
When orientation looks wrong, screenshot mid-walk, compare the nose vs the
displacement direction, and flip exactly one function (`heading`).

## 6. Movement: position-driven beats time-driven

The first walk machine advanced phases by *elapsed time*; a paused tab, a
slow frame, or a phase-boundary tick could strand or overshoot. The final
machine **strides by position**: each frame it reads the creature's live
position, moves a clamped step (`dt ≤ 0.1`) at constant speed toward the
current target, and never overshoots. Phases become consequences of
positions (arrived → next) instead of timers. This survives every
frame-timing pathology by construction.

## 7. Camera panning distorts perceived geometry

A camera that lerps toward the creature makes straight world paths look
curved on screen (user-reported "arc" while the world path was provably a
straight line — confirmed by per-frame distance math). When a user reports
path curvature, first test with the camera pinned (target fixed), then
conclude. Keep camera smoothing frame-rate independent:
`target.lerp(focus, 1 - exp(-k · dt))`, never a fixed per-frame factor
(refresh-rate dependent — reads as a snap on high-Hz displays).

## 8. Product decisions that changed the spec mid-track

- **Feeding ceremony is non-cancelable** (2026-10-10, user decision after
  live play): HUD inputs apply to the sim immediately but never interrupt
  the creature's motion. The machine retains `cancel()` as a tested safety
  valve only.
- **Walk style is straight-line by request**: from the current position →
  the stand spot on the creature→pile line (1.15 units short of the pile),
  nibble, then straight back to the home anchor — no seeded side offsets.
- The snack for reduced motion remains an in-place nibble (no travel).

## 9. Keep diagnostic build tags while iterating remotely

A one-line `div` build tag ("scene build N") at the bottom of the screen
sets whether the user's stale tab vs. the agent's bundle is the
difference — it ended three rounds of stale-bundle doubt instantly.
Remove before commit.

## 10. The free Strike out-sustains every special (known meta imbalance)

Found during the battle-animation-overhaul rebalance probe (2026-10-12),
invisible until cross-tactic mirror matches were measured: the typeless
basic Strike (power 4, 100% accuracy, no cooldown) deals 4 damage per
action window, while the best special's sustained output is Flame
Charge at 3.6/window (expected damage divided by 1 + cooldown). Favor
Specials never Strikes, so it loses every mirror attrition race —
balanced beats specials 100% in drake/axolotl mirrors (ox kit2/3
mirrors stall into 40-tick draws instead; ox kit4 is 94.5% for
balanced). Cross-type matchups are tactic-invariant because the type
triangle decides them outright. Fix candidates (a dedicated balance
track, not ad hoc): nerf the basic, buff special powers, or make Favor
Specials cooldown-DPS-aware (fall back to Strike when a special's
sustained output loses to 4/window). Any fix reshuffles the whole meta
and needs its own seed-batch rebalance pass.

   **RESOLVED 2026-10-13** (track `battle_sim_consolidation_20261013`,
   Phase 3): the probe disproved this finding's central claim before any
   fix was chosen. Measured on 216 mirror battles, `specials` won 80.8%
   (not lost) and `balanced` 25.5% — the inverse of this note. The real
   defect: `balancedQualifiers()` only admitted KO or super-effective
   specials, neither reachable in a neutral matchup, so Balanced could
   never fire its kit and degenerated into a pure Striker (20 total
   damage in an instrumented drake mirror vs Specials' 44). The fix
   (spec FR6 as revised): both tactics read the same sustained-score bar
   (`kitSustained >= strikeSustained`, i.e. the sum of expected/(1 +
   cooldown) vs the Strike's 4/window) — Balanced as a third qualifier
   after KO/SE, Specials as its fallback gate — and each tactic ranks
   the ready kit by its own objective (expected damage vs sustained per
   window), which also cured a first-cut convergence where both tactics
   produced byte-identical battles. Strike power stayed 4 (the nerf
   candidate was withdrawn: it would have hit the losing tactic's only
   attack). AFTER: mirrors 51.5%/48.6%, cross-element 50%/50%, 0 40-tick
   stalls on the varied-stats pass. Probe lives in
   `packages/sim/src/battle/tactics.balance.test.ts`
   (`APEX_BALANCE_REPORT=1`); before/after reports in
   `conductor/tracks/battle_sim_consolidation_20261013/probe-{before,after}.md`.
   Lesson: the documented imbalance was backwards — measure first, then
   choose the fix.
