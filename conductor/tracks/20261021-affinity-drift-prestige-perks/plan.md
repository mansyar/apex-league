# Type Affinity Drift & Extended Prestige — Implementation Plan

> **Branch:** `feat/20261021-affinity-drift-prestige-perks`
> **Base:** `main` @ `8a9dfdb`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Affinity Roll & Save v20

- **Goal:** the drift is decided at breeding time, persisted as save v20, and
  validated on load and import.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2, NFR-3, NFR-4
- **Touches:** `packages/sim/src/breeding.ts`, `packages/sim/src/legacy.ts` (record shape only), `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrate.ts`, `packages/sim/src/save/storage.ts`, `packages/sim/src/save/transfer.ts`, `packages/sim/src/types.ts` (if the creature/record types live there), `docs/save-schema.md`, co-located `*.test.ts`
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** in_progress

- [ ] **P1.T1: Seeded drift roll at breeding** — covers: FR-1
  - [ ] **P1.T1.1: Add `AFFINITY_DRIFT_CHANCE = 0.15` and a distinct-RNG-constant roll helper in `breeding.ts`; source = the parent whose element differs from the egg's species element; no roll when both parents share it**
  - [ ] **P1.T1.2: Thread the roll into the bred-creature creation seam so the nursery preview and the hatch agree (previewed = hatched); TDD the threshold / below-threshold / same-element cases (AC-1)**
- [ ] **P1.T2: Save v20 — additive `affinity`** — covers: FR-2
  - [ ] **P1.T2.1: `schema.ts` bumps `SAVE_VERSION` to 20 and adds `affinity: ElementType | null` to the active creature and `RetiredRecord`; `storage.ts` validates (valid element or null, never equal to primary); `transfer.ts` import validates the same shape**
  - [ ] **P1.T2.2: `migrate.ts` v19→v20 sets `null` with no inference; full-chain migration test proves v0→v20 (AC-2)**
  - [ ] **P1.T2.3: Update `docs/save-schema.md` in the same phase (project rule)**
- [ ] **P1.T3: Phase verification and evidence**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261021-affinity-drift-prestige-perks/verification/phase-1.md
-->

## Phase 2: Cancel-to-Neutral Defense Rule

- **Goal:** a drifted defender softens exactly one super-effective incoming
  matchup; no other resolver math moves.
- **Depends on:** Phase 1
- **Covers:** FR-3, AC-3, NFR-3
- **Touches:** `packages/sim/src/battle/` (damage/matchup path and its co-located tests), `packages/sim/src/battle.ts` barrel if re-export needed
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** pending

- [ ] **P2.T1: Incoming cancel-to-neutral in the damage path** — covers: FR-3
  - [ ] **P2.T1.1: Failing test first: ×2-vs-primary + ×0.5-vs-secondary resolves ×1; neutral-vs-primary stays neutral; resisted-vs-primary stays ×0.5 regardless of secondary**
  - [ ] **P2.T1.2: Implement the smallest rule in the resolver/matchup code; outgoing damage untouched**
- [ ] **P2.T2: Balance guardrails** — covers: FR-3
  - [ ] **P2.T2.1: Assert existing battle/cup goldens are unchanged (rivals and bosses carry no secondary) and the boss win-rate probe bands still pass**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261021-affinity-drift-prestige-perks/verification/phase-2.md
-->

## Phase 3: Prestige Milestones 7 & 9

- **Goal:** Refined Blood strengthens the floor; Champion Stable adds the
  head-start AP and the wider mutation band.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, AC-4, AC-5, NFR-3
- **Touches:** `packages/sim/src/legacy.ts`, `packages/sim/src/breeding.ts`, the day/AP settlement module (`packages/sim/src/` care/day machine), co-located `*.test.ts`
- **Verification:** `bun run check && bun test --timeout 120000`
- **Status:** pending

- [ ] **P3.T1: Milestone constants and perks** — covers: FR-4, FR-5
  - [ ] **P3.T1.1: Add `PRESTIGE_REFINED_BLOOD = 7` and `PRESTIGE_CHAMPION_STABLE = 9`; extend `LineagePerks` with `refinedBlood` / `championStable` (cumulative, like the existing three)**
- [ ] **P3.T2: Refined Blood floor** — covers: FR-4
  - [ ] **P3.T2.1: The dual-parent floor uses 0.55 for the stronger parent at prestige ≥ 7 (0.5 below); TDD both sides of the boundary (AC-4)**
- [ ] **P3.T3: Champion Stable effects** — covers: FR-5
  - [ ] **P3.T3.1: Head-start AP: +1 max AP for the hatchling's first 5 in-game days, derived from hatch-day data where present (additive v20 field only if the day data does not exist); bonus read at match-prep time so a cup spanning day 6 resolves correctly (AC-5)**
  - [ ] **P3.T3.2: Mutation band widens +1..+2 → +1..+3 at prestige ≥ 9; test the band edges (AC-5)**
- [ ] **P3.T4: Regression sweep** — covers: FR-4, FR-5
  - [ ] **P3.T4.1: Boss win-rate bands and existing legacy/breeding goldens stay green (perks apply to player lineage only)**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261021-affinity-drift-prestige-perks/verification/phase-3.md
-->

## Phase 4: Client Surfaces

- **Goal:** drift and the new perks are visible everywhere they matter, with
  visual evidence at two widths.
- **Depends on:** Phase 1, Phase 2, Phase 3
- **Covers:** FR-6, AC-6, NFR-1, NFR-4
- **Touches:** `apps/client/src/graduation/` (nursery preview), `apps/client/src/hud/` (plate, coach ticker), `apps/client/src/detail/` (creature-detail tabs), `apps/client/src/handbook/`, surface CSS under `apps/client/src/ui/`, co-located pure-module tests
- **Verification:** `bun run check && bun test --timeout 120000` plus the visual layer (desktop + iPhone 15 screenshots, clean console)
- **Status:** pending

- [ ] **P4.T1: Nursery preview shows the rolled secondary before hatching** — covers: FR-6
- [ ] **P4.T2: Creature plate and detail modal carry a dual-element crest** — covers: FR-6
- [ ] **P4.T3: Coach ticker announces a drift event; Handbook documents cancel-to-neutral and the two new perks** — covers: FR-6
- [ ] **P4.T4: Visual-layer evidence: playwright-cli screenshots (desktop + iPhone 15), console check, evidence file** — covers: AC-6

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261021-affinity-drift-prestige-perks/verification/phase-4.md
-->

## Phase 5: Docs Sync & Integrated Verification

- **Goal:** roadmap and stack truth recorded; the full gate green on the
  branch.
- **Depends on:** Phase 1, Phase 2, Phase 3, Phase 4
- **Covers:** FR-7, AC-7, NFR-2
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `README.md` (only if it repeats affected truth)
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P5.T1: Mark the two Phase 2 roadmap items landed in `product.md`; dated `tech-stack.md` note (save v20, drift rule, perk ladder)** — covers: FR-7
- [ ] **P5.T2: README truth check — update only claims this track invalidates (element genetics, prestige ladder); record skipped if nothing stale** — covers: FR-7
- [ ] **P5.T3: Integrated verification: `bun run verify && bun run build`** — covers: AC-7

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261021-affinity-drift-prestige-perks/verification/phase-5.md
-->
