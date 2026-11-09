# Phase 9 — Hit Reactions

- **Track:** `20261108-continuous-arena-battle`
- **Phase:** 9 (Hit Reactions) — FR-22, FR-23, AC-22, AC-23
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base:** `180dfb043f48d39488d1fc17c671733eb2e48a57`
- **Head:** `8113ead20af0a89036b100c4ed4ffbf57e482592`
- **Result:** verified

## What landed

A landed blow now transfers force. Before this phase a hit was an HP deduction
and a poise deduction, so a fighter could only reach the fence by walking
there; now the fence is a threat and the arena's width matters.

- **`battle/continuous/impulse.ts` (new)** — the whole mechanic, in one module:
  - `massOf(radiusMm, heightMm)` derives mass from body volume
    (`radius² × height / 1000`, floored, at least 1). No species mass column.
  - `knockbackVelocity(dir, poiseDamage, mass)` adds velocity along the blow
    line, linear in poise damage and inverse in mass.
  - `blowDirection(from, to)` — attacker centre to victim centre at blow time
    (the same integer unit direction projectiles already use).
  - `reactToBlow(fighter, dir, poiseDamage, broke)` — the single seam: adds the
    push to `vel` and opens hitstun with `max(remaining, new)`, never a sum.
  - `decayVelocity` (half per step, truncated toward zero) and
    `advanceHitstun` (one step closer to zero, identity at zero).
  - `isStunned`, `openingHitstun`, `HitstunFields`.
- **`types.ts`** — `FighterState.hitstunMs` (ms of fight time, FR-23).
- **`movement.ts`** — `integrate` now also reports which axes it clamped
  (`FencePin`), and `moveStunned(fighter, bounds)` is the stunned step: integrate
  the knockback, then decay it and serve one step of hitstun. Intent never runs
  on a stunned step, so intent and impulse cannot fight inside one step.
- **`advance.ts`** — `applyIntent` takes the stunned branch first (order ignored,
  dodge not paid, the clamped axes pushed onto `StepOutcome.pinned`), and
  `settleMeters` passes the blow direction into the existing single
  `hit(key, poiseDamage, damage)` closure: melee uses the pre-step centre line,
  a shot uses its own `dir`. No second damage path.
- **`step.ts`** — `hitstunMs` in `stateHash`, `openingHitstun()` in
  `openFighter`, `pinned` passed through `advance`, and `commit` refuses while
  stunned. Note that `settleMeters` already cancels an attack only on a poise
  break (FR-9) and on a startup interrupt (FR-6): hitstun does not cancel an
  attack in active/recovery, as the brief requires.
- **`projectile.ts`** — `ShotReport.dir`, so a shot's knockback direction is
  readable from the step that landed it.
- **`impulse.test.ts` (new)** — unit and fight-level tests below.

## Constants chosen and why

| Constant | Value | Why |
| --- | --- | --- |
| `MASS_VOLUME_DIVISOR` | 1000 | `radius² × height` is mm³; dividing by 1000 gives whole units. The π is dropped because only mass ratios matter. The default body is 43,560 units; the roster spreads over roughly 4×. |
| `KNOCKBACK_REFERENCE_MASS` | 43,560 | The default body (220 × 900), so a blow's push reads as its authored poise damage on an average fighter; heavier divides down, lighter scales up. |
| `KNOCKBACK_PER_POISE` | 1000 | Thousandths of a mm/ms, so one poise point is 1 m/s at reference mass. A basic blow (2 poise) gives the default body 2 m/s before decay. |
| `KNOCKBACK_DECAY_NUM/DEN` | 1/2 | A fixed half per step bounds the slide at 2× the impulse however hard the blow, and sheds the last mm well inside the window. Truncation (not rounding) guarantees the slide ends. |
| `HITSTUN_MS` | 100 | Five steps: one lost step of footwork, short enough to answer back in the same exchange. The step a blow lands spends one `STEP_MS`, so a blow suspends exactly 5 steps. |
| `BREAK_HITSTUN_MS` | 400 | Four times a plain hit (20 steps): a break reads as a real opening. Poise break already owns the attack cancellation; this is the body's helplessness on top. |

Measured slide from one basic blow (2 poise), five stunned steps:

