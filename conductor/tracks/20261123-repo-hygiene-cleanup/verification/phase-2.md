# Phase 2 Verification — Proof-backed deletion and artifact pruning

- **Track:** `20261123-repo-hygiene-cleanup` (Repository Hygiene Cleanup)
- **Phase:** 2 — Proof-backed deletion and artifact pruning
- **Date:** 2026-11-24
- **Branch:** `chore/20261123-repo-hygiene-cleanup`
- **Phase base commit:** `a9fda2440335cc20776f165accea74e3805eaef7`
- **Head commit at primary verification:** `661409115a62bcdf71668827dd92b1ed9c82e010` (evidence commit; one evidence-only documentation commit follows this report update)
- **Plan/diff base:** `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`
- **Covers:** FR-3, FR-4, NFR-1, NFR-2, NFR-3, NFR-4, AC-2, AC-3, AC-4, AC-5

## Result

**VERIFIED (by primary).** The proof-backed local-branch deletion (P2.T1) completed exactly as
allowlisted. The primary re-ran every command that the executor had denied in the phase
executor's permission layer — all artifact pruning groups and the two standalone verification
commands — on HEAD `66140911`. All artifact classes were pruned (`REMOVED_TOTAL=169`), all five
configured verification commands exited 0 on the final tree, the remote-head list was unchanged
(remote head diff count = 0), exactly the three protected local branches remain, and the tracked
tree is clean. No remote ref, tracked file, evidence reference, or unproven branch was touched.

## 1. Deleted branches (P2.T1)

Seven local branches deleted; each proof comes from the read-only Phase 1 record.

| Branch | Proof | Command(s) used | Result |
|---|---|---|---|
| `chore/20261027-prod-api-wiring` | merged PR #62 (squash) | `git branch -d chore/20261027-prod-api-wiring` | deleted (warning: merged to its remote-tracking ref, not HEAD); exit 0 |
| `feat/20261028-elemental-identity` | merged PR #63 (squash) | `git branch -d feat/20261028-elemental-identity` | deleted (same warning); exit 0 |
| `feat/20261028-fire-move-identity` | merged PR #64 (squash), head `81ec4af6` | `git branch -d ...` → exit 1 "not fully merged"; then `git branch -D feat/20261028-fire-move-identity` | deleted; exit 0 |
| `fix/20261120-server-image-sim-src` | merged PR #84 (squash) | `git branch -d fix/20261120-server-image-sim-src` | deleted (same warning); exit 0 |
| `fix/20261120-server-sim-runtime` | merged PR #83 (squash) | `git branch -d fix/20261120-server-sim-runtime` | deleted (same warning); exit 0 |
| `t3/346e8a09` | ancestor of `main`, empty diff | `git branch -d t3/346e8a09` | deleted; exit 0 |
| `t3/opening-command` | ancestor of `main`, empty diff | `git branch -d t3/opening-command` | deleted; exit 0 |

Six branches were deleted with `-d`. Only `feat/20261028-fire-move-identity` required the `-D`
escalation, permitted by the brief because Phase 1 records merged PR #64 with matching head
`81ec4af69edf2bbf9cf50a2fcaf35e404eadea18`. No other branch used `-D`, and no deletion denial
required escalation without proof.

`git branch --list` after deletion (exit 0) contained exactly the three preserved branches.

## 2. Preserved branches (P2.T1.2)

