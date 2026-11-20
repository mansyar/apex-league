# Phase 3 Verification — Integrated evidence and documentation truth

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: 3 — Integrated evidence and documentation truth
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base: `4b4e9382` (phase base; code head at acceptance)
- Head: final tree includes the primary-applied `product.md` edit; this evidence file and
  `integrated.md` were added by the phase subagent's evidence commits.
- Result: **verified by primary** — the integrated verification record and ADR supersession
  note are complete, and the owner-approved single-line `product.md` roadmap edit was
  applied by the primary (exact replacement below). All five configured commands were
  re-run on the final tree with exit 0.

This phase has no new user-facing change, so no new screenshots were captured. The existing
evidence paths in `verification/integrated.md` were reviewed instead.

## Docs edits

1. `conductor/product.md`, **line 339 only** — applied by the primary after the subagent's
   permission-denied edit was reported. Exactly this one-line change was made; every other
   roadmap line is byte-identical and no new product direction was added:

   ```
   OLD: - Async ghost PvP; live PvP (battle code designed for it from Phase 1).
   NEW: - Async ghost PvP; live PvP landed 2026-11-20 (PR #82), with production acceptance in PR #83/#84 and this track.
   ```

2. `verification/integrated.md` (new): the committed integrated verification record
   carrying exact commands/counts/hash, module caps, deployed URLs, all screenshot paths,
   console result, the AC-1..AC-9 table, scope proof, thin-slice limitations and verdict.

3. This file: supersession note and scope guard (below).

## ADR supersession note

Archived ADR `conductor/archive/20261119-live-pvp-foundation/verification/decision.md`,
lines 104–107, states:

> The two-client browser proof could not be executed by this subagent: the shell denied
> starting the API server with the required environment. All static, unit, build, balance
> and in-process determinism checks pass; the primary must run the visual layer. No visual
> pass is claimed here.

That line is a historical statement about what the *foundation subagent* could run. It is
**superseded** by `verification/integrated.md` and `verification/production-proof.md`, which
record the completed two-client visual proof against the deployed origins (desktop and
phone screenshots, natural verdict, mid-bout forfeit, 0 console errors) plus the second-bout
panel-reset proof in `verification/phase-2.md`. The archived ADR is deliberately left
untouched — it is historical evidence and is not edited by this track.

## Scope guard

Confirmed against `git diff e5459deb..HEAD`:

- No change to `LIVE_PROTOCOL_VERSION` (1), `SIM_VERSION` (3), save schema, balance gates,
  pacing pins/fences, CORS / `ALLOWED_ORIGIN`, or deploy configuration.
- No dependency change beyond the owner-approved `@apex/sim` workspace declaration in the
  server manifest, its matching `bun.lock` entry, the Dockerfile sim-source copy and its
  dockerignore exception (Phase 1R).
- No module-cap allowlist added; caps unchanged; largest changed client `live/` file well
  under 12,288 B.
- No credential, passphrase or real player data in tracked artifacts. Only the two throwaway
  trainer ids appear; passphrases were derived inside the browser, travel only in the JSON
  message body, and were never written to any file, URL, room code, log or screenshot;
  credentials were injected only as `apex.trainer` localStorage.

The one pre-existing Conductor/docs edit in the diff (`tracks.md`, track artifacts) is
Conductor state owned by the primary, not a source/config change.

## Commands

All commands were run separately (no `&&`, no pipes). This phase adds no code, so the final
tree is identical to the Phase 2 acceptance tree.

| Command | Exit | Observed detail |
| --- | --- | --- |
| `bun run verify` | 0 | **Observed by subagent:** 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; Biome clean (1030 files); voxel determinism byte-identical; hash `0xff6f3d62` |
| `bun run build` | 0 | **Observed by subagent:** Vite 438 modules, `index-BR1jNXG_.js` (1,106.89 kB); pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | **Observed by subagent:** 1680 fights, capShare 30.8% ≤ 33.3%, decisiveShare 93.7%, all 34 gates OK |
| `bun run gate:determinism` | 0 (primary) | Denied to this subagent by the shell permission layer; not retried or worked around. Primary result: 21 species × 3 stages + 5 props byte-identical. `bun run verify` ran the same gate internally byte-identically. |
| `bun run test:fuzz` | 0 (primary) | Denied to this subagent by the shell permission layer; not retried or worked around. Primary result: 139 pass / 0 fail, 129015 `expect()` calls. |

No pass is claimed for any command this phase did not observe; the two denied commands are
reported with their primary-run results exactly as supplied in the phase brief, consistent
with the record in every earlier phase of this track.

## Acceptance criteria (Phase 3 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-4 | Integrated record with commands, counts, hash, caps, screenshots, console, URLs, scope proof | `verification/integrated.md` | pass |
| AC-5 | `product.md` Phase 4 landed note (dated, PR #82); ADR line noted superseded; ADR unchanged | `product.md:339` landing note applied by primary; ADR supersession note here; archived ADR untouched | pass |
| AC-6 | Five commands exit 0, hash `0xff6f3d62`, caps pass, only approved deviation | Command table + scope guard above | pass |
| AC-8 | Repo-external failure recorded as blocked with probe output, no fabricated pass | Historical blocked records in `production-proof.md`; two permission-denied commands reported truthfully here | pass |

## Deviations / blockers

- No blockers remain. The `product.md` single-line roadmap edit was denied to the subagent
  but applied by the primary with the exact approved replacement; all other roadmap lines
  are byte-identical.
- Two verification commands (`gate:determinism`, `test:fuzz`) were denied to the subagent
  shell and were not retried by it. The primary re-ran both on the final tree with exit 0
  (139 fuzz cases; byte-identical determinism), matching the results carried in the table.

## Notes

- No new screenshots: no user-facing change in this phase; existing evidence paths were
  reviewed and are listed in `verification/integrated.md`.
- No push, merge or PR was performed. No Conductor state file (`plan.md`, `metadata.json`,
  `spec.md`, `tracks.md`, `index.md`) was edited by this phase.

## Primary verification (final tree)

Primary applied the approved `product.md` edit and independently re-ran all five configured
commands on the final tree:

| Command | Exit | Result |
|---|---|---|
| `bun run verify` | 0 | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests across 436 files, hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules, pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, 34 gates ok |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |

Primary confirmed `conductor/product.md:339` contains the dated landing note and that the
archived ADR was not modified. Scope guard re-checked: no protocol/save/balance/pacing/CORS/
deploy change beyond the approved container-runtime deviation; no credentials in tracked
artifacts.

**Verdict: Phase 3 accepted.**
