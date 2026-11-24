# Phase 2 — Proof-backed disposition and stale artifact cleanup

- **Track:** `20261124-battle-variance-branch-resolution`
- **Phase:** 2 (Proof-backed disposition and stale artifact cleanup)
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-battle-variance-branch-resolution`
- **Base:** `main` @ `13172e387b633142f888f6eaba93feb944e80f0f`
- **Phase base / HEAD:** `4ffc6ea4fc4cf494ada3d04a55bc2271cc9496c4` (unchanged — this phase commits only evidence)
- **Result:** **verified** — the proof-backed local branch deletion, stale-file cleanup, boundary proofs and all five verification commands are green (hash `0xff6f3d62`). Shell denials inside the subagent were resolved by the primary fallback in §9; AC-3, AC-4, AC-5 and AC-6 are satisfied and the working tree is clean.

## 1. Disposition action (P2.T1, FR-3, AC-3)

Phase 1 returned verdict `delete-candidate` with first-class supersession proof
(`verification/phase-1.md` §2, §9). The branch was deleted locally; no remote ref,
other branch, or tracked file was touched.

| Step | Command | Exit | Result |
| --- | --- | --- | --- |
| Before list | `git branch --list` | 0 | `* chore/20261124-battle-variance-branch-resolution`, `feat/20261110-battle-variance`, `main` |
| Preferred deletion | `git branch -d feat/20261110-battle-variance` | 1 | `error: the branch 'feat/20261110-battle-variance' is not fully merged` (expected squash-merge condition) |
| Forced deletion | `git branch -D feat/20261110-battle-variance` | 0 | `Deleted branch feat/20261110-battle-variance (was 7a08d427).` |
| After list | `git branch --list` | 0 | `* chore/20261124-battle-variance-branch-resolution`, `main` — target branch absent |

**Force-rationale (recorded, no content lost):** `-d` fails only because the branch was
squash-merged, so Git cannot see it as an ancestor. Phase 1 proves supersession with three
independent exit-0 assertions: PR #68 squash `e3b9d48ce9187032b3f0f0620417d242f531465b`
is an ancestor of `main`; both distinctive files
`packages/sim/src/battle/continuous/controller-noise.ts` and `controller-noise.test.ts`
exist on `main`; and PR #68's body states "the variance track closes as superseded".
The branch's own four phases were all `blocked` with a red balance frontier, which PR #68's
roster re-tune closed (today's `bun run balance` is green). No unique non-superseded content
was found, so nothing is discarded. The preserve path (P2.T1.2) does not apply.

## 2. Artifact cleanup (P2.T2, FR-4, AC-4) — VERIFIED (primary fallback)

The exact-path removal prescribed by the brief was refused by the shell permission layer:

```
$ Remove-Item -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'
{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}
```

The two `Test-Path` checks and the `Get-ChildItem` inventory were refused with the same
verbatim envelope. No rephrase, substitute, or retry was attempted, per the brief.

Existence was instead read with the native `read` tool (not a shell command):

| Artifact | Before | After | Intended |
| --- | --- | --- | --- |
| `.conductor/runs/20261123-repo-hygiene-cleanup.json` | present | **absent** | delete — achieved by primary fallback (§9) |
| `.conductor/runs/20261124-battle-variance-branch-resolution.json` | present | present | preserve — achieved |

Preserved artifact inventory (unchanged): `.conductor/runs/20261123-repo-hygiene-cleanup/`,
`.conductor/runs/20261124-battle-variance-branch-resolution/`, both run JSON files, and
`.conductor/evidence/20261124-battle-variance-branch-resolution/{baseline,supersession,verification}/`.
No wildcard or recursive deletion was executed. The primary completed the exact-path removal in §9; the active run file and all other gitignored artifacts were preserved.

## 3. Boundary proof (P2.T3.1, NFR-2, NFR-3, AC-5)

- `git ls-remote --heads origin` was read before and after the disposition. Both returned
  the same 11 heads with byte-identical hashes (full values in
  `.conductor/evidence/20261124-battle-variance-branch-resolution/disposition/commands.txt`).
- `git diff --quiet 13172e387b633142f888f6eaba93feb944e80f0f..HEAD -- packages apps` exited 0
  with no output — empty source diff.
- `git status --porcelain` was empty both before and after the verification sweep — clean tree.
- No fetch, push, pull, merge, reset, rebase, checkout, switch, clean, remote-ref mutation,
  or git-config change was executed. Only the one named branch was deleted; no other branch,
  file, or artifact was mutated.

## 4. Commands table

All commands invoked separately; no pipes and no `&&` chaining. `denied` is the verbatim
`permission.rejected` / "Permission denied: shell" envelope.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| disposition | `git branch --list` (before/after) | 0 | Target branch present before, absent after. |
| disposition | `git branch -d feat/20261110-battle-variance` | 1 | "not fully merged" — expected squash condition. |
| disposition | `git branch -D feat/20261110-battle-variance` | 0 | Deleted (was `7a08d427`), force rationale in §1. |
| cleanup | `Test-Path -LiteralPath ...20261123-repo-hygiene-cleanup.json` | denied | Verbatim denial; native `read` used instead (still present). |
| cleanup | `Test-Path -LiteralPath ...20261124-battle-variance-branch-resolution.json` | denied | Verbatim denial; native `read`: present. |
| cleanup | `Get-ChildItem -LiteralPath '.conductor/runs' -Force \| Select-Object -ExpandProperty Name` | denied | Verbatim denial; native `read` directory listing used. |
| cleanup | `Remove-Item -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'` | denied → 0 (primary) | Subagent denial verbatim; primary fallback removed the file — AC-4 satisfied (§9). |
| boundary | `git ls-remote --heads origin` (before/after) | 0 | 11 heads byte-identical. |
| boundary | `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| boundary | `git status --porcelain` (before/after) | 0 | Clean tree. |
| verify | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; Biome 1036 files; determinism gate OK; hash `0xff6f3d62`. |
| build | `bun run build` | 0 | Vite 438 modules in 641 ms; standard chunk-size advisory only. |
| balance | `bun run balance` | 0 | 21 species + 28 pacing/gate/boss assertions ok; 3 non-gated waivers. |
| determinism | `bun run gate:determinism` | denied → 0 (primary) | Subagent denial verbatim; primary fallback: all 18 GLBs and 5 prop digests byte-identical (§9). |
| fuzz | `bun run test:fuzz` | denied → 0 (primary) | Subagent denial verbatim; primary fallback: 139 pass / 0 fail / 129015 expect() in 64.66 s (§9). |

## 5. Acceptance criteria (Phase 2 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | Verdict matches proof; target branch absent with method + rationale recorded. | §1: `-d` failed, `-D` succeeded with Phase 1 supersession rationale; after-list shows branch gone. | **satisfied** |
| AC-4 | Stale run file absent; current run file and all other gitignored evidence remain. | §2/§9: primary exact-path removal exit 0; `Test-Path` false for stale, true for active; all other artifacts intact. | **satisfied** |
| AC-5 | 11 remote heads byte-identical; no remote deletion/rewrite command. | §3: before/after `ls-remote` identical; no remote-mutating command executed. | **satisfied** |
| AC-6 | Five commands exit 0 with hash `0xff6f3d62`; empty source diff; clean tree. | §4/§9: all five commands exit 0 (two via primary fallback); diff/status clean. | **satisfied** |

## 6. Deviations and denials

No scope file outside `Touches` was modified; no product or design decision was needed.
Shell-permission denials (not repository failures), recorded verbatim and not retried:

1. `Test-Path -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'`
2. `Test-Path -LiteralPath '.conductor/runs/20261124-battle-variance-branch-resolution.json'`
3. `Get-ChildItem -LiteralPath '.conductor/runs' -Force | Select-Object -ExpandProperty Name`
4. `Remove-Item -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'`
5. `bun run gate:determinism`
6. `bun run test:fuzz`

