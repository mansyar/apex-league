# Phase R1 Verification — Review Fixes

- **Track:** `20261023-test-suite-speedup`
- **Phase:** R1 (review round 1 → fixes)
- **Date:** 2026-10-24
- **Branch:** `chore/20261023-test-suite-speedup`
- **Base:** `a7da02163174f6cfe3d2c70d828e551cd473c55e` (phase base, "Mark phase in progress")
- **Head:** `ccc61b3` — `test(voxel): make the sliced fuzz titles count-neutral`; the docs/evidence commit (phase-3.md addendum + this file) follows on the same tree
- **Result:** **verified — F2 and F3 landed exactly; runtime legs denied in sandbox (primary to discharge, see Blockers)**
- **Scope:** F2 (R1.T2), F3 (R1.T3.1), proof (R1.T4). F1 (plan.md) is primary-executed per the brief and was not touched here.

## F2 — count-neutral gate titles (R1.T2.1)

Title strings ONLY across all 41 sliced fuzz suites — no assertion, seed list,
timeout, loop body, header comment, or file header change; the twice-build
property in the determinism files is untouched. Structural proof: `git diff
--numstat` = 41 files × **1+/1−** each, and `git diff --unified=0` shows every
one of the 41 hunks on the `test("…")` title line and nothing else.

Title map (pattern + example per category):

| Category (files ×) | Old (example) | New (example) |
|---|---|---|
| boundary × 24 | `no axolotl voxel touches the grid boundary over seeds 0-9` | `no axolotl voxel touches the grid boundary over the gate slice (first quarter of seeds; full list via APEX_FUZZ_SWEEP=full)` |
| budget × 12 | `4 axolotl seeds run the full pipeline within the GLB budget (seeds 0-3)` | `axolotl seeds run the full pipeline within the GLB budget (gate slice; full list via APEX_FUZZ_SWEEP=full)` — leading seed-count "4" dropped, so the title makes no seed-count claim in either mode |
| determinism × 5 | `full falcon pipeline is byte-identical per seed` | `full falcon pipeline is byte-identical per seed (gate slice; full list via APEX_FUZZ_SWEEP=full)` |

Boundary keeps the existing leading word(s) ("no … voxel") per the brief; the
full seed-range enumerations ("seeds 0-9", "seeds 4-7", and the dropped
leading "4") are gone, replaced by the slice-neutral clause. `storm_hound`
renders as "storm hound" in titles, consistent with the existing files.

Full file list (41):

- `boundary.{axolotl,bovine,drake,falcon,storm_hound,tortoise}.{00-09,10-19,20-29,30-39}.test.ts` — 6 × 4 = 24
- `budget.{axolotl,bovine,drake,falcon,storm_hound,tortoise}.{00-03,04-07}.test.ts` — 6 × 2 = 12
- `determinism.{axolotl,bovine,falcon,storm_hound,tortoise}.test.ts` — 5

Not touched, on scope grounds: `dna.test.ts` (unsliced — its "200 seeds" title
is accurate in both gate and sweep mode, since the full list runs in gate too;
F2 covers the 41 sliced suites only). Untouched elsewhere; no production code,
no seed consts, no `SAVE_VERSION`/schema files.

## F3 — the ~4-core-runner expectation (R1.T3.1)

