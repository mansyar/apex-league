# Ghost Data & Async Rivals — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Per-trainer best cup-winning ghosts (full replay bundle: seed + both kits + event log) auto-submitted alongside save push, listed top-100 in the Board tab, and fightable as spar-vs-ghost with local-only results. Closes the last Phase-3 backend gap with async social play and zero live-PvP cost.

## Problem / Motivation

Leaderboards shipped prestige without payoff — trainers see names but cannot test themselves against those teams. Without ghosts, social competition stays passive, cup-winning teams evaporate, and the deterministic sim investment goes unexploited. If unsolved, Board engagement decays and async PvP has no foundation.

## Goals & Success Metrics

- **Goal:** Any cup win yields a replayable ghost.
- **Metric:** Ghost submit success rate on cup win; replay determinism 100% byte-identical in tests.
- **Goal:** Board → preview → fight in <3 clicks.
- **Metric:** Board fight start rate; visual evidence desktop + 393px mobile.
- **Goal:** Offline-safe, quiet, capped submissions.
- **Metric:** No blocking UI on submit/fetch; offline snapshot served; oversize/foreign rejected quietly.

## Scope

### In Scope

- Ghost bundle capture on cup win (seed + both kits + event log + sim version pin)
- Auto-submit alongside save push, quiet + non-blocking
- Per-trainer best server store + top-100 listing reusing leaderboard plumbing
- Board tab badge + preview + Fight Ghost button
- Spar-vs-ghost local fight (win/loss stays local, no cup/ladder mutation)
- Fetch-on-open + offline snapshot
- Plausibility caps reuse (reject oversize/foreign quietly)

### Out of Scope

- Live / real-time PvP, matchmaking, seasons/resets, friend lists
- Cup-bracket ghosts (ghosts as cup rivals)
- Multiple-per-trainer history / version browser
- Ladder points, cup wins, or collection credit from ghost fights
- New save-schema version (derived from cup session, no migration)

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Cup win captures a full replay bundle (seed, both kits, event log, sim version) that replays byte-identically | must |
| FR-2 | Ghost auto-submits alongside save push after cup win, quiet and non-blocking | must |
| FR-3 | Server stores per-trainer best ghost and serves top-100 listing reusing leaderboard plumbing | must |
| FR-4 | Board tab shows ghost badge, preview, and Fight Ghost action, extending existing Board tab | must |
| FR-5 | Spar-vs-ghost fight runs in spar arena with ghost kit and keeps result local (no cups/ladder mutation) | must |
| FR-6 | Board fetch-on-open serves offline snapshot when offline | should |
| FR-7 | Oversize, foreign, or implausible ghosts are rejected quietly with caps | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Deterministic replay: same bundle + resolver yields identical event log |
| NFR-2 | No save-schema bump; ghost derived from cup session, no migration |
| NFR-3 | Module caps respected (client 12KB, sim 12KB, server 6KB guards) |
| NFR-4 | Privacy: trainer display name only, no PII in bundle or listing |
| NFR-5 | Offline resilience: fetch failure serves snapshot, submit failure queues quietly |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Cup win creates a bundle that playback verifies byte-identical | FR-1 |
| AC-2 | Ghost submits alongside save push without blocking UI | FR-2 |
| AC-3 | Top-100 fetch returns ghosts with trainer names | FR-3 |
| AC-4 | Board Fight action launches spar with ghost kit loaded | FR-4 |
| AC-5 | Ghost win grants no cups, ladder points, or collection credit | FR-5 |
| AC-6 | Offline Board open shows last snapshot with stale copy | FR-6 |
| AC-7 | Oversize/foreign payload rejected quietly, existing best kept | FR-7 |

## Edge Cases

- First submit after registration flushes in order with save push
- Wipe + re-register creates fresh trainer binding, old best unreachable
- Name collision resolves newest-name-wins like leaderboards
- Sim-version mismatch skips replay with quiet note, keeps listing entry
- Unwritable DB / offline server fails quiet, snapshot preserved
- Empty board (no ghosts yet) shows empty-state copy, no error

## Dependencies

- **Tracks:** none (backend-foundation and global-leaderboards merged)
- **External:** none

## Open Questions & Assumptions

- **Assumption:** Simulator version pinned in bundle; mismatch skips replay quietly.
- **Assumption:** Latest cup-winning team is per-trainer best; no manual best-picker this track.
- **Question:** Should ghost show cup tier / day won? Assumed yes in preview if trivial, else defer.

## References

- conductor/archive/20261027-global-leaderboards/spec.md
- conductor/archive/20261026-backend-foundation/spec.md (if present)
- conductor/product.md Phase 3 ghost + Phase 4 async ghost PvP
