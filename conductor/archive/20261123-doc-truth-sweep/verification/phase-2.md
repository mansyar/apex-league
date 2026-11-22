# Phase 2 Evidence — Approved documentation reconciliation

| Field | Value |
| --- | --- |
| Track | `20261123-doc-truth-sweep` |
| Phase | 2 |
| Date | 2026-11-23 |
| Branch | `chore/20261123-doc-truth-sweep` |
| Base | `main` @ `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba` |
| Phase base | `0b86336050f83af89993a9385883f156cbe05f91` |
| Head at re-verification | `0b86336050f83af89993a9385883f156cbe05f91` (doc edits applied in working tree by the primary; this evidence commit adds only this file) |
| Result | **verified** (by primary) |
| Covers | FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-6, NFR-1, NFR-2 |

## Verdict

**Phase 2 accepted.** The three owner-approved exact doc edits are present and
verified, the historical line-261 phrase conflict was resolved minimally by the
primary, every configured command exits 0, the source diff is empty, doc
assertions pass, and the post-edit production spot-check matches the expected
baseline. Earlier permission denials are recorded below and resolved by the
primary, who applied the doc edits and re-ran all previously blocked commands.

## 1. Doc edits applied and verified (read-only confirmation)

All three OLD anchors matched the phase base verbatim before editing; no anchor
mismatch occurred. The primary applied the edits; this agent verified their
presence with `read`/`grep` only and did not edit any doc.

### Edit 1 — `conductor/product.md` FR-2 block (now lines 369-378)

The 8-line OLD anchor ending `and both debt pins remain in place.)*` was
replaced with the brief's exact NEW block. Confirmed on disk:

- line 370: `fence stays on the 840-fight matrix and D-1 remains the accepted standing debt.`
- line 372: `on 2026-11-18 and both closed on 2026-11-20`
- lines 373-377: D-3 met by the D-2 45 s cap side effect at `11/42 (26.2%)`;
  D-4 diagnosed and bounded; kite band (D-2) closed 2026-11-20 with a
  speed-aware Kite clamp, a 45 s fight cap and a two-species re-tune
  (`20261120-kite-band-reachability`).
- line 378 closes the block with `...`20261120-kite-band-reachability`).)*`.

### Edit 2 — `conductor/tech-stack.md` server note (now lines 401-407)

The OLD block ending `The Coolify deploy itself is configuration-complete and
has not run.*` was replaced. The new 2026-11-23 Documentation truth sweep note
records the `Server image` run `44803326527` on `main` 2026-11-20, the SHA-tagged
redeploy, the supersession of the earlier wording, and health 200 with
`schemaVersion 0003_ghost.sql` (lines 402-407). The following 2026-11-20 Live
PvP bullet is unchanged.

### Edit 3 — `conductor/tech-stack.md` client note (now lines 819-828)

The OLD block with `**has not run yet**`, `does not resolve today` and `stays
deferred, unchanged.*` was replaced. The new 2026-11-23 note (lines 821-828)
records Deploy runs `44803326606` / `44708870397`, client HTTP 200, bundle
`/assets/index-B6REQeQ0.js` (1,107,393 bytes) with all four live-PvP markers,
health 200 with `schemaVersion 0003_ghost.sql`, and explicit supersession of the
"has not run yet / stays deferred" wording for both client and server. The
2026-10-27 prod-API-wiring bullet that follows remains unchanged.

### Extra fix — `conductor/product.md` historical line 261 (primary decision)

The brief asserted the phrase `and both debt pins remain in place` must be
absent from `product.md` anywhere, while also preserving historical narrative
outside Edit 1's block; the phrase also occurred at line 261 in the
2026-11-18 owner-decision history. The primary resolved this by the minimal
replacement of `and both debt pins remain in place as honest markers.` with
`and the two debt pins recorded here were resolved by the 2026-11-20 decision
below.` (now spanning lines 261-262). This keeps the history intact, satisfies
AC-2's exact-phrase assertion, and makes the old narrative consistent with the
2026-11-20 closures recorded in Edit 1. No other historical text was touched.

## 2. Command table (all exit 0)

