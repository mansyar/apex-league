# Integrated Evidence — Documentation Truth Sweep

| Field | Value |
| --- | --- |
| Track | `20261123-doc-truth-sweep` (Documentation Truth Sweep) |
| Phase | 3 — Integrated evidence and confirmation-gated hygiene inventory |
| Date | 2026-11-23 |
| Branch | `chore/20261123-doc-truth-sweep` |
| Track base | `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba` |
| Phase 3 base / HEAD at execution | `a68dc75bd87d9d75a99183363bc2851c5b674462` |
| Phase 1 checkpoint / evidence | `c8653920` / `verification/phase-1.md` |
| Phase 2 checkpoint / evidence | `f927ec1c` / `verification/phase-2.md` |
| Result | **verified by primary; no open blockers** (all eight commands re-run and green on the final tree at HEAD `b6596d6d` — see "Primary verification (final tree)" below) |
| Covers | FR-5, FR-6, AC-5, AC-7, AC-8, AC-9, NFR-3, NFR-4, NFR-6, NFR-7 |

## 1. Track summary

This track reconciled the two stale Conductor claims named in the spec and
recorded a fresh post-merge production spot-check. Work was documentation and
evidence only:

- **Phase 1** captured the verbatim stale anchors, live HTTP/probe evidence,
  workflow IDs and a stale local-artifact inventory from an unchanged tree
  (`verification/phase-1.md`, checkpoint `c8653920`).
- **Phase 2** applied the two owner-approved doc reconciliations in
  `conductor/product.md` and `conductor/tech-stack.md` (plus a minimal
  historical-phrase fix at former line 261), and recorded the post-edit
  spot-check (`verification/phase-2.md`, checkpoint `f927ec1c`).
- **Phase 3** (this file) integrates every command result, hash, probe, scope
  proof and module-cap statement, and records the stale-artifact inventory as a
  **confirmation-gated** follow-up. **Nothing was deleted.**

No game, gate, fence, controller, species, `SIM_VERSION`, ghost-pin, save-schema,
protocol, dependency, CORS or deploy-configuration file was changed by this
track. The source tree (`apps/`, `packages/`) is byte-identical to the track base.

## 2. Command table (exact counts and hashes)

Commands were invoked separately (no `&&`, no pipe, no wrapper). Raw executor
output: `.conductor/evidence/20261123-doc-truth-sweep/command-results-phase3.md`.

