# Battle Sim Consolidation & Rebalance — Implementation Plan

**Track ID:** `battle_sim_consolidation_20261013`
**Spec:** [spec.md](./spec.md)
**Branch:** `battle_sim_consolidation_20261013`

## Reading this plan

Per `conductor/workflow.md`, each task follows: mark `[~]` → failing tests
(logic-bearing work only) → implement to green → refactor → `bun run verify` →
commit + git note → record the commit SHA here. Every phase ends with the
Phase Verification & Checkpoint protocol (test coverage audit, automated
`bun test`, a manual verification plan, and user sign-off before the
checkpoint SHA is recorded).

Commands used throughout:

```bash
CI=true bun test packages/sim          # fast sim suite while iterating
CI=true bun test                       # full suite
bun run verify                         # types + tests + lint — definition of done
```

Phase notes capture what actually changed, especially any test whose expected
values had to move and *which FR* authorized it.

---

## Phase 0 — Safety net: pin current behavior before touching anything

Purpose: Parts A and B must be provably behavior-identical, so the exact event
streams have to be pinned *first*. This is the one place where a test is
expected to pass both before and after the refactor — its job is to be the
witness, not a red phase.

- [x] Task: Add a seeded battle event-stream contract test (new `packages/sim/src/battle/clock.contract.test.ts`) `f9f3793`
  - [x] Cover all three archetypes (draconic, bovine, axolotl) × kit tiers 2/3/4 × both tactics × both temperaments worth covering, over a fixed seed batch — 27 golden cases / 216 battles; matrix is 3 mirrors + 3 cross-element pairings (both side orders) × kit tiers 2/3/4 × 4 tactic pairings × seeds `[11, 29, 47]`
  - [x] Assert a stable digest of the full `BattleEvent[]` stream per case (kind order, damage, hpAfter, reaction, line copy), so any behavioral drift fails loudly — FNV-1a over a canonical serialization of every event field
  - [x] Ensure the chosen seeds actually exercise **both** heavy-hit paths: a projectile heavy hit (including a super-effective one) and a melee basic heavy hit — see the deviation below
  - [x] Confirm the test is fast (target: well under 1s for the whole matrix) — 197ms for the file
- [x] Task: Confirm existing save compatibility coverage exists for the shapes this track may touch
  - [x] Verify `packages/sim/src/save/save.test.ts` + `cupSession.test.ts` already round-trip a session with verdicts — confirmed; `cupSave.test.ts` and `cup-contracts.test.ts` cover the session shape too
  - [x] Record the baseline: `SAVE_VERSION` is 9 and no new save field is planned (spec FR4 rationale)
- [x] Task: Commit the safety net (`test(battle): pin seeded event-stream contract before core consolidation`) and attach a git note — `f9f3793`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: ab894d2]`

### Phase 0 notes

**Deviation from the task list (resolved, not deferred).** The plan asked the
matrix to exercise the melee-basic heavy hit. It cannot: the innate Strike's
best attainable damage (7, at max ATK vs min DEF across every starter pairing)
never reaches the lightest heavy threshold (`0.35 × 38 HP = 13.3`). The
duplicated melee block in `clock.ts` is therefore defensive code in practice.
Resolution: the matrix asserts projectile-path coverage (stagger, knockback,
downs — all present), a new test pins the unreachable arithmetic over the real
`statBounds`, and the melee rules stay pinned by the synthetic-stat unit tests
already in `clock.test.ts` (fraction stagger, knockback, no-stack, grace,
downing blow). Phase 1 must still route the melee path through the shared
helper — this is a dedupe obligation, not a coverage one.

**Second finding (design input for Phase 1).** The super-effective stagger branch
only fires on cross-element matchups, so a mirror-only matrix would have left
half the heavy-hit rule unpinned. The matrix mixes both on purpose.

---

## Phase 1 — Clock core consolidation (FR1, FR2)

The drift-risk removal: one heavy-hit rule, one event-construction path.

- [x] Task: Write failing/red tests for the shared heavy-hit rule
  - [x] Table-driven cases: heavy by damage fraction; heavy by super-effective fraction; grace-blocked heavy (reaction must report the actual outcome, not the raw heaviness); downing blow (never staggers); already-staggered victim (never re-locks); near-victim knockback (both fighters go far); far-victim knockback (no-op) — `packages/sim/src/battle/heavy-hit.test.ts`
  - [x] Each case exercised through **both** the projectile path and the melee-basic path, asserting identical rule outcomes — a two-row path table (`melee` / `projectile`) tuned to deal *identical damage*, so only the rule differs
  - [x] Run and confirm the new tests fail before implementation — **deviation**: a behavior-preserving dedupe has no red phase (same as Phase 0). See the phase notes; the typeless-strike guard is the test that catches a *wrong* dedupe.
- [x] Task: Extract the shared heavy-hit rule in `packages/sim/src/battle/clock.ts`
  - [x] Signature takes the attacker, the victim, the damage, the type factor, and the hit's own `kind` / `moveId` / `line`
  - [x] Apply heaviness test, stagger grace gate, knockback range shift, and push the `stagger` / `knockback` / `down` events
  - [x] Call it from `resolveShot` **and** `case "basic"` — the melee path passes the module-level `TYPELESS` factor (`1/1`) so the super-effective branch is inert (no simplified variant)
  - [x] Move the FR-tagged rule comments with the code they describe — both copies' comments merged into the one helper's doc comment
- [x] Task: Extract the `pushEvent(kind, partial)` helper
  - [x] Supplies the invariant `tick`, `actor`, `actorKey`, `hpAfter` fields
  - [x] Convert the event literals in the clock; event shapes, order and `line` copy unchanged — all nine literal sites converted; one `events.push` remains, inside `pushEvent` itself
- [x] Task: Verify behavior-identity
  - [x] The Phase 0 contract digests are unchanged — all 27 pass untouched
  - [x] `CI=true bun test packages/sim` green — 473 pass / 0 fail in 173ms
- [x] Task: Update phase notes — which tests moved, and why (expect: none) — none moved
- [x] Task: Commit (`refactor(battle): single heavy-hit rule and event-construction path in the clock`) + git note + record SHA
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: fc952f2]`