Raw output directory (primary): `C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p2-primary\`

| # | Command | Exit | Observed result |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; 4460 tests across 437 files; Biome checked 1034 files; sim hash `0xff6f3d62` |
| 2 | `bun run build` | 0 | Vite 438 modules transformed |
| 3 | `bun run balance` | 0 | 1680 matrix fights; cap 370/1680 (22.0%); 34/34 gates |
| 4 | `bun run gate:determinism` | 0 | byte-identical artifacts |
| 5 | `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 `expect()` calls |
| 6 | `git diff --quiet 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD -- packages apps` | 0 | empty source diff |
| 7 | `git status --porcelain` | 0 | `M conductor/product.md`, `M conductor/tech-stack.md`, `?? .../verification/phase-2.md` at re-verification; after this commit only the two primary doc edits remain pending for the primary's state commit |

## 3. Doc assertions (all pass)

| Assertion | Count | Status |
| --- | --- | --- |
| `product.md`: `and both debt pins remain in place` | 0 | pass |
| `tech-stack.md`: `2026-11-23` | 2 | pass |
| `tech-stack.md`: `20261123-doc-truth-sweep` | 2 | pass |
| `tech-stack.md`: `does not resolve today` | 0 | pass |
| `tech-stack.md`: active `**has not run yet**` | 0 | pass |

## 4. Post-edit production spot-check (read-only probes)

| Probe | Observed |
| --- | --- |
| `https://apex-league.pages.dev/` | HTTP 200 |
| Bundle `/assets/index-B6REQeQ0.js` | exactly 1,107,393 bytes; markers `Live PvP`=1, `Room code`=1, `/live`=1, `apex-api.ansyar-world.top`=2 |
| `https://apex-api.ansyar-world.top/health` | 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}` |
| `/live` plain GET | 404 NOT_FOUND, `Content-Length: 9`, `Server: cloudflare` |
| `/live` with valid Upgrade headers | 400 Bad Request, `Content-Length: 31`, `Server: cloudflare` |
| `gh run list --limit 8` | Deploy `44803326606` / `44708870397` success; Server image `44803326527` success; Nightly `45018277857` / `44898666458` / `44731078115` success; CI `44743770468` success, `44743614778` cancelled |

No browser 101 is re-observed in this track; PR #82/#85 remain the authoritative
earlier browser proof. No CORS, proxy, deploy-config, or server code was changed.

## 5. Acceptance-criteria mapping (Phase 2 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | FR-2 debt paragraph reconciled; phrase absent | §1 Edit 1 + extra line-261 fix; §3 count 0 | pass |
| AC-3 | FR-3 dated 2026-11-23 note with 200s and run IDs; old wording superseded | §1 Edits 2-3; §3 counts | pass |
| AC-4 | Spot-check records client 200, bundle markers, health 200, `/live` GET, run IDs | §4 | pass |
| AC-6 | Source diff empty; only approved docs + evidence change | §2 command 6-7, §1 | pass |

NFR-1 (no code/gate/fence/config change) and NFR-2 (docs limited to the two
approved files, plus the primary-authorized line-261 phrase fix) hold.

## 6. Scope proof

`git diff --quiet 059809f..HEAD -- packages apps` exits 0 with no output,
proving no source change. Changed-file list is limited to `conductor/product.md`,
`conductor/tech-stack.md` and this evidence file (plus gitignored artifacts under
`.conductor/evidence/20261123-doc-truth-sweep/`). No plan, metadata, registry,
review, archived track, source, test, gate, fence, config, or dependency file was
edited by this agent.

## 7. Earlier blockers — resolved

The initial subagent run was blocked because the runtime denied `edit`/`write`
on the two docs and denied `curl.exe`, `gh`, `bun run gate:determinism` and
`bun run test:fuzz`. The primary applied the three exact edits (plus the
line-261 phrase fix) and re-ran all seven commands on HEAD `0b863360` with exit
0 as recorded in §2-§4. All blockers are closed; none remain open.

## 8. Final verdict

**Phase 2 accepted.**

## Primary verification (final tree, HEAD `f927ec1c`)

All configured commands were independently re-run on the squashed Phase 2 tree; all exited 0. Raw output: `C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p2-final\`.

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail; 670479 `expect()` calls; sim hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules |
| `bun run balance` | 0 | 1680 fights; cap 370/1680 (22.0%); 34/34 gates |
| `bun run gate:determinism` | 0 | byte-identical regenerations |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 `expect()` calls |
| `git diff --quiet 059809f..HEAD -- packages apps` | 0 | empty source diff |

Final tree is clean. Verdict: Phase 2 accepted on the final checkpoint `f927ec1c`.