Each returned exactly:
`{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`

Native `read` replaced the denied existence/inventory probes inside the subagent. The
primary resolved all six denials in §9: the stale file was removed, both verification
commands were run to exit 0, and the artifact inventory was captured. This phase is
therefore `verified`.

## 7. Raw evidence

- `.conductor/evidence/20261124-battle-variance-branch-resolution/disposition/commands.txt`
- Prior-phase evidence retained under `.../baseline/`, `.../supersession/`, `.../verification/`.

## 8. Final verdict

**verified.** The proof-backed branch disposition (AC-3), stale-file cleanup (AC-4), remote/scope
boundaries (AC-5) and all five verification commands (AC-6) are green with battle hash `0xff6f3d62`
with an empty source diff and a clean tree. Subagent shell denials were resolved by the primary
fallback in §9 and are retained below as a verbatim historical record.

## Follow-up probe (primary-requested)

At the primary's explicit request, each of the six previously denied commands was retried
exactly once, verbatim, as a separate shell command (no pipes, no `&&` chaining, no
rephrase, no substitute, no workaround). Every retry returned the identical verbatim denial
envelope and produced no exit code (represented below as `-1`); no command executed.

Exact denial envelope returned by all six probes:

```
{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}
```

| # | Command | Exit | Summary | Denied |
| --- | --- | --- | --- | --- |
| 1 | `Test-Path -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; no result, no exit code. | true |
| 2 | `Test-Path -LiteralPath '.conductor/runs/20261124-battle-variance-branch-resolution.json'` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; no result, no exit code. | true |
| 3 | `Get-ChildItem -LiteralPath '.conductor/runs' -Force \| Select-Object -ExpandProperty Name` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; no listing, no exit code. | true |
| 4 | `Remove-Item -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; stale file not removed, no exit code. | true |
| 5 | `bun run gate:determinism` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; no standalone result, no exit code. | true |
| 6 | `bun run test:fuzz` | -1 | Verbatim `permission.rejected` / `Permission denied: shell` denial; no fuzz result, no exit code. | true |

