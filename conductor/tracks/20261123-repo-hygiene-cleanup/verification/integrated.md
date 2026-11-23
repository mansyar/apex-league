# Integrated Evidence — Repository Hygiene Cleanup

| Field | Value |
| --- | --- |
| Track | `20261123-repo-hygiene-cleanup` (Repository Hygiene Cleanup) |
| Phase | 3 — Final verification and integrated evidence |
| Date | 2026-11-24 |
| Branch | `chore/20261123-repo-hygiene-cleanup` |
| Base (`main`, plan/diff base) | `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5` |
| Phase 1 checkpoint | `1f8ab49b` — read-only baseline and safety proofs; no deletions |
| Phase 2 checkpoint | `04d3d5a7` — seven proof-backed local branches deleted; 169 stale gitignored artifacts removed |
| Phase 3 base / HEAD at execution | `2cc9bc46ae88ae8a9040453e1c7e647db8761447` |
| Final checkpoints | Phase 1 `1f8ab49b`; Phase 2 `04d3d5a7`; Phase 3 evidence commit `d2085e51ac04a469f1bb4187630ea6cc84867435` (primary final tree) |
| Covers | FR-5, FR-6, NFR-5, NFR-6, NFR-7, AC-6, AC-7, AC-8, AC-9 (AC-1..AC-5 consolidated below from Phases 1–2) |
| Result | **VERIFIED (by primary, final tree `d2085e51`)** — all configured checks exit 0 with sim hash `0xff6f3d62`; integrated audit complete; no open blockers. |

## 1. Track summary

This chore closed the confirmation-gated follow-up recorded by `20261123-doc-truth-sweep`. Phase 1 captured a read-only baseline and classified eight candidate local branches (7 safe, 1 preserve). Phase 2 deleted exactly the seven proof-backed branches and pruned exactly 169 stale gitignored artifacts while preserving current-run state, tracked files, and all archived evidence references. Phase 3 (this record) re-verifies the final tree, integrates all commands, counts, hashes, inventories and scope proofs, and records the outcome. **No source, config, gate, fence, version, save-schema, protocol, dependency, CORS, deploy, product, tech-stack, workflow, style-guide or other Conductor-state file was changed by this track.** The source tree (`apps/`, `packages/`) is byte-identical to the track base.

## 2. Before/after inventories

### 2.1 Local branches

| Snapshot | Branches | Count |
| --- | --- | --- |
| Before (Phase 1 baseline) | `chore/20261027-prod-api-wiring`, `chore/20261123-repo-hygiene-cleanup`, `feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`, `feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`, `fix/20261120-server-sim-runtime`, `main`, `t3/346e8a09`, `t3/opening-command` | 10 |
| After (Phase 2, re-verified Phase 3) | `main`, `chore/20261123-repo-hygiene-cleanup`, `feat/20261110-battle-variance` | 3 |

Source commands: `git for-each-ref --format='%(refname:short)' refs/heads` / `git branch --list` (final re-run exit 0). Net: 7 deleted, 3 preserved.

### 2.2 Gitignored artifacts

| Artifact class | Before (stale) | After | Preserved / notes |
| --- | --- | --- | --- |
| Stale directories under `.conductor/runs/` | 40 | 0 | current `20261123-repo-hygiene-cleanup/` present |
| Stale `.json` under `.conductor/runs/` | 38 | 0 | current `20261123-repo-hygiene-cleanup.json` present |
| Extra phase-brief `.md` under `.conductor/runs/` | 3 | 0 | — |
| `.log` at `.conductor/` root | 14 | 0 | `.conductor/` root now holds only 5 directories |
| `.log` under `.conductor/evidence/` | 61 | 0 | includes former `tmp/calls.log`, `tmp/gate/calls.log` |
| `.err` | 1 | 0 | former `.conductor/evidence/dev-server.err` |
| Root scratch files under `.conductor/` | 10 | 0 | — |
| Stale `.conductor/backups/` directories | 2 | 0 | empty `backups/` container remains |
| **Total stale artifacts removed** | **169** | **0** | — |
| Tracked files under `.conductor/` | 7 | 7 | never in scope |
| `.conductor/evidence/` entries | 260 (baseline) | 201 (current) | reduction is `.log`/`.err` classes only; all screenshots, probes and archived evidence retained |

