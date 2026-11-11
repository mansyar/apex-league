# Conductor Learnings ΓÇö 3D Scene & Animation

Hard-won lessons from building the Living Ranch presentation track
(`living_ranch_20261010`, 2026-10-10). Each item captures the *why*, not
just the what, so future tracks don't rediscover it the slow way.

## 1. Rig units: voxel builds are grid units, not world units

`buildCreatureGroup` nests everything inside an inner group that carries a
tiny world scale. A direct child's `position` (e.g. `body @(28.00, 27.11)`)
is in **voxel grid units**; its world position is ~20├ù smaller
(`(1.26, 1.22)`). Consequences:

- **Never mutate child positions with world-unit values.** Subtracting a
  world-unit offset from a grid-unit position shifts the mesh by ~1/20th of
  what you intended ΓÇö silent, invisible, maddening (this produced a
  multi-round "the pivot arcs" chase with three wrong fixes).
- **Re-anchor the rig by wrapping it in an identity-scale holder.** Measure
  the whole-creature visual center with `Box3().setFromObject(inner)`,
  put the inner group inside a fresh `THREE.Group()`, and set
  `inner.position.set(-center.x, 0, -center.z)` ΓÇö the inner position is in
  the *parent's* space (identity ΓåÆ true world units). All motion code then
  drives the holder. The rig's internal scale contract is untouched.

## 2. Part pivots Γëá the visual center

Anchoring the rotation axis at a part's `getWorldPosition()` (its pivot) or
even its local bounding-box center is not the same as pivoting around the
creature's visible mass. Measure, don't assume: dump the rig
(children names + positions, whole-group bounding box) to the console once
and read the numbers before writing the anchor.

## 3. Turning reads as "arc" unless the pivot is anchored AND the legs freeze

Two distinct bugs both presented as "the creature moves in a half circle":

- An off-origin rotation axis swings the body around a distant point
  (fix: learnings 1ΓÇô2).
- Full stride amplitude during an in-place pivot makes the creature
  *march while spinning* ΓÇö the swinging feet sweep visible arcs
  (fix: the walk machine reports a `pivoting` flag; the scene keeps the
  gait amplitude at 0 while pivoting so legs go still during the turn).

The final motion model is **turn-then-walk**: pivot at `TURN_SPEED` until
the yaw error is under `TURN_THRESHOLD` (0.12 rad), then stride a straight
line with yaw locked. Never translate while misaligned (no crab-walking).

## 4. Debugging rendering: give the user in-scene evidence

Browser screenshots from the automation pipeline served **stale compositor
frames** ΓÇö number traces said one thing, my captures showed another, and
the user's eyes a third. What finally aligned everyone:

- **Drop diagnostic meshes into the scene** (tiny marker cubes: white =
  travel path samples, blue = pivot origin). The user sees the ground
  truth in their own window; no capture pipeline involved.
- **Console telemetry** ΓÇö per-frame position logs, one-time rig dumps
  (`[rig] pivot=ΓÇª visualCenter=ΓÇª`, children layout, bounding box) pinpoint
  unit systems and anchor errors in a single page load.

## 5. Facing conventions: confirm live, don't derive

The mesh's rest-facing was *assumed* to be ΓêÆz; it is actually **+z**, so
`heading(dx, dz) = atan2(dx, dz)` ΓÇö no ╧Ç flip. A camera-dependent visual
world plus a doubled offset made theµù⌐µ£ƒ flip look correct for a while.
When orientation looks wrong, screenshot mid-walk, compare the nose vs the
displacement direction, and flip exactly one function (`heading`).

## 6. Movement: position-driven beats time-driven

The first walk machine advanced phases by *elapsed time*; a paused tab, a
slow frame, or a phase-boundary tick could strand or overshoot. The final
machine **strides by position**: each frame it reads the creature's live
position, moves a clamped step (`dt Γëñ 0.1`) at constant speed toward the
current target, and never overshoots. Phases become consequences of
positions (arrived ΓåÆ next) instead of timers. This survives every
frame-timing pathology by construction.

