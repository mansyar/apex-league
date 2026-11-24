# Integrated verification — Battle Variance Branch Resolution

- **Track:** `20261124-battle-variance-branch-resolution`
- **Phase:** 3 (Final verification and integrated evidence)
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-battle-variance-branch-resolution`
- **Base:** `main` @ `13172e387b633142f888f6eaba93feb944e80f0f`
- **Phase base:** `da4e7b3a5a44532f4b2578ff204014c6c23c7093`
- **Covers:** FR-1..FR-6, AC-1..AC-8, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6, NFR-7
- **Result:** **verified.** Every repository-state assertion is green: the source
  diff against the base is empty, `git diff --check` is clean, the working tree is
  clean, only the chore branch and `main` remain locally, and all 11 remote heads
  are byte-identical to the Phase 1 baseline. All five configured verification
  commands return exit 0 with battle hash `0xff6f3d62`. Two commands
  (`gate:determinism`, `test:fuzz`) were refused by the subagent's shell permission
  layer; the primary ran them separately with exit 0 (§7, §13). A duplicate primary
  `verify` sweep hit the documented load-sensitive `gatekeeper-reach` timeout while
  running concurrently with the subagent sweep; isolated under low load that test
  passed 8/8 in 10.76 s, and the authoritative sweep passed 4459 pass / 0 fail with
  the required hash (§13).

---

## 1. Final verdict

The disposition is complete and fully evidenced. The preserved branch
`feat/20261110-battle-variance` was proven superseded (§3), deleted locally with a
recorded force rationale (§4), and the single stale run file was removed while all
other gitignored artifacts were preserved (§5). No remote ref, tracked source,
config, product document, dependency, or allowlist was changed (§6, §8, §9).

The final-tree command sweep is **5/5 first-class exit-0** with the required battle
hash `0xff6f3d62` observed in `bun run verify` (§7, §13). All AC-1..AC-8 are
satisfied. The two subagent denials were resolved by the primary in separate
invocations (§13); the one load-induced `gatekeeper-reach` timeout in a duplicate
primary sweep was isolated once under low load and passed (§13).

## 2. Baseline (Phase 1, AC-1)

Captured before any action with explicit source commands and zero repository mutation
(full raw record: `.conductor/evidence/20261124-battle-variance-branch-resolution/baseline/`):

| Item | Value | Evidence |
| --- | --- | --- |
| Subject branch HEAD | `7a08d42759d1efcc62bbdc19d476e1a531b9eb8d` | `git rev-parse feat/20261110-battle-variance` (exit 0) |
| Merge base with `main` | `d7e5af3c4427acf87670ad8ebde467fc12331c9f` | `git merge-base main feat/20261110-battle-variance` (primary fallback, exit 0) |
| Unique commits | Exactly 20 (`27b2fdd1` … `7a08d427`) | `git log --oneline d7e5af3c…feat/20261110-battle-variance` (exit 0) |
| Diff against merge base | 33 files, 1748 insertions(+), 201 deletions(-) | `git diff --stat d7e5af3c… feat/20261110-battle-variance` (exit 0) |
| Branch metadata | `status: in_progress`, `phases_total: 4`, `phases_verified: 0`, `tasks_done: 18/18`, `pr_state: null` | `git show feat/…:conductor/tracks/20261110-battle-variance/metadata.json` (exit 0) |
| Close-out handoff | 4 phases executed, 0 green; unmerged to avoid a red gate; handoff to a roster re-tune track for 4 red balance rows | `git show feat/…:conductor/tracks/20261110-battle-variance/frontier.md` (exit 0) |
| Remote heads | 11 heads, byte-identical baseline (§6) | `git ls-remote --heads origin` (exit 0) |
| Working tree | Clean | `git status --porcelain` (exit 0, empty) |

The baseline verdict was `delete-candidate`.

## 3. Supersession proof (Phase 1, AC-2)

Three independent, first-class exit-0 assertions prove the branch's content is on `main`:

1. **Squash is on `main`.** `git merge-base --is-ancestor e3b9d48ce9187032b3f0f0620417d242f531465b main`
   exited 0; `git log --oneline --max-count=400 main` lists `e3b9d48c Battle variance and
   roster re-tune: … (#68)`.
2. **Distinctive files are on `main`.** `git cat-file -e
   main:packages/sim/src/battle/continuous/controller-noise.ts` and `git cat-file -e
   main:packages/sim/src/battle/continuous/controller-noise.test.ts` both exited 0;
   `git show main:<path>` returns the execution-noise implementation (`CADENCE_SKIP_DENOM
   16`, `COMMIT_SKIP_DENOM 32`, `PUNISH_SKIP_DENOM 16`, `cadenceHold`, `takeCommit`,
   `flankDodge`) and its co-located additive-only/two-way-determinism test.
3. **PR body declares supersession.** `gh pr view 68 --json mergeCommit,body,state`
   returned `"state":"MERGED"`, merge `e3b9d48ce9187032b3f0f0620417d242f531465b`,
   body: *"This branch stacks `feat/20261110-battle-variance` … Land together; the
   variance track closes as superseded."* (also preserved in the tracked local record
   `conductor/archive/20261111-roster-retune/pr.md` lines 5–8).