| Branch | Reason preserved |
|---|---|
| `main` | Default branch; never delete. |
| `chore/20261123-repo-hygiene-cleanup` | Current track branch; explicitly protected. |
| `feat/20261110-battle-variance` | Unproven: blocked/unmerged track, 33 unique files, `pr_state: null`, `status: in_progress`, no matching merged PR (the #68 squash is different work). |

## 3. Artifact before/after counts (P2.T2)

Baseline stale counts from Phase 1 / `stale-inventory.md`; after counts from the primary's
verification on the final tree. Every enumerated stale path was removed with
`Remove-Item -LiteralPath` (directories with `-Recurse -Force`); `REMOVED_TOTAL=169`.

| Artifact class | Stale before | Stale after | Exclusions / notes |
|---|---|---|---|
| Stale directories under `.conductor/runs/` | 40 | 0 | current `20261123-repo-hygiene-cleanup/` preserved (verified present) |
| Stale `.json` files under `.conductor/runs/` | 38 | 0 | current `20261123-repo-hygiene-cleanup.json` preserved (verified present) |
| Extra phase-brief `.md` under `.conductor/runs/` | 3 | 0 | none in scope |
| `.log` files directly under `.conductor/` | 14 | 0 | none in scope |
| `.log` files under `.conductor/evidence/` (incl. `tmp/calls.log`, `tmp/gate/calls.log`) | 61 | 0 | none in scope |
| `.conductor/evidence/dev-server.err` | 1 | 0 | none in scope |
| Root scratch files under `.conductor/` | 10 | 0 | none in scope |
| Stale `.conductor/backups/` directories | 2 | 0 | none in scope |
| Tracked files under `.conductor/` (`git ls-files`) | 7 | 7 | all tracked files preserved; not in scope |
| **Total stale artifacts removed** | **169** | **0** | — |

The current evidence directory `.conductor/evidence/20261123-repo-hygiene-cleanup/` was verified
present after pruning. The seven tracked `.conductor/` files (6 PNGs under
`.conductor/evidence/20261117-polish-showcase/` and
`.conductor/media/20261117-polish-showcase/phase-5-cup-run.gif`) were at no point in scope.

### Evidence-reference cross-check

Archived verification reports narratively mention some `.log` paths (e.g.
`.conductor/evidence/vK1.log`, `vK2.log`, `bK1.log`, `bK2.log`, `vR2b.log`,
`.conductor/review-verify.log`), but their evidential pass/fail values are printed in the tracked
report text itself. The owner-confirmed `20261123-doc-truth-sweep/stale-inventory.md` classifies
all 75 `.log` files as stale scratch, and the Phase 2 allowlist authorizes deleting every `.log`
under `.conductor/` and `.conductor/evidence/`. Only `.log` and `.err` classes were pruned;
genuine archived evidence (`.png`, `.ts`, `.cjs`, `.md`, `.gif`) and all tracked report text were
preserved, so no evidence reference was deleted or broken.

## 4. Remote-head before/after proof (P2.T3.1)

`git ls-remote --heads origin` was run before and after all deletions. Both invocations exit 0
and returned the identical 11-head list; `main` remained `1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`.
The primary confirmed a remote head diff count of 0. The full verbatim list is in
`evidence/phase-2-command-outputs.md`. **No remote branch, tag, or ref was mutated.**

`git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps` exited 0 with
no output both before and after. `git status --porcelain` exited 0 with no output after the
deletions. **No tracked source file changed.**

## 5. Verification command table (P2.T3.2)

Commands were run separately. The phase executor ran the first three; the primary re-ran all
five on the final tree. Exact exit codes recorded.

| Command | Exit | Decisive result |
|---|---|---|
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests / 437 files; Biome 1035 files clean; determinism gate OK (21 species × 3 stages + 5 props); 5 invariants `ok`; final hash `0xff6f3d62` |
| `bun run build` | 0 | 438 modules transformed; built in 478 ms; exit 0 |
| `bun run balance` | 0 | 1680 fights; cap share 370/1680 (22.0%); 34/34 gates `ok` |
| `bun run gate:determinism` | 0 | primary, final tree: byte-identical 21 species × 3 stages + 5 props |
| `bun run test:fuzz` | 0 | primary, final tree: 139 pass / 0 fail, 129015 `expect()` calls |

## 6. Acceptance-criteria table

| AC | Requirement | Evidence | Status |
|---|---|---|---|
| AC-2 | Only proof-backed stale local branches deleted | §1 table: 7 branches, each with Phase 1 proof; 6 via `-d`, 1 escalated `-D` with merged-PR proof | **pass** |
| AC-3 | Unproven branches preserved | §2 table: `main`, current branch, and `feat/20261110-battle-variance` all present in final `git branch --list` | **pass** |
| AC-4 | Stale gitignored run/log artifacts pruned with evidence references preserved | §3: 169 stale artifacts removed, 0 remaining; current run artifacts and all non-`.log`/`.err` evidence preserved | **pass** |
| AC-5 | Deletion is owner-confirmed and proof-backed; no tracked file or remote ref touched | Owner confirmation in Phase 1 / `stale-inventory.md`; §4: remote head diff 0, tracked tree clean, source diff exit 0 | **pass** |

## 7. Deviations

None requiring product or design decisions. Two clarifications are recorded:

1. **Deletion method.** Six branches used `git branch -d` and were deleted (four squash-merge
   branches had merged remote-tracking refs, so `-d` sufficed). Only
   `feat/20261028-fire-move-identity` used `git branch -D`, with recorded merged PR #64 proof
   and matching head `81ec4af69edf2bbf9cf50a2fcaf35e404eadea18`. No other `-D` was used.
2. **Archived `.log` narrative references.** Reconciled: no archived evidence was deleted because
   only `.log`/`.err` classes were pruned, and the evidential values they carried remain in
   tracked report text. Screenshot/probe evidence was excluded and preserved.

## 8. Blockers — resolved by primary

All commands initially rejected by the executor permission layer were re-run verbatim by the
primary on HEAD `66140911`. None remain open.

| # | Previously denied group | Resolution by primary |
|---|---|---|
| B1 | Enumerated stale run dirs / `.json` / brief `.md` pruning | removed; after counts 0, current run preserved |
| B2 | Single exact-path scratch deletion | covered by the primary's full scratch-class pruning; after count 0 |
| B3 | Stale `.log` / `.err` / backup pruning | removed; after counts all 0 (`REMOVED_TOTAL=169`) |
| B4 | `bun run gate:determinism` | exit 0; byte-identical 21 species × 3 stages + 5 props |
| B5 | `bun run test:fuzz` | exit 0; 139 pass / 0 fail, 129015 `expect()` calls |

## 9. Evidence paths

- Phase 1 baseline, branch proof table, exclusions: `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-1.md`
- Owner-confirmed stale inventory: `.conductor/evidence/20261123-doc-truth-sweep/stale-inventory.md`
- Phase 1 raw command outputs and remote-head baseline: `.conductor/evidence/20261123-repo-hygiene-cleanup/command-outputs.md`
- Phase 2 raw command outputs: `.conductor/evidence/20261123-repo-hygiene-cleanup/phase-2-command-outputs.md`
- Primary verification raw outputs: `C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-p2-primary\`
- This report: `conductor/tracks/20261123-repo-hygiene-cleanup/verification/phase-2.md`

## Final verdict

**Phase 2 accepted.** All seven allowlisted local branches were deleted with the required proof
discipline and the three protected branches remain; all 169 stale gitignored artifacts were
pruned while current-run artifacts, tracked files, and all non-`.log`/`.err` evidence were
preserved; all five configured verification commands exited 0 on the final tree; remote heads
were unchanged and the tracked source tree is clean. No deviation requires follow-up and no
blocker remains open.

## Primary verification (final tree, HEAD 66140911)

Re-run by the primary on the final tree after all executor-denied commands were executed.

### Deletion table

| Branch | Proof | Method | Result |
|---|---|---|---|
| `chore/20261027-prod-api-wiring` | merged PR #62 | `-d` | deleted |
| `feat/20261028-elemental-identity` | merged PR #63 | `-d` | deleted |
| `feat/20261028-fire-move-identity` | merged PR #64, head `81ec4af6` | `-d` failed → `-D` | deleted |
| `fix/20261120-server-image-sim-src` | merged PR #84 | `-d` | deleted |
| `fix/20261120-server-sim-runtime` | merged PR #83 | `-d` | deleted |
| `t3/346e8a09` | ancestor of `main`, empty diff | `-d` | deleted |
| `t3/opening-command` | ancestor of `main`, empty diff | `-d` | deleted |

Total deleted: 7. Only `feat/20261028-fire-move-identity` used `-D`, with recorded PR #64 proof.

### Artifact before/after table

| Class | Before (stale) | After | Preserved |
|---|---|---|---|
| Stale run directories | 40 | 0 | current run dir present |
| Stale run JSON | 38 | 0 | current run JSON present |
| Extra phase-brief `.md` | 3 | 0 | — |
| Root `.log` | 14 | 0 | — |
| Evidence `.log` | 61 | 0 | — |
| `.err` | 1 | 0 | — |
| Root scratch files | 10 | 0 | — |
| Backup directories | 2 | 0 | — |
| **Total** | **169** | **0** | current evidence dir present |

### Remote proof

`git ls-remote --heads origin` before and after: identical 11-head list; `main` =
`1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5`; remote head diff count = 0.

### Preserved branches

`chore/20261123-repo-hygiene-cleanup`, `feat/20261110-battle-variance`, `main` — exactly these
three remain.

### Five-command table

| Command | Exit | Result |
|---|---|---|
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; hash `0xff6f3d62` |
| `bun run build` | 0 | success |
| `bun run balance` | 0 | 1680 fights; capShare 370/1680 (22.0%); 34/34 gates |
| `bun run gate:determinism` | 0 | byte-identical 21 species × 3 stages + 5 props |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 `expect()` calls |

Source diff `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps`
exit 0. Working tree clean. HEAD unchanged at `66140911` during primary verification.

### Raw output directory

`C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-p2-primary\`

### Final verdict

**Phase 2 accepted.**

## Primary verification (final evidence tree, HEAD `534668ec`)

| Command | Exit | Result |
|---|---|---|
| `bun test packages/sim/src/cup/gatekeeper-reach.test.ts --timeout 120000` | 0 | 10 pass / 0 fail; 1011 `expect()` calls in 8.27 s |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; hash `0xff6f3d62` |
| `bun run build` | 0 | Vite build success |
| `bun run balance` | 0 | 1680 fights; capShare 370/1680 (22.0%); 34/34 gates |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 `expect()` calls |

One earlier `bun run verify` on this same tree was red only because the known `gatekeeper-reach.test.ts` "a real climb reaches the authored final and fights it for real" case timed out after 60 s (`65552.14ms`) under load; the same test passed 10/0 in isolation in 8.27 s, and a clean full `bun run verify` then exited 0 with the counts above. Working tree clean; branches are exactly `main`, `chore/20261123-repo-hygiene-cleanup`, and `feat/20261110-battle-variance`. Raw output: `C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-p2-final2\`. Phase 2 accepted on the final evidence tree.
