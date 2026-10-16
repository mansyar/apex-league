# Plan — Silver Ladder & Rival Bosses

**Track ID:** `silver_ladder_bosses_20261016`
**Spec:** [spec.md](./spec.md)
**Workflow:** [conductor/workflow.md](../../../workflow.md)
**Status:** In progress

Sim-first, client-last. Every sim task is TDD (red → green → refactor).
Presentation tasks carry a manual verification note. Each phase ends with a
verification checkpoint per `workflow.md`.

---

## Phase 1 — Sim: tier-aware ladder & save v11

- [x] Task: Red — tier-aware ladder tests — `a6dc88d`
  - Extend `ladder.test.ts` (or add `ladder.tier.test.ts`): `LadderState`
    gains `tier`; `initialLadder()` → Bronze III; `subTierFor` derives from
    Silver thresholds; `applyCupPlacement` never demotes, banks points,
    exposes tier in results; promotion win/loss semantics (FR1, FR4).
  - Confirm the new tests fail before implementing.

- [x] Task: Green — implement tier model — `a6dc88d`
  - `LadderState.tier`, tier-aware `subTierFor`, `SILVER_THRESHOLDS`
    constants (initial provisional values, tuned in Phase 3),
    `applyCupPlacement` promotion flag, promotion resolution (FR1, FR4, FR5).
  - Pure functions only; existing Bronze behavior byte-parity intact.

- [x] Task: Red+Green — promotion eligibility predicate (FR2) — `48b4ba7`
  - Tests for `promotionEligible` (boundary cases: at ceiling, one point
    past, already Silver, mid-Bronze).

- [x] Task: Red+Green — save v11 migration (FR10) — `1b5944a`
  - Extend `save.test.ts` / migrate tests: v10 → v11 (tier defaults to
    "bronze", empty `bossDefeats`), validator accepts v11, corrupt-save
    fallbacks unchanged, fresh-start pattern applied.
  - Update `docs/save-schema.md` in the same task.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `[checkpoint: 1b5944a]`
  - `bun test` green; `bun run check`; propose manual verification (no
    client wiring yet — sim-only, verify via test output); record
    checkpoint SHA.

## Phase 2 — Sim: bosses, cup substitution, ledger

- [x] Task: Red+Green — boss registry (FR8) — `4f0df3e`
  - `BOSSES` registry + tests: pinned stats within species legal bounds,
    kit legality (existing moves, equip rules), fixed tactic, ids stable.
  - Persona copy fields present (name, quips, intro) even though the client
    reads them later.

- [x] Task: Red+Green — promotion cup substitution (FR3) — `9141456`
  - Bracket `kind: "promotion" | "championship"`; final rival substituted
    with Boss 1 when eligible.
  - Stream-invariant tests: regular brackets for existing (day, save) pairs
    byte-identical (golden stream test stays green); substitution applied
    after the draw sequence.

- [x] Task: Red+Green — checkpoint & apex substitution (FR6, FR7) — `62ca3d8`
  - Boss 2 substitution at Silver III until scalped; Boss 3 at Silver I
    until scalped; un-substitution after scalp; non-blocking semantics.

- [x] Task: Red+Green — defeat ledger (FR9) — `1a8e9f6`
  - `bossDefeats: string[]` in state; idempotent append on boss defeat;
    `bossDefeated` presentation flag; coach line data.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `[checkpoint: 1a8e9f6]`
  - Full sim suite green + `bun run check`; propose manual verification;
    record checkpoint SHA.

## Phase 3 — Balance probe & tuning

> **Unparked 2026-10-16:** the element-chart track landed (3/2·2/3 chart,
> HP×2 scale) and Phase 3 completed on fresh probe data — pins softened
> (Hesse 100/11/13/8, Marlow 92/12/9/11), `SILVER_THRESHOLDS` tuned to
> 18/24, tripwires redefined per element. See `probe-before.md` /
> `probe-after.md` and commit `63561fb`.

- [x] Task: Red+Green — balance probe (FR12) — `63561fb` (probe-before/
  probe-after docs; pins + thresholds tuned; tripwires redefined)
  - Probe in the style of `tactics.balance.test.ts` (`APEX_BALANCE_REPORT=1`
    style env flag): measure typical climb cadence per tier and boss
    difficulty vs ramped rivals; tune `SILVER_THRESHOLDS` and boss stat
    pins; before/after report docs in the track folder
    (`probe-before.md` / `probe-after.md`).

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 63561fb]
  - Suite green; thresholds/pins landed with rationale comments; record
    checkpoint SHA.

## Phase 4 — Client presentation (manual-verify tasks)

- [x] Task: Rank plate & ladder HUD (FR11) — 2430f49
  - Tier + sub-tier display ("Bronze I" / "Silver III"), `--silver` token
    styling on the rank tab, progress-to-next per tier thresholds
    (Bronze 6/12, Silver 18/24), banked-pts readout at a tier's top,
    climb line + chip-pop on tier and sub-tier flips. Manual verification
    note: browser-verified aria + plate at all three fixtures.

- [x] Task: Cup chip, bracket banners & boss intro (FR11) — 2430f49
  - Chip copy via the sim's bossForCup ("Promotion Cup awaits" / "<Boss>
    holds the final"), standing fallback "Tier X · N pts"; promotion
    bracket header ("Promotion Cup"), boss-match banner ("Boss Final ·
    <name>"), arena lower-third intro (registry copy, reduced-motion
    aware) flipping to the boss's verdict quip during the stamp hold.
    Manual verification note: browser-verified on the gate fixture
    (Koda intro verbatim) and silver3 (Hesse banner).

- [x] Task: Callouts, coach lines & Hall of Fame scalps (FR11) — 2430f49
  - One-time boss-defeat callouts boss-koda/hesse/marlow (seenHints
    dedupe), silver-awaits hint bronze-gated, HoF "Scalps" section
    reading state.bossDefeats through the registry, ladderRow tier-aware
    (cross-tier promotion copy). Manual verification note: browser
    confirmed both scalps listed + the koda callout firing.

- [x] Task: Client save wiring — 2430f49 (verify-only)
  - No wiring needed: GameState carries v11 fields transparently through
    the existing storage/migration path; corrupt-save notice path
    untouched (main.ts has zero ladder/boss references).

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — [checkpoint: 3dc5560]
  - Agent browser verification (screenshots at 390/768/1280, console clean)
    + proposed manual steps for the user; await explicit feedback; record
    checkpoint SHA.

## Phase 5 — Final gates & docs

- [x] Task: Full verification & docs — (verify green; docs + learnings commit pending SHA)
  - `bun run verify` green end-to-end (types 62/51/126, 641 tests 0 fail,
    biome clean, determinism gate byte-identical); `docs/save-schema.md`
    already carries the v11 + v12 rows from Phases 1/3; README ladder
    paragraph now names the Promotion Cup + Silver gatekeepers and the
    roadmap row moves Phase 2 to "In progress"; learnings #13 appended
    (authored gatekeepers must be guaranteed to reach their stage — the
    boss walkover was found by browser play, not unit tests).

- [ ] Task: Final review & completion (Refer to workflow.md)
  - Self-review checklist; `conductor-review` handoff; registry + metadata
    finalized.
