# Review — 20261128-ranch-hierarchy

- Track: Rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit
- Branch: `refactor/20261128-ranch-hierarchy`
- Range: `1629b813..HEAD` (code diff scoped with `-- . ':!conductor'`)
- Reviewer: `conductor-reviewer` subagent (`muse-spark-1.3-contributor`), read-only; primary-owned checks reproduced independently
- Config: `review.strict: true`; `review.issues.enabled: false` (no issue creation; deferrals recorded here)

## Verdict: PASS

All FR-1..FR-6, NFR-1..NFR-3, and AC-1..AC-6 are covered. Round 1 returned
PASS WITH FINDINGS (two Lows); fix round 1 closed both with tests, and the
full gate is green. No open findings. No Debt carried.

## History

| Round | Result | Findings | Disposition |
| --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | F1 Low (`hud/dock.ts`: badge `cost: "1 AP"` literals diverge from `AP_COST_LINE`), F2 Low (`app/hud-screen.ts`: unconditional `role="status"` writes) | Both accepted; fixed in fix round 1 |
| fix-1 | verified | F1: badges now use `AP_COST_LINE` + badge-vs-line test; F2: compare-before-assign + untouched-on-identical-state test | Closed; evidence `verification/review-fix-1.md` |
| 2 (final) | PASS | none | — |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `hud/dock.test.ts` care inline lines; F1 pin badge == line cost | covered |
| FR-2 | P1.T2 | `hud/dock.test.ts` train control; `hud/programs.test.ts` picker rows | covered |
| FR-3 | P2.T2 | `app/hud-screen.test.ts` summary asserts; F2 untouched-on-identical test | covered |
| FR-4 | P2.T1 | `spar/panel.test.ts`, `cup/view-models.test.ts`, `stable.test.ts` | covered |
| FR-5 | P2.T2 | `hud/shell.test.ts` grouping with frozen order | covered |
| FR-6 | P1.T1, P1.T2, P2.T1, P2.T2 | stylesheet wrap assertions; phase-3 touch probe (hover:none, no title-only state) | covered |
| NFR-1 | P2.T2 | phase-3 matrix 393x852/852x393/1440x900, 7 stills, console 0/0 | covered |
| NFR-2 | P2.T2 | keyboard/ARIA + reduced-motion probes | covered |
| NFR-3 | P1.T1, P2.T1, P2.T2 | full gate, module caps, no sim/save change | covered |
| AC-1 | P1.T1 | `hud/dock.test.ts` | covered |
| AC-2 | P1.T2 | `hud/dock.test.ts` + `hud/programs.test.ts` | covered |
| AC-3 | P2.T2 | `app/hud-screen.test.ts` | covered |
| AC-4 | P2.T1 | `spar/panel.test.ts` + `cup/view-models.test.ts` + `stable.test.ts` | covered |
| AC-5 | P1.T1, P2.T1 | phase-3 touch probe | covered |
| AC-6 | P3.T1 + fix-1 | `bun run verify && bun run build` + stills | covered |

## Findings — none open

- F1 (Low, closed): `apps/client/src/hud/dock.ts` badge literals → `AP_COST_LINE`; regression test pins badge == line cost segment.
- F2 (Low, closed): `apps/client/src/app/hud-screen.ts` `withAdvanceSummary` compares before assigning to the live region; test proves identical-state updates leave the node untouched.

## Residuals (pre-existing, not introduced by this track)

- R1: on a 393px phone, leaving the More overflow panel open while the Actions
  dock is expanded paints the floating panel over the top care buttons. The
  `:has` mutual-exclusion rule (`ranch.css`) covers only creature-plate vs
  command-dock; the track changed no overflow logic or positioning. Reviewer
  concurred pre-existing. Captured as roadmap follow-up RM-22.

## Checks (primary re-ran after fix-1)

- `bun test --check ... hud/dock.test.ts programs/copy/plates` → 163 pass / 0 fail / 393 expects
- `bun test --check ... view-models.test.ts spar/panel.test.ts stable.test.ts hud-screen.test.ts` → 83 pass / 0 fail / 246 expects
- `bunx biome check` on the four fix-touched files → clean
- `bun test --check module-size.test.ts` → 5 pass / 0 fail
- `bun run verify && bun run build` → 4673 pass / 1 skip / 0 fail; Biome 1066 clean; determinism green; build exit 0
- Browser matrix (phase 3): scrollWidth == viewport at all three sizes, no offscreen interactives in captured states, console 0 errors / 0 warnings, touch emulation confirms no hover-only state
