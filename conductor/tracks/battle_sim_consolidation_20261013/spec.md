# Battle Sim Consolidation & Rebalance

**Track ID:** `battle_sim_consolidation_20261013`
**Type:** refactor (with a balance-relevant behavioral change gated behind contract tests)
**Branch:** `battle_sim_consolidation_20261013`

## Overview

The deterministic battle core carries two problems that both live in the same
place and can be fixed together:

1. **Drift risk from copy-paste.** `packages/sim/src/battle/clock.ts` implements
   the heavy-hit → stagger / knockback / down rule twice — once in the
   projectile impact path (`resolveShot`, ~lines 345–409) and once in the melee
   basic path (`case "basic"`, ~lines 528–584). Any future change to the
   stagger grace gate or knockback must be made in two places, and only tests
   would catch a divergence. Separately, ~20 `BattleEvent` literals repeat the
   same `tick / actor / actorKey / hpAfter` preamble, and the cup seed formula
   `(day*97 + round*13 + i*7) >>> 0` is written three times in `cup.ts`.
2. **A known meta imbalance, documented and unfixed.** `conductor/learnings.md`
   finding 10 records that the typeless innate Strike (power 4, 100% accuracy,
   no cooldown) out-sustains every special — the best special's sustained
   output is Flame Charge at ~3.6 damage/action-window (expected damage ÷
   `1 + cooldown`) versus Strike's 4/window. Consequently "Favor Specials"
   never picks Strike and loses every mirror attrition race, while "Balanced"
   wins **100%** of drake and axolotl mirrors. The same finding names three
   candidate fixes and requires a seed-batch rebalance pass.

This track consolidates the core first (behavior-identical, proven by the
existing test suite), then spends that confidence on the rebalance, gated by a
deterministic probe matrix so the meta shift is measured rather than guessed.

### Context that motivates the balance fix

- Product: `conductor/product.md` frames battles as spectator events where
  the player's skill shows in preparation; a tactic that is *never* correct
  removes a preparation decision the player is offered.
- Design: `conductor/product-guidelines.md` — choice must matter, outcomes must
  be legible. A 100%-win tactic makes the tactic picker theater.
- Learnings #10 is an explicit open obligation: "Fix candidates … Any fix
  reshuffles the whole meta and needs its own seed-batch rebalance pass."

## Functional Requirements

### Part A — Core consolidation (behavior-identical refactor)

**FR1 — One heavy-hit rule in the battle clock.**
Extract the duplicated heavy-hit / stagger / knockback / down block from both
the projectile path and the melee-basic path into a single internal helper
inside `clock.ts`. The helper takes the victim, the attacker, the damage, the
current tick, and the type factor numerator/denominator; it applies the
heaviness test, the stagger grace gate, the knockback range shift, and pushes
the `impact`-adjacent `stagger` / `knockback` / `down` events. Because the
typeless basic strike uses type factor `1/1`, the super-effective branch
(`type.num > type.den`) is naturally inert for it — **the melee path must call
the same helper, not a simplified variant of it.**
Contract: for every seeded battle, the emitted `BattleEvent[]` stream must be
byte-identical before and after this refactor.

**FR2 — One event-construction path.**
Introduce a `pushEvent(kind, partial)` helper inside the clock that supplies
the invariant `tick`, `actor`, `actorKey` and `hpAfter` fields, so event
literals carry only their kind-specific payload. Event shapes, order, and
`line` copy strings are unchanged.

**FR3 — One cup match-seed formula.**
The seed expression `(day*97 + round*13 + i*7) >>> 0` currently appears three
times in `packages/sim/src/cup.ts` (the `rivalSeed` helper, one inline call in
`resolvePlayerMatch`, and `seedFor` in `completeBracket`). Extract one exported
`cupMatchSeed(day, round, pairingIndex)` function and route all three call
sites through it. Behavior-identical: existing cup seed/placement contract
tests must pass unmodified.

### Part B — The one behavioral bug fix

**FR4 — Double-KO advancement parity in the bracket UI.**
On a double-KO the sim advances the fighter with higher remaining HP
(`doubleKoWinner`, `cup.ts` ~510–518) and records `RoundVerdict.winner: null`
to preserve the draw for display. The client's `advancingName`
(`apps/client/src/bracket-model.ts` ~59–63) falls back to `verdict.slotA` on a
draw, so a drawn pairing can highlight the wrong fighter as advancing. The
comment there claims it is "the sim's tiebreak", which the code does not
implement. Fix: `bracket-model.ts` calls the **already-exported** sim helper
`doubleKoWinner(a, b, verdict.battle.finalHp)` when `verdict.winner === null`
and both slots are known, instead of falling back to `slotA`. No rule is
re-implemented client-side and **no save schema change is required** —
`RoundVerdict` already carries the `BattleResult` with `finalHp`.
Contract: `bracket-model.ts` remains pure and DOM-free; the round-label list
duplicated between `cup.ts` and `bracket-model.ts` is left alone unless it
falls out of the touched code for free.

### Part C — Rebalance: make tactics matter

**FR5 — Strike power 4 → 3.**
`BASIC_MOVE.power` drops from 4 to 3 (`packages/sim/src/battle/moves.ts`).
Strike stays the innate typeless melee basic with 100% accuracy and no
cooldown; only its power base changes. Rationale: sustained output 3/window
sits below the best special's ~3.6/window while keeping Strike a real fallback
(e.g. when no equipped special is ready, or when closing distance costs more
than the chip damage is worth).

