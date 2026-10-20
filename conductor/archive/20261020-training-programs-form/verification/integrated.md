# Integrated verification - Raising Depth: Training Programs & Form

- **Track:** 20261020-training-programs-form
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-training-programs-form`
- **Base:** `main` @ `e7448d089fb15bb0d3422a54c9a432b9bdb49033`
- **Head:** `c0821d8`
- **Result:** pass

## Commands

| Command | Result | Detail |
| --- | --- | --- |
| `bun run check` (inside verify) | pass | voxel 62 / sim 86 / client 297 files, no type errors |
| `bun test --check --parallel --timeout 120000` (inside verify) | pass | 1917 pass / 1 skip / 0 fail, 149 files |
| `biome check` (inside verify) | pass | 0 errors, 7 pre-existing `noNonNullAssertion` warnings in untouched files |
| `bun run gate:determinism` (inside verify) | pass | nine creature GLBs byte-identical, 5 props digests match |
| `bun run build` | pass | 241 modules, JS 834.89 kB (228.27 kB gzip), CSS 59.97 kB (11.67 kB gzip) |

## Phase evidence

| Phase | Verification | Evidence |
| --- | --- | --- |
| 1 Form model | `bun test --timeout 120000 packages/sim/src/form.test.ts && bun run check` | `verification/phase-1.md` |
| 2 Programs and save v18 | `bun test --timeout 120000 packages/sim/src && bun run check && bun run gate:determinism` | `verification/phase-2.md` |
| 3 Battle wiring and balance | `bun test --timeout 120000 packages/sim/src && bun run verify` | `verification/phase-3.md` |
| 4 Dock picker and Training tab | `bun run verify && bun run build` | `verification/phase-4.md` |
| 5 Fight surfaces, handbook, docs | `bun run verify && bun run build` | `verification/phase-5.md` |

## Acceptance criteria

| AC | Status | Where |
| --- | --- | --- |
| AC-1 `battleStats` equals `effectiveStats` at steady | pass | `packages/sim/src/form.test.ts`, phase 1 |
| AC-2 sharp +1 ATK / flat -1 / sluggish -2, no SPD change | pass | `form.test.ts`, phase 1 amendment |
| AC-3 assignment spends 1 AP once, re-point free | pass | `packages/sim/src/care.test.ts`, phase 2 |
| AC-4 paying night costs 10 energy, gate at 30 | pass | `settlement.test.ts`, phase 2 |
| AC-5 breakthrough trickle on the third trained night, capped | pass | `settlement.test.ts`, phase 2 |
| AC-6 capped primary rejected, capped trickle allowed | pass | `care.test.ts`, phase 2 |
| AC-7 v17 `trainingFocus` maps to a program | pass | `save/save.test.ts`, phase 2 |
| AC-9 form stays inside the fairness guardrails | pass | `battle/form.balance.test.ts`, phase 3 |
| AC-10 picker, tab, form line and chip at desktop and 393x659 | pass | phase 4 and phase 5 evidence, primary visual pass |
| NFR-1 no new RNG draw in settlement | pass | `settlement.test.ts` no-RNG proof, determinism gate |
| NFR-2 fresh-creature goldens unchanged | pass | `cup-contracts.test.ts`, `battle/form-seam.test.ts` |
| NFR-3 v0 -> v18 chain | pass | `save/save.test.ts` chain and fixtures |
| NFR-4 client modules <= 12,288 B | pass | `module-size.test.ts`, largest `hud/update.ts` 11,864 B |
| NFR-5 text not colour alone, reduced motion unchanged | pass | handbook and card copy, `ui/tabs.ts` contracts |

## Notes

- One balance finding is recorded in phase 3: the form lever is ATK-only because a
  single SPD point flips initiative on the FR12 fixture grid, and AC-9's per-cell
  floor is 15 % (worst cell 16.7 %).
- A pre-existing calibration gap was observed and deliberately not fixed: a real
  four-move, 24-night build clears bosses at 79-100 %, while the FR12 probe uses
  the two-move birth kit. It belongs in its own track.
