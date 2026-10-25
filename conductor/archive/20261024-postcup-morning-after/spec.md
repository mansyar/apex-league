# Post-Cup Morning-After Ritual — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

After every completed cup, the first ranch arrival becomes "the morning after":
the fighting pet plays a short, outcome-aware ceremony — a pose + sparkle
moment, one warm coach debrief line in the existing ticker, and a class-tinted
idle that lasts the day — derived purely from the finalized in-memory session
plus persisted milestone firsts. No sim and no save-schema changes: the save
stays at v25.

## Problem / Motivation

Today the cup ends on a results card and the ranch reset is emotionally flat.
The product guidelines promise a warm coach-side world, but the transition
back gives the creature no reaction, so the loop's emotional punctuation drops
exactly at its peak. Players who lived a title run — or a forfeit — return to
an identical ranch morning either way.

## Goals & Success Metrics

- **Goal:** every completed cup ends with a legible, warm, outcome-aware
  morning reaction the player *feels* without reading.
- **Metric:** visual checklist (desktop + phone screenshots of representative
  mornings, clean console) + all classifier / ceremony / amplifier unit tests
  green + copy tone-verified against `product-guidelines.md` (coach voice,
  ≤ 2 sentences).

## Scope

### In Scope

- Four outcome classes (`title`, `gatekeep`, `exit`, `withdrawn`) plus a
  milestone amplifier, derived from the finalized session and persisted firsts.
- An arrival ceremony machine (`scene-logic`) wired through the ranch
  adapters: auto-plays once, skippable by player intent, class-adaptive caps.
- Per-archetype class poses + a day-long idle weight tint across all six
  archetypes, cleared at night settle.
- A subtle petting variant (first pet of the ritual day).
- Exactly one class- or amplifier-conditioned coach debrief line that day.
- A reduced-motion jump-cut variant.
- A `careCues` remap of existing audio assets per class (no new files).

### Out of Scope

- Any change to `packages/sim`, the save schema, or `docs/save-schema.md`.
- Persistence of cup placements (out-in-semis etc. stays un-persisted).
- New voxels, rigs, or pose vocabulary beyond what the adapters already do.
- Reactions from stable pets or on nursery surfaces; banter/dialogue systems;
  any change to cup flow itself (entry, bracket, results card stay untouched).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Pure classifier `deriveMorningAfter(finalizedSession, preState, postState) → { class, amplifier?, boss? }`, `null` outside a ritual day. Classes: `title` (won the final; a drawn final still crowns per the existing results rule), `gatekeep` (eliminated by an authored gatekeeper boss), `exit` (any other loss), `withdrawn` (forfeit overrides every other class). | must |
| FR-2 | The arrival ceremony auto-plays on the first ranch arrival after finalize; any player intent (petting, click) dismisses it politely; it never replays that day; class-adaptive caps: title 8–10 s, gatekeep 5–6 s, exit 4–5 s, withdrawn 3 s; the amplifier adds at most +1 s. | must |
| FR-3 | Class pose choreography and a day-long idle tint (e.g. strut vs droop weights) rendered for every archetype rig; the tint is cleared at night settle. | must |
| FR-4 | Milestone amplifier from **persisted firsts only**: first-ever title (`cupsWon` 0→1), first Legend title, first boss scalp (`bossDefeats` grows), new `claimedTiers` tier claimed this finalize — extra sparkle burst and the amplifier debrief copy overrides the class copy. (Placement-based milestones are impossible: placement is not persisted at v25.) | must |
| FR-5 | Subtle petting variant: the ritual day's first pet uses a class-conditioned line/reaction variant; petting cooldowns and conditions are unchanged. | must |
| FR-6 | Exactly one warm coach debrief line for the ritual day, shown in the existing coach ticker channel. | must |
| FR-7 | Reduced motion: jump-cut into the outcome pose (no travel, leap, or spin), ≤ 2 s glow moment, same debrief line. | must |
| FR-8 | Audio support via a `careCues` remap of already-bundled cues per class variant — no new asset files. | should |
| FR-9 | Edge rules: a reload anywhere before/during the ritual loses it gracefully (in-memory only, nothing written to the save); if the ritual day also hosts an evolution reveal, the cup ritual *yields* to it (the debrief line may still show; no pose ceremony); state never persists past night settle. | must |
| FR-10 | All ritual copy single-sourced in one `copy.ts` table keyed by class and amplifier. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to `packages/sim` or the save schema (v25 stays current); `docs/save-schema.md` untouched. |
| NFR-2 | Module caps respected: every module ≤ 12 KB in `apps/client`/`packages/sim`, ≤ 24 KB in `packages/voxel`; no existing file regrows past its cap. |
| NFR-3 | No new dependency; existing Bun + TypeScript + Three.js surface only. |
| NFR-4 | The voxel determinism gate is untouched — no GLB regenerations, no committed-artifact edits. |
| NFR-5 | All randomness is seeded; no unseeded `Math.random` in derivation or ceremony scheduling. |
| NFR-6 | Accessibility per product guidelines: colour never the sole carrier (copy carries the outcome), reduced motion honored, essential text not tiny. |
| NFR-7 | No lingering timers beyond night settle; ceremony cleanup is deterministic. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Classifier unit tests: each class derives correctly, forfeit wins precedence, a non-cup day derives `null`, gatekeeper elimination is recognized by boss id. | FR-1 |
| AC-2 | Machine tests: the schedule stays within the class cap; dismiss intent ends it early; no same-day replay; the idle tint is set on arrival and cleared at the night settle. | FR-2, FR-3 |
| AC-3 | Amplifier tests: each of the four persisted firsts fires exactly on its qualifying finalize, never on later days, and its copy overrides the class copy. | FR-4 |
| AC-4 | View-model tests: the pet variant and the debrief render for each class; the copy table is golden-tested. | FR-5, FR-6, FR-10 |
| AC-5 | Playwright screenshots: a champion morning and a subdued morning at 1440×900 and 393 px, console clean. | FR-2, FR-7 |
| AC-6 | Edge tests: an evolution-reveal collision makes the ritual yield; the first-ever forfeited cup produces a `withdrawn` morning with zero amplifiers. | FR-9 |

## Edge Cases

- Reload between finalize and ranch arrival → no ritual; arrival is a normal
  morning.
- Reload mid-ceremony → in-memory state lost; the day proceeds normally.
- Forfeited first-ever cup → `withdrawn` morning, zero amplifiers.
- Drawn final (double KO) → existing rule crowns the player → `title`.
- Elimination by a non-boss rival → `exit`.
- Loss in the final to the Legend gatekeeper → `gatekeep` (boss precedence
  over plain placement depth).
- A reward tier claimed that morning → the nursery claim flow stays separate
  (opened by player intent); the ritual never blocks or queues behind it.
- Reduced-motion toggled mid-ceremony → re-read at the next beat; current
  beat completes.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** "ritual day" = the ranch day first entered after cup
  finalize; same-day vs next-morning semantics are verified against the real
  finalize → ranch flow in Phase 1.
- **Assumption:** poses extend the existing pose/effect vocabulary; no new
  rig work.
- **Assumption:** milestone amplification is capped at +1 s and one extra
  sparkle burst.

## References

- `conductor/product-guidelines.md` — coach voice, tone, UX principles, a11y.
- `conductor/workflow.md` — visual layer procedure, module caps.
- Track precedents: `ranch_rituals` (ceremony machinery), `battle
  choreography` (BodyProfile/pose precedent), `stable-partner-reserve`
  (single active pet assumption).
