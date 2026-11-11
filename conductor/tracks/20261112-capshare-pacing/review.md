# Capshare Pacing — review

**Reviewer:** `conductor-reviewer` subagent (read-only)
**Range:** `c1957e8d..3130937d` — 14 commits
**Round:** 1
**Verdict:** PASS WITH FINDINGS (1 Medium, 4 Low; no blockers)

## What the reviewer ran

| Command | Result |
| --- | --- |
| `bun run telemetry` | pass — 42 fights, cap 20/42 (47.6%), dead zone 27 commits (2.9%), 14/14 bounds |
| `bun run balance` | pass — 840 fights, 15/15 species, cap 26.7%, median 31.21 s, decisive 95.6%, 49/49 moves |
| `bun run trace --seed 20261111 --check` | pass — hash `0xb6cce858`, 5/5 invariants |
| `bun test …telemetry.test.ts` / `identity.test.ts` / `pacing.test.ts` | not run — denied by the reviewer's shell policy; verified by reading the assertions instead |
| `bun run verify`, `biome check` | not run — same reason |

The reviewer independently re-derived the pairing rule (`i = 15·lap + h`,
`away = (11h + lap + 1) mod 15`) and confirmed 42 distinct mirror-free pairings,
12 species home 3× / 3 home 2×, the same for away, and 21 even / 21 odd seeds.
It confirmed `rewards.ts` is absent from the diff, `SIM_VERSION` is still 3, every
`BOUNDS` value is unchanged (`capShare` still `3/5`), and `pacing.test.ts` is
untouched with its `test.failing` intact and no `.skip`.

## Findings and disposition

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| F1 | Medium | Debt D-4 blamed the whole 47.6% vs 26.7% gap on the stat basis, but the samples also differ in doctrine (fixture: press vs kite; matrix: press on both sides) and nothing measured the split. The same single-cause claim appeared in `phase-3.md`, `learnings.md` #25 and `product.md`. | **Fixed.** D-4 now names both differences and states the attribution is **unmeasured**, with the suggested isolation (a reference-line cap share in `battle-balance-report.ts`) written down. `phase-3.md`, `learnings.md` #25 and `product.md` rewritten to match. |
| F2 | Low | The spec's problem statement still said the tortoise is "a side in 12 of the 25" and "nine stalled pairings", contradicting the track's own evidence (15, and ten). | **Fixed.** Both corrected with a dated note pointing at `phase-1.md` Table A. |
| F3 | Low | FR-2's withdrawal rationale said "every one of them resolves zero", which the rung table falsifies (rungs 4 and 6 resolve 2 and 1). | **Fixed.** Now "every **green** rung resolves zero", with the two non-green rungs named. |
| F4 | Low | Thirteen `BOUNDS` `why` strings still quoted the shipped 14 × 3 measurements (e.g. `distinctPositions` 65 → 46, `durationMin` 18.44 s → 14.48 s, `deadZoneShare` 2.4% → 2.9%), and the `deadZoneShare` line contradicted AC-8's amended text. | **Fixed.** All twelve moved figures refreshed to the 42-distinct readings and labelled with the sample they came from. No bound value touched. |
| F5 | Low | `phase-3.md`'s AC verdict paragraph mislabelled AC-6/AC-7/AC-8. | **Fixed.** Relabelled to match `integrated.md`. |

## Judgement calls the reviewer accepted

- **FR-2 / AC-2 withdrawn rather than unmet.** The reviewer checked that the
  withdrawal is honestly argued (six rungs, the green ones resolve nothing, the
  species is 52.7% as an outlaster) and that `rewards.ts` is provably untouched.
- **AC-8 amended rather than claimed.** The criterion froze `deadZoneShare` at
  2.4%; the reading is 2.9% because the fight set changed, not the mechanic. The
  reviewer accepted the dated amendment as the honest alternative to a false tick.
- **`pacing.test.ts` left alone.** Re-composing it would have been a second,
  unapproved goalpost move; its debt pin still fails as designed.

## Primary re-verification after the fixes

| Command | Result |
| --- | --- |
| `bun test telemetry.test.ts identity.test.ts pacing.test.ts` | 22 pass / 0 fail across 3 files |
| `bun run telemetry` | exit 0, cap 20/42 (47.6%), no bound violated |
| `bun run verify` | exit 0 — 4,151 pass / 1 skip / 0 fail; Biome clean; determinism gate byte-identical |
| `biome check` on the touched files | clean |

The reviewer's four `needs` (the three test files and `bun run verify`) are covered
by the primary's own runs above; the reviewer's shell policy forbade `bun test`,
not the suite itself.
