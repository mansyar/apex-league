# Implementation Plan — Coach's Knowledge Pass (`coach_knowledge_20261016`)

Workflow: `conductor/workflow.md` — TDD for logic-bearing code only; rendering
and DOM wiring verified manually; `bun run verify` gates every commit.

## Phase 1 — Sim: stat decomposition helper (TDD)

- [x] Task: Write failing tests for `statBreakdown` in `packages/sim` (decomposes
      each stat into rolled base / trained / evolution boost / inherited floor
      across: fresh baby, trained juvenile, champion with lineage floor, edge:
      cap at +6, fresh-start creature with no lineage) — b226830
- [x] Task: Implement the pure helper (aggregates existing `effectiveStats` +
      training + evolution + legacy data) and export from `@apex/sim` — b226830
- [x] Task: Commit + git note; mark complete — b226830

- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — note on b226830 [checkpoint: b226830]

## Phase 2 — Creature detail modal (client, rendering → manual verification)

- [x] Task: New module `creature-detail.ts` + CSS — modal built from the
      broadcast kit: 4 stat rows with the breakdown, stage/generation/cups
      context rows (888b7f3)
- [x] Task: Wire tap on the ranch creature plate → modal open/close (existing
      focus-trap machinery) (0130d31)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — browser
      verification desktop + phone viewport [checkpoint: 8318aef]

## Phase 3 — Move tooltips (client)

- [x] Task: Pure `moveStatLine(move)` formatter in `battleUI.ts` + failing test
      first (power/accuracy/cooldown; locked variant with unlock day) (099cb6c)
- [x] Task: Render the line in the spar kit picker and cup coaching room rows
      (099cb6c)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      [checkpoint: 099cb6c]

## Phase 4 — Coach's Handbook modal (client)

- [x] Task: New module `handbook.ts` — tabbed modal: type chart (6 crests,
      3/2–2/3 factors, population note), ladder rules (current-truth copy incl.
      the Silver ceiling), raising guidance (direction-only) (b5db8e3)
- [x] Task: HUD chip entry + aria/tabbable-tab semantics (5e58bed)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      [checkpoint: 5e58bed]

## Phase 5 — Settings modal (client, 1:1 chip relocation)

- [x] Task: New module `settings-modal.ts` — motion / camera style / new game
      (confirm-gated); wire commit() paths unchanged (5c445a1)
- [x] Task: Remove the three floating chips; verify no orphaned CSS/ids
      (5c445a1 — removal is atomic with the module)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      [checkpoint: 0cc4541]

## Phase 6 — Wrap-up

- [x] Task: Full `bun run verify`; cross-surface browser sweep (all 4 modals,
      desktop + phone tier, console clean) (1c7648e)
- [x] Task: Update `hud.copy.test.ts` / mock parity if HUD copy changed; final
      review readiness (1c7648e — mock parity updated; copy helpers untouched)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      [checkpoint: 1c7648e]

## Phase 7 - Review Fixes

- [x] Task: Apply review suggestions (4731dc4 - shared ui/labels.ts for
      stageLabel/romanNumeral with hud re-export, buildPrefCluster extracted
      to settings-modal.ts for hud/mock parity, isConnected focus guards in
      handbook + settings modals, handbook glyphs via template parsing,
      proper role=row structure in the type chart with display:contents CSS)
