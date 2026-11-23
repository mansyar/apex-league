# Phase 1 Verification — Baseline inventory and branch safety classification

- Track: `20261123-repo-hygiene-cleanup` — Repository Hygiene Cleanup
- Phase: 1 — Baseline inventory and branch safety classification
- Date: 2026-11-24
- Branch: `chore/20261123-repo-hygiene-cleanup`
- Base commit (`main`, matches plan base and `refs/heads/main` on origin): `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`
- Phase base / HEAD at verification: `9b867974a6d6079b0a00c4ff9cb081ed55800ab0`
- Primary verification HEAD: `52f086e2112052f9d5130dcca8666f937a9aaca6`
- Result: **verified (by primary)** — the read-only inventory, branch classification, and artifact baseline are complete. The seven commands denied in the subagent executor were re-run verbatim by the primary at HEAD `52f086e2112052f9d5130dcca8666f937a9aaca6` and all exited 0 (see §Primary verification). No deletion of any branch, file, directory, or remote ref has been performed.
- Scope: FR-1, FR-2, NFR-2, NFR-4, AC-1. This phase is read-only except for evidence.

## Commands table

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Branch inventory | `git for-each-ref --format='%(refname:short)' refs/heads` | 0 (primary) | Primary re-run listed 10 local branches: 8 stale candidates + `main` + current track branch. |
| Branch inventory (fallback) | `git branch --list` | 0 | Same 10 local branches; recorded by the subagent before the hand-off. |
| Remote inventory | `git ls-remote --heads origin` | 0 | 11 remote heads; `refs/heads/main` = `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`. Recorded for AC-4; no remote deletion planned. |
| Worktree | `git status --porcelain` | 0 | Empty output; clean tree at HEAD `9b867974…`. |
| Ancestry | `git merge-base --is-ancestor <branch> main` | 0 (primary) | Per-branch: exit 1 for the six non-ancestors, exit 0 for `t3/346e8a09` and `t3/opening-command`, as expected; agrees with `git branch --merged/--no-merged main`. |
| Merge base | `git merge-base <branch> main` | 0 (primary) | Eight merge-base SHAs supplied by primary (listed in §Primary verification). |
| Ancestry (fallback) | `git branch --merged main` / `git branch --no-merged main` | 0 / 0 | Merged: `main`, `t3/346e8a09`, `t3/opening-command`. Not merged: the 6 other candidates + current branch. |
| Diff proof | `git diff --quiet main...<branch>` | 0 / 1 | Exit 0 for `t3/346e8a09`, `t3/opening-command` (empty diff); exit 1 for the 5 PR-backed branches and `feat/20261110-battle-variance` (expected non-empty). |
| PR proof | `gh pr list --state merged --head <branch> --json number,url` | 0 (primary) | Merged PR #62, #63, #64, #83, #84 for the five PR-backed branches; empty for `feat/20261110-battle-variance` and both `t3/*` branches. Confirms the classification table. |
| Static + unit + determinism | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests across 437 files; Biome checked 1035 files; determinism gate OK for all species/props; final sim hash `0xff6f3d62`. |
| Static (build) | `bun run build` | 0 | Vite 8.3.4 built the client: 438 modules transformed in 1.21s; only the pre-existing >500 kB chunk-size warning. |
| Balance | `bun run balance` | 0 | 21 species, 1680 matrix fights, cap share 370/1680 (22.0%), 34/34 gates `ok`, all boss gates `ok`. |
| Determinism (standalone) | `bun run gate:determinism` | 0 (primary) | All 21 species × 3 stages byte-identical; 5 props digests match. |
| Fuzz | `bun run test:fuzz` | 0 (primary) | 139 pass, 0 fail; 129015 `expect()` calls; 139 tests across 135 files [61.02s]. |
| Ignore/tracked check | `git check-ignore <paths>` | 0 (primary) | `.conductor/runs`, `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`, and `.conductor/verify.log` all confirmed ignored; `git ls-files .conductor` identified the 7 tracked files that must never be deleted. |

