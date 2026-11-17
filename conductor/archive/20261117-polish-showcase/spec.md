# Polish & Showcase - Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A bounded polish pass over the deployed slice: expand the thin audio library
(new cues, a new music bed, one new CC0-only pack), add a music-ducking mix
layer, and lift accessibility/legibility to the product guidelines - then
capture verification evidence and one marquee cup-run clip.

## Problem / Motivation

The client is live and feature-complete, but its audio library is thin (2 beds,
2 jingles, 15 SFX, no UI/cup/milestone cues), music never ducks under important
cues, and the accessibility details (focus visibility, live-region feedback,
copy consistency) have never had a dedicated pass. Without this, the slice
plays correctly but does not *feel* finished for a portfolio audience. The
human-only device-lab pass remains, but everything else is agent-verifiable.

## Goals & Success Metrics

- **Goal:** A noticeably more finished, accessible, audibly richer slice, proven by captured evidence.
- **Metric:** >=6 new cues + 1 new bed + 1 new credited CC0 pack; ducking + 4 live-region event classes shipped; desktop and 393px mobile screenshots with clean console; 1 marquee capture; `bun run verify` and determinism gate unchanged.

## Scope

### In Scope

- New cues (UI navigate/confirm, cup stage transition, evolution/graduation) from already-credited CC0 packs.
- One new music bed and one new CC0-only pack with exact provenance in `CREDITS.md`.
- A pure, bun-tested music-ducking envelope for high-priority cues.
- Polite live-region announcements for verdict, KO, cup advancement, and save/load.
- Visible keyboard focus, guideline-compliant tooltip copy, reduced-motion parity.
- Desktop + phone screenshots, clean console, and one marquee cup-run capture.

### Out of Scope

- Any sim, battle-logic, save-schema, voxel or dependency change.
- Rewriting the existing crossfade or per-bus volume sliders.
- Onboarding redesign or a broad all-surfaces polish sweep.
- Physical mobile device-lab verification (human-only, deferred to the roadmap).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Expand the DOM-free, gate-checked cue table with UI-navigate/confirm, cup-transition and evolution/graduation cues, including calm variants; pure tests. | must |
| FR-2 | Bundle new SFX and one new music bed from already-credited CC0 packs; wire through `cueUrls`/`beds`; exact `CREDITS.md` provenance rows. | must |
| FR-3 | Source one additional CC0-only pack (agent's choice), vet its license, transcode to `.ogg` where needed, record provenance; flag ambiguity rather than guess. | must |
| FR-4 | Add a pure, bun-tested ducking envelope: music dips under verdict/KO/evolution cues and restores to the user's music volume; no public-contract change to `AudioPlayer`/`MusicBeds`. | must |
| FR-5 | Polite live-region announcements for verdict, KO, cup advancement, save/load; suppress in instant/reduced-motion dumps; never steal focus. | must |
| FR-6 | Visible keyboard focus on every interactive element on changed surfaces, styled per the broadcast kit and reduced-motion rules. | must |
| FR-7 | Tooltip/copy on touched surfaces follows guidelines: <=2 sentences, visible stat names, numbers over jargon, capitalized creature names. | should |
| FR-8 | Reduced-motion parity: calm-mix variants and silent instant dumps remain correct after cue expansion. | should |
| FR-9 | Produce desktop (1440x900) and iPhone 15 (393x852) screenshots of changed surfaces, clean console, and one marquee cup-run capture (arena -> verdict -> graduation). | must |
| FR-10 | All changes stay in `apps/client/src` and `apps/client/public/audio`; no sim, save, voxel or dependency changes. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism gate byte-identical; `SIM_VERSION` unchanged. |
| NFR-2 | Module size caps honored (client/sim 12,288 B; voxel 24,576 B) via module-size tests. |
| NFR-3 | New audio is CC0-only with recorded provenance; no new dependency without a stack decision. |
| NFR-4 | Audio failures are swallowed; first-gesture unlock preserved; audio never breaks the game loop. |
| NFR-5 | UX principle 8 holds at 393x852 and 852x393: no horizontal scroll, no occlusion, readable text, clean console. |
| NFR-6 | Ducking restores exact user volume after mute toggles or scene changes mid-duck. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Pure cue tests cover all new cue types including calm variants. | FR-1 |
| AC-2 | New asset URLs resolve; `CREDITS.md` has a row per bundled file. | FR-2 |
| AC-3 | New pack license verified CC0; provenance and transcode documented. | FR-3 |
| AC-4 | Ducking unit tests (duck, restore, mute toggle, scene change) pass; audible in capture. | FR-4 |
| AC-5 | All 4 live-region events observed in DOM; no focus stealing. | FR-5 |
| AC-6 | Keyboard focus visible on all interactive targets in visual pass. | FR-6 |
| AC-7 | Copy audit on touched surfaces passes guideline rules. | FR-7 |
| AC-8 | Reduced-motion mode yields calm variants and silent dumps. | FR-8 |
| AC-9 | Desktop + mobile screenshots, clean console, marquee capture committed. | FR-9 |
| AC-10 | `bun run gate:determinism` byte-identical; module-size tests green; `bun run verify` green. | FR-10 |

## Edge Cases

- Autoplay blocked until the first gesture; ducking must not resume audio before unlock.
- Mute toggled mid-duck: restore must not un-mute or raise audible volume.
- Scene change (ranch <-> arena) mid-duck: ducking applies to the current bed only.
- Missing or corrupt `.ogg`: `playCue` swallows the error and the game loop continues.
- Reduced motion with new cues: calm variants used; instant dumps stay silent.
- Ambiguous license: do not bundle; flag as an open question.
- Module size cap breach: split the module along existing seams.
- 393x852 and 852x393: no horizontal scroll, no occlusion of interactive elements.
- Rapid events: coalesced into one polite live region to avoid chattiness.

## Dependencies

- **Tracks:** none (audio foundation and presentation mapping are already complete).
- **External:** CC0 asset source (agent's choice); browser audio for the visual pass. Physical device-lab verification is human-only and deferred.

## Open Questions & Assumptions

- **Assumption:** The agent-selected pack is unambiguously CC0; if not, substitute another CC0 source and record it.
- **Assumption:** The marquee capture is producible with existing Playwright tooling; if video is unsupported, fall back to a frame sequence or GIF.
- **Assumption:** Existing v16 volume fields suffice; no save bump is needed.
- **Question (deferred):** The owner must schedule the physical device-lab pass post-merge.

## References

- `conductor/product.md` - Phase 4 roadmap item "audio expansion; polish".
- `conductor/product-guidelines.md` - UX principle 8, broadcast HUD, copy rules.
- `conductor/tech-stack.md` - audio foundation seam (`cues.ts` / `player.ts`).
- `apps/client/public/audio/CREDITS.md` - bundled asset provenance.
