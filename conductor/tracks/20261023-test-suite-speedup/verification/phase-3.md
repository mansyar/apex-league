# Phase 3 Evidence — The Nightly Sweep & the Full Gate

- **Track:** `20261023-test-suite-speedup`
- **Phase:** 3 of 3
- **Date:** 2026-10-24
- **Branch:** `chore/20261023-test-suite-speedup`
- **Base:** `94ac1ef75e09f5b66e7fd93b96a85152a49da022` (phase base, "Mark phase in progress")
- **Head:** `3d2d000dcc2a8d8324158f64a25dad9f346a6574` (evidence discharged by the primary on the same tree)
- **Result:** **verified — wiring landed + all runtime legs discharged by the primary (see Primary verification)**

## Sandbox constraint (affects every command below)

Every `bun`-led invocation was permission-denied in this phase's sandbox — including
each command named by the phase's Verification line. Per the brief ("do not retry or
work around; the primary will run it"), each was attempted exactly once and reported:

| Denied command (attempted once, no retry) | Exact error |
|---|---|
| `bun --version` | `permission.rejected: Permission denied: shell` |
| `bun run test:fuzz` | `permission.rejected: Permission denied: shell` |
| `bun run test:fuzz && bun run verify && bun run build` (phase Verification, exact) | `permission.rejected: Permission denied: shell` |

What did run here: `git` read commands, file edits, and the task commit. `git status`
was clean at head `3d2d000` after the code commit; the evidence file below is left
untracked for the primary.

## Commands table

| Command | Exit | Wall-clock | Summary |
|---|---|---|---|
| `bun run test:fuzz` | 0 | 41 s | **Full sweep confirmed**: 44 tests / **765 expect()** / 42 files / 0 fail. Smoke-mode control run of the same runner (`bun test --check --parallel packages/voxel/src/fuzz`, no env): 44 tests / **673 expect()** / 11 s — the sweep restores **+92 expects, exactly the −92 the Phase-2 slices removed** (baseline 126,812 → sliced 126,720). Expect-count parity at equal test counts is direct proof the sweep flag selects the FULL seed lists. |
| `bun run test:fuzz && bun run verify && bun run build` | 0 | 80 s + ~1 s | Verify leg run once (serving P3.T3.1 + the phase Verification), then `build`: typecheck 3 workspaces green; **≈2,452 pass / 1 skip / 0 fail** parallel suite; biome clean; **determinism gate 18 GLBs + 5 props byte-identical** (NFR-3, AC-6); build exit 0. **Verify wall-clock 80 s ≤ 120 s target (AC-6 met).** |
| `bun run test:phase` (P3.T3.2) | 0 | 53 s | Final AC-1 re-measure on the finished tree: 2,453 tests / 126,720 expect() / 194 files / 0 fail / **53 s ≤ 150 s (AC-1 met)** — even better than Phase 2's 73 s first measure. |
| Single-file sweep probe (`boundary.axolotl.00-09.test.ts`) | 0 | 0.98 s smoke → 2.61 s full | Env var propagation proof on Windows: no env → 3 gate seeds (0.98 s); `APEX_FUZZ_SWEEP=full` set natively → all 10 seeds (2.61 s, ≈10/3×). The landed POSIX-prefix script value (which derives its env the same way through bun's script shell) demonstrably selects the full lists — runtime-proven, resolving the script-shape question; no `--env-if-present` re-landing needed. |
| `git add package.json .github/workflows/nightly.yml && git commit` | 0 | — | One task commit `3d2d000`, 2 files, +4/−0 lines. |

> The undersigned rows are the primary's to discharge: `test:fuzz` (record wall-clock +
> seed total here), the verify leg for P3.T3.1/AC-6/NFR-3, `test:phase` for AC-1, and
> the shared verify-then-`build` for P3.T3.3. Brief note upheld: run `verify` ONCE to
> serve P3.T3.1 and the Verification leg, then `build`.

## Seed-count audit (static, from the landed Phase-2 slices)

24 boundary files: 10-seed `FULL_CHUNK`, gate 3 → **240 full / 72 gate**
12 budget files: 4-seed `FULL_SEEDS`, gate 1 → **48 full / 12 gate**
5 determinism files: 3-seed `FULL_SEEDS`, gate 1 → **15 full / 5 gate**
1 `dna.test.ts`: not sliced (DNA-layer property tests, not pipeline passes).
Totals: **303 full seeds vs 89 gate seeds at equal per-suite run counts** — matches
the brief's figures and what P3.T1 must verify proportionally at runtime.

## Script shape decision (P3.T1.1)

Landed exactly in root `package.json`:

```json
"test:fuzz": "APEX_FUZZ_SWEEP=full bun test --check --parallel --timeout 120000 packages/voxel/src/fuzz"
```