**FR6 — Cooldown-DPS-aware "Favor Specials".**
`chooseAction` in `packages/sim/src/battle/policy.ts` gains a sustained-output
comparison. Each ready equipped special gets a sustained score
`expected / (1 + cooldown)` (expected = `damage * accuracy / 100`, as already
computed by `rankedReady`). The Strike baseline is the same computation with
the typeless factor `1/1`, 100% accuracy and cooldown 0. Under the
`specials` tactic, when the best ready special's sustained score does not beat
the Strike baseline, the fighter falls back to the existing no-special path
(`far ? CLOSE : BASIC`) instead of firing the weaker special. The finisher
override (any ready special that would KO, `policy.ts` ~126–132) is evaluated
**before** this comparison and is never suppressed. The `balanced` tactic's
qualifier rule is **unchanged**.

**FR7 — Deterministic probe matrix with thresholds.**
Add a fast test that sweeps mirror matches over a fixed seed batch of **200
seeds**, covering all three starter archetypes (draconic, bovine, axolotl),
the legal kit tiers (2, 3 and 4 specials), and all three tactic pairings
(balanced/balanced, balanced/specials, specials/specials), and asserts on
aggregate mirror win rates:

- no tactic wins **more than 60%** of its mirror matchups,
- no tactic wins **fewer than 25%** of its mirror matchups,
- draws stay **below 20%** of decided-and-drawn matchups.

The probe must run in the normal `bun test` suite (see NFR2). If the full
matrix proves too slow at 200 seeds, narrow the matrix (for example kit 4
only) rather than raising the time budget — and record the narrowing in the
plan.

### Part D — Ripples

**FR8 — Reconcile tests and fixtures that pin old numbers.**
Every test asserting pre-change behavior (clock damage/stagger expectations,
resolver golden values, cup seed contracts, policy expectations, any client
hud-copy expectations) is re-read and updated *only where the change is
intended*, each with a comment naming the FR that changed it. Tests that must
change are listed in the plan's phase notes.

**FR9 — Documentation.**
`conductor/learnings.md` finding 10 gains a resolution note: the fix chosen,
the probe numbers before and after, and where the probe lives. The spec/plan
of this track record the final thresholds. `docs/save-schema.md` is updated
only if the save shape actually changes — expected outcome: **it does not**
(`SAVE_VERSION` stays 9; confirm with a save round-trip test).

**FR10 — Ladder and cup ripple review.**
The rebalance changes rival-vs-rival verdicts, cup outcomes and therefore
ladder pacing. Verify: (a) a saved session in progress still loads and
completes; (b) a fresh cup still reaches a champion; (c) Bronze promotions
remain reachable with a well-raised creature. No ladder *tuning* changes are
part of this track — only verification that nothing is now unwinnable.

## Non-Functional Requirements

- **NFR1 — Determinism.** All work lives in the pure, seeded simulation. No
  new RNG stream, no wall-clock, no I/O. Identical inputs still produce
  identical event streams.
- **NFR2 — Speed.** `bun test` stays well under the project's 10-second suite
  budget, and the probe is fast enough to run on every commit.
- **NFR3 — Style.** Biome clean; `conductor/code_styleguides/typescript.md` and
  `general.md` respected; comments explain *why*, matching the density already
  used in `clock.ts` (the existing FR-tagged rule comments move with the code
  they describe).
- **NFR4 — No scope creep.** The staging/scene decomposition and the arena
  controller (the other two candidate tracks) stay out; this track touches
  `packages/sim/src/battle/*`, `packages/sim/src/cup.ts`,
  `apps/client/src/bracket-model.ts`, and the docs named in FR9.

## Acceptance Criteria

1. `bun run verify` (types + tests + lint) passes.
2. **Part A is provably behavior-identical:** a before/after comparison of
   seeded battle event streams shows no diff, and the existing clock, resolver,
   policy and cup tests pass unmodified by the refactor itself (before Part C's
   intended changes land).
3. The heavy-hit rule exists in exactly one place in `clock.ts`, called by
   both the projectile and the melee path.
4. The cup seed formula exists in exactly one exported function with three
   call sites.
5. `bracket-model.ts` resolves a double-KO's advancing fighter through the
   sim's exported `doubleKoWinner`, with a test covering a drawn pairing where
   the higher-HP fighter is *not* `slotA`.
6. `BASIC_MOVE.power === 3`, and the probe's mirror matrix passes the FR7
   thresholds: every tactic within the 25–60% band, draws under 20%.
7. The before/after probe numbers are recorded in the track folder and the
   resolution note is added to `conductor/learnings.md` finding 10.
8. `SAVE_VERSION` is still 9 and an existing save round-trips; no
   `docs/save-schema.md` change is needed (or the change is documented).
9. Manual verification note: a spar and a full cup run in the browser still
   play to a champion, with no console errors, at the new balance.

## Out of Scope

- The staging/scene/camera decomposition and the arena battle controller.
- Ladder re-tuning (Silver tier), breeding, boss rivals, new species.
- Buffing or re-typing catalog specials; only the innate basic changes power.
- Saving a probe report as generated artifacts in `artifacts/`.
- Any change to move cooldowns, accuracy, type chart, or the `balanced`
  tactic's qualifier rule. If the thresholds cannot be met without touching
  those, that is the signal to stop and re-scope with the user.