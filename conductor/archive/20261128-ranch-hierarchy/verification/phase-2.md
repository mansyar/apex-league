# Phase 2 — Chips, advance summary, grouping

- Track: `20261128-ranch-hierarchy`
- Phase: 2 — Chips, advance summary, grouping (FR-3, FR-4, FR-5, FR-6, AC-3, AC-4)
- Date: 2026-11-28
- Branch: `refactor/20261128-ranch-hierarchy`
- Base: `a14ed8db0bccb95c56a185a1b6fb7fd8daded35b` (conductor plan mark)
- Head (code): `878a32ffdb3eaf33433ce7a5938cd5bfd16c3c96`
- Result: **PASS** — named phase check, `bun run check`, the 12 KB module-size gate, Biome and the full `bun run verify` chain are all green.

## What changed

- Spar, cup and stable chips now render a persistent `.kit-chip-state` line beside their existing title/sub text. The line carries state + hint/reason: `Ready` / `Unavailable · No partner yet.` (spar), `Ready · Cup day`, `Ready · Cup in progress`, `Unavailable · No partner yet.` and `Closed · next on day N` (cup), and `Open · Empty|N pet(s) waiting` plus the verbatim cup-phase refusal (stable). Rejection wording reuses `REJECTION_COPY` and `stableRefusalCopy` verbatim.
- Gating is unchanged: the spar chip's authoritative `disabled` flag still comes from `spar.ts` and is mirrored by a guarded `MutationObserver`; the cup chip still hides off-day (`visible/enabled = cupToday || resumable`) while its view-model exposes the off-day reason; the stable chip is always visible.
- Advance Day now shows an eve-of-advance summary in a `p.advance-summary[role=status]` after the CTA. `advanceSummaryLine(state)` reports only current facts: assigned program (sim label), unspent AP and its dawn reset, ration readiness (`fedToday`), and current growth-gate tally. It never predicts tomorrow's AP budget or promises an evolution. The CTA stays enabled with its handler and position untouched.
- Dock hierarchy is clarified with a keyline before the training group, muted secondary button fills, a solid-accent primary CTA and a divider for the summary. Action order remains `dockHead, dockRow, dockTrain, dockGraduate, picker, advance`.
- Inline chip text wraps with `overflow-wrap: anywhere` and viewport-relative max widths so 393px portrait/landscape does not introduce horizontal scroll.

## Commands

| Command | Result | Detail |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/cup/view-models.test.ts apps/client/src/spar/panel.test.ts apps/client/src/stable.test.ts apps/client/src/app/hud-screen.test.ts` | PASS (exit 0) | 82 pass, 0 fail, 244 expect() calls |
| `bun test --check --timeout 120000 apps/client/src/hud/shell.test.ts` | PASS (exit 0) | 3 pass, 0 fail, 8 expect() calls |
| `bun test --check --timeout 120000 apps/client/src/module-size.test.ts` | PASS (exit 0) | 5 pass, 0 fail; comment trims brought `app/hud-screen.ts` and `hud/shell.ts` under 12288 B |
| `bun run check` | PASS (exit 0) | All workspaces type-check; client 562 files |
| `bun run verify` | PASS (exit 0) | 4671 pass, 1 skip, 0 fail (447 files); Biome 1066 files clean; determinism gate green |

## Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| FR-3 | Done | `advanceSummaryLine` lists assigned training, unspent AP + dawn reset, ration readiness and current growth progress; painted on every update before the tap. |
| FR-4 | Done | Spar/cup/stable chips each paint a visible state/reason line; `chipView` gains an additive `state` for all gating paths; stable refusal copy reused verbatim. |
| FR-5 | Done | Grouping/dividers/emphasis only; `shell.test.ts` pins the frozen `root.append(...)` order and the CSS seams. |
| FR-6 | Done | `.kit-chip-state` and `.advance-summary` are persistent visible text; hover tooltips remain a desktop-only enhancement. |
| AC-3 | Done | `hud-screen.test.ts` asserts the summary contains the assigned program label and the AP dawn reset before the CTA. |
| AC-4 | Done | Tests cover spar with/without a partner, cup day/off day/resumable, and stable empty/one/two/cup-phase states. |
| NFR-3 | Done | Module-size cap, `bun run check` and full `bun run verify` all green. |

## Evidence paths

- `apps/client/src/spar/panel.ts`, `apps/client/src/spar/panel.test.ts`, `apps/client/src/spar.css`
- `apps/client/src/cup/view-models.ts`, `apps/client/src/cup/view-models.test.ts`, `apps/client/src/cup/entry.ts`, `apps/client/src/cup.css`
- `apps/client/src/stable.ts`, `apps/client/src/stable.test.ts`
- `apps/client/src/app/hud-screen.ts`, `apps/client/src/app/hud-screen.test.ts`
- `apps/client/src/hud/shell.ts`, `apps/client/src/hud/shell.test.ts`
- `apps/client/src/ui/kit.css`, `apps/client/src/ranch.css`
- Commits: `b262a592` (chips), `9d7bd1f7` (summary), `0f47173b` (grouping), `65c22d10` (module-size trims), `878a32ff` (Biome/format fixes)

## Deviations

- None. All changes stayed inside the phase `Touches` paths (including the new related `hud/shell.test.ts`).

## Notes

- Sim, economy, gating, action order, copy wording and save schema are untouched.
- The summary deliberately avoids predicting tomorrow's AP budget (cup/tier/lineage bonuses are derived inside `advanceDay`) and avoids promising an evolution (the gate is evaluated after settlement).
- Browser/visual acceptance matrix (AC-5/AC-6 stills at 393px and 1440px) remains owned by the primary; no screenshots were captured in this phase.
- The named check was green before and after the final Biome/format pass; the full verify chain was rerun green at the final head commit.
