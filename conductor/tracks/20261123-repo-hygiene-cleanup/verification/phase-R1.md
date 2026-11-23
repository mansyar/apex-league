# Phase R1 verification — review findings F1, F2, F3

- **Track:** `20261123-repo-hygiene-cleanup`
- **Phase:** R1 (round-1 review evidence corrections)
- **Date:** 2026-11-24
- **Branch:** `chore/20261123-repo-hygiene-cleanup`
- **Base:** `be5a44481f6a5a48f94e7896ece35fc12dc03918`
- **Head:** the R1 evidence commit `eed2de99` (squashed to the Phase R1 checkpoint; see Primary verification below)

This is an evidence-only phase. No source, config, game, product, tech-stack, workflow, guideline, registry, plan, metadata, or `review.md` change was made. The source diff remains empty by design.

## 1. Findings and exact edits

### F1 — NFR-6 / NFR-7 coverage-row label (`phase-1.md`, line 45)

The row describing "Five configured verification commands exit 0 with sim hash `0xff6f3d62`" was mislabeled `NFR-7`; per `spec.md:72` it is **NFR-6**, and per `spec.md:73` NFR-7 is the module-cap invariant.

- Changed only the ID cell: `NFR-7` → `NFR-6`; requirement text and evidence cell left as-is.
- Added one new row immediately below:

  `| NFR-7 | Module caps unchanged, no allowlist | Source diff empty (\`git diff --quiet base..HEAD -- packages apps\` exit 0); module-size guards unchanged at 12,288 B client/sim/server and 24,576 B voxel, no allowlist. | met |`

- No other row touched.

### F2 — AC-4 / AC-5 swap (`phase-2.md`, lines 116–117)

The AC table swapped AC-4 and AC-5 relative to `spec.md:82-83`. Both rows were replaced with the spec-aligned mapping (IDs moved together with their requirement and evidence text), matching the already-correct rows in `integrated.md:128-129`:

- **AC-4** = "No remote branch list changed, and no remote deletion/rewrite command was executed" — §4 evidence: 11 remote heads byte-identical before/after, diff count 0; no remote deletion/rewrite command run.
- **AC-5** = "Final artifact inventory shows pruned counts and confirms current-track and archived evidence preserved" — §3 evidence: 169 stale artifacts removed, 0 remaining; current-run and all non-`.log`/`.err` evidence preserved; owner confirmation in Phase 1 / `stale-inventory.md`.

`integrated.md:128-129` was used as the reference and was not edited.

### F3 — stale pre-rewrite SHA `d2085e51ac04a469f1bb4187630ea6cc84867435`

That SHA was a pre-rewrite commit amended into Phase 3 checkpoint `3e53fce5` before final HEAD `9c065563`; it is not in the reviewed range `1eee3011..9c065563`. All 10 tracked occurrences were replaced:

- `integrated.md`: lines 13, 15, 84, 155 (4 replacements).
- `phase-3.md`: lines 8, 10, 20, 66, 81, 82 (6 replacements).

"Final tree" / "evidence commit" / "primary verification" citations now point to Phase 3 checkpoint `3e53fce5`; where final HEAD is meant, the text now says `9c065563`. No gitignored scratch artifact was edited (the optional `phase-3-command-outputs.md:207` occurrence was left untouched).

## 2. Verification commands

Each command was run separately (no `&&`, no pipes).

