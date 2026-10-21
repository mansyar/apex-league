# Phase 2 Verification — Cancel-to-Neutral Defense Rule

**Track:** 20261021-affinity-drift-prestige-perks
**Phase:** 2 of 5
**Date:** 2026-10-21
**Branch:** `feat/20261021-affinity-drift-prestige-perks`
**Phase base:** `1ecd7af` · **Head:** `8be7e36`
**Result:** `verified`

## What landed

- `incomingTypeFactor(attack, primary, secondary)` in
  `packages/sim/src/battle/chart.ts`: the incoming (defender-side) type
  factor collapses to neutral `{num: 1, den: 1}` exactly when the move is
  super-effective against the primary AND resisted by the secondary.
  No fractional multipliers; outgoing `typeFactor` untouched.
- `BattleSide.affinity?: Element | null` (resolver.ts), threaded through
  `BattleFighter`/`ClockFighter`/`RunFighter`/`view`/`createClockFighter`/
  `createClock` and applied at the single incoming type-factor site in
  `clock.ts` `resolveShot` (the projectile path; the innate Strike stays
  typeless).
- `exhibition.ts` threads the owned creature's `affinity` into its side;
  the rival side never carries one.
- `battle/index.ts` barrel re-exports `incomingTypeFactor`.
- `packages/sim/src/battle/affinity.test.ts`: the cancel contract
  (unit + resolver-level) and the balance guardrails. TDD'd: written first,
  observed failing (`Module '"./chart"' has no exported member
  'incomingTypeFactor'`, `'affinity' does not exist in type
  'Partial<BattleSide>'`), then implemented.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run check` | 0 | 62 + 92 + 301 files, no type errors (part of the phase command) |
| unit | `bun test --timeout 120000` | 0 | 2083 pass, 1 skip, 0 fail, 86,702 expect() calls, 154 files, ~72 s |
| combined | `bun run check && bun test --timeout 120000` (phase verification command) | 0 | exact command from the brief |
| full gate | `bun run verify` (extra: adds `biome check`, determinism gate, `--check --parallel`) | 0 | 476 files lint/format-clean; all 9 creature GLBs + 5 props regenerate byte-identically |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | ×2-vs-primary + ×0.5-vs-secondary incoming resolves ×1 | `affinity.test.ts` → `incomingTypeFactor("fire", "plant", "water")` = `{num:1, den:1}`; resolver-level: seed 22 first Flame Charge impact on a water-affinity plant defender is 16 (= `strikeDamage(8, 20, 10, 1, 1, true)`) vs 24 (`3/2x`) without | pass |
| AC-3 | All other matchup math byte-identical | Full suite green with zero edits to any existing test/expectation: chart goldens, clock contract digest matrix, cup goldens, resolver/playback tests all pass unchanged | pass |
| FR-3 | Incoming-only; outgoing unchanged | `an attacker's secondary never moves outgoing damage`: a fire attacker with a water affinity (the exact pair the rule would cancel if bidirectional) produces a byte-identical `BattleResult`; `typeFactor` and `strikeDamage` signatures/behavior untouched; `policy.ts` never reads affinity | pass |
| FR-3 | Rivals and bosses never carry secondaries | Guardrail test: exhibition `rivalSide` has no `affinity` key; boss/rival sides are built from shapes without affinity (cup `BattleSide`s carry none) | pass |
| NFR-3 | Pure, seeded, DOM-free, TDD'd; suite in seconds | New logic lives in pure chart/clock functions; suite runs in ~72 s (≈17 s under `--check --parallel`) | pass |

## Edge cases covered

- Neutral-vs-primary stays neutral regardless of secondary (fire→fire with
  water; electric→fire with water) and with no secondary.
- Resisted-vs-primary stays ×0.5 regardless of secondary (plant→fire with
  water affinity does not weaken further or cancel).
- Super-effective-vs-primary with a non-resisting secondary stays
  super-effective (fire→plant with electric affinity).
- Missing/`null` secondary behaves exactly as before (no behavior change for
  pre-v20 callers; cup sides that omit `affinity` see no change).
- The owned side threads the creature's real secondary into the battle
  (`makeExhibition` carries `owned.affinity` through).

## Balance guardrails (explicitly checked)

- **Boss win-rate probe bands:** `bosses.balance.test.ts` (and
  `form.balance.test.ts` / `branch-balance.test.ts` boss matrices) pass —
  all six authored bosses (Koda, Hesse, Marlow, Delmar, Fenn, Thessa) remain
  in their 40–70% player win-rate bands.
- **Battle/cup goldens:** `clock.contract.test.ts` digest matrix,
  `chart.test.ts`, cup session/verdict goldens, and all resolver-level
  golden tests pass byte-identically — no rival or boss side carries a
  secondary, so no pre-existing expectation moved.

## Deviations

- None. All changes are inside `packages/sim/src/battle/**`. The planned
  `battle.ts` barrel re-export turned out to be `battle/index.ts` (there is
  no separate `battle.ts`); it received the `incomingTypeFactor` re-export
  within Touches.
