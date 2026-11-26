# Decide stable capacity, ranch expansion, and pet release — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track ratifies the three open product-policy questions in RM-7: stable capacity, ranch expansion, and pet release. It confirms the shipped contract — the stable is unlimited, exactly one partner lives in the ranch at a time, and there is no permanent release seam — then records those decisions in `conductor/product.md` and `docs/save-schema.md`. It also corrects the save-schema doc's stale version (`25` → `26`) and records an explicit revisit trigger. No sim, client, server, save, or generated code changes.

## Problem / Motivation

The product vision says the player owns several pets, only one partner lives in the ranch, and every other pet waits frozen in the stable. It does not explicitly say whether the stable is capped, whether the ranch may ever hold multiple active pets, or whether a pet can be permanently released. The code and docs currently imply “unlimited / one partner / no release”, but without a ratified decision, future roster expansion or UI work could invent conflicting rules, add a save migration for a cap, or add a destructive release flow. Ratifying the low-risk options now prevents that drift and gives content work a stable policy to build against.

## Goals & Success Metrics

- **Goal:** Ratify the three RM-7 policies and align product/save-schema docs with the shipped behavior.
- **Metric:** Product and save-schema docs explicitly state unlimited stable, one active ranch partner, and no release seam; the save-schema doc reports version `26`; the full configured verification stack is green; and the diff contains no sim/client/server/save/generated change.

## Scope

### In Scope

- Ratify: unlimited stable capacity, one active ranch partner, no release seam.
- Edit `conductor/product.md` to state these decisions explicitly (owner approval captured in the spec interview).
- Edit `docs/save-schema.md` to state current version `26`, “no capacity limit”, exactly one active `creature`, frozen `stable` pets, and no release path.
- Record a revisit trigger and roadmap-only follow-up handling in this spec.
- Run the full configured verification stack and a doc truth check.

### Out of Scope

- Implementing a stable cap, release command, or multi-partner ranch in sim/UI/server code.
- Bumping `SAVE_VERSION`, adding migration, or changing save fields.
- New visual captures or generated artifacts.
- Changing the 20–40 species vision, evolution rules, or battle behavior.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Ratify stable capacity as unlimited; product and save-schema docs explicitly state there is no cap. | must |
| FR-2 | Ratify one active ranch partner; docs state exactly one `creature` is active and all other owned pets wait frozen in `stable`. | must |
| FR-3 | Ratify no permanent release seam; docs state retirement/breeding remain the lifecycle path and stabled pets may only be brought forward, not deleted. | must |
| FR-4 | Correct `docs/save-schema.md` to report the current `SAVE_VERSION` as `26` while preserving its “no capacity limit” and frozen-stable statements. | must |
| FR-5 | Record an explicit revisit trigger (stable collection growth past ~40 pets, or a future need for multiple active partners) and state that future mechanics go to `conductor/roadmap.md` Later, not GitHub issues. | must |
| FR-6 | Verify the track with the full configured stack and a doc truth check, with no sim/client/server/save/generated diff. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Changes are confined to `conductor/**` state and the two approved product-facing docs; no sim, client, server, save, or generated file changes. |
| NFR-2 | No dependency, lockfile, generated artifact, or determinism-hash change; full verify and build gates stay green. |
| NFR-3 | Product-doc edits only ratify the decided policies; no new vision, balance, or progression rule is introduced. |
| NFR-4 | All FR/NFR/AC IDs remain stable and are mapped to evidence in review. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `conductor/product.md` explicitly states unlimited stable, one active ranch partner, and no release seam. | FR-1, FR-2, FR-3 |
| AC-2 | `docs/save-schema.md` reports version `26`, states no capacity limit, exactly one active `creature`, frozen `stable` pets, and no release path. | FR-1, FR-2, FR-3, FR-4 |
| AC-3 | The spec records the revisit trigger and roadmap-only follow-up handling. | FR-5 |
| AC-4 | Git diff contains no sim/client/server/save/generated change; only Conductor state and the two approved docs are touched. | NFR-1, NFR-2 |
| AC-5 | `bun run verify && bun run build` exits 0 with determinism and module-size gates green. | FR-6, NFR-2 |
| AC-6 | Doc truth check finds no remaining statement of a stable cap, release seam, multiple active partners, or save version `25` in the docs this track edits. | FR-1–FR-4 |
| AC-7 | Conductor completion proof holds: registry `[x]`, archived metadata `status: complete` with `pr_url`, `verification/integrated.md` committed, `review.md` PASS, and roadmap RM-7 retired. | NFR-4 |

## Edge Cases

- **Future capacity change:** A cap would require a new track with a save-version bump, migration for over-cap saves, refusal reasons, and UI counters; this track does none of that.
- **Existing large stables:** No cap means no over-cap saves exist; existing saves are unchanged.
- **Release requests:** No destructive action is added; players who want a different pet bring one forward from the stable.
- **Product-doc duplication:** `conductor/product.md` already states the one-partner rule; edits add explicit ratification rather than restating the whole acquisition section.
- **Save-version drift:** `docs/save-schema.md` says `25` while `SAVE_VERSION` is `26`; correct the doc, do not bump the code version.
- **Revisit trigger:** If the stable collection grows past ~40 pets, or a feature needs multiple active partners, the owner opens a new decision/feature track.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** “Stable” means the frozen collection in `state.stable`; “release” means permanent removal from the save.
- **Assumption:** Retirement and breeding remain the lifecycle path; no release seam is introduced.
- **Assumption:** Approval to edit `conductor/product.md` and `docs/save-schema.md` was given in the spec interview and is limited to ratifying these decisions.
- **Assumption:** Follow-ups are recorded in `conductor/roadmap.md` Later only; GitHub issues are disabled for this workflow.

## References

- `conductor/roadmap.md` — RM-7
- `conductor/product.md` — Core Loop and Acquisition
- `docs/save-schema.md` — stable/creature fields and save version
- `packages/sim/src/stable.ts` — current stable seams
- `conductor/archive/20261022-stable-partner-reserve/` — prior stable/partner work
