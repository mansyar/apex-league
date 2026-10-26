# Review — 20261027-roster-wave-3 (Roster Wave 3 Breeding Discovery)

- Track: `20261027-roster-wave-3`, type `feature`, priority `high`
- Branch: `feat/20261027-roster-wave-3`
- Range: `9b6a72bb..HEAD` (per-phase: `75f15a7d..d4c7a14a`, `0a97f38f..297040a9`, `2361de87..c0d9e096`, `6dff0f45..bec13d67`)
- Date: 2026-10-27 (UTC)
- Verdict: **PASS WITH FINDINGS (override)** — one Low finding, explicitly overridden below. No Critical/High/Medium findings.
- Strategy: large diff (87 files, ~5900 lines excl. conductor/) → per-phase checkpoint review + cross-phase integration check.

## Summary

All four phases verified with checkpoints and evidence. The roster grows 9 → 12
species via three breeding-discovery lines (Voltfox, Galeheron, Shalemole) with
fixed element-pair recipes, determinism-gated voxel archetypes (9 GLB pairs,
98–146 KiB each), six new branch forms, open handbook recipe listings, widened
non-Bronze rival fields, and untouched bosses (0-delta). Full gate green:
`bun run check` 0, suite 3146 pass / 0 fail, bare `biome check` 0, determinism
gate 0 across all 36 pairs, build 0, desktop + phone visual pass with clean
consoles.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `bun run check` | exit 0, all 4 workspaces | primary run 2026-10-27 |
| unit | `bun test --check --parallel=4 --timeout 120000` | exit 0: 3146 pass, 1 skip, 0 fail (3147 tests / 291 files) | primary run 2026-10-27 |
| gate | `bun run verify` (exact CI gate) | exit 0 | primary run 2026-10-27 |
| determinism | `bun run gate:determinism` | exit 0, all 36 pairs byte-identical | primary run 2026-10-27 |
| build | `bun run build` | exit 0 | primary run 2026-10-27 |
| visual | playwright-cli vs `bun run dev` | desktop handbook + live battle, phone handbook; 0 console errors both widths | `.conductor/evidence/20261027-roster-wave-3/phase-4-*.png` |

## Requirements

Every FR/NFR/AC covered (reviewer-confirmed against spec + in-suite pins):

- FR-1 species defs/kits, FR-2 archetypes, FR-3 score bands, FR-4 fixed recipes + breed-true — covered (discovery.ts, species tests, 432-duel probe).
- FR-5 client rendering/lifecycle, FR-6 rival pools + boss refresh, FR-7 lifecycle parity, FR-8 open recipes — covered (branch-catalog discoveries, CONTRACT 18→24, handbook discovery, machine.ts pool, gatekeeper-reach).
- NFR-1 save v25 untouched, NFR-2 hues 50/165/28, NFR-3 determinism, NFR-4 tripwire + gilded 32, NFR-5 row discipline, NFR-6 voice copy — covered.
- AC-1..AC-8 — covered (AC-6 with the F1 waiver below: six finals covered on the production path by gatekeeper-reach + representative browser battle).

## Findings

### F1 (Low) — six-cup browser matrix not shown

- File: `conductor/tracks/20261027-roster-wave-3/verification/phase-4.md`
- What: visual evidence is a representative live battle (handbook + spar → damage applied, HP bars moved, both models rendered), not all six boss cup-finals played end-to-end in the browser.
- Why Low: bosses are 0-delta data (no code change — all six kits already carry wider-pool rows, no boss wields a discovery signature) and `gatekeeper-reach.test.ts` drives every final on the production `prepareCup → resolvePlayerMatch` path. Residual risk is visual-only and nil for a data-only change.
- Fix: override waiver recorded below (user-approved); no code change required.

## Overrides

- **F1** — approved by the user 2026-10-27: proceed without a six-final browser matrix. Scope: this track only. Reason: 0-delta boss data + production-path unit coverage + representative rendered/fought browser battle with clean console.

## Plan compliance

- All 4 phases verified with Result/Checkpoint/Evidence; 7/7 tasks `[x]`, none dropped.
- Diff stays within the union of phase Touches except six accepted deviations:
  - D1 ranch.css reorder (out-of-Touches, pre-existing since PR #54, specificity-proof reorder, computed styles identical) — accepted.
  - D2 branch-catalog split (12 KB sim module cap forced it; group-seam split, barrel preserves surface) — accepted.
  - D3 choreo.ts profiles (suite hardcodes archetype list; wave-2 precedent) — accepted.
  - D4 kit 6-tuple narrowing (strictly stronger contract; consumers conformed; no runtime change) — accepted.
  - D5 bosses.ts 0-delta (wider-pool rows already present; changing pairings would be a product decision) — accepted.
  - D6 P4.T1.2 browser play executed as the primary visual layer per workflow — accepted.
- No review-fix phase needed (no fixable findings).

## Out of scope

- Discovery-species players are unprobed in bosses.balance sweeps (STARTER-only) — phase-4 notes flag it as a later-track design decision, not this review's finding.
- Biome is unpinned (`biome check` resolves latest via bunx locally and in CI); version drift reddened `verify` on main independent of this track. Suggested follow-up, not filed (below threshold).

## Debt

None. No deferred findings; no issues filed (`review.issues.enabled` false path — everything resolved in-track except the F1 waiver above).

## History

| Round | Verdict | C | H | M | L | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS (override) | 0 | 0 | 0 | 1 | 0 (F1 waived) |

## Doc sync

Updated post-review scope: `conductor/product.md` Phase 3 roadmap carries the wave-3 landing note (approved, committed `26d71b4c`); `metadata.json` `doc_sync: complete`.
