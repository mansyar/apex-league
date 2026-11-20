# Phase R1 Verification — Review finding F1 (throwaway identity count)

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: R1 — Review Fixes / finding F1 (NFR-2 / AC-7 documentation truth)
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base: `25d7c26f` (phase base from the R1 brief; HEAD at phase start)
- Head: this evidence file and the corrected `conductor/tracks/20261120-live-pvp-production-acceptance/verification/integrated.md`
  are the phase's only changes, committed together as one documentation-only commit. No code changed.
- Result: **verified by primary (documentation-only)** — F1 corrected in both required locations;
  all five configured commands re-run by the primary with exit 0. No new visual proof is needed for
  a documentation fix.

## Finding F1 (Low, NFR-2 / AC-7)

`verification/integrated.md` claimed "Two throwaway ids only" (AC-7 evidence cell) and "Only two
throwaway trainer identities were used" (thin-slice limitations bullet). The existing evidence
actually records six distinct throwaway trainer IDs across three attempts:

| Attempt | Trainer IDs | Source |
|---|---|---|
| Blocked attempt | `trn_0kpsy4z9rw2y1n2g9ymm`, `trn_ytm0w7yqmtt5qcdeqrxm` | `verification/production-proof.md:39` |
| Final retry | `trn_y76gpfjs2dnr45qmhqpy`, `trn_hd8mpxr7tewachd64hyw` | `verification/production-proof.md:137-138` |
| Second-bout proof | `trn_pt4menvrrc8nx7s8ranf`, `trn_shs0nyvcxwhkcmp10c69` | `verification/phase-2.md:56` |

All six are throwaway; no real player data, credentials or passphrases appear in any tracked
artifact. The defect was documentation truth only — no source, config or evidence behavior changed.

## F1 fix (old → new wording)

Only `verification/integrated.md` was edited, in exactly two places.

1. AC-7 evidence cell (line 135):

   ```
   OLD: Two throwaway ids only; passphrases browser-derived, never written to file/URL/room code/log/screenshot; credentials only in `apex.trainer` localStorage
   NEW: Two concurrent throwaway identities per proof; six total across the blocked attempt, retry and second-bout proof; passphrases browser-derived, never written to file/URL/room code/log/screenshot; credentials only in `apex.trainer` localStorage
   ```

2. Thin-slice limitations bullet (line 162):

   ```
   OLD: - Only two throwaway trainer identities were used; no real player data is involved.
   NEW: - Each proof used two concurrent throwaway trainer identities (six total across the blocked attempt, retry and second-bout proof); no real player data is involved. This is the accepted interpretation of NFR-2 (a fresh pair per proof attempt).
   ```

Both replacements were verified present by a follow-up read. The AC-7 criterion column, all other
integrated.md content, `spec.md`, and every source/config file are byte-unchanged.

## Credential and scope guard

- No code changed. No source, config, manifest, deploy, CORS, spec, plan, metadata, tracks, review
  or archived ADR file was edited; no protocol/save/balance/pacing constant was touched.
- No passphrase was written to any artifact. None is known and none was invented. Passphrases were
  browser-derived, travel only in the JSON message body, and were never placed in a file, URL,
  room code, log or screenshot; credentials were injected only as `apex.trainer` localStorage.
- No real player data or personal credentials appear in any tracked artifact. The six trainer IDs
  listed above are throwaway and were already present in the referenced tracked evidence.
- No push, merge or PR was performed.

## Commands

All commands were run separately (no `&&`, no pipes). No new visual proof was needed for a
documentation-only fix.

| Command | Exit | Observed detail |
| --- | --- | --- |
| `bun run verify` | 0 | **Observed by subagent:** 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; Biome clean (1030 files); voxel determinism byte-identical; hash `0xff6f3d62` |
| `bun run build` | 0 | **Observed by subagent:** Vite 438 modules, `index-BR1jNXG_.js` (1,106.89 kB); pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | **Observed by subagent:** 1680 fights, capShare 30.8% ≤ 33.3%, decisiveShare 93.7%, all 34 gates OK |
| `bun run gate:determinism` | 0 (primary) | Denied to this subagent by the shell permission layer; not retried or worked around. Primary re-ran it on the final tree: 21 species × 3 stages + 5 props byte-identical. |
| `bun run test:fuzz` | 0 (primary) | Denied to this subagent by the shell permission layer; not retried or worked around. Primary re-ran it: 139 pass / 0 fail, 129015 `expect()` calls. |

Both denied commands were re-run by the primary on the final tree and are recorded below; no claim
rests on the subagent's denied attempts.

## Acceptance criteria (R1 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| F1 / NFR-2 | Evidence states the true count of throwaway identities and records accepted NFR-2 interpretation | AC-7 cell + limitations bullet corrected above; both replacements read back | pass |
| F1 / AC-7 | No credentials, passphrases or real player data in tracked artifacts | Credential/scope guard above; no passphrase written or invented | pass |

## Deviations / blockers

- Two verification commands (`gate:determinism`, `test:fuzz`) were denied to this subagent by the
  shell permission layer and were not retried or worked around, per the brief. The primary re-ran
  both on the final tree with exit 0; this was a permission-layer limitation, not a test failure.
- No other deviations. The fix is limited to the two allowed files.

## Notes

- Strict mode: F1 was the only finding and was fixed, not deferred.
- The AC-7 criterion column and stable AC definitions were deliberately left unchanged; only the
  evidence cell and the limitations bullet were corrected.
- No new screenshots: documentation-only phase with no user-facing change.

## Primary verification (final tree, HEAD `c1a9bbf6`, squashed to checkpoint `7d6b9bea`)

All five configured commands were re-run separately by the primary on the final tree; all exit 0.

| Command | Exit | Observed detail |
| --- | --- | --- |
| `bun run verify` | 0 | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; typecheck + Biome clean (1030 files); hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules, `index-BR1jNXG_.js`; pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, capShare 30.8%, decisiveShare 93.7%, 34 gates OK |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |

Full output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1f67a8fa0001xbgWvboqFLQCdD.out`.

Scope check: `git diff 25d7c26f..HEAD --name-only` contains only `verification/integrated.md` and
this evidence file; no source, config, spec, plan or metadata change. The diff shows exactly the two
F1 wording corrections.

- **Verdict: Phase R1 accepted (documentation-only).**