The branch's red balance frontier was closed by PR #68's roster re-tune: this phase's
`bun run balance` is green for all 21 species rows and all pacing/gate/boss bounds
(§7). No unique non-superseded content was found.

## 4. Disposition (Phase 2, AC-3)

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| Before | `git branch --list` | 0 | `* chore/20261124-battle-variance-branch-resolution`, `feat/20261110-battle-variance`, `main` |
| Preferred | `git branch -d feat/20261110-battle-variance` | 1 | `error: the branch 'feat/20261110-battle-variance' is not fully merged` (expected squash condition) |
| Forced | `git branch -D feat/20261110-battle-variance` | 0 | `Deleted branch feat/20261110-battle-variance (was 7a08d427).` |
| After | `git branch --list` | 0 | Only `* chore/20261124-battle-variance-branch-resolution` and `main` remain |

**Force rationale (recorded, no content lost):** `-d` fails only because the branch was
squash-merged, so Git cannot see it as an ancestor. §3 proves supersession three ways;
the branch's own four phases were all `blocked` with a red balance frontier that PR
#68's re-tune closed. No unique non-superseded content exists, so nothing is discarded.
The preserve path (P2.T1.2) did not apply. No other branch was touched.

## 5. Stale-file cleanup (Phase 2, AC-4)

| Artifact | Before | After | Intended |
| --- | --- | --- | --- |
| `.conductor/runs/20261123-repo-hygiene-cleanup.json` | present | **absent** | delete — achieved by primary exact-path fallback |
| `.conductor/runs/20261124-battle-variance-branch-resolution.json` | present | present | preserve — achieved |

Removal was an exact-path operation (`Remove-Item -LiteralPath '<exact path>'`), no
wildcard, no recursion. The primary's `Test-Path` checks returned `True` before and
`False` after for the stale file and `True` before and after for the active run file.
Preserved inventory (unchanged): `.conductor/runs/20261123-repo-hygiene-cleanup/`,
`.conductor/runs/20261124-battle-variance-branch-resolution/`, both run JSON files, and
`.conductor/evidence/20261124-battle-variance-branch-resolution/{baseline,supersession,verification}/`.
No archived evidence, screenshot, probe, or report was deleted.

## 6. Remote proof (AC-5)

`git ls-remote --heads origin` was read at baseline, before/after disposition, and again
in this phase. All reads returned the same 11 heads with byte-identical hashes:

```
b7698cc0aff3d0246c29da7f76dcf78b4f0f71e0  refs/heads/chore/20261026-release-funnel
34942c6f2daf2e331fe988b5b0085c454c13cb65  refs/heads/chore/20261027-prod-api-wiring
a3e7b949730b4194deccfb5121d70ff4b09351f2  refs/heads/feat/20261024-postcup-morning-after
0d199d962c2cbad28d3302efa6cd679c28a5b6a3  refs/heads/feat/20261025-mobile-layout-pass
90aa853eddcf97d405ae40dbda33a9d89628ed4d  refs/heads/feat/20261025-species-roster-expansion
3915a0dd63f5d25f3c3203fb9bd0b19fb5b4dffc  refs/heads/feat/20261028-elemental-identity
81ec4af69edf2bbf9cf50a2fcaf35e404eadea18  refs/heads/feat/20261028-fire-move-identity
8c75e890badd566c21b758f2f356ae32de7f7af6  refs/heads/feat/20261108-continuous-arena-battle
ebec13e33f68cbd5bb8146c6f68afdb77ff7594e  refs/heads/fix/20261120-server-image-sim-src
fb987494e2460348b14bca39b4fd07759272d6b3  refs/heads/fix/20261120-server-sim-runtime
13172e387b633142f888f6eaba93feb944e80f0f  refs/heads/main
```

