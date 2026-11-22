# Documentation Truth Sweep — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Reconcile two project documents that still describe a pre-deployment or pre-debt-closure reality, and record a fresh post-merge production spot-check. The work is documentation and evidence only: it changes no game code, gate, fence, protocol, replay version, dependency, or deploy configuration. It closes the last factual drift left by the recent Live PvP, D-2, and D-3/D-4 tracks and leaves the repository with a truthful baseline for future work.

## Problem / Motivation

`conductor/product.md` still ends its D-1/D-2/D-3/D-4 decision paragraph with “and both debt pins remain in place,” even though the same paragraph records D-3 and D-4 as closed on 2026-11-20. `conductor/tech-stack.md` still says the client deploy “has not run yet” and that `https://apex-league.pages.dev/` “does not resolve today,” though the Deploy workflow has succeeded on `main`, the client returns HTTP 200 with the live-PvP bundle, and the API health endpoint returns 200. A reader following Conductor as the source of truth would draw wrong conclusions about release state and open debt. Left unfixed, this drift compounds with each new track.

## Goals & Success Metrics

- **Goal:** All Conductor context docs agree with observed repository and production state, with evidence recorded in the track.
- **Metric:** Zero stale claims at the named anchors; fresh HTTP/probe evidence recorded; all configured checks green with unchanged sim hash `0xff6f3d62`; no source/gate/fence change.

## Scope

### In Scope

- Record a read-only baseline of the exact stale passages, live HTTP/workflow evidence, and stale local artifacts.
- Correct the contradictory D-3/D-4 debt-pin sentence in `conductor/product.md`, preserving the historical narrative and the accepted D-1 standing debt.
- Correct the stale client-deploy claims in `conductor/tech-stack.md` with a dated 2026-11-23 note that supersedes the 2026-10-26 “has not run / stays deferred” wording for both client and server.
- Record a post-merge production spot-check: client HTTP 200 and live-PvP bundle markers, API health 200, `/live` plain-GET response, and observed workflow run IDs.
- Record a stale branch/run-file inventory as a confirmation-gated follow-up; no deletion in this track.
- Write integrated evidence with command table, counts, hashes, probe outputs, scope proof, and final verdict.

### Out of Scope