| Command | Exit code | Result / note |
|---|---|---|
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, sim hash `0xff6f3d62`; 1035 files biome-clean; determinism-gate lines all OK. No `gatekeeper-reach.test.ts` timeout occurred, so no isolated re-run was needed. |
| `bun run build` | 0 | Client build: 438 modules transformed, built in 502 ms. Only the pre-existing >500 kB chunk warning (known noise, excluded by the review noise rule). |
| `bun run balance` | 0 | All species, cap-share, decisive-share, cap-win-quality, duration, damage-band and boss gates report `ok`. |
| `bun run gate:determinism` | 0 | Primary re-run on final tree: all 21 species × 3 stages byte-identical, 5 props digests match. |
| `bun run test:fuzz` | 0 | Primary re-run on final tree: 139 pass / 0 fail, 129015 `expect()` calls, 139 tests across 135 files [51.08s]. |
| `git diff --check 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD` | 0 | No whitespace errors; no output. |
| `git diff --quiet 1eee30116b23d4a1d3ecb8d23551dd24b4ca3ed5..HEAD -- packages apps` | 0 | No output — source diff is empty, no allowlist/module-cap change. |
| `grep -n d2085e51 <four tracked evidence files>` | 0 (no matches) | Executed with the native `grep` tool rather than through the shell: executor policy forbids invoking `grep` via shell, and the native tool covers the need. Result: zero matches across `phase-1.md`, `phase-2.md`, `integrated.md`, `phase-3.md`. |

The known load-induced `gatekeeper-reach.test.ts` 60 s timeout did not appear in `bun run verify` (which ran alone), so the isolated re-run named in the brief was not invoked.

## 3. Stale-SHA grep confirmation

Native grep for literal `d2085e51` over `conductor/tracks/20261123-repo-hygiene-cleanup/verification/` returned **no matches** after the edits. Zero occurrences remain in tracked evidence; there is no residual "pre-rewrite SHA" note.

## 4. Scope proof

`git diff --stat` before this evidence file was written showed exactly four modified files:

```
 .../20261123-repo-hygiene-cleanup/verification/integrated.md |  8 ++++----
 .../20261123-repo-hygiene-cleanup/verification/phase-1.md    |  3 ++-
 .../20261123-repo-hygiene-cleanup/verification/phase-2.md    |  4 ++--
 .../20261123-repo-hygiene-cleanup/verification/phase-3.md    | 12 ++++++------
 4 files changed, 14 insertions(+), 13 deletions(-)
```

With this file, the single R1 commit touches exactly the five allowed tracked files: `phase-1.md`, `phase-2.md`, `phase-3.md`, `integrated.md`, `phase-R1.md`. No other tracked file was modified; no file, branch, or ref was deleted.

## 5. Primary verification (final tree)

The two commands denied to the executor were re-run by the primary on the R1 verification tree (pre-squash SHA `eed2de99`, squashed into Phase R1 checkpoint `478bc388`; final HEAD `cb30b26a`), all exit 0. Raw output: `C:\Users\Ansyar\AppData\Local\Temp\opencode\hyg-r1-final\`.

| Command | Exit code | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, final hash `0xff6f3d62`; determinism gate OK inside verify. Expected non-gating `smoke: RESULT fail ... file:///tmp/x` diagnostic excluded. |
| `bun run build` | 0 | 438 modules; pre-existing >500 kB chunk warning only. |
| `bun run balance` | 0 | all species/cap/decisive/duration/damage/boss gates ok. |
| `bun run gate:determinism` | 0 | 21 species × 3 stages byte-identical; 5 prop digests match. |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls. |
| `git diff --check 1eee3011..HEAD` | 0 | no whitespace errors. |
| `git diff --quiet 1eee3011..HEAD -- packages apps` | 0 | empty source diff; module caps/allowlist untouched. |

Scope: single R1 commit (checkpoint `478bc388`) touches only the five allowed evidence files; clean tree (`git status --porcelain` empty) at final HEAD `cb30b26a`. The earlier executor denials of `gate:determinism` and `test:fuzz` are resolved by the primary re-runs above.

## 6. Verdict

**VERIFIED by primary.** F1, F2 and F3 are fully applied and self-consistent with the approved spec and branch history. In tracked files the literal `d2085e51` now survives only in historical finding descriptions — this file, `review.md` (F3 record) and `plan.md` (task R1.T3.1) — and never as a final-tree citation; the four verification evidence files (`phase-1.md`, `phase-2.md`, `phase-3.md`, `integrated.md`) contain zero occurrences. All five configured verification commands and both git diff checks exit 0 on the final tree, the source diff is empty, and the stale-SHA grep is clean. No blockers remain. `Verdict: Phase R1 accepted`.