No `origin/feat/20261110-battle-variance` head exists. No fetch, push, pull, merge,
reset, rebase, checkout, switch, clean, force-push, remote-ref mutation, or git-config
change was executed at any point in the track. No credential, token, passphrase, or
real player data appears in any artifact.

## 7. Final verification commands (FR-5, AC-6)

All five commands were invoked **separately** — no pipes and no `&&` chaining in any
invocation. `denied` is the verbatim shell envelope, not a repository result:

```
{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}
```

| # | Command | Exit | Summary |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4459 pass, 1 skip, 0 fail, 670479 expect() calls, 4460 tests / 437 files in 133.40 s; Biome 1036 files, no fixes; voxel determinism gate OK (18 GLBs + 5 props byte-identical); **final hash `0xff6f3d62`** with all 5 trace invariants ok (y-zero, hp-range, arena-bounds, integers, deterministic replay). |
| 2 | `bun run build` | 0 | Vite 438 modules transformed, built in 625 ms; only the standard >500 kB chunk-size advisory. |
| 3 | `bun run balance` | 0 | All 21 species rows inside their design bands and all pacing/gate/boss assertions ok (cap share 22.0%, decisive share 95.1%, cap-win quality 78.9%, median duration 32.80 s, 49/49 moves in damage band, 6 bosses beatable and not trivial); 3 diagnostic non-gated misses recorded. |
| 4 | `bun run gate:determinism` | 0 (primary) | Subagent denial recorded verbatim; primary ran it separately: all 18 creature GLBs and 5 prop digests regenerated byte-identical (§13). |
| 5 | `bun run test:fuzz` | 0 (primary) | Subagent denial recorded verbatim; primary ran it separately: 139 pass / 0 fail, 129015 `expect()` calls across 135 files in 63.85 s (§13). |

All repository-state assertions run in this phase passed:

