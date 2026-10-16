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

- [ ] Task: Red+Green — balance probe (FR12)
  - Probe in the style of `tactics.balance.test.ts` (`APEX_BALANCE_REPORT=1`
    style env flag): measure typical climb cadence per tier and boss
    difficulty vs ramped rivals; tune `SILVER_THRESHOLDS` and boss stat
    pins; before/after report docs in the track folder
    (`probe-before.md` / `probe-after.md`).

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Suite green; thresholds/pins landed with rationale comments; record
    checkpoint SHA.

## Phase 4 — Client presentation (manual-verify tasks)

- [ ] Task: Rank plate & ladder HUD (FR11)
  - Tier + sub-tier display, Silver styling, progress-to-next line per
    tier. Manual verification note.

- [ ] Task: Cup chip, bracket banners & boss intro (FR11)
  - Chip copy ("Promotion Cup awaits" / checkpoint / apex framing),
    promotion bracket header, boss-match banner, arena lower-third intro
    (reduced-motion aware). Manual verification note.

- [ ] Task: Callouts, coach lines & Hall of Fame scalps (FR11)
  - Promotion callout, one-time boss-defeat callout (seenHints dedupe),
    coach ticker lines, HoF scalp display. Manual verification note.

- [ ] Task: Client save wiring
  - Store wiring for v11 fields; corrupt-save notice path unchanged.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Agent browser verification (screenshots at 390/768/1280, console clean)
    + proposed manual steps for the user; await explicit feedback; record
    checkpoint SHA.

## Phase 5 — Final gates & docs

- [ ] Task: Full verification & docs
  - `bun run verify` green end-to-end; `docs/save-schema.md` final pass;
    README ladder/roadmap sentence updated (Silver playable); learnings
    appended if any hard-won lessons emerged.

- [ ] Task: Final review & completion (Refer to workflow.md)
  - Self-review checklist; `conductor-review` handoff; registry + metadata
    finalized.