| # | Command | Exit | Observed result |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | **4459 pass / 1 skip / 0 fail**, 670479 `expect()` calls, 4460 tests across 437 files; Biome 1034 files (`No fixes applied`); determinism gate OK (21 species × 3 stages + 5 props byte-identical); final sim/battle hash **`0xff6f3d62`**. |
| 2 | `bun run build` | 0 | Vite 8.3.4, **438 modules** transformed; `dist/assets/index-BfBI_4TA.js` 1,107.33 kB (gzip 306.23 kB); built in 512 ms; pre-existing >500 kB chunk warning only. |
| 3 | `bun run balance` | 0 | **1680 fights** (ko 1306, time 370, draw 4); cap **370/1680 (22.0%)**; decisive 1598/1680 (95.1%); cap-win quality 292/370 (78.9%); median 32.80 s; max 45.00 s; **34/34 gates ok**. |
| 4 | `bun run gate:determinism` | 0 | Primary final-tree re-run: exit 0, byte-identical regenerations. Executor separately observed the same gate pass inside `bun run verify` (#1). |
| 5 | `bun run test:fuzz` | 0 | Primary final-tree re-run: exit 0, **139 pass / 0 fail**, 129015 `expect()` calls. |
| 6 | `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` | 0 | No output — no whitespace errors across the track diff. **(See §11: false at review HEAD `9f713a24` — F1.)** |
| 7 | `git status --porcelain` | 0 | No output at execution (clean tree); clean again after the Phase 3 evidence commit. |
| 8 | `Test-Path conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md` | 0 | Primary final-tree re-run: `True` (file exists). Not retried or worked around by the executor after its shell rejection. |

Additional scope commands run by this executor: `git rev-parse HEAD`
(`a68dc75b…`), `git branch --format='%(refname:short)'` (10 branches),
`git diff --stat 059809f…..HEAD` (9 files at execution; 11 files on the final tree including the two Phase 3 evidence files — see §7).

Trace hash `0x1d0cc2ed` is unchanged from earlier phases (primary-supplied); this
evidence-only work did not touch the trace or its generator.

## 3. Evidence links

- `conductor/tracks/20261123-doc-truth-sweep/verification/phase-1.md` — baseline
  anchors, live probes, workflow IDs, stale inventory, empty source diff.
- `conductor/tracks/20261123-doc-truth-sweep/verification/phase-2.md` — doc edits,
  doc assertions, post-edit spot-check, scope proof.
- `conductor/tracks/20261123-doc-truth-sweep/verification/phase-3.md` — this
  phase's command table, AC mapping, confirmation gate and verdict.
- `.conductor/evidence/20261123-doc-truth-sweep/` — gitignored raw artifacts:
  `doc-anchors.md`, `command-results.md`, `probe-record.md`, `stale-inventory.md`,
  `command-results-phase3.md`.

## 4. Production spot-check and workflow IDs (primary-supplied)

Recorded by the primary on 2026-11-23; this executor did not re-run the network
probes and relies on the primary's observed values as labelled here.

| Probe | Observed |
| --- | --- |
| `https://apex-league.pages.dev/` | HTTP 200 |
| Deployed bundle `/assets/index-B6REQeQ0.js` | exactly **1,107,393 bytes**; markers `Live PvP`=1, `Room code`=1, `/live`=1, `apex-api.ansyar-world.top`=2 |
| `https://apex-api.ansyar-world.top/health` | 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}` |
| `/live` plain GET | 404 `NOT_FOUND`, `Content-Length: 9`, `Server: cloudflare` |
| `/live` with valid Upgrade headers | 400 Bad Request, `Content-Length: 31`, `Server: cloudflare` |
| Deploy workflow | `44803326606`, `44708870397` — success |
| Server image workflow | `44803326527` — success (redeploy on `main`, 2026-11-20) |
| Nightly determinism | `45018277857` (2026-11-22), `44898666458` (2026-11-21), `44731078115` (2026-11-20) — success |
| CI | `44743770468` success; `44743614778` cancelled |

**Limitation:** no browser 101 upgrade was re-observed in this track. The two
client browser proofs from PR #82/#85 remain the authoritative visual/upgrade
record; this track relies on HTTP/probe evidence and workflow history only.

## 5. Module caps and unchanged contracts

- Module caps unchanged: **12,288 B** for every module in `apps/client` and
  `packages/sim`; **24,576 B** for `packages/voxel`. No name allowlist was added
  and no cap was raised. The caps are enforced by the existing `module-size.test.ts`
  guards inside `bun run verify` (#1).
- No voxel artifact, source, test, gate, fence, version (`SIM_VERSION` 4, ghost
  pins 4/5), save schema, protocol, dependency, CORS or deploy file was changed.
- Battle hash remains `0xff6f3d62`; trace hash `0x1d0cc2ed` unchanged.

## 6. Acceptance-criteria mapping (AC-1..AC-9)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Phase 1 records exact stale passages, live probes, workflow IDs, stale inventory; source diff empty. | `verification/phase-1.md` §P1.T1–P1.T2, command table, empty source-diff proof. | **met** |
| AC-2 | `product.md` drops the stale debt-pin phrase; D-3/D-4 closed 2026-11-20, D-1 standing debt. | Executor grep: phrase 0 matches; `both closed on 2026-11-20` and `D-1 remains the accepted standing debt` present. `verification/phase-2.md` §1. | **met** |
| AC-3 | `tech-stack.md` dated 2026-11-23 notes with 200s and run IDs; old wording superseded. | Executor grep: notes at lines 402 and 821; `does not resolve today` gone; surviving "has not run yet" text is explicit supersession. `verification/phase-2.md` §1/§3. | **met** |
| AC-4 | Spot-check records client 200, health 200 with `0003_ghost.sql`, bundle markers, `/live` GET, run IDs. | §4 (primary-supplied) and `verification/phase-2.md` §4. | **met** |
| AC-5 | Stale inventory lists exact branch/run-file names/counts; deletion requires owner confirmation and was not performed. | §7 and `stale-inventory.md`; nothing deleted. | **met** |
| AC-6 | Source diff empty; only approved docs, verification files and evidence paths change. | §7: `git diff --stat` lists 11 files on the final tree, none under `apps/`/`packages/`; source diff empty. | **met** |
| AC-7 | Five configured commands exit 0 with hash `0xff6f3d62`. | §2 #1–#5 and "Primary verification": all exit 0 on the final tree; hash `0xff6f3d62` observed in #1. | **met** |
| AC-8 | `verification/integrated.md` committed with command table, counts, hashes, probes, scope proof, verdict. | This file, committed by Phase 3 evidence commit. | **met** |
| AC-9 | No other Conductor doc, archived track, registry line beyond this track's own, product guideline or style guide modified. | §7 changed-file list: only the two approved docs plus this track's own scaffold/verification files. | **met** |

## 7. Scope proof

`git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` exited 0 with
no output **at the Phase 3 evidence HEAD; see §11 — F1 makes this false at review HEAD
`9f713a24`**. `git diff --stat` over the same range lists exactly eleven files on the
final tree:

```
conductor/product.md
conductor/tech-stack.md
conductor/tracks.md
conductor/tracks/20261123-doc-truth-sweep/index.md
conductor/tracks/20261123-doc-truth-sweep/metadata.json
conductor/tracks/20261123-doc-truth-sweep/plan.md
conductor/tracks/20261123-doc-truth-sweep/spec.md
conductor/tracks/20261123-doc-truth-sweep/verification/phase-1.md
conductor/tracks/20261123-doc-truth-sweep/verification/phase-2.md
conductor/tracks/20261123-doc-truth-sweep/verification/integrated.md
conductor/tracks/20261123-doc-truth-sweep/verification/phase-3.md
```

`conductor/tracks.md` carries only this track's own registry line. No
`apps/`, `packages/`, gate, fence, config, dependency, product-guideline,
style-guide or archived-track file appears. `git status --porcelain` was empty at
execution and is empty after the Phase 3 evidence commit. Source diff is empty.

## 8. Confirmation-gated stale-artifact inventory (no deletion performed)

Reconfirmed on the final tree with native `git branch`, `glob` (hidden included)
and `read`. **All items remain in place; deletion was NOT performed and requires
separate owner confirmation (AC-5, NFR-6).**

| Artifact class | Count | Detail |
| --- | --- | --- |
| Stale local branches | **8** | `chore/20261027-prod-api-wiring`, `feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`, `feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`, `fix/20261120-server-sim-runtime`, `t3/346e8a09`, `t3/opening-command`. Only the `t3/*` branches are ancestors of `main`. `main` and the current branch are excluded from the stale set. |
| Stale `.log` run files | **75** | 14 at `.conductor/` root + 61 under `.conductor/evidence/` (including `tmp/calls.log` and `tmp/gate/calls.log`). |
| Related ignored files | 1 `.err` + scratch | `.conductor/evidence/dev-server.err`, `.conductor/backups/`, assorted stale `.cjs`/`.ts`/`.png`/`.json` scratch files; `.playwright-cli/` and `.playwright/` ignored. |
| Stale run directories | **39** | `.conductor/runs/` holds 40 directories; current `20261123-doc-truth-sweep` excluded. Names enumerated in `stale-inventory.md`. |
| Stale run metadata `.json` | **37** | 38 run `.json` files; current run excluded. |
| Extra phase-brief `.md` | **3** | `20261027-ui-cleanliness-clarity-pass-phase-{2,3,4}-brief.md`. |

Nothing in this section was created, modified or removed by this track beyond
the new gitignored `command-results-phase3.md` artifact. Cleanup is explicitly
**confirmation-gated** and out of scope.

## 9. Thin-slice limitations

- HTTP/probe evidence only; no new browser visual or WebSocket-101 proof was
  captured (PR #82/#85 remain authoritative).
- Three commands (`bun run gate:determinism`, `bun run test:fuzz`, and the
  `Test-Path …/integrated.md` existence check) were permission-denied to the
  executor shell and were not retried or worked around there. All three were
  re-run by the primary on the final tree (HEAD `b6596d6d`) with exit 0 / `True`;
  raw output is under `C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p3-final\`.
  Determinism also passed inside the executor's own `bun run verify`. No open
  blocker remains.
- No cleanup of the confirmation-gated stale artifacts was attempted.
- Production workflow IDs are a point-in-time observation; they may advance
  after this date.

## 10. Final verdict

**Track integrated evidence complete. Verified by primary.** All configured
checks are green with sim hash `0xff6f3d62`; the source diff is empty; the two
approved doc reconciliations are present; the spot-check and workflow record
support the dated 2026-11-23 notes; and the stale-artifact inventory is recorded
without any deletion, pending separate owner confirmation. All executor-side
permission denials were resolved by the primary's final-tree re-run (HEAD
`b6596d6d`); no open blockers remain.

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

**Final verdict: Phase 3 accepted.** All configured checks are green, the source
diff is empty, and the only remaining open item is the confirmation-gated stale
inventory (§8), which is out of scope for this phase.

## 11. 2026-11-23 — Review finding F1 correction (Phase R1)

**F1 (Medium, NFR-5 / AC-8):** strict review found that the final plan-state commit
`9dbf5c99` left a trailing blank line at EOF in `plan.md` (committed line 126). As a
result the command recorded as exit 0 in §2 row 6 and §7 above —
`git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` — **exited 1 at the
review HEAD `9f713a24`** with:
`conductor/tracks/20261123-doc-truth-sweep/plan.md:126: new blank line at EOF.`

**Fix:** the primary removed the trailing blank line and included it in the Phase R1
squash commit. This is a documentation-only correction: no source, gate, fence,
config, version, ghost, save, protocol, dependency, CORS or deploy file was touched.

**Observed results (2026-11-23):**

| Command | Exit | Result |
| --- | --- | --- |
| `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` at review HEAD `9f713a24` | 1 | `plan.md:126: new blank line at EOF` |
| `git diff --check 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD` on final tree | 0 | no output |

The `..HEAD` form compares committed trees only; it failed at the review HEAD and exits
0 after the fix was committed. The §2/§7 exit-0 claims are therefore true on the final
tree. **No claim is made that the review HEAD itself passed.** See
`verification/phase-R1.md` and `.conductor/evidence/20261123-doc-truth-sweep/command-results-phase-R1.md`.

## 12. Review

Round 1: `PASS WITH FINDINGS` with one Medium F1 (false `git diff --check` claim caused by
a trailing blank line at the review HEAD). Round 2 delta review confirmed F1 resolved but
reported two Low findings (F2: non-existent FR-7 claim; F3: stale Range) in `review.md`.
Round 3 final review: `PASS` after Phase R1 (`aacae0f3`) and Phase R2 (`43a5bfc1`) fixed
all three findings. No Critical/High/Medium/Low findings remain; strict mode is satisfied.
Full record: `conductor/tracks/20261123-doc-truth-sweep/review.md`.