- Any game, controller, species, balance, fence, pacing-pin, `SIM_VERSION`, ghost-pin, save-schema, protocol, CORS, deploy-config, manifest, or dependency change.
- Changing `conductor/product-guidelines.md`, style guides, workflow config, archived tracks, or the registry beyond this track's own scaffold/completion lines.
- Deleting local branches, run files, or any other repository cleanup; this requires separate owner confirmation.
- Re-deciding D-1, D-2, D-3, or D-4, or reopening product decisions already closed in archived tracks.
- New browser visual proof: the two-client browser evidence from PR #82/#85 remains the authoritative visual record; this track uses HTTP/probe evidence only.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Baseline evidence records the exact stale passages, live production probe results, workflow history, and stale branch/run inventory from an unchanged tree. | must |
| FR-2 | `conductor/product.md` reconciles the D-1/D-2/D-3/D-4 paragraph: D-3 and D-4 are closed on 2026-11-20, D-2 is closed, and D-1 remains the accepted standing debt; the contradictory “both debt pins remain in place” claim is removed. | must |
| FR-3 | `conductor/tech-stack.md` replaces the stale client-deploy claim with a dated 2026-11-23 note stating that Deploy and Server image ran on `main` on 2026-11-20, both URLs resolve, and the 2026-10-26 “has not run / stays deferred” wording is superseded for both client and server. | must |
| FR-4 | A post-merge production spot-check is recorded with observed client status, bundle markers, API health payload, `/live` plain-GET response, and workflow run IDs. | must |
| FR-5 | A stale branch/run-file inventory is recorded with exact names and counts, explicitly marked as requiring separate owner confirmation; no artifact is deleted. | should |
| FR-6 | `verification/integrated.md` records all commands, counts, hashes, probe outputs, scope proof, and the final verdict. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No source, game, gate, fence, controller, species, `SIM_VERSION`, ghost-pin, save-schema, protocol, dependency, CORS, or deploy-configuration change. |
| NFR-2 | Document edits are limited to `conductor/product.md` and `conductor/tech-stack.md`; all other docs require fresh owner approval. |
| NFR-3 | No credentials, passphrases, or real player data in tracked artifacts; probes use public endpoints only. |
| NFR-4 | All configured checks remain green: `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, `bun run test:fuzz`, with sim hash `0xff6f3d62`. |
| NFR-5 | Evidence cites exact commands and observed outputs; no result is claimed without command output or a file path. |
| NFR-6 | Branch and run-file cleanup is confirmation-gated and is not performed in this track. |
| NFR-7 | Module caps (12,288 B client/sim/server, 24,576 B voxel) remain unchanged with no allowlist. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `verification/phase-1.md` contains the exact old product and tech-stack passages, live probe outputs, workflow IDs, and stale inventory; source diff is empty. | FR-1 |
| AC-2 | `conductor/product.md` no longer contains “both debt pins remain in place” and explicitly records D-3/D-4 closed on 2026-11-20 with D-1 as the remaining accepted debt. | FR-2 |
| AC-3 | `conductor/tech-stack.md` contains a dated 2026-11-23 note with observed 200s and workflow run IDs; the active claim that the client deploy has not run is gone, and the historical wording is explicitly superseded. | FR-3 |
| AC-4 | Spot-check evidence records client 200, API health 200 with `schemaVersion 0003_ghost.sql`, live-PvP bundle markers, `/live` plain-GET response, and relevant workflow run IDs. | FR-4 |
| AC-5 | Stale inventory lists exact branch and run-file names/counts and states that deletion requires owner confirmation; repository shows no such deletion. | FR-5 |
| AC-6 | `git diff --quiet <base>..HEAD -- packages apps` exits 0; only the two approved docs, verification files, and evidence paths change. | FR-6 |
| AC-7 | All five configured commands exit 0 with hash `0xff6f3d62`. | FR-6 |
| AC-8 | `verification/integrated.md` is committed with command table, counts, hashes, probes, scope proof, and verdict. | FR-6 |
| AC-9 | No other Conductor doc, archived track, registry entry (beyond this track's own lines), product guideline, or style guide is modified. | FR-2, FR-3 |

## Edge Cases

- If a production probe returns a non-200 or unexpected body, record the exact response and mark that acceptance item unmet; do not invent or soften the result.
- If workflow history changes between baseline and final, cite the observed run IDs and timestamps rather than an absolute claim.
- If a stale branch disappears between inventory and final, reconcile the count in the final evidence with an explanation.
- If a doc anchor no longer matches exactly, stop and report the mismatch rather than approximating the edit.
- If a configured check fails for an unrelated transient reason, isolate and re-run the specific check once, recording both results.

## Dependencies

- **Tracks:** none — all cited tracks (`20261119-live-pvp-foundation`, `20261120-live-pvp-production-acceptance`, `20261120-kite-band-reachability`, `20261120-telemetry-fixture-debt`) are merged ancestors of the base.
- **External:** public production URLs (`https://apex-league.pages.dev/`, `https://apex-api.ansyar-world.top/`) and read-only `gh` workflow history.

## Open Questions & Assumptions

- **Assumption:** Owner approval covers editing both `conductor/product.md` and `conductor/tech-stack.md` (confirmed during planning).
- **Assumption:** A post-merge spot-check can be satisfied by HTTP/probe evidence and workflow history; the earlier browser proof remains authoritative for visual acceptance.
- **Assumption:** Stale branch and run-file cleanup is out of scope until a separate owner confirmation; this track records the inventory only.
- **Assumption:** The phrase “both debt pins remain in place” refers to the old D-3/D-4 pins and is stale; D-1's accepted ≤1/3 fence remains in force.

## References

- `conductor/product.md:258-265, 285-294, 368-376`
- `conductor/tech-stack.md:394-402, 808-826`
- Status probe on 2026-11-23: API `/health` 200, client 200, successful `Deploy`/`Server image` runs on 2026-11-20, Nightly determinism success 2026-11-21 and 2026-11-22
- Merged PRs #82, #85, #86, #87
- `conductor/workflow.md` (configured verification commands and strict review)