| Assertion | Exit | Result |
| --- | --- | --- |
| `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| `git diff --check 13172e38..HEAD` | 0 | Clean — no whitespace errors. |
| `git branch --list` | 0 | Only `chore/20261124-battle-variance-branch-resolution` and `main`. |
| `git ls-remote --heads origin` | 0 | Same 11 heads, byte-identical to baseline (§6). |
| `git status --porcelain` | 0 | Empty — clean working tree. |

## 8. Scope proof (AC-8, NFR-1, NFR-5)

`git diff --name-status 13172e387b633142f888f6eaba93feb944e80f0f..HEAD` produced exactly:

```
M	conductor/tracks.md
A	conductor/tracks/20261124-battle-variance-branch-resolution/index.md
A	conductor/tracks/20261124-battle-variance-branch-resolution/metadata.json
A	conductor/tracks/20261124-battle-variance-branch-resolution/plan.md
A	conductor/tracks/20261124-battle-variance-branch-resolution/spec.md
A	conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-1.md
A	conductor/tracks/20261124-battle-variance-branch-resolution/verification/phase-2.md
```

`conductor/tracks.md` is the pre-existing Conductor registry change made by the primary
when the track was created; it is not modified by this phase. This phase adds only its
two evidence files, `verification/integrated.md` and `verification/phase-3.md`, which
join the two already-committed phase records above. There is **no** change to
`packages/`, `apps/`, `conductor/product.md`, `conductor/tech-stack.md`,
`conductor/workflow.md`, style guides, config, schema, deployment, or lockfiles.
`git diff --quiet 13172e38..HEAD -- packages apps` and `git diff --check` both exit 0.
No credential, passphrase, or real player data is present in any tracked artifact.

## 9. Module caps, dependencies, and allowlist (NFR-6, NFR-7)

No source file was touched, so the authoritative caps are unchanged: **12,288 B** per
module in `apps/client` and `packages/sim`, **24,576 B** in `packages/voxel`. The
module-size tests (`apps/client/src/module-size.test.ts`, `packages/sim/src/module-size.test.ts`,
`packages/voxel/src/module-size.test.ts`) run inside the green `bun run verify` sweep and
remain authoritative. No new dependency, no new allowlist entry, no package manifest,
and no lockfile was changed.

## 10. Acceptance criteria mapping (AC-1..AC-8)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Committed baseline: HEAD `7a08d427`, merge base `d7e5af3c`, 20 commits, 33 files, `in_progress`/0-of-4-green, frontier handoff | §2; `verification/phase-1.md` §1–2 and §9; baseline raw record | **satisfied** |
| AC-2 | PR #68 `e3b9d48c` ancestor of `main`; both controller-noise files on `main`; "closes as superseded" quote | §3; `verification/phase-1.md` §2 and §9; supersession raw record | **satisfied** |
| AC-3 | Verdict matches proof; target branch absent with method + rationale | §4; `verification/phase-2.md` §1, §9 | **satisfied** |
| AC-4 | Stale run file absent; current run file and all other gitignored evidence remain | §5; `verification/phase-2.md` §2, §9 | **satisfied** |
| AC-5 | 11 remote heads byte-identical; no remote deletion/rewrite command | §6; all three phases' `ls-remote` reads | **satisfied** |
| AC-6 | Five commands exit 0 with hash `0xff6f3d62`; empty source diff; clean tree | §7 and §13: all five commands exit 0 with hash; diff/status/diff-check proofs green | **satisfied** |
| AC-7 | `verification/integrated.md` committed with baseline, proof, disposition, cleanup, final verification | This file, committed in Phase 3 | **satisfied** |
| AC-8 | Only this track's Conductor artifacts changed vs base; no product/tech-stack/workflow/style-guide/source change | §8 name-status list; §9 caps; empty source diff | **satisfied** |

## 11. Deviations and denials

No product or design decision was required; no file outside `Touches` was modified;
no deviation from the phase contract was needed. Shell-permission denials (not
repository failures) were recorded verbatim and were **not** retried, rephrased, or
worked around, exactly as the brief requires:

1. `bun run gate:determinism` — `permission.rejected` / "Permission denied: shell".
2. `bun run test:fuzz` — `permission.rejected` / "Permission denied: shell".

The primary ran both commands separately with exit 0 and appended their first-class
results in §13, satisfying AC-6 and allowing the phase to be accepted.

## 12. Raw evidence

- `.conductor/evidence/20261124-battle-variance-branch-resolution/baseline/`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/supersession/`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/verification/`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/disposition/`
- `.conductor/evidence/20261124-battle-variance-branch-resolution/final/commands.txt`
## 13. Primary resolution of subagent denials (fallback)

The primary executed every denied command separately (no pipes, no `&&`), then ran
one additional isolation check for the load-sensitive test observed in a duplicate
primary sweep:

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run gate:determinism` | 0 | All 18 creature GLBs (all 21 species in three stages) and the 5 prop digests regenerated byte-identical. |
| 2 | `bun run test:fuzz` | 0 | `APEX_FUZZ_SWEEP=full` voxel fuzz: 139 pass / 0 fail, 129015 `expect()` calls, 135 files in 63.85 s; no gatekeeper-reach timeout. |
| 3 | `bun test --timeout 120000 -t "authored gatekeepers reach their stage under the widened field" packages/sim/src/cup/gatekeeper-reach.test.ts` | 0 | Isolated once under low load after a duplicate primary `bun run verify` hit the documented load-induced 60 s timeout while two sweeps overlapped: 8 pass / 2 filtered / 0 fail, 1008 `expect()` calls in 10.76 s. Confirms the timeout was load, not a defect. |
| 4 | `git branch --list` | 0 | Only `chore/20261124-battle-variance-branch-resolution` and `main`. |
| 5 | `git ls-remote --heads origin` | 0 | Same 11 byte-identical heads as baseline. |
| 6 | `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| 7 | `git status --porcelain` | 0 | Empty — clean tree. |

**Outcome:** AC-6 is satisfied on first-class results. The authoritative phase sweep
(`bun run verify`, exit 0, hash `0xff6f3d62`, 4459 pass / 1 skip / 0 fail) plus the
standalone determinism and fuzz exits 0 complete the five-command matrix. No source,
config, dependency, allowlist, credential, remote ref, or branch was mutated by the
fallback; the only repository change is committed evidence.