**Home choice (brief's choose-one rule):** the sentence is added ONCE, as a
short subsection appended to `verification/phase-3.md` under Primary
verification — `### ~4-core GitHub-runner expectation (FR-7, derived)`. The
FR-7 metrics row itself is unchanged. `verification/**` is
phase-agent-editable per the brief, and phase-3.md is where the review finding
pointed.

The F3 sentence as landed:

> On a ~4-core GitHub runner, bun self-caps to ~4 workers; as a derived
> expectation (not a measurement), the full sweep's serial-equivalent work —
> the voxel pipeline family whose sliced-serial leg measured 117 s, scaled
> from the gate's 89 seeds to the sweep's 303, plus per-file import overhead
> across the 42 fuzz files — implies roughly 35–60 s there, comfortable for
> the nightly cron (dev reference run: 41 s at 20 workers).

Grounding — every number exists in the track's evidence:

| Number | Source |
|---|---|
| 117 s (sliced-serial voxel run) | phase-2.md, Primary measurements: `bun test --timeout 120000 packages/voxel` = 117 s (gate slices, serial) |
| 41 s at 20 workers (dev full sweep) | phase-3.md, Commands table: `bun run test:fuzz` = 41 s, uncapped parallel on the 20-core dev machine |
| 303 full seeds vs 89 gate seeds | phase-3.md, Seed-count audit (24×10 / 12×4 / 5×3 full = 303; gate 24×3 + 12 + 5 = 89) |
| 42 fuzz files | phase-3.md sweep summary (44 tests / 42 files: these 41 suites + `dna.test.ts`) |

Explicitly a derived expectation, labeled as such in the sentence itself — not
a measured claim; no CI runner run exists.

## R1.T4 — proof (title-only, no behavior change)

### Sandbox runtime legs — denied once, not retried

The phase Verification command, attempted exactly once as written:

```
bun test --check --parallel=4 --timeout 120000 packages/voxel && bun run check && biome check
```

→ `permission.rejected: Permission denied: shell`. Per the brief: no retry, no
rephrase, no workaround; the primary discharges and appends (Phase 3 hit the
identical policy for every bun-led invocation, including `bun --version`).

### What did run here (git read commands + file edits)

| Check | Expected | Result |
|---|---|---|
| `git diff --numstat` | 41 files, +1/−1 each | ✅ 41 × `1  1`, all under `packages/voxel/src/fuzz/` |
| `git diff --unified=0` inspection | only `test("…")` title lines change | ✅ all 41 hunks land on the test-title line; no assertion/seed/timeout/loop text in any hunk |
| `git status --porcelain` | nothing else modified or untracked | ✅ exactly the 41 `M` entries, no untracked files |
| `git commit` (41 files) | 41 insertions / 41 deletions | ✅ → `ccc61b3` |

Count logic unchanged by construction: one `test()` registration per edited
file remains, so the fuzz dir stays at **44 test entries** (41 retitled suites,
one test each, plus `dna.test.ts`'s 3 unsliced tests) and the voxel package
stays at **295 tests / 65 files / 54,274 expect()** in gate mode — string
literals cannot alter these counts.

### Checks table (for the primary to discharge)

| Check | Expected |
|---|---|
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` | exit 0 — 295 pass / 0 fail / 65 files, expect 54,274 (unchanged) |
| `bun run check` | exit 0 |
| `biome check` (bare binary; via `bun run verify` only if unresolvable) | 0 findings |

All three legs are inside the single denied compound command above; the
primary runs it and appends results here.

### Primary verification (discharged 2026-10-24)

All three legs run by the primary on the phase tree (base `a7da021` → head
`5681d26`):

| Check | Result |
|---|---|
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` | ✅ exit 0 — **295 pass / 0 fail / 65 files / 54,274 expect() / 49.1 s** — counts byte-for-byte unchanged, exactly as the string-only prediction held |
| `bun run check` | ✅ exit 0 — voxel 90 / sim 147 / client 352 files |
| `bunx biome check` | ✅ exit 0 — 570 files clean |

F1 (plan.md, primary-executed) was completed pre-phase during review recording:
both "≤ 35 s" occurrences (Phase-2 Goal L53, P2.T4.1 L71) now read "≤ 70 s,
revised 2026-10-23 from 35 s" — verbatim F1's fix. F2 confirmed via structural
diff (title lines only) + runtime count parity. F3's sentence landed in
phase-3.md (grounded derivation, labeled derived-not-measured). All three
round-1 findings resolved.

## Deviations

| File | Reason |
|---|---|
| — | none: 41 fuzz titles + the phase-3.md addendum are inside Touches; phase-R1.md is this phase's evidence file; no scratch was created under `.conductor/evidence/` |

## Notes

- F3 echo in `integrated.md` (mentioned in plan R1.T3.1) is NOT in this
  phase's Touches — flagged for the primary's doc-sync step to add there if
  wanted; the one authoritative sentence lives in phase-3.md (quoted above).
- Commits: `test(voxel): make the sliced fuzz titles count-neutral`
  (`ccc61b3`, 41 files), then `docs(conductor): document the ~4-core runner
  expectation and record R1 verification` (phase-3.md addendum + this file).
- F1 (plan.md) edit belongs to the primary per the brief; untested here.
- git tree state: clean at `ccc61b3` after the title commit, before this
  evidence/docs commit.
