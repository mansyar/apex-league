# Plan — Cup Module Refactor (`cup_module_refactor_20261018`)

Refactor track: behavior-identical decomposition of the cup domain (sim first,
then client), golden-test-first per the confirmed spec. Follows
`conductor/workflow.md` — git notes per task, plan updates per task, phase
checkpoints with explicit user verification.

## Phase 1 — Sim Golden Safety Net

- [x] Task: Pin sim cup behavior with semantic goldens
  - [x] New `cup.golden.test.ts`: bracket construction (strict match order +
        slot labels)
  - [x] `CupSession` step/transition flow (commit at first arena step,
        coach-room re-pick points, forfeit semantics)
  - [x] Rival-vs-rival verdict determinism (seeded, replayable)
  - [x] `cupPlacement` points (champion/runner-up/semifinal, loss/forfeit = 0)
  - [x] `bossForCup` routing across all tiers — all six bosses + walkover path
        (learnings §13)
  - [x] Confirm suite green — goldens *pin* current behavior (not red-first)

> b80cf9b — **Note:** 18-row exhaustive `bossForCup` routing grid (all six bosses,
> gate-overrides and re-summon rows) plus full `[round, slotA, slotB, winner,
> line]` transcripts for all three endings (champion seed 25, SF-exit seed 2,
> forfeit seed 101). Capture values taken from the live engine and
> cross-validated against the existing contract goldens (seed 101 rival
> winners matched exactly). 707 pass / 0 fail, biome clean. Deviation note:
> the plan's bracket-construction bullets were already pinned by existing
> goldens (`cup.test.ts` draw-stream, `cup-contracts.test.ts` exact fields)
> and are not duplicated; the new file instead adds the exhaustive routing
> grid and full-transcript depth that were missing.
>
> **[checkpoint: b80cf9b]** Phase 1 complete — user-approved. Test-only
> phase; no production logic changed. Browser probe waived by approval.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Sim Decomposition (FR1, FR2)

- [x] Task: Data-driven `bossForCup` routing
  - [x] TDD: equivalence tests derived from Phase 1 goldens
  - [x] Frozen milestone→boss table + thin lookup in `bosses.ts`; routing
        output byte-identical

> fac7eef — **Note:** TDD red first (`CUP_ROUTES` shape tests: frozen,
> ordered per tier, gate→milestone pairing pinned — silver gates on
> `"promotion"`, gold re-seats the `"apex"` Thessa). Then the frozen
> per-tier rule table (`when`/`milestone`/`kind`) with a thin first-match
> lookup replacing the if/else chain. Behavior proven identical by the
> Phase 1 golden grid + all existing `cup.boss` tests. 712 pass / 0 fail,
> biome clean.

- [x] Task: Split `packages/sim/src/cup.ts` → `packages/sim/src/cup/`
  - [x] Move `bracket.ts`, `session.ts`, `verdicts.ts`, `placement.ts` (pure
        relocation, no edits beyond imports)
  - [x] `cup.ts` becomes barrel re-export; zero consumer import changes

> 04f6158 — **Note:** Pure relocation; placement logic (`cupPlacement`)
> lives in `session.ts` rather than its own `placement.ts` — it is a
> 5-line function over session state, a fourth file would be
> ceremony (deviation: sub-task naming only, spec unchanged). `bracket.ts`
> (CupSlot, name pool, constants, makeBracket, ramp, substituteFinalBoss),
> `verdicts.ts` (RoundVerdict, cupMatchSeed, battleSideForSlot, double-KO
> tiebreak, resolvePairing, roundLabel), `session.ts` (CupSession, start/
> resolve/complete/forfeit/cupPlacement/bossScalps). `cup.ts` =
> explicit-list barrel; no import cycles; zero consumer changes.
> Deviation caught by tsc (lesson: type-check before commit, not just bun
> test): CUP_ROUTES literal widened through `Object.freeze` → fixed with
> `as const satisfies`; golden `stateAt` params typed `LadderTier`/
> `LadderSubTier`/`CupKind`. 712 pass / 0 fail; workspace check green.
- [x] Task: Size-cap audit + `bun run verify` green; commit with git note

> bed5d11 — **Note:** bracket 8.4 KB / verdicts 6.5 KB / session 12.0 KB /
> barrel 1.1 KB — all at or below the ~12 KB cap. `biome --write` fixed
> formatting + import order. `bun run verify` fully green (type check ×3
> packages, 1397 tests, determinism gate byte-identical).

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

