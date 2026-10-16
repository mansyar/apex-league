# Specification — Coach's Knowledge Pass (`coach_knowledge_20261016`)

- **Type**: Feature (UI/UX legibility pass)
- **Status**: new
- **Branch**: `track/coach_knowledge_20261016`

## Overview

A UI/UX legibility pass that makes the sim's already-existing data readable to
the player, honoring product guideline 2 ("Preparation is the fun — make it
legible"). Four new informational surfaces, all built from the shared broadcast
kit (`apps/client/src/ui/kit.ts` / `kit.css`), all opened from the ranch HUD,
with zero gameplay-balance changes.

## Functional Requirements

### FR1 — Creature Detail Modal

- Tapping the ranch creature plate opens a modal with the full 4-way stat
  breakdown per stat (HP/ATK/DEF/SPD):
  1. rolled **base**,
  2. **trained** bonus (capped at +6 above base, per training focus),
  3. **evolution boost** (baby→juvenile +3 HP / +2 ATK / +2 DEF / +1 SPD;
     champion +6/+4/+4/+2),
  4. **inherited floor** contribution from the lineage.
- A sim-side pure helper decomposes `effectiveStats` into these components
  (logic-bearing → TDD). The rows must sum exactly to the displayed totals.
- The modal also shows context rows: stage, generation, cups won, bond and mood.

### FR2 — Move Tooltips

- Kit picker rows in the **spar panel and the cup coaching room** (the shared
  `battleUI.ts` factories) surface power / accuracy / cooldown straight from
  `MoveDef`.
- Locked moves show their unlock day *plus* their stats (motivation to train).
- Tactic rows keep their existing prose previews (unchanged).

### FR3 — Coach's Handbook Modal

- One new HUD chip opens a tabbed modal. Access is ranch-only; battle and cup
  screens stay distraction-free.
- Tabs:
  - **Type chart** — all 6 element crests (glyphs exist ahead of archetypes),
    the soft 3/2–2/3 advantage factors, and a note that only the
    Fire/Plant/Water species are currently in the league.
  - **Ladder rules** — Bronze III→II→I at 6/12 points, Silver at 18/24,
    promotion-cup gate-boss mechanics, the placement-point table
    (champion +3 / runner-up +2 / semifinal +1). Copy states the *current
    truth*: Silver I is today's ceiling and banks points for what's next —
    no Gold promises.
  - **Raising guidance** — direction-only evolution and graduation guidance,
    consistent with the existing hint wording (no exact thresholds), per
    guideline 4 ("Discovered, not hidden").

### FR4 — Settings Modal

- A 1:1 relocation of the three floating chips (motion toggle, camera style,
  new game with its confirm-gated reset) into one modal; the floating chips are
  removed.
- Zero new behavior; all `commit()` paths unchanged.
- The existing one-time onboarding hint callouts stay independent of the
  handbook (no linking between the two systems in this track).

## Non-Functional Requirements

- Full broadcast-kit compliance for every new surface: 44px phone tap targets,
  shared `:focus-visible` rings, focus traps, aria labels/roles,
  reduced-motion setting + `prefers-reduced-motion` honored, breakpoint tiers +
  `100dvh`/safe-area insets, no gradients on panels.
- New surfaces live in their **own modules** (e.g. `creature-detail.ts`,
  `handbook.ts`, `settings-modal.ts`) — explicitly not grown into
  `hud.ts` (1,325 lines).
- `bun run verify` stays green; the suite stays fast, deterministic and
  DOM-free where logic-bearing.

## Acceptance Criteria

1. Tapping the creature plate opens the detail modal; the 4-way breakdown sums
   exactly to the HUD's displayed stats for every stage/lineage state.
2. Every kit row in spar and the coaching room shows power/accuracy/cooldown;
   locked rows show unlock day + stats.
3. The handbook opens from the ranch; all three sections render; ladder copy
   states the Silver ceiling truthfully.
4. The settings modal reproduces all 3 chip behaviors; the floating chips are
   gone; the new-game confirm flow is unchanged.
5. Browser verification on desktop + phone-tier viewport passes with a clean
   console (per the workflow's manual-verification protocol).

## Out of Scope

- Settings additions beyond the 3 existing chips (a volume row awaits the
  Audio Foundation track).
- A move encyclopedia / browsable full move pool.
- Changes to the hint ledger, callout system, or any sim balance/mechanics.
- Evolution threshold discovery mechanics (stage branching, Phase 2+).
- Linking onboarding callouts into the handbook.
