# Phase 3 Evidence — Integrated evidence and confirmation-gated hygiene inventory

| Field | Value |
| --- | --- |
| Track | `20261123-doc-truth-sweep` (Documentation Truth Sweep) |
| Phase | 3 — Integrated evidence and confirmation-gated hygiene inventory |
| Date | 2026-11-23 |
| Branch | `chore/20261123-doc-truth-sweep` |
| Track base | `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba` |
| Phase base / HEAD at execution | `a68dc75bd87d9d75a99183363bc2851c5b674462` |
| Result | **verified by primary; no open blockers** (all eight commands re-run and green on the final tree at HEAD `b6596d6d` — see "Primary verification (final tree)" below) |
| Covers | FR-5, FR-6, AC-5, AC-7, AC-8, AC-9, NFR-3, NFR-4, NFR-6, NFR-7 |

## Verdict

**Evidence written, committed, and verified by the primary; no open blockers.**
The executor could run five of eight commands locally (all exit 0); three were
rejected by the shell permission layer and were **not** retried, wrapped, piped
or worked around by the executor. The primary re-ran all eight commands on the
final tree at HEAD `b6596d6d` — every command exit 0, including
`bun run gate:determinism` (byte-identical), `bun run test:fuzz` (139 pass /
0 fail, 129015 `expect()` calls) and the `Test-Path …/integrated.md` check
(`True`). Determinism is additionally covered by the executor's own
`bun run verify`, whose pipeline includes the voxel determinism gate. No
deletion of confirmation-gated stale artifacts occurred.

## 1. Command table

All commands invoked separately (no `&&`, no pipe, no wrapper). Raw output:
`.conductor/evidence/20261123-doc-truth-sweep/command-results-phase3.md`.

| # | Command | Exit | Summary |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests / 437 files; Biome 1034 files; determinism gate OK inside verify; sim hash `0xff6f3d62`. |
| 2 | `bun run build` | 0 | Vite 438 modules; `index-BfBI_4TA.js` 1,107.33 kB; pre-existing >500 kB warning only. |
| 3 | `bun run balance` | 0 | 1680 fights; cap 370/1680 (22.0%); decisive 95.1%; cap-win quality 78.9%; median 32.80 s; 34/34 gates. |
| 4 | `bun run gate:determinism` | 0 | Primary final-tree re-run: exit 0, byte-identical regenerations. Also passed inside #1. |
| 5 | `bun run test:fuzz` | 0 | Primary final-tree re-run: exit 0, 139 pass / 0 fail, 129015 `expect()` calls. |
| 6 | `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` | 0 | No output — no whitespace errors. **(See §7: false at review HEAD `9f713a24` — F1.)** |
| 7 | `git status --porcelain` | 0 | Clean at execution and after the evidence commit. |
| 8 | `Test-Path conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md` | 0 | Primary final-tree re-run: `True`. Not retried or worked around by the executor after its shell rejection. |

Primary-supplied spot-check facts (client 200; bundle `/assets/index-B6REQeQ0.js`
1,107,393 bytes with four markers; health 200 `0003_ghost.sql`; `/live` 404/400;
workflow IDs Deploy `44803326606`/`44708870397`, Server `44803326527`, Nightly
`45018277857`/`44898666458`/`44731078115`, CI `44743770468` success /
`44743614778` cancelled) are recorded in `verification/integrated.md` §4 and are
labelled there as primary-supplied. Trace hash `0x1d0cc2ed` unchanged.

## 2. Acceptance-criteria mapping (Phase 3 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-5 | Stale inventory with exact names/counts; deletion confirmation-gated and not performed. | §3; `integrated.md` §8; `stale-inventory.md`. | **met** |
| AC-7 | Five configured commands exit 0 with hash `0xff6f3d62`. | §1 #1–#5 and "Primary verification": all exit 0 on the final tree; hash `0xff6f3d62` observed in #1. | **met** |
| AC-8 | `verification/integrated.md` committed with command table, counts, hashes, probes, scope proof, verdict. | `integrated.md` §§1–10; Phase 3 evidence commit. | **met** |
| AC-9 | No other Conductor doc, archived track, registry line beyond this track's own, guideline or style guide modified. | `integrated.md` §7 eleven-file list; no source/config change. | **met** |
| NFR-3 | No credentials/PII; public endpoints only. | No secrets in evidence; probes were public GETs (primary-supplied). | **met** |
| NFR-4 | All configured checks green, sim hash `0xff6f3d62`. | §1 #1–#5 and "Primary verification": all exit 0 on the final tree; hash `0xff6f3d62`. | **met** |
| NFR-6 | Branch/run-file cleanup confirmation-gated, not performed. | §3 — nothing deleted. | **met** |
| NFR-7 | Module caps unchanged, no allowlist. | `integrated.md` §5; caps enforced inside #1. | **met** |