> **[checkpoint: bed5d11]** — **Manual browser verification (agent-driven,
> user-approved probe):** Vite dev server, fresh save, Ember Drake drafted
> day 1 → advanced to day 7. **Step 1 regular cup:** bracket screen
> renders 8-slot field ("Bronze Cup · DAY 7 · SINGLE ELIMINATION", YOU
> badges, rival subtree resolved: Ash-ledger / Reedle Mirefin / Gilded
> Horn advanced); coaching room renders fighter card + scouting report
> ("Tactic unknown — watch the first exchanges") + kit with locked moves +
> BALANCED/SPECIALS toggle; arena played QF (HP plates, voxel fighters,
> feed lines "Flame Charge hits Pondskipper Grub for 10."). **Step 2
> elimination:** SF loss to Ash-ledger → bracket updated, feed "Reedle
> Mirefin takes the Semifinal!", results screen exactly per contract:
> "Eliminated — Reedle Mirefin takes the Bronze Cup · 3rd — Ember Drake ·
> out in the semifinal · Consolation: mood +2 · Ladder: +1 · Bronze III".
> **Console: 0 errors / 0 warnings across the whole session.** Step 3
> (Promotion Cup gate) waived: needs 12 ladder points (~12 cups); the
> banner path (`substituteFinalBoss`) moved verbatim and is covered by
> cup.boss.test.ts. Evidence: 5 screenshots captured via agent browser.

## Phase 3 — Client Golden Safety Net

- [x] Task: Pin client cup behavior with semantic goldens
  - [x] Screen sequence: bracket → coach room → arena → results
  - [x] Results screen math + placement/reward copy
  - [x] Give-up → as-if-lost placement semantics
  - [x] Coach-room kit/tactic re-pick flow per match
  - [x] Confirm suite green before any move

> **Coverage audit (deviation, same pattern as Phase 1):** the client's
> PURE cup surface was already fully pinned by existing suites —
> `bracket-model.test.ts` (match order/labels, verdict matching by name,
> double-KO advancement, forfeit display, topology 4/8/16, ordinalOf/
> exitStage, ladderRow incl. promotion + gold→legend flip, resultRows for
> champion/elimination/forfeit/tier bonuses/legend title),
> `battleUI.test.ts` (`toggleKitChoice` 2–4 bounds), and
> `battle-session.test.ts` (`cupStampTitle`). Duplicating those would add
> no safety. The unpinned remainder — screen sequence, commit-on-first-
> fight, give-up modal wiring, per-match picks reset — is DOM-locked in
> `createCup` and per learnings §11 must NOT be unit-tested through a DOM
> shim; those decisions become the Phase 4 view-model extractions (TDD,
> values captured from the current code before each move). Flow baseline
> evidence: the Phase 2 checkpoint probe (5 screenshots, exact copy,
> console 0/0) + committed `evidence/mock-baseline-*.png` for the Phase 4
> mock.html comparison. Suite green: client 553 pass / 0 fail (741 ms);
> full `bun run verify` green at bed5d11.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

> **[checkpoint: bed5d11]** — Test-audit + evidence phase; zero source
> changes (diff bed5d11..HEAD = plan + evidence PNGs only). Manual
> verification: mock.html baseline captured pre-refactor (viewport +
> full-page under evidence/), console 0/0; client suite 553 pass / 0
> fail; full `bun run verify` green at bed5d11. User approved close.
> Phase 4 note: view-model goldens must be written against values
> captured from the current `cup.ts` before each extraction move.

## Phase 4 — Client Decomposition (FR3, FR4)

- [ ] Task: Extract pure view-models first (TDD)
  - [ ] DOM-free modules for screen-flow ordering, results math, give-up
        semantics (`spar/loadout-vm.ts` style)
- [ ] Task: Split `apps/client/src/cup.ts` → `apps/client/src/cup/`
  - [ ] Submodules: screens / coach-room / results / session-flow + arena
        handoff
  - [ ] `cup.ts` remains the orchestration entrypoint (import path unchanged)
- [ ] Task: Size-cap audit (≤ ~12 KB each) + `bun run verify`; commit with
      git note
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Final Verification & Close

- [ ] Task: Full mock.html golden comparison + live browser probe — play a
      real cup end-to-end including a boss cup; attach evidence
- [ ] Task: Final `bun run verify`, registry/metadata status update, track
      closeout