Exit codes follow the executor convention: no `Exit code:` line means exit 0. Rows marked "(primary)" were denied in the subagent executor and re-run verbatim by the primary at HEAD `52f086e…`; their exact outcomes are recorded below.

## Acceptance criteria table

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-1 | Committed pre-cleanup baseline with counts and source commands | This file plus `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`; branch and artifact tables below; commands table and §Primary verification | met |
| FR-1 | Read-only baseline inventory recorded | Branch, remote, and artifact tables below; no deletions in this phase | met |
| FR-2 | Every candidate classified with explicit deletion-safety proof | Branch classification table below (7 safe-to-delete, 1 preserve); merged PRs confirmed by primary | met |
| NFR-2 | No remote changes | `git ls-remote --heads origin` recorded; no push/ref command run | met |
| NFR-4 | Archived evidence paths preserved and excluded from stale set | Artifact exclusions below; `.conductor/evidence/20261123-doc-truth-sweep/**`, current-run evidence, and all docs-referenced `.conductor/evidence/**` paths excluded | met |
| AC-4 | Remote head list unchanged | 11 remote heads recorded; no remote command other than `ls-remote` | met |
| NFR-6 | Five configured verification commands exit 0 with sim hash `0xff6f3d62` | §Primary verification: `bun run verify` (exit 0, hash `0xff6f3d62`), `bun run build` (exit 0), `bun run balance` (exit 0), `bun run gate:determinism` (exit 0), `bun run test:fuzz` (exit 0) | met |
| NFR-7 | Module caps unchanged, no allowlist | Source diff empty (`git diff --quiet base..HEAD -- packages apps` exit 0); module-size guards unchanged at 12,288 B client/sim/server and 24,576 B voxel, no allowlist. | met |

## Branch classification table

Candidates exclude `main` and the current track branch. Strongest available proof is recorded per branch; `safe-to-delete` is a classification only — Phase 1 performs no deletion.

| Branch | Ancestor of `main` | `git diff --quiet main...<branch>` | Merged-PR / local proof | Classification | Phase 2 deletion mode |
|---|---|---|---|---|---|
| `chore/20261027-prod-api-wiring` | no | exit 1 | `main` has `912fe3b7 chore(deploy): wire prod API origin into Pages deploy (#62)` and `751443c7 conductor(done): Record PR #62 merged for track '20261027-prod-api-wiring'`; branch tip `34942c6f conductor(complete): Record PR #62 for 'Prod API Wiring'`; primary confirmed merged PR #62 (`https://github.com/mansyar/apex-league/pull/62`) | safe-to-delete | `git branch -D` (squash merge, no ancestry) |
| `feat/20261028-elemental-identity` | no | exit 1 | `main` has `2d301f7c feat(client): Elemental Identity Pass (#63)` and `50e083d8 conductor(done): Record PR #63 merged for track '20261028-elemental-identity'`; branch tip `3915a0dd chore(conductor): Complete and archive track '20261028-elemental-identity'`; primary confirmed merged PR #63 | safe-to-delete | `git branch -D` (squash merge, no ancestry) |
| `feat/20261028-fire-move-identity` | no | exit 1 | `main` has `e790506e Fire move identity — per-row signatures for all 8 fire moves (#64)` and `ab34e2c4 chore(conductor): mark fire-move-identity PR #64 merged`; branch tip `81ec4af6 chore(conductor): complete and archive track '20261028-fire-move-identity'`; primary confirmed merged PR #64 | safe-to-delete | `git branch -D` (squash merge, no ancestry) |
| `fix/20261120-server-sim-runtime` | no | exit 1 | `main` has `45211d83 fix(server): declare sim workspace dependency for runtime image (#83)`; branch tip `fb987494` has the identical message (squashed); primary confirmed merged PR #83 | safe-to-delete | `git branch -D` (squash merge, no ancestry) |
| `fix/20261120-server-image-sim-src` | no | exit 1 | `main` has `8c773f54 fix(server): unignore sim source in server image build context (#84)`; branch tip `ebec13e3` has the identical message (squashed); primary confirmed merged PR #84 | safe-to-delete | `git branch -D` (squash merge, no ancestry) |
| `t3/346e8a09` | yes (`git branch --merged main`; primary: `--is-ancestor` exit 0) | exit 0 | Tip `0ebfcc95 Merge pull request #18 from mansyar/battle_animation_overhaul_20261012` is an ancestor of `main` and the three-way diff is empty; primary: no merged PR with this head | safe-to-delete | `git branch -d` (ancestry proof) |
| `t3/opening-command` | yes (`git branch --merged main`; primary: `--is-ancestor` exit 0) | exit 0 | Tip `07cee38d refactor(client): scene architecture pass II - decompose scene/staging, shared battle session, HUD builders (#23)` is an ancestor of `main` and the three-way diff is empty; primary: no merged PR with this head | safe-to-delete | `git branch -d` (ancestry proof) |
| `feat/20261110-battle-variance` | no (primary: `--is-ancestor` exit 1) | exit 1 | `git diff --stat main...feat/20261110-battle-variance`: 33 files, 1748 insertions(+), 201 deletions(-), including `packages/sim/src/battle/continuous/controller-noise.ts` and unique track docs. Branch-tip `metadata.json`: `pr_state: null`, `pr_url: null`, `status: "in_progress"`, `base_sha: d7e5af3c4427acf87670ad8ebde467fc12331c9f`, `last_checkpoint: 03bbb4d0`; no `pr.md` on the branch. The `#68` squash on `main` (`e3b9d48c` + `645142bc`) is different work and is not this branch. Branch tip `7a08d427 docs(conductor): Record the variance track frontier and close-out`; primary: no merged PR with this head. | **preserve** | none — unique content and no matching merged PR |