### Phase 1 notes

**Naming.** FR1 named the helper `applyHeavyHit`; it ships as `landHit`. The
helper also subtracts the damage and pushes the hit's own event (it has to:
the `reaction` hint is the rule's output, so the hit event cannot be pushed by
the caller without splitting the rule in half again). `landHit` says what it
does; `applyHeavyHit` would have read as "apply the heavy rule" while doing
three other things.

**Why `TYPELESS` is a constant and not an argument default.** A default of
`1/1` would silently let a future melee caller skip the chart. An explicit
named constant forces the melee path to state that the innate Strike has no
element, and `heavy-hit.test.ts` fails if that ever changes.

**Test count.** +3 tests, +1 file. No existing test moved or changed.

---

## Phase 2 — Cup seed extraction and double-KO advancement parity (FR3, FR4)

- [x] Task: Extract the cup match-seed formula
  - [x] Export `cupMatchSeed(day, round, pairingIndex)` in `packages/sim/src/cup.ts`
  - [x] Route all three call sites through it: the `rivalSeed` helper, the inline call in `resolvePlayerMatch`, and `seedFor` in `completeBracket`
  - [x] Existing cup seed/placement contract tests pass **unmodified** — the player's own match is pairing index 0 of its round, which the old inline formula already was, so the extraction is arithmetic-identical
  - [x] Note: the mid-file `battle` imports (`cup.ts` ~177–183) were **not** touched (outside the lines being changed — kept surgical)
- [x] Task: Write the failing/red test for double-KO advancement
  - [x] A drawn pairing where the higher-`finalHp` fighter is **not** `slotA` must place *that* fighter in the next round
  - [x] An exact final-HP tie still falls to the earlier slot; a forfeit verdict (`battle: null`) still advances `slotA`
  - [x] Confirmed red on today's code: `Expected: "Bravo" / Received: "Alpha"` — the sim advanced Bravo on 7 HP, the screen highlighted slotA
- [x] Task: Fix `advancingName` in `apps/client/src/bracket-model.ts`
  - [x] Use the sim's tiebreak when `verdict.winner === null`; call the newly exported name-level `doubleKoAdvancingName(verdict.slotA, verdict.slotB, verdict.battle.finalHp)`
  - [x] Keep the module pure and DOM-free; corrected the stale comment that claimed the `slotA` fallback *is* the sim's tiebreak
- [x] Task: Verify
  - [x] `bun test` = 817 pass / 0 fail; `bun run verify` green; no save schema change (`SAVE_VERSION` still 9, no `docs/save-schema.md` edit)
