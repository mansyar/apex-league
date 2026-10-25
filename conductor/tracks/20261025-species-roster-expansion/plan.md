# Species Roster Expansion — Implementation Plan

> Base branch: `main` @ `2adc0518d136ec3b41cc7b6daa17821ae4e1d6f4`
> Spec: `spec.md` (approved 2026-10-25)

## Phase 1 — Species data, kits & reward seam

- **Goal:** `ALL_SPECIES` holds 9 species — the three new lines exist in the
  sim with probe-tuned kits, unlock at their reward tiers, and existing
  claimed tiers catch up retroactively; all proven by unit tests.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, FR-5 (sim half), NFR-1, NFR-5 → AC-1, AC-3,
  AC-4, AC-5 (sim)
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/battle/**`
  (kit tables), `packages/sim/src/**` reward/economy seam files
  (`claimedTiers`/`pendingRewards` logic), co-located `*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** in_progress

- [ ] **P1.T1: Species data & tier gating** — covers: FR-1
  - [ ] **P1.T1.1: Failing tests pinning the three new SpeciesDefs (element, kit size 6, rewardFromTier) and obtainableSpecies per tier**
  - [ ] **P1.T1.2: Implement fernstag/reefclaw/cindermoor definitions; ALL_SPECIES = 9 green**
- [ ] **P1.T2: Kits from existing move vocabulary** — covers: FR-3, NFR-5
  - [ ] **P1.T2.1: Compose three distinct six-move pools from existing move vocabulary; verify against rivalKit/kit gate rules**
  - [ ] **P1.T2.2: Run the tactics balance probe (APEX_BALANCE_REPORT=1); tune stat spreads/kit picks into the existing sustained-score bands; goldens stay green or re-baseline recorded**
- [ ] **P1.T3: Reward seam & retroactive catch-up** — covers: FR-4
  - [ ] **P1.T3.1: Failing tests — new-claim grant per tier, retroactive pendingReward for pre-claimed tiers, no duplicate on repeat boots, starter seam refuses new reward ids**
  - [ ] **P1.T3.2: Implement boot-time reconciliation against claimedTiers via the existing pendingRewards queue; save stays v25**

## Phase 2 — Voxel archetypes

- **Goal:** Three distinct, determinism-gated voxel archetypes (Fernstag,
  Reefclaw, Cindermoor) generated through the pipeline with the gilded
  gate, digests pinned, tripwire green.
- **Depends on:** Phase 1 (species ids fixed)
- **Covers:** FR-2, NFR-2, NFR-3, NFR-4 → AC-2
- **Touches:** `packages/voxel/src/**` (archetype recipes, gilded gate,
  frequency tests), determinism gate script + digest manifest
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P2.T1: Three archetype recipes** — covers: FR-2, NFR-4
  - [ ] **P2.T1.1: Author fernstag (sapling stag), reefclaw (coral crab), cindermoor (ember ram) recipes — hue contract, surface ramp, gilded weight 32, frequency tests**
- [ ] **P2.T2: Determinism pinning & gates** — covers: FR-2, NFR-2, NFR-3
  - [ ] **P2.T2.1: Generate GLBs for all life stages; pin digests in the determinism gate manifest; module-size + 320 KiB tripwire green**

## Phase 3 — Client presentation & lifecycle

- **Goal:** The new species are fully rendered and playable client-side —
  roster surfaces, battle choreography, lifecycle moments, and copy.
- **Depends on:** Phase 1, Phase 2
- **Covers:** FR-5 (client half), FR-7, FR-8, NFR-6 → AC-5 (client), AC-7,
  AC-8
- **Touches:** `apps/client/src/**` — ui (plates, handbook, creature
  detail, growth), scene-logic (staging, hatch/evolution machines), ranch
  (poses/mood for new archetypes), battle animation (BodyProfile,
  move-fx mapping), copy tables; co-located tests
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P3.T1: Roster surfaces** — covers: FR-7, NFR-6
  - [ ] **P3.T1.1: Plates, handbook entries (element-true crests Plant 110°/Water 205°/Fire 18°), creature detail, growth panel, stable for the three new species**
- [ ] **P3.T2: Battle choreography** — covers: FR-7
  - [ ] **P3.T2.1: BodyProfile per new archetype; move-fx mapping for each new kit; staging/arena presentation verified at 1440×900 and 393×852**
- [ ] **P3.T3: Lifecycle moments & copy** — covers: FR-5 (client), FR-8
  - [ ] **P3.T3.1: Hatch moment, branch-evolution reveal, single-sourced copy tables (≤2 sentences, stat names visible)**

## Phase 4 — Rivals, bosses & integrated evidence

- **Goal:** The rival field uses the wider roster; the six authored
  gatekeeper pairings are refreshed and every one is played end-to-end in
  the browser; integrated visual audit passes; docs synchronized.
- **Depends on:** Phase 3
- **Covers:** FR-6, NFR-5 → AC-6, plus full-sweep AC re-check
- **Touches:** `packages/sim/src/**` (rival pools, authored boss pairings),
  `apps/client/src/**` only if wiring demands, `conductor/tech-stack.md`,
  `conductor/product.md`, track `verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`;
  Playwright procedure at 1440×900 + 393×852/852×393, console clean
- **Status:** pending

- [ ] **P4.T1: Rival integration & boss refresh** — covers: FR-6, NFR-5
  - [ ] **P4.T1.1: Rival pools draw the new species; six authored gatekeeper pairings refreshed (boss kit re-tuning within wider-pool discipline); probe re-check**
- [ ] **P4.T2: End-to-end browser verification** — covers: FR-6, AC-6
  - [ ] **P4.T2.1: Play every refreshed boss pairing through a real cup in the browser (authored gatekeepers reach their stage and pose a real fight); species surfaces at both widths; evidence file**
- [ ] **P4.T3: Docs sync** — covers: NFR-1 support
  - [ ] **P4.T3.1: tech-stack.md dated note; product.md roadmap roster count (product.md edit needs explicit approval at docs-sync gate)**

<!-- Review-Fixes phases are appended here by conductor-review. -->
