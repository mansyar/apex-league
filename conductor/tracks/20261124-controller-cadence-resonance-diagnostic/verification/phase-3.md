# Phase 3 — Freeze proof, integrated evidence, and dated product pointer

- Track: `20261124-controller-cadence-resonance-diagnostic`
- Phase: 3
- Date: 2026-11-24
- Branch: `chore/20261124-controller-cadence-resonance-diagnostic`
- Base: main @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- Phase base / HEAD before this phase's commit: `254200954e7e71ab58b936824f4ca23e3ee523f3`
- Result: **blocked (subagent view)** — all subagent-runnable configured checks
  are green at the frozen readings; four commands and the single dated product
  note edit were denied by the permission layer and are reported unchanged in
  `blockers` for the primary to run as an autonomous fallback. The integrated
  record and the phase report are committed; the product note is pending. No
  gate, bound, sample, or controller constant was changed; no fix was
  implemented.

## 1. Command table

Each command was run separately, with no pipe, `&&` chain, wrapper binary, or
Code Mode workaround. Exit codes are those observed by the subagent shell; raw
captures are gitignored under
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/final/**`.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| suite | `bun run verify` | 0 | 4462 pass / 1 skip / 0 fail; 670507 expect() calls; 4463 tests across 437 files [109.40s]; Biome checked 1038 files, no fixes; voxel determinism OK (21 species × 3 stages + 5 props); trace 5/5 invariants; hash `0xff6f3d62`. Telemetry `5/42 (11.9%)`, `340/946/6061` mm, min 19 cells, `12.50s..45.00s`, 14/14 bounds ok. Balance `370/1680 (22.0%)`, 33/33 gates ok, reference line `580/1680 (34.5%)`. No `gatekeeper-reach` timeout recurred. |
| build | `bun run build` | 0 | Vite production build, 438 modules, 512 ms, exit 0; only pre-existing >500 kB chunk advisory. |
| balance | `bun run balance` | 0 | `370/1680 (22.0%)` cap share; 33/33 gates `ok`; reference-line cap `580/1680 (34.5%)`; readings match the frozen Phase 1 values. |
| determinism | `bun run gate:determinism` | denied | Permission-layer `permission.rejected`. Not retried or worked around; reported unchanged in `blockers`. Corroboration only: the determinism gate passed inside `bun run verify`. |
| fuzz | `bun run test:fuzz` | denied | Permission-layer `permission.rejected`. Not retried or worked around; reported unchanged in `blockers`. |
| telemetry | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061` mm; idle `30.3%`, contact `10.3%`, retreats `14872 / 15001`, dead zone `5.1%`, positions min `19`, duration `12.50s..45.00s`; 14/14 bounds `ok`; row 39 is the named zero-commit artifact. |
| smoke | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | denied | Permission-layer `permission.rejected`. Not retried or worked around; reported unchanged in `blockers`. Prior reading `11/42 (26.2%)`, `345/1102/3992` mm. |
| audit | `bun run fixture-audit` | denied | Permission-layer `permission.rejected`. Not retried or worked around; reported unchanged in `blockers`. Prior cells `11/8/7/5`, `+12.5` points. |
| freeze | `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` | 0 | No whitespace error. |
| freeze | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff. |
| scope | `git status --porcelain` | 0 | Empty before and after the sweep. |
| scope | `git diff --name-status dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` | 0 | Only Conductor state/reports; no `packages/` or `apps/` change. |
| scope | `git branch --list` | 0 | Only the chore branch and `main` locally. |
| scope | `git ls-remote --heads origin` | 0 | Read-only; `refs/heads/main = dcbe314a5a4cea813e424f350e2490bf9f99165f`, unchanged; no chore branch for this track on the remote. |

Raw captures: `final/verify.txt`, `final/build.txt`, `final/balance.txt`,
`final/telemetry.txt`, `final/denied-commands.txt`, and `final/git-checks.txt`
under the gitignored scratch path above.

## 2. Hash and freeze confirmation

`bun run verify` reports the unchanged battle hash `0xff6f3d62` and all
subagent-runnable checks exit 0. Frozen readings unchanged: representative gate
`5/42 (11.9%)`; smoke `11/42 (26.2%)`; matrix `370/1680 (22.0%)`; D-1 `≤1/3`
fence; fixture-audit cells `11 / 8 / 7 / 5` and `+12.5` points. Resonance
inventory unchanged: gate `1/42 (2.4%)`, matrix `12/1680 (0.7%)`, no near-resonant
notes, matrix cap equivalence PASS, byte-identical scanner reruns. No
`BOUNDS`, `CAP_MAX`, D-1 fence, sample size/seed/stride, smoke semantics, species
band, controller constant, reach table, body profile, `SIM_VERSION`, module cap,
dependency, allowlist, or deployment changed. The documented load-induced
`gatekeeper-reach` timeout did not recur, so no isolated low-load rerun was
performed and no gate was widened.

## 3. Acceptance criteria (Phase 3 scope)

| AC | Result | Evidence |
| --- | --- | --- |
| AC-6 (full configured check suite green at frozen readings) | blocked (subagent view) | §1: subagent-runnable checks green, hash `0xff6f3d62`; `gate:determinism`, `test:fuzz`, `--smoke`, `fixture-audit` denied to the subagent and reported unchanged in `blockers` for primary fallback. Determinism corroborated inside `bun run verify`. |
| AC-7 (gate / smoke / matrix / audit truth unchanged) | satisfied (smoke and audit pending primary fallback) | §2: gate `5/42`, matrix `370/1680`, audit `11/8/7/5` / `+12.5`, hash `0xff6f3d62`; smoke `11/42` prior reading recorded. |
| AC-8 (scope and freeze proven) | satisfied | §4: empty source diff, `diff --check` 0, clean worktree, Conductor-artifact-only diff, remote heads unchanged. |
| AC-9 (integrated record + dated product pointer hand decision back) | blocked (subagent view) | §5 plus `verification/integrated.md` are complete; the single dated `conductor/product.md` note edit was denied and is in `blockers` for the primary. Owner question explicitly deferred. |

AC-10 (no fix/re-pin/bound/gate/sample change) is corroborated by §2 and §4;
no option from `verification/phase-2.md` §5 was implemented.

## 4. Scope proof

- `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages
  apps` exit 0 and `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..
  HEAD` exit 0; `git status --porcelain` empty before and after the sweep.
- `git diff --name-status dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` lists
  only `M conductor/tracks.md` and the track's `index.md`, `metadata.json`,
  `plan.md`, `spec.md`, `verification/phase-1.md` and `verification/phase-2.md`.
  This phase adds `verification/integrated.md`, this report, and one dated note
  in `conductor/product.md` — no bound, fence, sample, module cap, dependency,
  allowlist, credential, deployment, source, test, config, manifest, schema or
  API change.
- `git branch --list` shows only the chore branch and `main`. `git ls-remote
  --heads origin` is read-only and shows `origin/main` unchanged at
  `dcbe314a5a4cea813e424f350e2490bf9f99165f`; no chore branch for this track on
  the remote. No push, fetch, pull, merge, rebase, reset, clean, switch,
  checkout, tag, stash, or ref mutation was executed.
- All scratch sits under `.conductor/evidence/20261124-controller-cadence-
  resonance-diagnostic/final/**`, gitignored at `.gitignore:3`.

## 5. Integrated record and product pointer

`verification/integrated.md` contains the baseline and named artifact, the full
gate/matrix resonance inventory, the per-event mechanism decomposition, the
ranked owner-facing options with the decision deferred, the check-suite command
table and freeze proof, the scope proof, AC-1..AC-10 mapping, deviations and
verdict. The single dated (2026-11-24) note for `conductor/product.md` — to be
inserted immediately after the existing telemetry note and before
`## Target Audience`, recording the two sample counts, the trio and matrix
seeds, the pointers to `verification/integrated.md` and
`verification/phase-2.md`, the unchanged hash and bounds, and the explicit
deferral of the tolerate-vs-change question to the owner — is provided verbatim
in the phase JSON `notes` for the primary to apply unchanged; the subagent's
`edit` call on that file returned `permission.rejected` and was not retried or
worked around.

No screenshots were produced (evidence-only diagnostic; no UI surface touched).

## 6. Deviations

- Four configured commands were denied by the permission layer:
  `bun run gate:determinism`, `bun run test:fuzz`,
  `bun packages/sim/scripts/battle-telemetry.ts --smoke`, `bun run fixture-audit`.
  None was retried, rephrased, or worked around; each is in the JSON `blockers`
  for the primary to run unchanged. This mirrors the resolved pattern in Phase 1
  §8 and Phase 2 §8.
- The `edit` call inserting the single dated note into `conductor/product.md`
  returned `permission.rejected`. It was not retried or worked around; the exact
  note text is in the phase JSON `notes` for the primary to apply unchanged.
- No other deviation. Tracked writes by this subagent are limited to the two
  verification reports; scratch is confined to the gitignored `final/**` path.

## 7. Notes and verdict

The freeze proof is complete for every check this shell could run: hash
`0xff6f3d62`, unchanged frozen readings, empty source diff and clean worktree.
The permission-layer denials are reported rather than bypassed, and the primary
is expected to run them unchanged and hand back the output for reconciliation.
No fix was implemented; the tolerate-under-AC-11 versus controller-family-change
question stays with the owner. **Verdict: blocked pending primary fallback on
four denied commands and the dated `product.md` note; no evidence of a
regression and no scope expansion.**
