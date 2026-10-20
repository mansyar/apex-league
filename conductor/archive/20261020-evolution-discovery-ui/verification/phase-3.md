# Phase 3 — Panel integration & live refresh

- **Track:** `20261020-evolution-discovery-ui` — Evolution Threshold Discovery UI
- **Phase:** 3 of 3 — Panel integration & live refresh
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-evolution-discovery-ui`
- **Base commit:** `0cb48f0` (phase base)
- **Head commit:** `385a49f` (phase checkpoint)
- **Result:** verified

Per-task history was squashed into the phase checkpoint `385a49f`; the branch
carries no per-task commits, so every commit reference below names that
checkpoint.

## What changed

| File | Change |
| --- | --- |
| `apps/client/src/creature-detail.ts` | Builds a `detail-growth` block from `growthView(state)` and inserts it after the context rows, before the move kit. Adds `sync(state)`, which repaints only that block. |
| `apps/client/src/hud.ts` | `update(state)` calls `creatureDetail.sync(state)` on every commit; `sync` is a no-op while the modal is closed. |
| `apps/client/src/ui/kit.css` | `.detail-growth*` layout on kit tokens (keyline top rule, uppercase accent heading, dim note) plus a `.kit-sr-only` utility for the spoken status word. |
| `apps/client/src/creature-detail.test.ts` | New pure `bun:test` file pinning the row reading (`growthRowParts`) — no DOM dependency, no new packages. |

`apps/client/src/growth.ts` was consumed as-is. No sim file changed. `main.ts`
was not needed.

## Task results

| Task | Status | Commit |
| --- | --- | --- |
| P3.T1 Render the Growth section | done | `385a49f` |
| P3.T2 Refresh while open | done | `385a49f` |
| P3.T3 Accessibility pass | done | `385a49f` |
| P3.T4 Style with the broadcast kit | done | `385a49f` |
| P3.T5 Prove Hall of Fame is unchanged | done | `385a49f` (no record code touched; evidence below) |

Every task landed inside the squashed phase checkpoint, so the table names that
one commit throughout.

## Commands

| Command | Exit code | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typechecks clean (3 workspaces), 1751 pass / 1 skip / 0 fail across 139 files, `biome check` clean (7 pre-existing `noNonNullAssertion` warnings in untouched test files), determinism gate OK |
| `bun run build` | 0 | Vite production build, 189 modules, `dist/` emitted |
| `bunx biome check` | not run | Shell policy denied the command (`permission.rejected`). The identical `biome check` stage ran inside `bun run verify` and exited 0; the only diagnostics were the seven pre-existing warnings above, none in a touched file. |

## Acceptance criteria

| ID | Criterion | Evidence |
| --- | --- | --- |
| FR-1 | The active creature's detail modal shows a Growth section for its current stage gate. | `growthSection(view)` mounts under a fixed host appended between `context` and `kit` in `buildCreatureDetail`; `open()` renders it from `growthView(state)`. Heading is `view.title`, note is `view.note` when non-null, then one row per `view.rows` entry. `creature-detail.test.ts` asserts the juvenile row set (`Day`, `Clean nights`, `Mood`, `Bond`, `Cups won`) and the revealed pair per row. `growthView` returning `null` hides the host instead of throwing. |
| FR-7 | The section refreshes in place if a settlement resolves while the panel is open. | `hud.update` already receives every commit and now calls `creatureDetail.sync(state)`. `sync` checks the modal's own `visible` flag, then `renderGrowth` replaces children of the Growth host only — the rest of the modal keeps its nodes, so scroll and focus never reset and no reopen happens. `main.ts` is untouched. |
| FR-8 | Hall of Fame records are unchanged. | No record-rendering file was touched: `apps/client/src/graduation.ts` (Hall list, `hallEntryLabel`, `hallEntryMeta`) is absent from the diff, and nothing under `packages/sim` changed. The existing golden assertions for that surface — `hallEntryLabel` and `hallEntryMeta` in `apps/client/src/graduation.test.ts` (lines 80–126) — pass in the `bun run verify` run above, which is the regression proof. The detail panel and the Hall share no element or record code path. |
| AC-9 / NFR-1 | Each row's met/unmet status is readable without colour, and the section has an accessible name. | Status is a text word (`Met` / `Not yet`) in a `.kit-sr-only` span, paired with a distinct glyph (`✓` met, `○` unmet, `aria-hidden`) so colour is reinforcement only; the section carries `role="group"` and `aria-label={view.summary}`. Reading order is label → status → detail. `creature-detail.test.ts` asserts the two `glyph|status` readings are the only ones produced, that a met row yields `✓|Met` and an unmet row `○|Not yet`, and that an undiscovered gate's composed row text carries no digits. No animation was added, so reduced motion needs no extra gate. |

## Module size

`apps/client/src/module-size.test.ts` (12 KB guard) scopes `scene-logic` and
`ranch`; it is green in this run. The only logic module touched is
`creature-detail.ts` (122 added lines), which measured **12,305 B** against the
12,288 B cap — over budget, and missed because the guard never scans client root
modules. Review finding F2; Phase R1 extracted the Growth DOM into
`apps/client/src/growth-panel.ts` (see `verification/phase-R1.md`). The
view-model itself (`growth.ts`) was unchanged in this phase.

## Visual check

Not run. This subagent has no `playwright-cli` surface and shell access is
limited to the configured verification commands, so `bun run dev` could not be
started for a 1280×800 / iPhone 15 pass. The visual layer should be checked by
the primary before the PR: open the partner panel as a baby (qualitative rows,
no digits), as a discovered juvenile (value/target pairs), and as a champion
(final-stage note, no rows).

## Deviations

- `apps/client/src/main.ts` — **not needed**: `hud.update` already runs on every
  commit, so the in-place refresh lives there. The file is untouched.

## Notes

- Rows are built with `textContent` only; no `innerHTML`, so view-model copy
  cannot inject markup.
- The Growth host is hidden when `growthView` returns `null` (no creature),
  which keeps the "modal is unreachable but must not throw" edge case total.
- Champion rows read `Day 6 / 25` at the champion gate target; the juvenile gate
  reads `Day 6 / 10`. Both are covered by the new test.
- Phase R1 (review F2) moved `growthSection`/`growthRowNode` out of
  `creature-detail.ts` into `apps/client/src/growth-panel.ts` behind
  `createGrowthHost`; `renderGrowth` and the local `visible` flag no longer
  exist. The names used above describe the phase-3 tree.