## 7. Camera panning distorts perceived geometry

A camera that lerps toward the creature makes straight world paths look
curved on screen (user-reported "arc" while the world path was provably a
straight line ΓÇö confirmed by per-frame distance math). When a user reports
path curvature, first test with the camera pinned (target fixed), then
conclude. Keep camera smoothing frame-rate independent:
`target.lerp(focus, 1 - exp(-k ┬╖ dt))`, never a fixed per-frame factor
(refresh-rate dependent ΓÇö reads as a snap on high-Hz displays).

## 8. Product decisions that changed the spec mid-track

- **Feeding ceremony is non-cancelable** (2026-10-10, user decision after
  live play): HUD inputs apply to the sim immediately but never interrupt
  the creature's motion. The machine retains `cancel()` as a tested safety
  valve only.
- **Walk style is straight-line by request**: from the current position ΓåÆ
  the stand spot on the creatureΓåÆpile line (1.15 units short of the pile),
  nibble, then straight back to the home anchor ΓÇö no seeded side offsets.
- The snack for reduced motion remains an in-place nibble (no travel).

## 9. Keep diagnostic build tags while iterating remotely

A one-line `div` build tag ("scene build N") at the bottom of the screen
sets whether the user's stale tab vs. the agent's bundle is the
difference ΓÇö it ended three rounds of stale-bundle doubt instantly.
Remove before commit.

## 10. The free Strike out-sustains every special (known meta imbalance)

