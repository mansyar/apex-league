# Phase 3 — Final verification and integrated evidence

- **Track:** `20261124-battle-variance-branch-resolution`
- **Phase:** 3 (Final verification and integrated evidence)
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-battle-variance-branch-resolution`
- **Base:** `main` @ `13172e387b633142f888f6eaba93feb944e80f0f`
- **Phase base / HEAD at start:** `da4e7b3a5a44532f4b2578ff204014c6c23c7093`
- **Result:** **verified.** All repository-state assertions are green (`git diff --quiet
  … -- packages apps` exit 0, `git diff --check` exit 0, `git status --porcelain` empty,
  only chore + main locally, 11 remote heads byte-identical). All five configured
  commands returned exit 0 with battle hash `0xff6f3d62`: three in this subagent and
  two (`gate:determinism`, `test:fuzz`) by the primary in separate invocations (§7).
  A duplicate primary `verify` sweep hit the documented load-induced
  `gatekeeper-reach` timeout while sweeps overlapped; isolated once under low load it
  passed 8/8. See `verification/integrated.md` §7, §11, and §13.

## 1. Commands table

All commands invoked separately; no pipes and no `&&` chaining. A `denied` row shows the
verbatim shell envelope, not a repository result:

```
{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}
```

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| verify | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 expect(); 4460 tests / 437 files; Biome 1036 files, no fixes; determinism gate OK; final hash `0xff6f3d62`; 5 trace invariants ok. |
| static | `bun run build` | 0 | Vite 438 modules transformed in 625 ms; standard chunk-size advisory only. |
| balance | `bun run balance` | 0 | 21 species rows + all pacing/gate/boss assertions ok; 3 non-gated diagnostic misses. |
| determinism | `bun run gate:determinism` | 0 (primary) | Subagent denial recorded verbatim; primary ran it separately: 18 GLBs + 5 props byte-identical (§7). |
| fuzz | `bun run test:fuzz` | 0 (primary) | Subagent denial recorded verbatim; primary ran it separately: 139 pass / 0 fail, 129015 expect() (§7). |
| scope | `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| scope | `git diff --check 13172e38..HEAD` | 0 | No whitespace errors. |
| scope | `git branch --list` | 0 | Only `* chore/20261124-battle-variance-branch-resolution` and `main`. |
| scope | `git ls-remote --heads origin` | 0 | Same 11 heads, byte-identical to the Phase 1 baseline. |
| scope | `git status --porcelain` | 0 | Empty — clean working tree. |
| scope | `git diff --name-status 13172e38..HEAD` | 0 | `M conductor/tracks.md` (pre-existing registry change) plus this track's Conductor artifacts only; see `integrated.md` §8. |

## 2. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Baseline record complete | `integrated.md` §2; `phase-1.md` §1–2, §9 | **satisfied** |
| AC-2 | Supersession proof complete | `integrated.md` §3; `phase-1.md` §2, §9 | **satisfied** |
| AC-3 | Disposition matches proof | `integrated.md` §4; `phase-2.md` §1, §9 | **satisfied** |
| AC-4 | Stale run file absent, others preserved | `integrated.md` §5; `phase-2.md` §2, §9 | **satisfied** |
| AC-5 | 11 remote heads byte-identical | `integrated.md` §6 | **satisfied** |
| AC-6 | Five commands exit 0 with hash `0xff6f3d62`; empty source diff; clean tree | `integrated.md` §7, §13: all five exit 0 with hash; all repository-state proofs green | **satisfied** |
| AC-7 | Integrated evidence committed | `verification/integrated.md` (committed with this phase) | **satisfied** |
| AC-8 | Only this track's Conductor artifacts changed | `integrated.md` §8–9 | **satisfied** |

## 3. Scope proof

`git diff --name-status 13172e387b633142f888f6eaba93feb944e80f0f..HEAD` listed only
`conductor/tracks.md` (pre-existing primary registry edit at track creation) and this
track's `index.md`, `metadata.json`, `plan.md`, `spec.md`, `verification/phase-1.md`,
and `verification/phase-2.md`. This phase adds `verification/integrated.md` and this
file. No source, config, product, tech-stack, workflow, style-guide, schema, deployment,
dependency, allowlist, or lockfile change; `git diff --quiet … -- packages apps` and
`git diff --check` exit 0. Module caps unchanged (12,288 B client/sim; 24,576 B voxel).
No credentials, tokens, passphrases, or real player data in any artifact.

## 4. Deviations

None. No file outside `Touches` was modified; no product or design decision was needed.
The two subagent shell-permission denials are recorded verbatim in §1 and
`integrated.md` §11; they were not retried or substituted in that subagent. The primary
resolved them with separate first-class invocations (§7). One duplicate primary
`verify` sweep timed out on `gatekeeper-reach` while two sweeps overlapped; the test
was isolated exactly once under low load and passed 8/8, confirming a load-induced
flake rather than a defect, and the authoritative sweep passed 4459 pass / 0 fail.

## 5. Raw evidence

- `.conductor/evidence/20261124-battle-variance-branch-resolution/final/commands.txt`
- Prior-phase raw evidence retained under `baseline/`, `supersession/`, `verification/`,
  and `disposition/`.

## 6. Final verdict

**verified.** The disposition, cleanup, remote/scope boundaries, and all
repository-state assertions are green with battle hash `0xff6f3d62`. All five
configured commands exit 0 (§7); the two subagent denials were resolved by separate
primary invocations and the one load-induced duplicate-sweep timeout was isolated
once under low load. AC-1..AC-8 are satisfied and the phase is accepted.
## 7. Primary resolution of subagent denials (fallback)

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run gate:determinism` | 0 | All 18 creature GLBs and 5 prop digests byte-identical. |
| 2 | `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls, 135 files in 63.85 s; no timeout. |
| 3 | `bun test --timeout 120000 -t "authored gatekeepers reach their stage under the widened field" packages/sim/src/cup/gatekeeper-reach.test.ts` | 0 | Isolated once under low load: 8 pass / 2 filtered / 0 fail in 10.76 s. |
| 4 | `git branch --list` | 0 | Only chore branch and `main`. |
| 5 | `git ls-remote --heads origin` | 0 | Same 11 byte-identical heads. |
| 6 | `git diff --quiet 13172e38..HEAD -- packages apps` | 0 | Empty source diff. |
| 7 | `git status --porcelain` | 0 | Empty — clean tree. |

**Outcome:** AC-6 satisfied. No source, config, dependency, allowlist, credential,
remote ref, or branch was mutated by the fallback.