Post-cleanup checks used native `read`/`glob`: `.conductor/runs/` has exactly 2 entries (current dir + current JSON); glob `.conductor/**/*.log` and `.conductor/**/*.err` return no files; `.conductor/evidence/20261123-repo-hygiene-cleanup/` still holds `command-outputs.md` and `phase-2-command-outputs.md`; `.conductor/evidence/20261123-doc-truth-sweep/` still holds all 9 archived files.

### 2.3 Remote heads

`git ls-remote --heads origin` returned the identical 11-head list before and after (exit 0 both times), with `main` at `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`. Byte-for-byte comparison against the Phase 1 baseline in `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`: all 11 lines match; remote head diff count = 0. Deleted local branches still have their remote-tracking refs. **No remote branch, tag or ref was deleted or rewritten.**

## 3. Branch deletion and preservation proof

| Branch | Proof (Phase 1) | Method (Phase 2) | Outcome |
| --- | --- | --- | --- |
| `chore/20261027-prod-api-wiring` | merged PR #62 (squash) | `git branch -d` | deleted, exit 0 |
| `feat/20261028-elemental-identity` | merged PR #63 (squash) | `git branch -d` | deleted, exit 0 |
| `feat/20261028-fire-move-identity` | merged PR #64 (squash), head `81ec4af6` | `-d` failed → `git branch -D` | deleted, exit 0 |
| `fix/20261120-server-image-sim-src` | merged PR #84 (squash) | `git branch -d` | deleted, exit 0 |
| `fix/20261120-server-sim-runtime` | merged PR #83 (squash) | `git branch -d` | deleted, exit 0 |
| `t3/346e8a09` | ancestor of `main`, empty diff (`--is-ancestor` 0, `--quiet` 0) | `git branch -d` | deleted, exit 0 |
| `t3/opening-command` | ancestor of `main`, empty diff (`--is-ancestor` 0, `--quiet` 0) | `git branch -d` | deleted, exit 0 |

Only `feat/20261028-fire-move-identity` required `-D`, permitted by the recorded merged PR #64 with matching head. No other `-D` was used.

