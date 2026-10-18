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

- [x] Task: Extract pure view-models first (TDD)
  - [x] DOM-free modules for screen-flow ordering, results math, give-up
        semantics (`spar/loadout-vm.ts` style)

> 8ffc482 — Extracted `cup/view-models.ts` (walkStep, entryLine,
> giveupLine, coachTabLabel, initialPicks, resultsView, closeIntent,
> chipView, bracketHeader) behind `cup/view-models.test.ts` (25 tests,
> values captured from `cup.ts` before extraction); `cup.ts` rewired to
> consume them, behavior-identical. Notes: closeIntent's input field is
> `status` (the sim's own name); the chip hint uses the boss's full
> persona name ("Verdant Dame Hesse holds the final"); the reveal step
> carries its verdict (drops the verdictOf re-derivation in walk).
> 1423 pass / 0 fail; check green ×3; determinism gate OK.
- [x] Task: Split `apps/client/src/cup.ts` → `apps/client/src/cup/`
  - [x] Submodules: screens / coach-room / results / session-flow + arena
        handoff
  - [x] `cup.ts` remains the orchestration entrypoint (import path unchanged)

> 68b56f1 — Split `cup.ts` (935 lines, 31.6 KB) into
> `cup/{shared, board, arena, coach-room, results, entry}.ts`; `cup.ts`
> is the orchestration entrypoint (10.0 KB). The former closure became an
> explicit `CupShared` context (memory + screens + late-bound
> walk/conclude/battle); the battle session lives in `arena.ts` (it owns
> the finish hold); the stall walk step now carries its match id so the
> board still renders the pending card. `CupHandlers` moved into
> `shared.ts` to break the cup.ts↔cup/ type cycle. Module map: shared =
> context types; board = slot fill / render / stamp / crown + the
> strict-order walk; arena = casting, fight commit, boss lower-third,
> stamp-hold exit; coach-room = coach screen + kit/tactic pickers;
> results = resultsView rendering + finalizeCup; entry = open /
> close-free / syncChip.

- [x] Task: Size-cap audit (≤ ~12 KB each) + `bun run verify`; commit with
      git note

> Size audit green: cup.ts 10.0 / arena 6.4 / board 5.0 / coach-room 5.6
> / entry 4.4 / results 2.1 / shared 4.9 / view-models 7.3 KB. `bun run
> verify` green: check ×3, 1422 pass / 0 fail, biome clean (4
> pre-existing warnings), determinism gate byte-identical.

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

> [checkpoint: 68b56f1] Coverage audit: diff bed5d11..68b56f1 touches
> `apps/client/src/cup.ts` + new `cup/` modules — every extracted decision
> is pinned by `cup/view-models.test.ts` (25 tests) and the pure surface
> remains covered by `bracket-model.test.ts`/`battleUI.test.ts`/
> `battle-session.test.ts`. Live browser probe (user-approved) covered the
> full client flow: fresh save → draft → advance to day 7 → regular cup QF
> loss (results "4th · out in the quarterfinal", console clean) → injected
> Bronze I 13 pts save → day 14 Promotion Cup gate ("Promotion Cup awaits"
> chip hint, banner, Koda walking the rival subtree) → QF win → resume
> after overlay close → SF forfeit via the give-up modal ("Forfeit — no
> ladder points", Koda takes the Promotion Cup, gate stayed active) → day
> 21 Promotion Cup again → QF knockout win → SF win → **boss final vs
> Koda: lower-third intro chyron + pinned 92-HP boss build verified**
> (`probe4-boss-lower-third.png`), final loss → results "2nd · out in the
> final", "Ladder +2 · Bronze I" (`probe4-boss-final-results.png`).
> Console: 0 errors / 0 warnings across all runs. mock.html post-refactor
> full-page capture matches the pre-refactor baseline (committed in
> Phase 3). Evidence: conductor/tracks/cup_module_refactor_20261018/evidence/.

## Phase 5 — Final Verification & Close

- [x] Task: Full mock.html golden comparison + live browser probe — play a
      real cup end-to-end including a boss cup; attach evidence

> Covered by the Phase 4 checkpoint probe (same session, same evidence):
> mock.html post-refactor full-page capture matches the committed
> pre-refactor baseline (`evidence/mock-baseline-fullpage.png` vs
> `mock-post-refactor-fullpage.png`), and a real cup was played
> end-to-end **including a boss cup** — draft → day 7 regular cup (QF
> loss contract) → day 14 + day 21 Promotion Cups → boss final vs Sear
> Marshal Koda (lower-third intro, pinned 92-HP build, runner-up results
> "2nd · out in the final", "Ladder +2 · Bronze I"). Console 0 errors / 0
> warnings across every run. Evidence:
> `evidence/probe4-boss-lower-third.png`, `probe4-boss-final-results.png`.
- [x] Task: Final `bun run verify`, registry/metadata status update, track
      closeout

> Final `bun run verify` green at closeout: check ×3, 1422 pass / 0 fail
> (1 skip), biome clean (4 pre-existing warnings), determinism gate
> byte-identical (3 species × 3 stages + 5 props). Registry entry marked
> [x]; metadata status → "complete". Net outcome: both monoliths reduced
> — sim `cup.ts` 25.5 KB → 1.1 KB barrel + `cup/{bracket,verdicts,session}`
> (max 12.0 KB); client `cup.ts` 31.6 KB → 10.0 KB entrypoint +
> `cup/{shared,board,arena,coach-room,results,entry,view-models}` (max
> 10.0 KB); `bossForCup` now reads from the frozen `CUP_ROUTES` table;
> 25 new view-model tests + 5 golden transcript tests added. No
> user-visible copy/DOM/CSS/save-schema changes (FR1–FR7 all met).
