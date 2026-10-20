# Review — 20261020-detail-modal-tabs

- **Verdict:** PASS
- **Round:** 2
- **Range:** `3f930f8..9cf5e1d` (code `3f930f8..5f30449`), fixes `b81c1ce` and `5f30449`
- **Reviewer:** `conductor-reviewer` (read-only), lead-validated

## Summary

The shared tab controller, the handbook migration and the tabbed detail modal are
correct and spec-faithful. One Medium (a new module outside any size pin) and five
Lows were found; strict mode fixes all of them rather than deferring.

## Volume strategy

13 commits, 16 files, +1451/−82 including `conductor/`; code diff 5 files. Single
pass, plus per-phase diffs for the two code phases.

## Verification

| Check | Result |
| --- | --- |
| `bun test --timeout 120000` | 1787 pass, 1 skip, 0 fail, 143 files |
| `bun test --check --parallel` | identical, 16.94 s |
| `bun run check` | clean |
| `biome check` | 398 files, 0 errors, 7 pre-existing warnings |
| `bun run gate:determinism` | byte-identical |
| `bun run build` | exit 0 |
| Visual | 390×844 and 1083×766 measured; strip one row, no horizontal overflow |

## Requirements coverage

FR-1–FR-11 covered. NFR-2–NFR-6 covered. NFR-1 partial at review time (F1) and
covered after the fix. AC-1–AC-9 covered.

## Findings

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| F1 | Medium | New `ui/tabs.ts` in no size pin (`size-probe.test.ts:18`, `module-size.test.ts:13`) | fixed — pinned |
| F2 | Low | Phase 2 `Status: in_progress` beside `Result: verified` | fixed |
| F3 | Low | `sync`'s remembered-state write documented as unreachable | corrected — the write is load-bearing (test at `creature-detail.test.ts` fails without it); contract and comment rewritten |
| F4 | Low | Detail shell CSS in `kit.css`, duplicating a `ranch.css` selector | fixed — moved beside the other `.detail-*` rules |
| F5 | Low | Phase 2 evidence cited a squashed-away head commit | fixed — `c0f3491` |
| F6 | Low | Panels not focusable, so an overflowing page had no keyboard scroll path | fixed — `tabpanel` takes `tabindex="0"`, asserted |

## Plan compliance

Phases 1 and 2 delivered inside their Touches; Phase 2 needed no `detail-pages.ts`
split. Phase R1 covers the findings. Every task `[x]` with Result/Checkpoint/Evidence.

## Out of scope / debt

None. No deferred issues (strict mode).

## History

| Round | Range | Verdict | Notes |
| --- | --- | --- | --- |
| 1 | `3f930f8..7144a7c` | PASS WITH FINDINGS | 1 Medium, 5 Low; all fixed in `b81c1ce` |
| 2 | `7144a7c..e39110c` | PASS WITH FINDINGS | all six round-1 findings closed at the root; 4 Low record defects, fixed in `5f30449` |

## Round 2

| ID | Finding | Disposition |
| --- | --- | --- |
| F-A | `sync`'s inline comment still claimed a blanket no-op, contradicting the new doc block | fixed — comment now scopes the no-op to the repaint and states that the record is always updated |
| F-B | `metadata.json` progress still counted 2 phases / 8 tasks | fixed — 3 phases / 11 tasks, all verified |
| F-C | size-probe docstring and test name still said "three pins / Growth modules" | fixed — four pins, Growth modules plus the tab controller |
| F-D | Phase R1 heading glued to Phase 2's evidence, hyphen instead of em dash in its task bullets | fixed |

## Doc sync

Tech-stack note added in `7144a7c`; re-checked after the CSS move (no further doc change needed).