Found during the battle-animation-overhaul rebalance probe (2026-10-12),
invisible until cross-tactic mirror matches were measured: the typeless
basic Strike (power 4, 100% accuracy, no cooldown) deals 4 damage per
action window, while the best special's sustained output is Flame
Charge at 3.6/window (expected damage divided by 1 + cooldown). Favor
Specials never Strikes, so it loses every mirror attrition race ΓÇö
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
   (not lost) and `balanced` 25.5% ΓÇö the inverse of this note. The real
   defect: `balancedQualifiers()` only admitted KO or super-effective
   specials, neither reachable in a neutral matchup, so Balanced could
   never fire its kit and degenerated into a pure Striker (20 total
   damage in an instrumented drake mirror vs Specials' 44). The fix
   (spec FR6 as revised): both tactics read the same sustained-score bar
   (`kitSustained >= strikeSustained`, i.e. the sum of expected/(1 +
   cooldown) vs the Strike's 4/window) ΓÇö Balanced as a third qualifier
   after KO/SE, Specials as its fallback gate ΓÇö and each tactic ranks
   the ready kit by its own objective (expected damage vs sustained per
   window), which also cured a first-cut convergence where both tactics
   produced byte-identical battles. Strike power stayed 4 (the nerf
   candidate was withdrawn: it would have hit the losing tactic's only
   attack). AFTER: mirrors 51.5%/48.6%, cross-element 50%/50%, 0 40-tick
   stalls on the varied-stats pass. Probe lives in
   `packages/sim/src/battle/tactics.balance.test.ts`
   (`APEX_BALANCE_REPORT=1`); before/after reports in
   `conductor/tracks/battle_sim_consolidation_20261013/probe-{before,after}.md`.
   Lesson: the documented imbalance was backwards ΓÇö measure first, then
   choose the fix.

## 11. Injected test doubles hide broken default bindings

EffectLoop (staging-fx) took schedule / cancel as constructor
parameters defaulting to the globals. Every test injected a fake clock,
so the by-reference default was never exercised - until a headless
browser run threw TypeError: Illegal invocation out of spawnProjectile
and spawnBurst: the loop called this.schedule(cb), and
window.requestAnimationFrame rejects a foreign receiver.

Two lessons, both general:

- A test double for an *injected* dependency says nothing about the
  *default*. When a default matters, test it: stub the global and
  construct with no arguments.
- The stub must reproduce the contract you are protecting. An arrow
  function stub ignores this, so it passes even with the bug present;
  a function stub that throws when the receiver is a foreign object
  catches it. Verify a regression test fails against the old code before
  trusting it.
- Browser-side rendering work needs a real browser check even when every
  unit test is green. When the desktop browser tool is unavailable,
  headless Chromium driven by Playwright (screenshots + pageerror +
  computed-style assertions) is an acceptable substitute and caught what
  three phases of green gates did not.

## 12. Measure balance through the production path, and grade cliffs with longer pools

The element-chart track (element_chart_20261016) taught three things the
hard way:

- **Tally what resolveBattle actually returns.** The winner is the
  fighter's *name*, not an id. A probe that compared
  `result.winner === player.id` scored every battle a loss and printed a
  flat 0% table that looked like a balance catastrophe. One throwaway
  single-duel script that printed the raw verdict exposed it. When a
  measurement looks impossible, re-measure by hand before theorizing.
- **Dominant type swings make short fights binary.** Under a 2/1 chart,
  the 4x effective swing (2x dealt x 0.5x taken) plus short HP pools
  meant cross-element fights resolved at 0% or 100% with no middle.
  Softening to 3/2 / 2/3 AND doubling the HP pool (tick cap scaled with
  it) produced a graded middle where untrained disadvantaged fighters
  still lose heavily but invested ones grind through. The HP scale did
  more work than the factors: tempo dominance decides short fights, and
  longer pools give the comeback mechanics room to matter.
- **Balance constants deserve a probe, not an opinion.** A sweep driver
  (patch constants, run the probe, restore) turned "what should the
  factor be" into a table. Park blocked work behind `test.failing` /
  `test.skip` with a comment naming the unblocking track, so the red
  tripwire survives without holding the suite hostage.

13. **An authored gatekeeper must be guaranteed to reach its stage.**
    (silver_ladder_bosses, 2026-10-16) Substituting a boss into the final
    slot is not enough: the boss still has to *fight* through the rival
    subtree, and after the element chart softened the type swing a
    generated rival knocked Sear Marshal Koda out in his own semifinal —
    the browser run reached a "Promotion Cup" whose final never featured
    the boss. Found only by playing the real cup end-to-end, not by any
    unit test that checked the substitution in isolation. Fix: boss
    pairings in the rival subtree are walkovers (the boss advances, no
    battle, no RNG read). Lesson: whenever you special-case an entity
    into a tournament, also special-case its *path* there, and verify
    authored content by watching it happen in the browser.

14. **Small API surfaces hide silent no-ops.**
    (coach_knowledge_20261016, 2026-10-17) `chip()` accepts only
    label/glyph/variant/onClick — a `className` option passed to it was
    silently ignored (no crash, no effect), and the probe only caught it
    because the click timed out. Fix: create the chip, then
    `classList.add(...)` explicitly. Lesson: when a helper drops an
    option, it fails silently — verify the rendered DOM, not just that
    the call didn't throw.

15. **Stacking contexts decide reachability, not visibility.**
    (coach_knowledge_20261016, 2026-10-17) The spar overlay (fixed,
    inset 0, z-40) covered the whole arena, so HUD-cluster chips were
    *visible through the scrim but unclickable* for their entire
    lifetime (the camera chip since save v9) — elementFromPoint hit the
    overlay, not the chip. Fix: z-index 45 on `.hud-motion` so the
    settings chip stays reachable mid-battle; the modals (z-70) already
    layered above. Lesson: `display != none` does not mean clickable;
    probe with `elementFromPoint`, and remember bun's 5s default test
    timeout can flake the balance/voxel gates on a loaded machine
    (rerun in isolation before chasing ghosts).

16. **At voxel scale, a face is a colour decision, not a modelling one.**
    (creature_readability_20261018, 2026-10-19) The first face kit carved
    brows, cheek planes, a snout ridge and teeth, and the verdict was "it
    made the creature look hideous" — every feature was 1-2 cells, so the
    head read as damage rather than expression. The version that shipped
    carves nothing: a 2x2 dark bead per eye (near-black, one faint warm
    catchlight), a single painted mouth row, painted nostril cells, and one
    sliver of brow. Lesson: on a 2-4 cell feature budget the readable
    variables are *contrast and position*, not shape — add detail by
    painting or removing cells, and reserve geometry for parts that must
    move (the lid is a pivot plus `scale.y`, not new geometry). Measure the
    surface work in triangles against the pre-track artifact; this track
    spent 1.7-1.95x the original triangle count and almost no voxels,
    because AO and colour classes are vertex work.

## 13. A mechanic you cannot reach is not implemented

(20261108-continuous-arena-battle, 2026-11-08) Three mechanics passed their
tests and still did nothing in play:

- The **dodge** displaced about 60-110 mm per order while the hit test required
  a 220 mm lateral offset, so a dodge could never convert a hit into a miss —
  and it charged stamina for the privilege. The test asserted "a dodge moves
  you"; the spec wanted "a dodge saves you".
- The **tactic** overlay was never read by the continuous controller, so moving
  the cup onto the new engine would have silently deleted the player's only
  coaching choice. Two cup tests asserted the *property* that tactics change
  outcomes, which is why the regression surfaced instead of shipping.
- **Flank and rear damage bonuses** were unreachable the moment facing was
  about to snap to the opponent: with instant lock-on nobody can be hit from
  the side. Fixing it meant making facing ease at a bounded turn rate.

Lesson: for every mechanic, write the assertion in the player's terms ("this
action changes the outcome"), not the implementation's ("this action changes a
variable"). If the two differ, the mechanic is decoration.

## 14. Retargeting playback is not retargeting animation

(20261108-continuous-arena-battle, 2026-11-08) The dense stream made the client
render where the simulation says the bodies are, and the fight still looked
wrong: hitstun had no pose, the dodge was a fast slide, knockback skated, and
the models' bulk disagreed with the simulated radius and height. Rendering the
correct positions is one job; giving the new states an animation vocabulary is
another, and it needs its own track.

Two concrete traps from the same work:

- **Two writers to one field is a pop.** The legacy choreography nudged
  `fighter.stage` on every impact while the stream also assigned it each frame,
  so bodies jumped out and snapped back. Ownership of a field must be explicit
  and singular — one boolean on the step contract, not a convention.
- **Bounds and the painted ring must be the same number.** The simulation
  arena was ±4,000 x ±3,000 mm while the floor ring was far smaller, so fights
  visibly happened outside the paint. Any world-space constant that appears in
  both the sim and the art is a coupling, and it needs a test.

## 15. A gate that cannot see the lever is not a gate

(20261109-battle-balance, 2026-11-10) The roster re-tune failed twice before it
worked, and both failures had the same cause: the balance report measured every
species by clamping one reference line (`189/10/10/10`) into that species' roll
bounds. A species' stats therefore only reached the fight when its bounds
excluded 10, so two species whose bounds straddled 10 were measured as the same
creature. Three phases were spent tuning a measurement that could not see the
thing being tuned.

What the blindness produced:

- **A wrong conclusion that read like an insight.** "The spread is not in the
  stat lines, it is kit shape" was true *of the harness*, not of the game. It
  sent the next phase into a 15-way round robin where a kit reorder moves every
  row by 10-40 points, which does not converge, and the phase correctly refused
  to ship a probe fit rather than fake it.
- **An instrument change is a legitimate deliverable.** The fix was a dozen
  lines in a script plus two tests - measure each species at the integer
  midpoint of its own bounds, keep the equal-investment line as a printed
  diagnostic that never gates - and the re-tune then converged in one phase to
  15/15 inside the band.

The rule: before tuning a system, prove the measurement moves when you move the
system. A test that shifts one species' bounds by 2 and shows its measured win
rate move is worth more than any amount of searching. And when a phase reports
"this cannot be reached", the first hypothesis should be that the instrument is
blind, not that the goal is wrong.

Corollary: **refusing to ship a bad fit is the correct outcome.** Phase 11
returned `failed` with a clean tree and a measured explanation, which is what
made Phase 12 possible. A phase that had quietly committed the probe roster would
have poisoned every number after it.

## 16. A target met on average is not met

(20261109-battle-balance, 2026-11-10) Two separate places in this track had to
choose between an honest miss and a comfortable pass, and both times the honest
miss was right.

- Phase 10's first pass landed 33.8% cap share against a 33.3% bound and 66.2%
  knockout against 66.7% - half a point outside on 840 fights, well within one
  standard error. Softening the damage-spread floor from `base/8` to `base/16`
  closed it. "Within one SE" is how a regression gate becomes decorative.
- Phase 4 relaxed a knockout-majority assertion to "at least half" to absorb a
  7/7 split. That was caught and reverted to a strict guard marked `test.failing`,
  so the miss stayed visible instead of becoming the new definition of passing.

The related trap is a statistical gate whose slack is wider than its target. A
95% test over 112 games per species now derives its error from distinct fights, which are 21-34
of 112, so the slack is 17-21 points and a species can
"pass" at 42% when the design band is 45-55%. Keep both numbers in the output:
the gate is what CI enforces, the band is what the game wants, and a report that
prints only the gate is lying by omission.

Two more from the same track worth remembering:

- **A damage band that only holds before positional multipliers is not a band.**
  Flank (1.25x) x rear (1.5x) x counter (1.25x) stacks to 1.875x, so a 12% base
  hit reaches 21.7%. That is fine - it is an earned-angle reward - but it has to
  be stated, or the next person reads 12% as the ceiling and is wrong.
- **Diversity is part of balance.** With accuracy near-decorative (94-100%
  effective) only 9.5% of ordered pairings change winner across seeds, and one
  species produced 4 distinct fights in 112. A row like that is four coin flips
  with a standard error printed beside it; it cannot be balanced and should not
  be reported as balanced.

## 17. A measurement you cannot make is a finding, not a number to fudge

The balance gate computed a binomial standard error from the game count - 112 fights per
species - while one row contained only 6 distinct fights. The printed error said 4.7
points; the real spread was plus or minus twenty. The row passed, and the pass was luck.

Two rules came out of it. First, the error must come from the effective sample: derive it
from the distinct-fight count, state a floor below which a row cannot be judged, and make
an unverified row **fail** the gate. A gate with an escape hatch is worse than a gate that
says no, because the escape hatch is invisible in the summary line.

Second, and more useful: if a species cannot be measured, that is a finding about the
game, not a defect in the harness. A slow tank's fights reach the time cap, a cap decision
is made on HP percentage, and HP percentage is near-deterministic - so the seed barely
matters and six coin flips get dressed up as a sample. The honest output is a named
unverified row with the reason attached, and the real fix is a design answer (mobility, a
closing move, a cap rule that is not a near-tie), not a stat nudge. Raising that species'
attack far enough to end fights by knockout overshot the win-rate gate before it satisfied
the distinct floor, which is the signature of a design problem wearing tuning clothes.

## 18. Pace is a global lever, and identity outranks a pacing bound

Restoring a frail species to frailty dropped the share of fights inside the 25-40 s window
from 52% to 46%, and the obvious local fix - more defence on the two fastest killers - did
nothing: their own win rates moved 25-38 points and the band stayed pinned at 46.0%. The
mass of fights sat just under 25 s across the whole matrix, so only a global lever moved
it. Scaling the entire authored damage ladder down together, staying inside the frozen 4-12%
band and keeping the tier order, took the band to 54.5%.

The lesson is about which direction to reach for. A per-species lever moves that species'
row; a per-system lever moves the distribution. When a distribution statistic is wrong, look
for a lever that touches every fight before you touch one creature. And when the two
conflict - a frail creature shortens fights, and a pacing bound wants longer ones - identity
wins: giving a glass cannon a tank's HP to satisfy a duration target is the same error as
deleting the invariant that says it is frail, only quieter. Replace the fragile bound
instead: a floor on the single fastest fight in an 840-fight sample is a target that invites
propping up an archetype, where a fifth-percentile floor says the same thing without
demanding that no fight ever be quick.

## 19. A win condition you call a failure will be balanced away

The pacing metric was `resolvedInBand`: the share of fights that ended by knockout inside
25-40 s. It read 23.1% and the team spent a phase compressing the authored ladder to move
it, reaching 41.0% while cap share, knockout share and the median were all already healthy.
The metric was wrong, not the game: a cap decision is how a tank wins, and counting it as
"did not resolve" made a legal archetype a defect. Worse, the fix for a metric like that is
always to weaken the archetype - the ladder compression was already trimming the heavy tier
that the tank's durability exists to survive.

For the record, the ladder compression was made *for* `resolvedInBand`, the metric this
learning calls wrong, and it was kept afterwards because the pacing targets it moved were real.
That is the honest sequence: the work was right, the target was not.

The rule: before optimising a metric, ask what behaviour it *rewards*. A metric that can only
be improved by deleting a legitimate strategy is a specification bug. The replacement kept
the parts that were true (a median inside the window, a floor on the fastest fifth, cap share
bounded) and added the part that was missing (an outlasting win counts when its HP margin
clears a floor, so a coin-flip cap decision does not count as decisive). Cap share 30.0%,
decisive share 92.4%, median 31.21 s, and the gate went green for the first time - with no
ladder change beyond what the honest numbers had already asked for.

The corollary is about honesty in the other direction: a green gate is not a balanced roster.
Twelve of fifteen species still sit outside the 45-55% design band, and they pass because the
interval is 24-28 points wide - distinct fights are 12-20 of 112. A gate that passes a 26.8%
row is telling you it cannot see, not that the row is fine. Print the number on every row so
nobody can mistake a wide interval for a balanced creature.

## 20. A stat that scales three systems at once taxes the archetype it describes

SPD in this engine drives walk speed, recovery (`recoveryMsFor` = `recoveryMs * 10 / spd`) and
the dodge threshold. At `spd 4` that is 2.5x recovery on every attack, so the roster's tank
walked at 460 mm/s *and* waited two and a half times as long between swings. Measured on seed 1
it closed to a 988 mm median gap - reach was never the problem - and still lost the exchange 8
blows to 10, and 1 blow to 11 against a neutral opponent, with its own poise bottoming at 0
while the opponent never dropped below 16. The loop is self-reinforcing: fewer swings, so it
loses the exchange, so it lives in hitstun and poise break, so its commits are refused, so it
swings less.

The fix that worked was the one field SPD does not scale: `startupMs` 600 -> 512 on the single
move it actually commits to, which took the row from 26.8% to 39.3% without touching recovery,
power or pacing. Two lessons. First, when one stat feeds several systems, a creature defined by
having little of it is penalised several times over, and the honest fix is to attack the
multiplication rather than the number. Second, a row can go green on pairings other than the one
that produced the diagnosis: the hound matchup improved from 8/10 to 10/12 blows, while the
axolotl matchup stayed at 1 blow to 11, because there the tank's swings are *evaded* rather than
*interrupted* and a shorter wind-up buys nothing. Record the matchup you diagnosed, not just the
row you moved.

## 21. A client that cannot tell two events apart needs one bit, not a redesign

The review asked the client to render a dodge roll sometimes and a cut
(slip) other times. The client only sees positions, so a 60-91 mm overlap
band made the two indistinguishable - and a test with 100 controller seeds
proved no threshold separates them: it is information-theoretic, not a
tuning problem.

The answer was one spare bit on the stream's phaseT word plus a 1-based
move index riding above the phase bits: an additive export, 9 fields stay
9, the replay hash byte-identical (0xc579e9ae before and after). The rule
generalises: when the consumer provably cannot derive X from the channel,
add the cheapest explicit signal that carries X - and the proof that it
cannot be derived is part of the evidence, so nobody "simplifies" the bit
away later. Cost of the alternative on the table (move-id export for
honest wall tells) was one more small export; taken only if the review
demands it, since the current longest-reach reading is a documented
approximation, not a leak.

## 22. A dead zone is a switch, not a dial - because the interval is tested where the blow lands

Minimum reach looked like a knob: author 1,200 mm on long moves and fighters
learn to respect it. It is not. The interval is tested at the gap the blow
resolves at, so the *effective* blind spot is `minReachMm + closing x startup`,
which is 100-250 mm wider than the authored number for the fastest rows. The
first sweep therefore went from "no dead zone" at 0 mm to 14/14 cap and 79% idle
at 1,200 mm, and the smallest positive integer the validator accepts - 1 mm -
already moved three species 8-13 points. Measure a mechanic's real range before
promising a tuning curve.

## 23. When a gate cannot measure the change, fix the gate first

The 14-fight telemetry fixture read 7/14 caps and then produced a
non-monotonic answer to a monotonic change: 50 mm -> 10/14, 150 -> 9/14, 300 ->
8/14, 400 -> 10/14, while the 840-fight matrix said 23.5% throughout. The
mechanic was not chaotic; the sample was. Widening to 42 fights (the same 14
pairings x 3 seeds, so the first fight still matches byte for byte) and
re-deriving all thirteen bounds with before/after figures turned the same
question into a clean window: ~85-99 mm is accepted, 100 mm fails balance by one
win, 75 mm fails telemetry by one fight. The approved exception to "never widen
a bound" is the sample and its re-derivation - not the ceiling that a later
mechanic trips.

## 24. Refusing a shot costs a ranged kit its damage, so answer the blind spot by firing backwards

With the chooser refusing every move whose active-frame gap fell inside the
inner edge, `voltfox` fell to 32.1% - 3.8 standard errors below even - because a
ranged kit told "not from here" has nothing else to do with its startup. The fix
that unblocked the whole track was not a wider band or a smaller dead zone: it
was letting the commit *give ground* so the launch opens outside the inner edge,
with a step back as the fallback and the basic as the last resort. Whenever a new
geometric rule removes an option, ask what the fighter does instead - the answer
is usually an intent the controller already has, pointed the other way.

## 25. A fixture that replays one pairing three times measures its own composition

The 42-fight telemetry gate read 59.5% cap while the 840-fight matrix read 26.7% on
the same tree. Nobody had written down that the walk was `away = (i * 5 + 7) % 15`
with `gcd(5, 15) = 5` - so only **three** species ever appeared on the away side -
and `SEEDS_PER_PAIRING = 3`, so the ten pairings that stalled each contributed
**three** caps. The gate was not measuring the game's pacing; it was measuring how
often ten chosen matchups were replayed. Re-composing it to 42 *distinct* pairings
(one seed each, a written stride-11 rule, a pin that proves distinctness, no
mirrors and coverage) read 47.6%, and the remaining gap to the matrix turned out to
be a second, unrelated property: the harness fights reference-stat bodies while the
matrix fights each species at its bounds midpoint. Two lessons. First, before
believing a fixture's number, count how many distinct samples it actually draws -
a repeated pairing is a weighting, and a weighting set by a modulo is invisible
until someone looks. Second, when a gate and a broader measurement disagree by more
than a few points, one of them is measuring something else; find out which before
you tune anything to satisfy either.

## 26. A species that wins by outlasting is not a stall to fix

The tortoise was a side in fifteen of twenty-five time-outs, and the obvious read
was "it cannot close". Six identity-preserving rungs later the read was wrong:
every green configuration resolved **zero** of its nine collapse fights, and the
cheapest rung that resolved even one pushed it to 65.2% on the 840-fight matrix.
The species was already at 52.7% *as an outlaster*, and the project had long ago
ruled that a cap win is an outlasting win - so its caps were the design working,
and "fixing" them meant deleting the thing that makes it a tortoise. Two habits
worth keeping. Write the identity fence **before** the fix, as a test that passes
on the untouched tree (`spd` exactly `[3, 5]`, `temperament`, `archetypeId`, its
own six moves); it turns "don't lose the identity" from a vibe into a build
failure, and it is what made withdrawing the fix cheap instead of embarrassing.
And when a gate fails, check whether the thing it is complaining about is a
feature with a cost before treating it as a defect - the honest fix may be the
measurement, not the species.