PR proof is now dual-sourced: local `main` history (squash commits plus `conductor(done)` records) and the primary's `gh pr list` re-run. Current branch `chore/20261123-repo-hygiene-cleanup` and `main` are never candidates.

## Artifact baseline table

Fresh counts at verification; nothing deleted. Prior archived inventory (`20261123-doc-truth-sweep` §8 / `stale-inventory.md`) recorded 8 branches, 39 stale run dirs, 37 stale run JSON, 75 `.log`, 1 `.err`, and 3 extra briefs; fresh counts differ only by the current run's directory and JSON (and one additional `.json` from later drift).

| Category | Fresh total | Stale candidates after exclusions | Exclusions / notes | Source command |
|---|---|---|---|---|
| Local branches | 10 | 8 (7 safe-to-delete, 1 preserve) | Exclude `main` and current track branch | `git for-each-ref --format='%(refname:short)' refs/heads` (primary); `git branch --list` |
| Remote heads | 11 | 0 | All remotes out of scope (NFR-2/AC-4) | `git ls-remote --heads origin` |
| `.conductor/runs/` directories | 41 | 40 | Exclude current `20261123-repo-hygiene-cleanup/`; `20261123-doc-truth-sweep/` is now stale as a run dir but its `.conductor/evidence/20261123-doc-truth-sweep/**` evidence must be preserved | native directory read of `.conductor/runs` |
| `.conductor/runs/*.json` | 39 | 38 | Exclude current `20261123-repo-hygiene-cleanup.json`; preserve any JSON referenced by archived verification docs | same directory read |
| Extra brief `.md` in `.conductor/runs/` | 3 | 3 | `20261027-ui-cleanliness-clarity-pass-phase-{2,3,4}-brief.md` | same directory read |
| `.conductor/*.log` (root) | 14 | 14 | `build-integrated.log`, `build-p3-final.log`, `build.log`, `build5.log`, `p1-server.log`, `p4-matrix.log`, `review-verify.log`, `vite-dev-5175.log`, `vite-dev.log`, `verify-integrated.log`, `verify-p3-final.log`, `verify-p3.log`, `verify.log`, `verify5.log` | glob `**/*.log` under `.conductor/` |
| `.conductor/evidence/**/*.log` | 61 | 61 (cross-check docs references before any deletion) | Includes `.conductor/evidence/tmp/calls.log` and `tmp/gate/calls.log`; archived reports may reference individual logs | same glob |
| `.err` | 1 | 1 | `.conductor/evidence/dev-server.err` | glob `**/*.err` under `.conductor/` |
| `.conductor/` root scratch files | 10 | 10 (cross-check docs references) | `detail-tabs-390-growth.png`, `detail-tabs-390.png`, `p1-visual.sqlite`, `phase-2-brief.md`, `phase-3-brief.md`, `phase-4-brief.md`, `probe-390.mjs`, `scratch-battle-choreography-plan.md`, `scratch-battle-choreography.md`, `scratch-test-suite-speedup.md` | native directory read of `.conductor/` |
| `.conductor/backups/` | 2 directories | 2 (cross-check docs references) | `agents-v2.2-20261108-151238`, `conductor-v1-20261020-103647` | native directory read |
| `.conductor/evidence/` entries | 260 | 0 classified stale in Phase 1 | Preserve all docs-referenced artifacts (NFR-4), including `20261123-doc-truth-sweep/**`, `20261123-repo-hygiene-cleanup/**`, and named probes/phase reports; deletion decisions deferred to Phase 2 with per-path proof | native directory read + docs-reference cross-check |
| Tracked files under `.conductor/` | 7 | 0 | Six `20261117-polish-showcase/phase-5-*.png` and `.conductor/media/20261117-polish-showcase/phase-5-cup-run.gif` — must never be deleted | `git ls-files .conductor` |

