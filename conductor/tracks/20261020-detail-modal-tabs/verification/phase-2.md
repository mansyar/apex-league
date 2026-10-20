# Phase 2 — Tabbed detail modal

- **Track:** `20261020-detail-modal-tabs`
- **Phase:** 2 (P2.T1–P2.T5)
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-detail-modal-tabs`
- **Base commit:** `61ff7f6`
- **Head commit:** `24995d5`
- **Result:** verified (code, tests, static, determinism, build). Visual layer is
  the primary's acceptance pass — see *Visual layer* below.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static (types) | `bun run check` (first leg of `bun run verify`) | 0 | voxel 62, sim 79, client 237 files — no type errors |
| unit | `bun test --check --parallel --timeout 120000` (second leg) | 0 | 1787 pass, 1 skip, 0 fail across 143 files |
| static (lint/format) | `biome check` (third leg) | 0 | 398 files checked, 7 pre-existing warnings, 0 errors |
| determinism | `bun run gate:determinism` (fourth leg) | 0 | 9 creature GLBs byte-identical + prop digest match |
| build | `bun run build` | 0 | vite 8.3.4, 191 modules, `dist` written |

`bun run verify` (the conjunction of the four legs above) exited `0`;
`bun run build` exited `0`. Each was run green after the final fix.

## Files touched

- `apps/client/src/creature-detail.ts` — shell + three pages, `open` repaint and
  `select(0)`, remembered state for Growth entry.
- `apps/client/src/ui/kit.css` — `.creature-detail-box`, `.detail-tabs`,
  `.detail-tab[aria-selected="true"]`, `.detail-panel` and its `[hidden]` rule.
- `apps/client/src/creature-detail.test.ts` — fake DOM gains `classList.toggle`
  and focus tracking; hooks hoisted to file scope; six new page tests.

No new module was needed: `apps/client/src/creature-detail.ts` stays inside the
12,288 B cap, so `detail-pages.ts` / `detail-pages.test.ts` were not created and
`apps/client/src/size-probe.test.ts` needed no new pin.

## Tasks

| Task | Result |
| --- | --- |
| P2.T1 shell + three pages | done — header row kept; tab strip under it; Stats = stat list + context, Growth = growth slot (`createGrowthHost` still receives the same node), Moves = kit; `open` repaints all three pages, `select(0)`, then focuses close |
| P2.T2 live Growth across tabs | done — `last` state remembered by `open`/`sync`; `onSelect(1)` repaints from it; `sync` while closed updates only the remembered state and the host's internal copy (no DOM) |
| P2.T3 shell CSS | done — 4-row grid + `max-height: min(86dvh, 720px)`; only `.detail-panel` scrolls; selected tab = filled plate (controller drops `is-outline`) + `font-weight: 900` + inset bottom bar; no gradient, transition or keyframe added |
| P2.T4 proof | done — six new fake-DOM tests, listed below |
| P2.T5 size guard | done — `size-probe.test.ts` green unchanged; every touched module ≤ 12,288 B |

## Acceptance criteria

| ID | Evidence | Status |
| --- | --- | --- |
| AC-1 | `the detail modal's pages > opens on Stats with one selected tab and every page painted` (three tabs in order, exactly one `aria-selected="true"`, Stats active) and `> closing from Moves and reopening lands on Stats` | pass |
| AC-2 | `the detail modal's pages > arrows, Home/End and clicks switch pages and take focus` (ArrowRight → Growth, End → Moves, ArrowRight wraps → Stats, ArrowLeft wraps → Moves, Home → Stats; focus asserted on the selected tab; click also switches) | pass |
| AC-3 | Same two tests assert the panel map `[false, true, true]` — inactive pages carry `hidden` | pass |
| AC-4 | `the detail modal's pages > Growth shows digit-free copy until discovery, then current / target` (no digits before discovery, `Mood` reads `35 / 40` after) | pass |
| AC-5 | `the detail modal's pages > leaving and returning to Growth paints the latest state` (Stats scroll surface untouched: `detail-stat-list.repaints` stays 1) plus the existing `the detail modal's Growth slot > sync repaints the open slot in place…` and `> sync after close leaves the slot alone` | pass |
| AC-6 | `the detail modal's pages > Moves lists the creature's kit` (row names equal `species.kit` display names in order; at least one `In kit`) | pass |
| AC-8 | Static: `.creature-detail-box` caps height at `min(86dvh, 720px)` inside a `min(420px, 88vw)` box, `.detail-panel` is the only `overflow-y: auto` surface, `.detail-tabs` is a single nowrap flex row, `.detail-stat-chips` already wraps. No horizontal scroll container is introduced. Browser confirmation is still outstanding — see *Visual layer* | static pass / visual pending |
| AC-9 | `bun run verify` exit 0 and `bun run build` exit 0 (table above); `size-probe.test.ts` green | pass |

## Visual layer

Not run by this phase subagent: the phase brief assigns
`bun run verify && bun run build` and the workflow keeps the visual pass for the
primary at phase acceptance. This subagent's shell is limited to the configured
verification commands, and no desktop browser is connected to the session
(`browser.tabs.list` → disconnected), so `bun run dev` + `playwright-cli` was not
startable here. Required at acceptance:

1. `bun run dev`, open a partner's detail modal at desktop and at 390×844.
2. Confirm one tab row, the shell inside the viewport, no horizontal scroll on
   any of the three pages, and the selected tab's filled plate + underline.
3. Screenshot to `.conductor/evidence/20261020-detail-modal-tabs/phase-2-*.png`
   and check the console.

## Deviations

None. The planned optional split (`detail-pages.ts`) was not needed: the modal
stays under the cap, so no extra module and no new size pin.

## Notes

- `ui/tabs.ts`, `growth.ts`, `growth-panel.ts`, `handbook.ts` and `ranch.css`
  are untouched.
- The fake DOM gained exactly the two DOM features the shared controller uses
  that the harness lacked: `classList.toggle(name, on)` and a focus record.
  Nothing else in the harness changed; the existing Growth-slot tests still
  assert the same counts (`open` → one Growth repaint, `sync` while open → one
  more, `sync` after close → none).
- `sync` still no-ops on the DOM while closed (the host is set invisible on
  close), and repainting Growth behind Stats swaps only the Growth slot's
  children, so the visible page's scroll position is never touched.
