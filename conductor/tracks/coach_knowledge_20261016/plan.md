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

- [ ] Task: New module `creature-detail.ts` + CSS — modal built from the
      broadcast kit: 4 stat rows with the breakdown, stage/generation/cups
      context rows
- [ ] Task: Wire tap on the ranch creature plate → modal open/close (existing
      focus-trap machinery)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — browser
      verification desktop + phone viewport

## Phase 3 — Move tooltips (client)

- [ ] Task: Pure `moveStatLine(move)` formatter in `battleUI.ts` + failing test
      first (power/accuracy/cooldown; locked variant with unlock day)
- [ ] Task: Render the line in the spar kit picker and cup coaching room rows
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Coach's Handbook modal (client)

- [ ] Task: New module `handbook.ts` — tabbed modal: type chart (6 crests,
      3/2–2/3 factors, population note), ladder rules (current-truth copy incl.
      the Silver ceiling), raising guidance (direction-only)
- [ ] Task: HUD chip entry + aria/tabbable-tab semantics
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Settings modal (client, 1:1 chip relocation)

- [ ] Task: New module `settings-modal.ts` — motion / camera style / new game
      (confirm-gated); wire commit() paths unchanged
- [ ] Task: Remove the three floating chips; verify no orphaned CSS/ids
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 6 — Wrap-up

- [ ] Task: Full `bun run verify`; cross-surface browser sweep (all 4 modals,
      desktop + phone tier, console clean)
- [ ] Task: Update `hud.copy.test.ts` / mock parity if HUD copy changed; final
      review readiness
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