- [x] Task: Commit (`fix(cup): bracket advances the higher-HP fighter on a double-KO`) + git note + record SHA
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 5e95ce9]`

### Phase 2 notes

**Deviation — the client calls `doubleKoAdvancingName`, not `doubleKoWinner`.**
The plan called for `doubleKoWinner(a, b, verdict.battle.finalHp)`, but that
function is slot-shaped: it takes `CupSlot` objects. A stored `RoundVerdict`
carries `slotA`/`slotB` **names** plus `battle.finalHp` — no slots — so the
client cannot build the argument. Rather than duplicate the rule or cast fake
slots, the sim now exports the name-level primitive `doubleKoAdvancingName(a,
b, finalHp)` and `doubleKoWinner` delegates to it. One implementation, two
callers, same rule; the plan's intent (do not reimplement the tiebreak in the
client) is satisfied.

**The two local seed wrappers stay.** `rivalSeed` and `seedFor` remain as
one-line closures that bind `day`; the formula itself is now single-sourced in
`cupMatchSeed`. Inlining six call sites would trade a named helper for longer
argument lists and buy nothing.

**Red-phase record.** The double-KO test is a genuine red → green. Two fixture
corrections came first: the bracket walk pairs slots (0,1) and (2,3), and a
4-slot plan is `qf1, qf2, sf1` — so the semifinal is `matches[2]`, not
`matches[1]`.

---

## Phase 3 — Rebalance: make tactics matter (FR6, FR7; FR5 withdrawn)

This is the phase with a genuine red stage: the threshold test must fail on
the measured balance before any fix lands.

**Scope revision (2026-10-13, user-approved).** The BEFORE probe contradicted
learnings #10: `specials` won 80.8% of mirrors (not lost them) because
`balancedQualifiers()` only admits KO/SE specials — unreachable in a neutral
mirror — so Balanced degenerated to a pure Striker while Specials fired its
kit every window. FR5 (Strike 4→3) was withdrawn and the `balanced` qualifier
rule was brought into scope: both tactics now read the same sustained-score
bar (`kitSustained ≥ strikeSustained`), Balanced as a third qualifier alongside
KO/SE, Specials as its fallback gate — and each tactic ranks the ready kit by
its own objective (expected damage vs sustained per window).

- [x] Task: Build the deterministic probe and capture the BEFORE numbers
  - [x] Probe matrix: 3 archetypes × kit tiers 2/3/4 × 4 tactic pairings × 6 battle seeds = 216 mirror battles (matrix narrowed from "200 seeds" to 6 seeds × cells — same cell coverage at seconds of runtime), plus a cross-element matrix (432 battles) and a varied-stats pass (rival rolls its own creature seed)
  - [x] Record per-tactic mirror win rates and the draw rate
  - [x] Saved the before report into this track folder (`probe-before.md`) — RED: specials 80.8% win / 20.4% draws, balanced 25.5%
  - [x] Narrowing recorded: 6 battle seeds per cell instead of 200 distinct seeds
- [x] Task: Write the failing/red threshold test
  - [x] Every tactic within the 25–60% mirror win-rate band
  - [x] Draws below 20%
  - [x] Ran and confirmed it failed against the pre-FR6 balance (specials 80.8% out of band)
- [x] Task: ~~Apply FR5~~ — **WITHDRAWN** (spec amendment): the probe showed the Strike is the only attack Balanced could legally make, so nerfing it would widen the gap. `BASIC_MOVE.power` stays 4; `moves.test.ts` pin `toBe(4)` untouched.
- [x] Task: Apply the revised FR6 in `packages/sim/src/battle/policy.ts`
  - [x] Sustained score per ready special: `expected / (1 + cooldown)` (`kitSustained` sums the equipped kit, skipping the basic)
  - [x] Strike baseline: the same computation with type factor `1/1`, 100% accuracy, cooldown 0 (`strikeSustained`)
  - [x] Under `specials`, fall back to the existing `far ? CLOSE : BASIC` path when the best ready special does not beat the baseline
  - [x] The finisher override (any ready special that would KO) is evaluated first and never suppressed
  - [x] **Revised**: the `balanced` tactic's qualifier rule gained a third qualifier — fire the ranked special when the kit out-sustains the Strike (same bar, shared definition). KO/SE qualifiers keep priority, preserving the tactic's elemental identity.
  - [x] **Revised**: per-tactic ranking — `rankExpected` (expected → power → id) for `balanced`, `rankSustained` (sustained → expected tiebreak) for `specials`
  - [x] Tests: wall fixture (2-move kit sustaining 0.95 vs Strike 1) proves fallback triggers and does not when the kit out-sustains; finisher still fires; regression guard "the two tactics rank one kit differently" (`blaze_bolt` vs `flame_charge`)
- [x] Task: Re-run the probe and record the AFTER numbers (`probe-after.md`)
  - [x] All tactics inside the 25–60% band in both matrices (mirrors 51.5/48.6; cross 50.0/50.0); 40-tick stalls 0% on the varied pass; the frozen-mirror non-decisive rate (37%) is entirely double KOs between stat-identical twins — 0 timeouts, 0 stalls
  - [x] Thresholds met without touching specials' powers, cooldowns, accuracy, the type chart, or species bounds — no second re-scope needed
- [x] Task: Commit (`fix(battle): per-tactic move ranking and the sustained-score qualifier on Balanced`) + git note + record SHA
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 8e6b7ca]

### Phase 3 notes

**The first cut of FR6 converged the tactics.** With both tactics reading the
same bar and the same expected-damage ranking, every mirror produced
byte-identical streams — the coach's pick was cosmetic. The fix was the
ranking split (Balanced ranks by expected damage, Specials by sustained
per-window), framed by Pokémon's trainer-AI modules (Strong AI maximizes
damage; Basic AI gates ineffective moves): same information, different
objective, different move.

**FR8 sweep (partial — Phase 4 lists the rest).** Authorized expectation
updates this phase: `clock.contract.test.ts` GOLDEN recaptured (all mirrors +
fire/plant + ox/axolotl cells moved; fire/water kit2 both directions kept
their streams); `resolver.test.ts` one-sided KO finalHp `Bolt: 34 → 36`
(Reed's reply is Thorn Volley 4, not Bramble Dart 6, under sustained
ranking); `cup-contracts.test.ts` draw golden (QF1 seed 101 is now a
double-KO — the FR4 tiebreak's first golden exercise; seed 19's QF4 double-KO
moved off) and the player-lifecycle goldens (seed 1 no longer wins the cup —
re-pointed to seed 17, pinned under BOTH tactics as the day-7
tactic-invariance guard; seed 2 replaces seed 1 for the SF-exit shape; seed
6/101/forfeit champions renamed); `cup.test.ts` champion property test now
derives the champion through `doubleKoAdvancingName` when the final pairing
double-KOs; `cupSession.test.ts` two "tactic must matter" tests pass the full
species kit (a fresh baby's 2-move equal-cooldown kit makes the tactic
unobservable — divergence needs a cooldown-2 move); `bracket-model.test.ts`
champion-run and resultRows tests moved to seed 17.

**Full gate after the sweep:** `bun run verify` — 834 pass / 0 fail, types
clean (voxel 51, sim 53, client 89 files), biome 200 files, determinism gate
byte-identical.

---

## Phase 4 — Ripples: fixtures, docs, and the player-facing check (FR8, FR9, FR10)

- [ ] Task: Reconcile tests that pinned pre-rebalance numbers (FR8)
  - [ ] Sweep `clock.test.ts`, `resolver.test.ts`, `policy.test.ts`, `moves.test.ts`, `cup*.test.ts`, and client `hud.copy.test.ts` for damage/stagger/outcome expectations
  - [ ] Update only what FR5/FR6 authorized; each edit carries a comment naming the FR
  - [ ] List every changed expectation in the phase notes
- [ ] Task: Documentation (FR9)
  - [ ] Append a resolution note to `conductor/learnings.md` finding 10: the fix chosen, the before/after probe numbers, and where the probe lives
  - [ ] Confirm `docs/save-schema.md` needs no change; if it does, document the migration
- [ ] Task: Ladder and cup ripple review (FR10)
  - [ ] A saved in-progress session loads and completes
  - [ ] A fresh cup still reaches a champion
  - [ ] Bronze promotions remain reachable for a well-raised creature
  - [ ] No ladder tuning changes — verification only
- [ ] Task: Manual verification note (workflow phase protocol)
  - [ ] Agent browser check first: open the app, run a spar to completion, capture a screenshot, confirm the console is clean
  - [ ] Then present the user with: run a full weekly cup in the browser, confirm the bracket reveals in order and the champion screen shows, with no console errors
- [ ] Task: Full gate: `bun run verify` green, suite runtime unchanged or faster
- [ ] Task: Commit (`docs(battle): record the tactic rebalance in learnings`) + git note + record SHA
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

---

## Phase 5 — Close the track

- [ ] Task: Update `metadata.json` → `status: "complete"`, record the closing commit base
- [ ] Task: Mark the registry entry in `conductor/tracks.md` as `[x]` with the final title
- [ ] Task: Record phase checkpoint SHAs and per-phase outcomes in this plan
- [ ] Task: Commit (`conductor(plan): mark track 'Battle Sim Consolidation & Rebalance' complete`)

---

## Open questions to resolve during implementation

- Does the 200-seed × full-kit matrix stay inside the suite budget? (Phase 3
  task 2 — narrow the matrix rather than the time budget.)
- Does the threshold band need an archetype-specific exception for bovine
  (learnings #10 notes ox kit2/3 mirrors stall into 40-tick draws)? Resolve with
  the user if the draw rate cannot reach <20% for bovine without changing the
  `balanced` rule.