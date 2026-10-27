# Global Leaderboards — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track adds global leaderboards on top of the shipped backend foundation
(anonymous trainer identity + cloud save sync on Coolify). Trainers' cup wins,
ladder points, AP totals, and collection breadth are submitted automatically
after results land and ranked on four all-time boards under the trainer's
chosen name.

## Problem / Motivation

Every achievement today is local: a cup win or a full collection exists only
on the device that earned it. Without a shared board there is no cross-trainer
comparison, no reason to visit from a second device, and the identity +
save-sync backend has no social payoff. If unsolved, the backend stays plumbing
with no visible product value.

## Goals & Success Metrics

- **Goal:** any trainer's earned result appears on the global boards and is
  visible from a second device.
- **Metric:** two-device check — a cup win earned on device A appears on
  device B's board after sync, with the trainer's chosen name and correct rank.

## Scope

### In Scope

- Four all-time boards: cup wins + placements, ladder points, trainer AP,
  collection breadth.
- Server: score-submission endpoint, per-trainer best per category,
  plausibility caps, ranked-list endpoint.
- Client: new Board tab with per-category lists, auto-submit after cup/ladder
  results, fetch-on-open with offline last-snapshot fallback.
- Abuse: implausible submissions rejected, trainer's last valid entry kept.

### Out of Scope

- Ghost data, seasons/resets, friend lists, live PvP matchmaking, manual share
  buttons, full server-side result verification (replay/recompute).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Client auto-submits a score entry after a cup or ladder result lands (alongside the save push) | must |
| FR-2 | Server stores the per-trainer best per category, keyed by anonymous trainer ID | must |
| FR-3 | Server rejects implausible values (negative, non-finite, beyond per-category caps) and keeps the trainer's last valid entry | must |
| FR-4 | Server serves ranked lists per category (rank, chosen name, value), newest-name on submit | must |
| FR-5 | Board tab shows all four categories with rank, name, and value; loading, empty, and error states | must |
| FR-6 | Board fetches on open; offline or unreachable server shows the last snapshot with a quiet offline note | must |
| FR-7 | Submitted entry carries the trainer's current chosen name; name changes update on next submit | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No save-schema change (leaderboard state is server-side; save v25 untouched) |
| NFR-2 | Submission is non-blocking and quiet — a failed submit never interrupts play or the save push |
| NFR-3 | No PII: only anonymous ID + chosen name + scores leave the device |
| NFR-4 | In-test server routes run in-process without ports (backend-foundation precedent) |
| NFR-5 | Board list renders within the existing client performance budgets (module caps enforced by tests) |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Winning a cup produces a submission; the trainer's best cup entry updates only when beaten | FR-1, FR-2 |
| AC-2 | Implausible payload (negative / absurd AP) is rejected; previous valid entry remains | FR-3 |
| AC-3 | Ranked list orders by value desc, ties share rank order deterministically, names current | FR-4, FR-7 |
| AC-4 | Board tab renders all four categories from a live server; empty board shows an empty state | FR-5 |
| AC-5 | With the server unreachable, the board shows the last snapshot + quiet offline note, no error plate | FR-6 |
| AC-6 | Two-device check: result on device A visible on device B's board after sync | FR-1, FR-4 |
| AC-7 | Full gates green (`bun run verify`, build) with no save-schema migration | NFR-1, NFR-2 |

## Edge Cases

- First submit creates the entry; no prior best exists.
- Two results before a push flushes: last-savedAt-wins ordering inherited from
  the save pipeline.
- Trainer wipes local data and re-registers: new anonymous ID starts fresh (no
  reset flow — backend-foundation precedent).
- Oversize/foreign-shape payloads rejected, not stored.
- Server DB unwritable: submit fails quiet, save push unaffected.
- Name collision: two trainers, same chosen name — ID stays the key, names may
  repeat.

## Dependencies

- **Tracks:** none unmerged (`20261026-backend-foundation` merged; identity +
  save sync live).
- **External:** Coolify VPS + GHCR already provisioned (backend-foundation); no
  new secrets.

## Open Questions & Assumptions

- **Assumption:** per-category plausibility caps are set from current game
  maxima (cup tallies, ladder points, AP bounds) and recorded in code; tuning
  them later needs no migration.
- **Assumption:** board page size is a fixed top-100 per category; pagination
  beyond that is a later track if needed.

## References

- `conductor/product.md` Phase 3 (ElysiaJS line: leaderboards still open)
- `conductor/tech-stack.md` Server (ElysiaJS, Drizzle, Coolify deployment)
- `conductor/archive/20261026-backend-foundation/` (identity, save sync,
  container precedent)