| Preserved branch | Reason |
| --- | --- |
| `main` | Default branch; never a candidate. |
| `chore/20261123-repo-hygiene-cleanup` | Current track branch; explicitly protected. |
| `feat/20261110-battle-variance` | Unproven: blocked/unmerged track, 33 unique files (1748+/201-), `pr_state: null`, `pr_url: null`, `status: in_progress`, no matching merged PR (the #68 squash is different work). |

**Artifact preservation statement:** current-run dir/JSON/evidence, all seven tracked `.conductor/` files, all archived verification reports, and all non-`.log`/`.err` evidence (`.png`, `.ts`, `.cjs`, `.md`, `.gif`, probe scripts) were preserved. Only enumerated `.log`/`.err`/stale-run/scratch/backup classes were pruned; archived `.log` narrative mentions had their evidential values already recorded in tracked report text.

## 4. Exact commands, exit codes and counts

Commands were invoked separately (no `&&`, no pipe, no wrapper). Raw output: `.conductor/evidence/20261123-repo-hygiene-cleanup/phase-3-command-outputs.md`. Rows marked *executor (historical)* are retained as context; the authoritative final-tree results are in the Primary verification section and §9.

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `bun run verify` — executor (historical) | 1 | Known load-induced timeout only: `gatekeeper-reach.test.ts` 60 s timeout at 63098.19 ms. 4458 pass / 1 skip / 1 fail, 670479 `expect()` calls, 4460 tests / 437 files. `final hash 0xff6f3d62`; determinism gate and 5 invariants `ok` inside the same run. No other failure. |
| 1b | `bun test packages/sim/src/cup/gatekeeper-reach.test.ts --timeout 120000` — executor (historical) | 0 | Isolated once per brief: 10 pass / 0 fail, 1011 `expect()` calls, 47.62 s. |
| 1c | `bun run verify` — primary clean re-run | 0 | Final tree `d2085e51`: 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, sim hash `0xff6f3d62`. |
| 2 | `bun run build` | 0 | Vite 8.3.4; 438 modules transformed; built in 530 ms; pre-existing >500 kB chunk warning only. |
| 3 | `bun run balance` | 0 | 21 species, 1680 fights (ko 1306, time 370, draw 4); cap share 370/1680 (22.0%); decisive 1598/1680 (95.1%); median 32.80 s; max 45.00 s; 34/34 gates `ok` incl. all six bosses. |
| 4 | `bun run gate:determinism` — primary re-run | 0 | 21 species × 3 stages byte-identical; 5 props digests match. (Executor had a `permission.rejected` denial, resolved by primary.) |
| 5 | `bun run test:fuzz` — primary re-run | 0 | 139 pass / 0 fail, 129015 `expect()` calls, 139 tests across 135 files. (Executor had a `permission.rejected` denial, resolved by primary.) |
| 6 | `git diff --check 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD` | 0 | No output; no whitespace errors. |
| 7 | `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps` | 0 | No output; source diff empty. |
| 8 | `git status --porcelain` | 0 | Clean at execution and after the evidence commit; re-checked clean by primary on the final tree. |
| 9 | `Test-Path conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md` — primary re-run | True | File exists. (Executor had a `permission.rejected` denial, resolved by primary.) |
| 10 | `git branch --list` | 0 | Exactly the three protected branches. |
| 11 | `git ls-remote --heads origin` | 0 | 11 heads, byte-identical to baseline; diff count 0. |
| 12 | `git diff --stat 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD` | 0 | 7 files: this track's Conductor scaffold/verification + registry line; no `apps/`/`packages/`. |

Historical reference counts (Phases 1–2, primary-verified): `bun run verify` 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, hash `0xff6f3d62`; `bun run balance` 1680 fights, 34/34 gates; `bun run gate:determinism` byte-identical 21 species × 3 stages + 5 props; `bun run test:fuzz` 139 pass / 0 fail, 129015 `expect()` calls. All of these were re-confirmed on the final tree by the primary (§9, Primary verification section).

## 5. Module caps and unchanged contracts

- **12,288 B** (`12 * 1024`) for every module in `apps/client` and `packages/sim`; **24,576 B** (`24 * 1024`) for `packages/voxel`. No name allowlist and no per-folder exception in any of the three guards (verified by native grep). No cap raised, no allowlist added.
- The brief's "client/sim/server" wording is recorded verbatim; the enforced caps live in the three `module-size.test.ts` guards above. No server module-size guard exists to change, and the source diff is empty regardless.
- No voxel artifact, source, test, gate, fence, `SIM_VERSION` (4), ghost pins (4/5), save schema, protocol, dependency, CORS or deploy file changed. Battle hash `0xff6f3d62`; trace hash `0x1d0cc2ed` unchanged from earlier tracks.

## 6. Scope proof

`git diff --stat 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD` lists exactly seven files:

```
conductor/tracks.md
conductor/tracks/20261123-repo-hygiene-cleanup/index.md
conductor/tracks/20261123-repo-hygiene-cleanup/metadata.json
conductor/tracks/20261123-repo-hygiene-cleanup/plan.md
conductor/tracks/20261123-repo-hygiene-cleanup/spec.md
conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md
conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-2.md
```

plus this phase's two verification reports added by the Phase 3 evidence commit. `conductor/tracks.md` carries only this track's `[~] Track: Repository Hygiene Cleanup` registry marker; the primary restored the adjacent `Documentation Truth Sweep` line to its original em-dash formatting, so the final registry diff adds only this track's line. No `apps/`, `packages/`, gate, fence, config, dependency, product doc, tech-stack, workflow, style guide, archived track, `review.md` or `pr.md` appears. `git status --porcelain` is empty before and after the evidence commit and on the primary's final tree. `git diff --check` exits 0.

## 7. Acceptance criteria (AC-1..AC-9)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Committed baseline inventory with counts and source commands | Phase 1 §branch/artifact tables, commands table, `command-outputs.md`; §2 above | **met** |
| AC-2 | Every deleted branch has recorded merge/safety proof | §3 deletion table: 7 branches, 6 `-d` + 1 `-D` with merged PR #64 proof | **met** |
| AC-3 | Every preserved branch listed with a reason; unique/unproven branches remain | §3 preservation table; `git branch --list` re-verified in Phase 3 | **met** |
| AC-4 | No remote branch list changed; no remote deletion/rewrite | §2.3: 11-head list byte-identical before/after, diff count 0 | **met** |
| AC-5 | Final artifact inventory shows pruned counts; current-track and archived evidence preserved | §2.2 + artifact preservation statement in §3 | **met** |
| AC-6 | Configured verification commands all exit 0 with hash `0xff6f3d62` | Primary clean re-run: verify exit 0, 4459 pass / 1 skip / 0 fail, hash `0xff6f3d62`; determinism and fuzz exit 0 on the final tree. | **met** |
| AC-7 | Source diff empty and worktree clean after completion commit | #7/#8 exit 0; re-checked clean after evidence commit and by primary | **met** |
| AC-8 | `verification/integrated.md` committed with commands, inventories, proofs, verdict | This file; primary `Test-Path` -> `True` | **met** |
| AC-9 | No product, tech-stack, workflow, style-guide, registry or other Conductor-state change beyond this track | §6: 7 files + 2 Phase 3 reports; only this track's registry line added | **met** |

## 8. Thin-slice limitations

- Remote refs were left untouched by design; only local branches and gitignored artifacts were in scope. Remote head list was observed, never mutated.
- `feat/20261110-battle-variance` was preserved because its uniqueness is unproven; no deletion decision was made about it.
- No cleanup of anything not enumerated in the owner-confirmed inventory was attempted; all seven deletions and all 169 artifact removals trace to Phase 1 proof and the Phase 2 allowlist.
- The executor's three permission denials and the load-induced `gatekeeper-reach.test.ts` 60 s timeout were all resolved by the primary on the final tree (§9); none remain open. The historical executor results are retained in §4 as context only.
- Provenance of historical counts and deletion proofs rests on the committed Phase 1/2 reports and the archived doc-truth-sweep inventory; only safe-to-recheck facts were re-observed here.
- Screenshots: **N/A** — documentation/evidence-only phase with no user-facing change.

## 9. Resolved by primary — no open blockers

| # | Command | Primary result |
|---|---|---|
| B1 | `bun run gate:determinism` | resolved — exit 0; 21 species × 3 stages byte-identical, 5 prop digests match |
| B2 | `bun run test:fuzz` | resolved — exit 0; 139 pass / 0 fail, 129015 `expect()` calls, 139 tests / 135 files |
| B3 | `Test-Path conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md` | resolved — `True` |
| B4 | `bun run verify` (clean re-run on unloaded tree) | resolved — exit 0; 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, sim hash `0xff6f3d62` |

## 10. Final verdict

**VERIFIED by primary on the final tree `d2085e51ac04a469f1bb4187630ea6cc84867435` — integrated verification complete, no open blockers.** The repository is clean, the scope diff contains only this track's Conductor artifacts and the single added registry line, the source tree is byte-identical to base, all 169 stale artifacts remain pruned with current-run and archived evidence preserved, exactly the three protected branches remain, remote refs are untouched, module caps and the no-allowlist invariant are unchanged, and the sim hash `0xff6f3d62` is confirmed by a clean `bun run verify` (4459 pass / 1 skip / 0 fail). `bun run build`, `bun run balance`, `bun run gate:determinism` and `bun run test:fuzz` all exit 0. AC-1..AC-9 are all met; the track is ready for review. `Verdict: Phase 3 accepted`.

## Primary verification (final tree)

Raw output dir: `C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-p3-final\`

| Command | Exit | Result |
|---|---|---|
| `bun run gate:determinism` | 0 | All 21 species × 3 stages byte-identical; 5 props digests match |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls, 139 tests across 135 files |
| `Test-Path conductor/tracks/20261123-repo-hygiene-cleanup/verification/integrated.md` | True | File exists |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, sim hash `0xff6f3d62` |
| `git diff --check 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD` | 0 | No whitespace errors |
| `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps` | 0 | Empty source diff; `apps/` and `packages/` byte-identical to base |
| `git status --porcelain` | 0 | Empty — clean tree |

Local branches remain exactly three: `main`, `chore/20261123-repo-hygiene-cleanup`, `feat/20261110-battle-variance`. The registry diff adds only this track's `[~] **Track: Repository Hygiene Cleanup**` line; the adjacent doc-truth-sweep line is in its original em-dash formatting.

**Verdict: Phase 3 accepted.**