Why not the brief's recommended exact value:
`"bun test --env-if-present=APEX_FUZZ_SWEEP=full --check --parallel --timeout 120000 packages/voxel/src/fuzz"`
could not be runtime-probed (denied family above). It was rejected on documented-API
grounds: bun's `--env-if-present`/`--env-file` are env-FILE loaders per `bun --help`
(the flag loads a file if it exists, silently if missing). If bun reads
`APEX_FUZZ_SWEEP=full` as such a file name, it resolves as missing-and-ignored and
`test:fuzz` runs the nightly green in **smoke** mode forever — the exact silent no-op
FR-4/APEX_FUZZ_SWEEP=full exists to prevent. If the primary's `bun --help` disagrees
with this reading, either value works — prefer re-landing the recommended one.

Landed shape explanation: bun's script shell provides POSIX `VAR=value` prefix
assignment on Windows; nightly `default` ubuntu shell is bash. Works in both, no
runner script, no new dependency, `bun test` forwards process env, `process.exitCode`
propagates natively. 2-hyphen flags preserved; house style is 2-space indent JSON
biome format.

## Nightly wiring (P3.T2.1)

One step appended after `Determinism gate`, same style:

```yaml
      - name: Fuzz sweep
        run: bun run test:fuzz
```

2-space indent, no tabs, `name:`/`run:` parallel to the existing step; job name
`Determinism gate`, schedule, concurrency, and all prior bytes unchanged (see diff:
`+4/−0` total across both files). CI workflow `ci.yml` untouched.

## Deviations

| File | Reason |
|---|---|
| `package.json` (`test:fuzz` value) | Recommended `--env-if-present=` value could not be runtime-probed here (denied) and is an undocumented substitution into a documented env-FILE flag — risk of a silently smoke-mode nightly. Landed the Windows-safe POSIX-prefix form the brief's fallback ladder authorizes; recorded as the exact script value per P3.T1.1. |
| `.github/workflows/nightly.yml` | In Touches — listed for the record: one step, byte-minimal. |

## Primary verification

Discharge of the sandbox-blocked legs, run by the primary on the phase tree (base `94ac1ef` → head `3d2d000`):

- **Structural checks:** `git status --porcelain` after the task commit = only this untracked evidence file; phase diff = exactly `package.json` + `.github/workflows/nightly.yml` (+1 line each) plus this evidence — inside Touches; `ci.yml` untouched; no test files touched in this phase.
- **Sweep-mode proof (FR-4/FR-7):** see the commands table — +92 expects restored at identical test counts (44/44) and the single-file probe (0.98 s → 2.61 s) prove the flag selects the FULL seed lists; the landed POSIX-prefix form propagates through bun's script shell on Windows and natively on the nightly's Linux bash.
- **Script-shape resolution:** the `--env-if-present` reconsideration is settled empirically — the landed value is verified working end to end (41 s / 765 expects), so it LANDS as final; no follow-up.
- **Final metrics vs the spec's numeric targets:**

| Metric | Measured | Target | Verdict |
|---|---|---|---|
| Whole-suite phase leg (`test:phase`, capped 4) | **53 s** | ≤ 150 s (AC-1) | ✅ |
| `bun run verify` (end to end) | **80 s** | ≤ 120 s (AC-6) | ✅ |
| Determinism gate | 18 GLBs + 5 props byte-identical | unchanged (NFR-3) | ✅ |
| Nightly full fuzz sweep (`test:fuzz`) | **41 s** | "completes comfortably" (FR-7, should) | ✅ |
| CI | unchanged (this track touched only nightly.yml) | no regression | ✅ |

- **Baseline → final:** whole-suite phase test leg 206 s serial → 92 s uncapped → **53 s capped-4**: the compound fix (Phase 2 slices shrinking the critical path + the capped runner) beat even the uncapped pre-slice suite time. Phase-leg wall-clock per phase-verification run drops ~4×.
- **Guards under workers (AC-5, Phase 1):** held — the 3 module-size guards' negative-control suites still fire (included in the 2,453 counts, still 15/0 on a direct run in Phase 1).
- **Accepted deviation:** the `test:fuzz` script value (POSIX-prefix env, not `--env-if-present`) — accepted with runtime proof above; rationale preserved in the Script shape decision section.

## Notes

- P3.T1.1, P3.T2.1: done. P3.T1.2, P3.T3.1–T3.3: blocked on sandbox execution only —
  no evidence contradicts the code; the primary runs five commands and fills the
  empty wall-clock/exit rows above.
- `git status` clean at `3d2d000` after the task commit; this evidence file left
  untracked for the primary (brief permits either).
- The script's `--parallel` is uncapped on purpose — `workflow.md` Phase Test Tiers
  already documents uncapped parallelism for CI/nightly precisely "so the nightly
  full fuzz sweep wants every worker it can get".
