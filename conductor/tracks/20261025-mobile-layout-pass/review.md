# Review — Mobile Layout Pass

- **Track:** 20261025-mobile-layout-pass
- **Type:** feature
- **Branch:** `feat/20261025-mobile-layout-pass`
- **Range:** `f359653d..HEAD` (code files: 9 — kit.css, ranch.css,
  dock-collapse.ts/.test.ts, shell.ts, cup.css, battle-hud.css, spar.css,
  starter.css)
- **Date:** 2026-10-25
- **Verdict:** **PASS** (round 2; round 1 was PASS WITH FINDINGS — one Low
  finding, fixed)

## Summary

The mobile layout pass is correctly implemented across all 9 files with
coherent breakpoints, a well-tested pure dock-collapse seam, and thorough
documented visual evidence (real cup runs, spar sessions, hit-test sweeps,
console-clean captures at both orientations plus desktop/tablet guards).
The only finding was a Low NFR-numbering slip in the integrated summary
(conductor-owned doc), fixed in round 2. No code defect was found.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Test | `bun test --timeout 120000` | pass — 2640 pass / 1 skip / 0 fail, 209 files | run by primary at `fab6267d` |
| Typecheck + lint + format + determinism | `bun run verify` | pass (determinism gate OK) | run by primary at `fab6267d` |
| Build | `bun run build` | pass (pre-existing >500 kB chunk advisory only) | run by primary at `fab6267d` |
| Code diff | per-phase checkpoints + full-range read | pass — 9 files, all within Touches; no reduced-motion content touched; style-guide clean | reviewer read 100% of hunks |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | kit.css responsive tiers; phase-1.md measurements | covered |
| FR-2 | P1.T2 | phase-1.md: `:has()` mutual exclusion, hit-tests, real taps | covered |
| FR-3 | P2.T2 | phase-2.md landscape block, 16/16 hit sweeps | covered |
| FR-4 | P3.T1 | phase-3.md real cup runs both orientations | covered |
| FR-5 | P3.T2 | phase-3.md spar panel + real tactic taps | covered |
| FR-6 | P4.T1 | phase-4.md sweep; 3 unreachable surfaces static-only | partial (documented) |
| FR-7 | P2.T1 | dock-collapse.test.ts (failing-first) + AC-5 measurements | covered |
| FR-8 | P3.T2 | battle-hud retarget + landscape block; phase-3 evidence | covered |
| FR-9 | P4.T2 | product-guidelines.md UX Principle 8 (read directly) | covered |
| NFR-1 | all | 9-file client-only diff; save stays v25; no new deps | covered |
| NFR-2 | all | 1440×900 + 800×1000 guards per phase | covered |
| NFR-3 | — | full diff read: no reduced-motion block touched | covered |
| NFR-4 | P1/P2 | 40px kit floors | covered |
| NFR-5 | P2.T1 | ~1.5 KB pure module; module caps green | covered |
| NFR-6 | all | console 0/0 evidence all phases | covered |
| AC-1 | P1+P2 | both orientations, live geometry | covered |
| AC-2 | P3.T1 | phase-3 captures + real runs | covered |
| AC-3 | P3.T2 | phase-3 captures + mid-battle rotation | covered |
| AC-4 | P4.T1 | sweep + static review for unreachable surfaces | partial (documented) |
| AC-5 | P2.T1 | dock collapse semantics tested + measured | covered |
| AC-6 | P4.T2 | Principle 8 present | covered |
| AC-7 | all | guard captures per phase gate | covered |
| AC-8 | all | console 0/0 everywhere | covered |

FR-6/AC-4 `partial` is exactly as recorded via the workflow fallback
ladder (graduation/nursery/gift unreachable by real play in one session;
static CSS review only). Documented, not a finding.

## Findings

### Low

- **F1** — `conductor/tracks/20261025-mobile-layout-pass/verification/integrated.md:59-62` —
  NFR numbering slip: the bullet labeled "NFR-6" described NFR-4 content
  (copy/labels/tiny text) and "NFR-7/AC-8" cited an NFR that does not
  exist in the spec (console-clean is NFR-6). **Fix (applied):** the
  copy/labels line folded into the NFR-4 bullet; the console bullet
  relabeled NFR-6 / AC-8. Requirement: NFR-4/NFR-6. Test gap: none.
  **Resolved in Phase R1.**

## Overrides

None.

## Plan compliance

Compliant. All four phases carry Result / Checkpoint / Evidence; all 9
tasks `[x]`; no silent drops; the final diff sits exactly within the union
of the phases' Touches (recorded deviations: `hud/shell.ts` wiring is the
P2 brief's sanctioned co-located-module alternative; `spar.css`
`.hud-lineage` arena deviation recorded in phase-3.md; `starter.css` is
P4's named Touch).

## Out of scope

- The landscape verdict stamp passing behind the open battle-log box
  (cosmetic, transient, non-interactive) — documented in phase-3.md with
  two fix attempts spent.
- Pre-existing tablet-band chip/lineage overlap at 800×1000 — pre-dates
  the track; NFR-2 preserves tablet base seats.
- `.app-in-arena` lineage-hide depends on `hud/update.ts:193` continuing
  to *clear* (not set) the inline display — pre-existing and correct
  today; worth remembering if that line is ever refactored.

## Debt

None — `review.issues.enabled` is false and no findings remain after the
fix round.

## Doc sync

Updated before review: product-guidelines.md (UX Principle 8) and
tech-stack.md (dated 2026-10-25 note) committed at `e1d83b3c` / `00e616b2`;
no other docs required (save stays v25; no commands/deps changed).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
| 2 | PASS | 0 | 0 | 0 | 0 | 1 |