`git check-ignore` was confirmed by the primary (exit 0): `.conductor/runs`, `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`, and `.conductor/verify.log` are all ignored.

## Evidence paths

- This report: `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md`
- Raw command outputs: `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`
- Referenced prior reports: `conductor/archive/20261123-doc-truth-sweep/verification/integrated.md` §8–§9; `.conductor/evidence/20261123-doc-truth-sweep/stale-inventory.md`
- No screenshots apply (read-only inventory; no user-facing change).

## Deviations

- Seven commands (`git for-each-ref`, `git merge-base --is-ancestor`, `git merge-base`, `gh pr list`, `git check-ignore`, `bun run gate:determinism`, `bun run test:fuzz`) were permission-denied in the subagent executor and were not retried or wrapped there. Permitted equivalents supplied interim proof; the primary then re-ran all seven verbatim at HEAD `52f086e…` with exit 0, and this report uses those results.
- No files outside the two evidence paths above were written; no Conductor state, source, config, or product docs were changed.

## Notes

- **No branch, file, directory, remote ref, tag, or artifact was deleted in Phase 1.**
- Branch classification is proof-only: 7 safe-to-delete (5 squash-merge PRs #62/#63/#64/#83/#84; 2 ancestor + empty-diff `t3/*`), 1 preserve (`feat/20261110-battle-variance`).
- The five safe-to-delete PR branches have no ancestry on `main` (squash merges), so Phase 2 will need `git branch -D` with the PR proof recorded here; the two `t3/*` branches qualify for `git branch -d`.
- All five configured verification commands exited 0; determinism hash is `0xff6f3d62` in `bun run verify`.
- All seven handoff blockers are resolved by primary re-run; no blockers remain for Phase 1.

## Primary verification (final tree, HEAD 52f086e)

The primary re-ran the seven commands denied in the subagent executor verbatim on evidence HEAD `52f086e2112052f9d5130dcca8666f937a9aaca6`; all returned success. No deletion was performed.

### Configured verification commands (five)

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests across 437 files; Biome checked 1035 files; determinism gate OK; final hash `0xff6f3d62` |
| 2 | `bun run build` | 0 | 438 modules transformed in 1.21s; chunk-size warning only |
| 3 | `bun run balance` | 0 | 1680 matrix fights; cap share 370/1680 (22.0%); 34/34 gates `ok`; all boss gates `ok` |
| 4 | `bun run gate:determinism` | 0 | All 21 species × 3 stages byte-identical; 5 props digests match |
| 5 | `bun run test:fuzz` | 0 | 139 pass, 0 fail; 129015 `expect()` calls; 139 tests across 135 files [61.02s] |

### Handoff commands (seven)

| # | Command | Exit | Exact outcome |
|---|---|---|---|
| 1 | `git for-each-ref --format='%(refname:short)' refs/heads` | 0 | 10 branches: `chore/20261027-prod-api-wiring`, `chore/20261123-repo-hygiene-cleanup`, `feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`, `feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`, `fix/20261120-server-sim-runtime`, `main`, `t3/346e8a09`, `t3/opening-command` |
| 2 | `git merge-base --is-ancestor <branch> main` | 0 (harness); per-branch 1 / 0 | Exit 1 for six candidates (`chore/20261027-prod-api-wiring`, `feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`, `feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`, `fix/20261120-server-sim-runtime`); exit 0 for `t3/346e8a09`, `t3/opening-command` |
| 3 | `git merge-base <branch> main` | 0 | `chore/20261027-prod-api-wiring` = `3336f0b82e8878bbc96201afe023c6312fe840fc`; `feat/20261028-elemental-identity` = `751443c7fab78dfb83410e71211c94e2b0394e49`; `feat/20261028-fire-move-identity` = `50e083d887e36d408a6d640dcbe80cf30c390eef`; `feat/20261110-battle-variance` = `d7e5af3c4427acf87670ad8ebde467fc12331c9f`; `fix/20261120-server-image-sim-src` = `45211d831c1a860497cc8dc09755d70a892a645a`; `fix/20261120-server-sim-runtime` = `e5459deb4189166756e057262a6439c08aa92ffd`; `t3/346e8a09` = `0ebfcc955aaaa98a256a2aa1255a9ff59cf5180c`; `t3/opening-command` = `07cee38d54ce471d53a12111a4b0f434c8eb7648` |
| 4 | `gh pr list --state merged --head <branch> --json number,url` | 0 | PR #62 `https://github.com/mansyar/apex-league/pull/62` for `chore/20261027-prod-api-wiring`; #63 `feat/20261028-elemental-identity`; #64 `feat/20261028-fire-move-identity`; #84 `fix/20261120-server-image-sim-src`; #83 `fix/20261120-server-sim-runtime`; empty for `feat/20261110-battle-variance` and both `t3/*` branches — confirming 7 safe-to-delete, 1 preserve |
| 5 | `git check-ignore .conductor/runs .conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md .conductor/verify.log` | 0 | All three paths listed as ignored |
| 6 | `bun run gate:determinism` | 0 | All 21 species × 3 stages byte-identical; 5 props digests match |
| 7 | `bun run test:fuzz` | 0 | 139 pass, 0 fail; 129015 `expect()` calls; 139 tests across 135 files [61.02s] |

### Blockers resolution

Prior blockers B1–B7 are all **resolved by primary re-run** at HEAD `52f086e…` (handoff table above, all exit 0). No blockers remain. No branch, file, directory, ref, or artifact has been deleted.

**Verdict: Phase 1 accepted.**

## Primary verification (final tree, Phase 1 squash)

The primary independently re-ran all five configured verification commands on the final evidence tree; all exited 0. Raw output: `C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-p1-final\`.

| Command | Exit | Result |
|---|---|---|
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, hash `0xff6f3d62` |
| `bun run build` | 0 | Vite, 438 modules |
| `bun run balance` | 0 | 1680 fights, capShare 370/1680 (22.0%), 34/34 gates |
| `bun run gate:determinism` | 0 | 21 species x 3 stages byte-identical; 5 props digests match |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |

Scope check: commits since phase base touch only `verification/phase-1.md`; the tracked source and config trees are unchanged. No deletion was performed in Phase 1.
