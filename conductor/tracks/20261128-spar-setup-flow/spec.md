# Streamline Spar Setup — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The spar setup panel gets an explicit start action and a scroll-stable layout:
tactic buttons arm a selection instead of launching the battle, a sticky Start
footer shows the armed tactic + rule and launches on tap, and the panel keeps
internal-only scrolling with the start control always reachable at 393px in
both orientations.

## Problem / Motivation

Today the tactic buttons are also the fight trigger — tapping Press/Kite to
read or compare doctrines instantly launches the battle (`spar.ts`
`onPickTactic → runBattle`). Players suffer accidental entries with no review
step, and on phones the launch controls can sit below the fold of the
internally-scrolling panel while there is no persistent start affordance. If
unsolved, sparring keeps punishing curiosity taps and mobile setup stays a
scroll-hunt.

## Goals & Success Metrics

- **Goal:** Every spar launches from an explicit, always-visible Start action
  after the player reviews rival, kit, tactic, and rule.
- **Metric:** Tactic/rule/kit taps never start a battle (unit-tested); Start
  footer visible without scrolling at 393×852 and 852×393 (visual proof); zero
  horizontal page scroll and clean console (mobile-bar check).

## Scope

### In Scope

- Tactic select-to-arm (Press pre-armed on open; tap re-arms, highlights,
  never launches).
- Sticky Start footer: armed tactic + active rule summary + Start bout
  control; launches via the existing `runBattle` path.
- Panel scroll stability: page stays locked, only the panel scrolls, Start
  stays reachable on short/portrait/landscape variants.
- Ghost-bout setup inherits the same chrome via the shared panel (no behavior
  change).

### Out of Scope

- Kit picker, Reset kit, rules options, stat cards, form readout (unchanged).
- Sim/exhibition logic, rival generation, rewards (untouched).
- Any other modal or screen's scrolling.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Tapping a tactic arms it (visible armed state) and never starts the battle. | must |
| FR-2 | Setup opens with Press pre-armed; Start is live immediately. | must |
| FR-3 | A sticky Start footer displays the armed tactic + active rule and a Start bout control that launches the existing battle path. | must |
| FR-4 | Panel content scrolls internally while page/scene stay locked; footer remains visible without scrolling at 393×852 and 852×393. | must |
| FR-5 | Ghost-bout setup uses the same arm-then-start chrome with identical behavior. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Mobile bar: no horizontal scroll, no occluded interactives, readable sizes, clean console at both 393px orientations. |
| NFR-2 | Unchanged modal contract: focus trap includes the Start control, Escape/scrim close, `returnFocusTo` spar button. |
| NFR-3 | Reduced-motion honored for any footer/panel transitions. |
| NFR-4 | No new dependencies; client-only change, no save-schema or sim changes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Tactic tap updates armed highlight; no `runBattle`/arena entry occurs. | FR-1 |
| AC-2 | Fresh setup shows Press armed and enabled Start. | FR-2 |
| AC-3 | Start tap launches the battle with armed tactic + stored rule (existing resolve path). | FR-3 |
| AC-4 | At 393×852 and 852×393 the footer is in-frame on open with zero page-level scroll. | FR-4 |
| AC-5 | Ghost setup: arm-then-start works; fight resolves the ghost contender. | FR-5 |
| AC-6 | Full gate green: `bun run verify && bun run build`, Biome clean, existing spar/modal tests pass. | NFR-1..4 |

## Edge Cases

- Landscape ≤500px height and ≤700px short screens: footer visible, content scrolls.
- Narrow single-column kit/rules layout: footer unaffected.
- Escape/scrim close mid-setup: no battle state leaks (no seed consumed beyond existing behavior).
- Rapid tactic re-taps then Start: last armed tactic wins.
- Rules default `none`: footer shows "no rule" plainly.

## Dependencies

- **Tracks:** none (RM-13 retired).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Footer copy ("Start bout", tactic + rule summary) follows
  broadcast-kit voice; exact wording settled in implementation, reviewed
  visually.
- **Assumption:** `battleSeed` timing unchanged (seed minted at `open()` as today).

## References

- RM-15 roadmap row; flow map: `apps/client/src/spar.ts`, `spar/panel.ts`,
  `spar/setup.ts`, `spar.css`, `ui/modal.ts`.