AC-1..AC-4 and AC-6 are mapped in `verification/integrated.md` §6 for the whole
track; Phase 1/2 evidence files remain the primary records for those.

## 3. Stale-inventory confirmation gate

Reconfirmed on the final tree (native `git branch`, hidden-inclusive `glob`,
`read`). **Deletion was NOT performed. Owner confirmation is required (AC-5,
NFR-6).**

- **8 stale local branches:** `chore/20261027-prod-api-wiring`,
  `feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`,
  `feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`,
  `fix/20261120-server-sim-runtime`, `t3/346e8a09`, `t3/opening-command`.
  Only `t3/*` are ancestors of `main`.
- **75 stale `.log` files:** 14 at `.conductor/` root + 61 under
  `.conductor/evidence/` (including `tmp/calls.log`, `tmp/gate/calls.log`), plus
  `dev-server.err` and assorted ignored scratch files.
- **39 stale run directories**, **37 stale run `.json` files**, and **3 extra
  phase-brief `.md` files** under `.conductor/runs/` (current run excluded).

Full names: `stale-inventory.md` and `integrated.md` §8. This phase created only
the new gitignored `command-results-phase3.md` artifact; it did not delete or
modify any inventoried item.

## 4. Resolved by primary

All three commands initially rejected by the executor shell were re-run by the
primary on the final tree at HEAD `b6596d6d14542d0bd5e835707ea5eaea093b5bb1`.
Executor raw output is under `.conductor/evidence/20261123-doc-truth-sweep/`;
primary raw output is under `C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p3-final\`.

| Command | Final-tree result |
| --- | --- |
| `bun run gate:determinism` | exit 0 — byte-identical regenerations |
| `bun run test:fuzz` | exit 0 — 139 pass / 0 fail, 129015 `expect()` calls |
| `Test-Path conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md` | exit 0 — `True` |

No open blockers remain. The executor did not retry, wrap, pipe or work around
any denied command.

## 5. Deviations

- None. Only `verification/integrated.md`, `verification/phase-3.md` (both inside
  `Touches`) and a gitignored artifact under
  `.conductor/evidence/20261123-doc-truth-sweep/` were written. No source, test,
  config, gate, fence, version, ghost, save, protocol, dependency, CORS,
  deploy, product-guideline, style-guide or archived-track file was edited.

## 6. Final verdict

Phase 3 is **verified by primary with no open blockers**. Evidence is complete
and committed; the primary's final-tree re-run (HEAD `b6596d6d`, raw output under
`C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p3-final\`) closed all three
executor-side permission denials. No stale artifact was deleted; that work
remains confirmation-gated.

## Primary verification (final tree, HEAD `b6596d6d`)

The primary re-ran every Phase 3 command on the final tree at HEAD
`b6596d6d14542d0bd5e835707ea5eaea093b5bb1`. Raw output:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p3-final\`.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests / 437 files; Biome 1034 files; hash `0xff6f3d62` |
| 2 | `bun run build` | 0 | Vite 438 modules |
| 3 | `bun run balance` | 0 | 1680 fights; cap 370/1680 (22.0%); 34/34 gates |
| 4 | `bun run gate:determinism` | 0 | byte-identical |
| 5 | `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 `expect()` calls |
| 6 | `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` | 0 | no output |
| 7 | `Test-Path conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md` | 0 | `True` |
| 8 | `git status --porcelain` | 0 | empty |

**Final verdict: Phase 3 accepted.** All configured checks are green with hash
`0xff6f3d62`, the source diff is empty, and the only remaining open item is the
confirmation-gated stale inventory (§3), which is out of scope for this phase.

## 7. 2026-11-23 — Review finding F1 correction (Phase R1)

**F1 (Medium, NFR-5 / AC-8):** strict review found that the final plan-state commit
`9dbf5c99` left a trailing blank line at EOF in `plan.md` (committed line 126). The
`git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` claim in §1 row 6
above was therefore **false at the review HEAD `9f713a24`**: the exact command exited 1
with `conductor/tracks/20261123-doc-truth-sweep/plan.md:126: new blank line at EOF.`

**Fix:** the primary removed the trailing blank line in the working tree (uncommitted at
this note; to be included in the Phase R1 squash), confirmed by `git diff --stat`
(`plan.md | 1 -`). Documentation-only; no source, gate, fence or config change.

**Observed results (2026-11-23, HEAD `9f713a24`):**

| Command | Exit | Result |
| --- | --- | --- |
| `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` (exact brief command) | 1 | `plan.md:126: new blank line at EOF` |
| `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba` (working tree vs base) | 0 | no output |
| `git diff --check` (working tree vs index) | 0 | no output |

The `..HEAD` form compares committed trees, so it still reports the blank line until the
primary commits the fix; it exits 0 on the final tree once the fix is in the squash.
**No claim is made that the review HEAD itself passed.** See `verification/phase-R1.md`
and `.conductor/evidence/20261123-doc-truth-sweep/command-results-phase-R1.md`.