**Probe conclusion:** the shell permission layer consistently refuses all six commands; the
retry changed nothing. The stale run file remains on disk (AC-4 still unsatisfied) and the
two verification commands remain unrun in this subagent. No other file or ref was modified
by the probe.

## 9. Primary resolution of subagent denials (fallback)

The subagent's shell permission layer refused six commands (§6 and the follow-up probe). The
primary ran each affected command autonomously, separately (no pipes, no `&&`):

| Command | Exit | Summary |
| --- | --- | --- |
| `Test-Path -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json'` | 0 | `True` before removal. |
| `Test-Path -LiteralPath '.conductor/runs/20261124-battle-variance-branch-resolution.json'` | 0 | `True` before and after removal. |
| `Remove-Item -LiteralPath '.conductor/runs/20261123-repo-hygiene-cleanup.json' -Force` | 0 | Exact-path removal; no wildcard, no recursive deletion. |
| `Test-Path ...stale...` (after) | 0 | `False` — stale file absent. |
| `Get-ChildItem -LiteralPath '.conductor/runs' -Force` | 0 | `20261123-repo-hygiene-cleanup/`, `20261124-battle-variance-branch-resolution/`, `20261124-battle-variance-branch-resolution.json` — active run JSON and all directories preserved. |
| `bun run gate:determinism` | 0 | All 18 creature GLBs and 5 prop digests regenerated byte-identical. |
| `bun run test:fuzz` | 0 | `APEX_FUZZ_SWEEP=full ... packages/voxel/src/fuzz`: 139 pass / 0 fail / 129015 expect() across 135 files in 64.66 s. |
| `git branch --list` | 0 | Only `chore/20261124-battle-variance-branch-resolution` and `main` remain. |
| `git ls-remote --heads origin` | 0 | Same 11 heads, byte-identical to the Phase 1 and pre-disposition baseline. |
| `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| `git status --porcelain` | 0 | Empty — clean tree. |

**Outcome:** AC-3, AC-4, AC-5 and AC-6 are satisfied. No source file, config, ref, remote,
branch (other than the single named deletion), or git-ignored artifact other than the single
named stale run JSON was mutated.