- default body (220/900): 78 mm
- heavy (260/1250, draconic): 40 mm — tens of mm
- light (180/650, heron): 160 mm — low hundreds

That is the AC-22 spread: the same blow, three bodies, three distances.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-22 | Heavy and light bodies struck by the same blow travel different distances (heavier less) | `impulse.test.ts` › "the same blow slides a heavy body less than a light one" (heavy < 100 mm, light > 100 mm, light > heavy); "mass follows the body and never reaches zero"; "the push follows the blow line and is inverse to mass" (doubling damage doubles the push, doubling mass halves it) | pass |
| AC-22 | A body knocked at the fence stops at the boundary and never crosses | `impulse.test.ts` › "a body knocked into the fence stops at it and is reported pinned" (max x equals the wall, final x equals the wall, `vel.x` zeroed); "a cornered fighter's pinned step is on the outcome" (five steps, max x equals `maxX`) | pass |
| AC-22 | A body with no room to retreat is observable as pinned | `StepOutcome.pinned: readonly PinnedReport[]` (`key`, `x`, `z` axes) and `impulse.test.ts` › "a cornered fighter's pinned step is on the outcome" asserts `{ key: "away", x: 1, z: 0 }` on the landing step | pass |
| AC-23 | Struck fighter does not move under its own intent for the hitstun window | `impulse.test.ts` › "a stunned victim ignores its order, cannot commit, then resumes" (orders `WEST` every step, x never decreases across the window) | pass |
| AC-23 | Cannot commit a new attack during it | same test: `fight.commit(1, "basic")` is `false` while stunned; `step.ts` guard is `isBroken \|\| isStunned \|\| !canCommit` | pass |
| AC-23 | Resumes the step after it ends | same test: after `(HITSTUN_MS - STEP_MS) / STEP_MS` stunned steps `hitstunMs` is 0, and the next step moves west under the same order | pass |
| AC-23 | Broken fighter suspended longer than merely struck | `impulse.test.ts` › "a broken fighter is suspended longer than a merely struck one" (80 vs 380 after the landing step = 5 vs 20 suppressed steps); "a break suspends the victim longer than a plain hit"; "a second blow does not stack the window" (100 stays 100, never 200) | pass |
| FR-22 | Shots push along the line they flew | `impulse.test.ts` › "a shot knocks the victim along the line it flew" (`shots[0].dir` is the shot's direction, victim stunned) | pass |
| FR-1 | Determinism | `impulse.test.ts` › "hitstun is part of the state hash"; "the same blows replay to the same hashes"; `bun run gate:determinism` byte-identical | pass |

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Typecheck + tests + lint + determinism | `bun run verify` | 0 | 3,725 pass, 1 skip, 0 fail, 443,171 expect() calls, 346 files, 48.43 s; Biome clean on 862 files; determinism gate byte-identical (46 species stages + 5 props) |
| Build | `bun run build` | 0 | Vite 8.3.4, 385 modules, 368 ms; chunk-size warning only (`index` 1,019.49 kB) |

## Deviations

| File | Reason |
| --- | --- |
| `packages/sim/src/battle/continuous/step.ts` | Allowed by the brief if reported: `hitstunMs` must be hashed, fighters must open with 0, `commit` must refuse a stunned fighter, and `pinned` must reach the caller. |
| `packages/sim/src/battle/continuous/projectile.ts` | `ShotReport` needed `dir` for a shot's own blow direction; two field assignments. No resolution change. |
| `packages/sim/src/battle/continuous/poise.test.ts` | Fighter literal gained `hitstunMs: 0` (the new required state field). |
| `packages/sim/src/battle/continuous/projectile.test.ts` | Same helper churn. |
| `packages/sim/src/battle/continuous/stamina.test.ts` | Same helper churn. |
| `packages/sim/src/battle/continuous/strike.test.ts` | Outcome re-pin forced by the change: the recovery-counter fixture now needs its eighth step, because the victim's earlier blow leaves the attacker in hitstun through step 7 and the commit would be refused. |
| `packages/sim/src/cup-contracts.test.ts` | Outcome re-pin forced by the change (four rows, below). |
| `packages/sim/src/cup.golden.test.ts` | Outcome re-pin forced by the change (forfeit path, below). |
| `packages/sim/src/cupSession.test.ts` | Fixture re-pin forced by the change: the final-loss sweep covers the aggressive tactic, because no balanced seed in 1..60 loses the final any more. |

`battle/resolver.ts`, `battle/clock/`, `battle/frames.ts`, `battle/moves.ts`,
`battle/policy.ts`, every `*.balance.test.ts`, `controller.ts`, `report.ts` and
`resolve.ts` are untouched.

## Outcome re-pins (only what the change forced)

The Ash-ledger vs Mossbottom Brute pairing now goes to Mossbottom Brute at both
day 7 and day 14, which moves SF2 and the final on the pinned seeds:

- `cup-contracts.test.ts` seed 101 rival winners: last row `Ash-ledger` →
  `Mossbottom Brute`; day-14 seed 101 the same.
- `cup-contracts.test.ts` seed 9 SF exit: champion `Ash-ledger` →
  `Mossbottom Brute`; final row `[3, "Gilded Horn", "Ash-ledger", "Ash-ledger"]`
  → `[3, "Gilded Horn", "Mossbottom Brute", "Mossbottom Brute"]`.
- `cup-contracts.test.ts` seed 101 forfeit: champion → `Mossbottom Brute`;
  final row → `[3, "Reedle Mirefin", "Mossbottom Brute", "Mossbottom Brute"]`.
- `cup.golden.test.ts` forfeit path (seed 101): champion → `Mossbottom Brute`,
  SF2 row and final row follow.
- `cupSession.test.ts` `eliminatedAt`: the sweep now tries `balanced` then
  `specials`, because knockback moved every balanced final-loss seed out of
  1..60. The QF-exit test still resolves on a balanced seed.

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 3,725 pass, 1 skip, 0 fail across 346 files; biome 862 files clean; determinism gate byte-identical |
| build | `bun run build` | 0 | Vite built 385 modules; only the pre-existing chunk-size warning |

Independently confirmed in code: `impulse.ts` (174 lines) derives mass as
`radius² × height / 1000`, pushes along `blowDirection` scaled by
`KNOCKBACK_PER_POISE` and divided by mass, and opens hitstun with
`Math.max(remaining, duration)` so it cannot stack; `advance.ts` takes the
stunned branch in `applyIntent` before any intent runs and reports `pinned`
axes on `StepOutcome`; `step.ts` refuses `commit` on `isBroken || isStunned`
and mixes `hitstunMs` into `stateHash`. `controller.ts` is still 12,158 B,
`report.ts` and `resolve.ts` are untouched, and no `*.balance.test.ts` moved.

**Not squashed:** the phase range holds the primary's playtest-protocol commit
(`3d8558c6`), which is not part of the subagent's work. Checkpoint is
`e98c3994`.

**`SIM_VERSION` ruling (resolving the subagent's flag):** leave it at 2. The
constant was introduced on this branch in Phase 8 and has never shipped, so no
bundle in the wild carries it; every ghost written on this branch is disposable,
and Phase 10 will move outcomes again. Bumping per phase would churn a marker
that only means something once the engine is final. The rule instead: `v2` is the
version the continuous engine ships under, and Phase 13's version-gate task
confirms the constant matches the shipped engine — no bundle written before the
merge is trusted.

**Measured spread (AC-22), same basic blow:** heavy draconic 40 mm, default body
78 mm, light heron 160 mm.

## Notes

- **Pacing is untouched.** Fight length, tactic overlays, controller and the
  cap are Phase 10's; this phase only adds force. Knockback does make exchanges
  more ranged, and the re-pins above are the visible symptom — Phase 10 should
  expect to re-tune on top of these values.
- **`SIM_VERSION` is still 2** and was not bumped: it is outside this phase's
  Touches and task list, but fight outcomes changed, so pre-Phase-9 ghost and
  replay bundles now carry stale results under a matching version. Flagged for
  the primary: either bump it in Phase 10 or record the decision.
- `controller.ts` untouched (12,158 B, 130 B headroom). New mechanics live in
  `impulse.ts`; `advance.ts` stayed inside the 12,288 B cap (enforced by
  `module-size.test.ts`, which passed).
- Hitstun is expressed in ms of fight time and counts down one `STEP_MS` per
  step, including the step the blow lands on — so `HITSTUN_MS = 100` suspends
  exactly 5 steps and the victim acts on the 6th.