- Deferred note (not a Phase 2 deviation): cup battles (`packages/sim/src/
  cup/verdicts.ts`, `cup/session.ts`) build player/rival `BattleSide`s from
  `CupSlot`, which carries no affinity, so live cup fights do not yet apply
  the defender's secondary. Wiring that is cup-side surface work outside
  this phase's Touches and is left for the client-surfaces phase to pick up
  with the primary agent's call.

## Notes

- Red→green evidence: the first `bun run check` failed on the missing
  `incomingTypeFactor` export and `affinity` on `Partial<BattleSide>` before
  the implementation landed; after implementation the first full run caught
  a mislabeled "outgoing" test in the new suite itself (the drifted side was
  actually the defender), which was corrected rather than the rule.
- The final phase verification command (`bun run check && bun test
  --timeout 120000`) exited 0 on the committed tree; `bun run verify` was
  run as an additional gate and also exited 0.

## Cup-side threading (plan amendment 92ba3b0)

### What landed

- `CupSlot.affinity?: Element | null` (`cup/bracket.ts`) — optional,
  additive field; no save-version bump needed (session validation is
  permissive about extra slot fields and existing sessions migrate
  forward untouched).
- `makeBracket` stamps the owned creature's `affinity` on the player slot
  only — rivals and `substituteFinalBoss` slots never gain it. It is
  omitted when the creature has none, so brackets without a secondary keep
  their exact pre-amendment persisted shape (existing cup goldens
  untouched and green).
- `battleSideForSlot` (`cup/verdicts.ts`) threads the slot's `affinity`
  into the non-boss branch side; the boss branch never sets one.
- `slotPlayerSide` (`cup/session.ts`) threads the player slot's
  `affinity` into the player side.
- `packages/sim/src/cup/affinity.test.ts`: TDD'd — written first and
  observed failing (`'affinity' does not exist in type
  'Partial<CupSlot>'` on 4 call sites, missing `CupSlot.affinity`
  property), then implemented.

### Commands (cup addition)

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| combined | `bun run check && bun test --timeout 120000` (phase verification command) | 0 | check green (93 sim files); 2089 pass, 1 skip, 0 fail, 86,720 expect() calls, 155 files |
| full gate | `bun run verify` | 0 | parallel tests 2089 pass / 0 fail; biome 477 files clean; determinism gate OK (9 GLBs + 5 props) |

### Evidence for the cup contract

- `battleSideForSlot(slot({affinity: "water"}), 22)` returns the bare side
  plus exactly `affinity: "water"` — nothing else moves.
- Incoming cancel holds on cup sides: first impact on a defended
  `plant_ox` slot is `strikeDamage(power, 20, 10, 1, 1, true)` vs
  `strikeDamage(power, 20, 10, 3, 2, true)` on the bare slot.
- A slot with `affinity: null` and one with no `affinity` key resolve
  byte-identically (`resolveBattle` outputs equal).
- A boss slot carrying `affinity` still builds a side without it — the
  boss branch never sets a secondary.
- `makeBracket` with an affinity-carrying creature: player slot carries
  it, all 7 rival slots and `finalRival` do not; the substituted boss slot
  does not either.
- Existing cup goldens (session/verdict goldens, `cup.boss.test.ts` exact
  slot equality, save cup round-trip) all pass unchanged — no existing
  expectation was edited.

### Deviations (cup addition)

- None. All changes are inside the amended Touches
  (`cup/bracket.ts`, `cup/verdicts.ts`, `cup/session.ts`, co-located
  `cup/affinity.test.ts`).

### Notes (cup addition)

- No save-version bump required: `affinity` is optional on `CupSlot`, and
  `isValidSession` validation does not reject extra/absent slot fields;
  the field is omitted entirely for creatures without a secondary, so
  persisted JSON for existing sessions is unchanged.
- Rival slots are structurally incapable of gaining a secondary
  (`makeBracket` builds them without the field; `battleSideForSlot`'s
  boss branch ignores it).

## Primary verification

Run by the primary agent after both the core phase and the cup-side
amendment, on the squashed checkpoint.

- Task commits squashed to **checkpoint `67660bb`**
  (`feat(sim): cancel-to-neutral secondary defense with cup-side threading`);
  the plan amendment remains a separate Conductor state commit (`9c3e5e2`).
- Range contents matched the reported commits exactly (4 core + 3
  cup-addition commits); working tree clean before acceptance.
- Full project gate re-run independently after the cup addition:
  `bun run verify` → exit 0 (2089 pass / 0 fail, biome clean, determinism
  gate OK).
- Files changed match the reported lists; zero edits to existing
  test/expectation files (goldens untouched).
- Deviations: none reported; the plan amendment itself was the primary's
  call after reviewing the deferred cup note, and `CupSlot` turned out to
  live inside the amended Touches (`cup/bracket.ts`).
- Verdict: **Phase 2 accepted** (core + cup-side amendment).
