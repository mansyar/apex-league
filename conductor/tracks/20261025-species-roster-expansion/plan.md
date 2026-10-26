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
- **Status:** verified

- [x] **P1.T1: Species data & tier gating** — covers: FR-1
  - [x] **P1.T1.1: Failing tests pinning the three new SpeciesDefs (element, kit size 6, rewardFromTier) and obtainableSpecies per tier**
  - [x] **P1.T1.2: Implement fernstag/reefclaw/cindermoor definitions; ALL_SPECIES = 9 green**
- [x] **P1.T2: Kits from existing move vocabulary** — covers: FR-3, NFR-5
  - [x] **P1.T2.1: Compose three distinct six-move pools from existing move vocabulary; verify against rivalKit/kit gate rules**
  - [x] **P1.T2.2: Run the tactics balance probe (APEX_BALANCE_REPORT=1); tune stat spreads/kit picks into the existing sustained-score bands; goldens stay green or re-baseline recorded**
- [x] **P1.T3: Reward seam & retroactive catch-up** — covers: FR-4
  - [x] **P1.T3.1: Failing tests — new-claim grant per tier, retroactive pendingReward for pre-claimed tiers, no duplicate on repeat boots, starter seam refuses new reward ids**
  - [x] **P1.T3.2: Implement boot-time reconciliation against claimedTiers via the existing pendingRewards queue; save stays v25**

> **Result:** verified — ALL_SPECIES=9 with probe-tuned kits, obtainable
> gating, grant-per-tier fix, retroactive catch-up at loadBoot, champion
> branch forms with kit-row signatures (user decision 2026-10-25, boss
> invariant re-scoped). Gates: test:phase 2688/211/0 fail; verify 0; build 0.
> **Checkpoint:** `f9c1e366`
> **Evidence:** `verification/phase-1.md`

## Phase 2 — Voxel archetypes

- **Goal:** Three distinct, determinism-gated voxel archetypes (Fernstag,
  Reefclaw, Cindermoor) generated through the pipeline with the gilded
  gate, digests pinned, tripwire green.
- **Depends on:** Phase 1 (species ids fixed)
- **Covers:** FR-2, NFR-2, NFR-3, NFR-4 → AC-2
- **Touches:** `packages/voxel/src/**` (archetype recipes, gilded gate,
  frequency tests), determinism gate script + digest manifest
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P2.T1: Three archetype recipes** — covers: FR-2, NFR-4
  - [x] **P2.T1.1: Author frond (sapling stag), crab (coral crab), smolder (ember ram) recipes — hue contract, surface ramp, gilded weight 32, frequency tests**
- [x] **P2.T2: Determinism pinning & gates** — covers: FR-2, NFR-2, NFR-3
  - [x] **P2.T2.1: Generate GLBs for all life stages; pin digests in the determinism gate manifest; module-size + 320 KiB tripwire green**

> **Result:** verified — three new archetypes (frond/crab/smolder) authored
> through the pipeline; determinism gate green across 27 creature GLBs +
> 5 props; largest new GLB 199,560 B (61% of the 320 KiB tripwire); voxel
> module cap green; hue contract 110°/205°/18°; gilded weight 32 pinned.
> Gates: test:phase 2763/235/0 fail; verify 0; build 0.
> **Checkpoint:** `6e30f698`
> **Evidence:** `verification/phase-2.md`

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
- **Status:** verified

- [x] **P3.T1: Roster surfaces** — covers: FR-7, NFR-6
  - [x] **P3.T1.1: Plates, handbook entries (element-true crests Plant 110°/Water 205°/Fire 18°), creature detail, growth panel, stable for the three new species**
- [x] **P3.T2: Battle choreography** — covers: FR-7
  - [x] **P3.T2.1: BodyProfile per new archetype; move-fx mapping for each new kit; staging/arena presentation verified at 1440×900 and 393×852**
- [x] **P3.T3: Lifecycle moments & copy** — covers: FR-5 (client), FR-8
  - [x] **P3.T3.1: Hatch moment, branch-evolution reveal, single-sourced copy tables (≤2 sentences, stat names visible)**

> **Result:** verified — three new lines render and play across every client
> surface (gift card, stable, ranch plate, detail, growth, moves, handbook
> chart/moves/paths, spar, battle staging, victory); hatch and branch-reveal
> moments speak single-sourced species copy; mobile bar held at 393×852 and
> 852×393 with console clean. Gates: test:phase 2781/237/0 fail; verify 0;
> build 0. Primary lint fix absorbed (`de37cc13`).
> **Checkpoint:** `a15a01a2`
> **Evidence:** `verification/phase-3.md`

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
- **Status:** verified

- [x] **P4.T1: Rival integration & boss refresh** — covers: FR-6, NFR-5
  - [x] **P4.T1.1: Rival pools draw the new species; six authored gatekeeper pairings refreshed (boss kit re-tuning within wider-pool discipline); probe re-check**
- [x] **P4.T2: End-to-end browser verification** — covers: FR-6, AC-6
  - [x] **P4.T2.1: Play every refreshed boss pairing through a real cup in the browser (authored gatekeepers reach their stage and pose a real fight); species surfaces at both widths; evidence file**
- [x] **P4.T3: Docs sync** — covers: NFR-1 support
  - [x] **P4.T3.1: tech-stack.md dated note; product.md roadmap roster count (product.md edit needs explicit approval at docs-sync gate)**

> **Result:** verified — rival fields draw the three new lines at every
> unlocked tier (`makeBracket` already drew from `obtainableSpecies(tier)`, so
> no code change was needed); all six authored gatekeepers were played
> end-to-end in the browser (each reached its stage, was fought in the final,
> and was beaten), backed by a new structural `cup/gatekeeper-reach.test.ts`
> that pins learnings lesson 13. Boss kits deliberately 0-delta: an exhaustive
> kit/stat search showed all six already hold every probe invariant and every
> alternative broke a hard pin. One real defect found and fixed by the
> 852×393 audit (landscape bracket collapsing under the CTA/ticker).
> tech-stack note applied by the primary; product.md wording pending user
> approval at the docs-sync gate. Gates: test:phase 2791/238/0 fail; verify 0;
> build 0.
> **Checkpoint:** `0564ee8b`
> **Evidence:** `verification/phase-4.md`

<!-- Review-Fixes phases are appended here by conductor-review. -->

## Phase R1: Review Fixes

- **Goal:** Resolve every finding from round 1 of review (F1–F6) at root cause, with tests, so the track can pass review under strict mode.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3, F4, F5, F6
- **Touches:** `apps/client/src/handbook/chart.ts`, `apps/client/src/species-roster.test.ts`, `apps/client/src/gift.ts` (chip class toggle only), `apps/client/src/ranch.css`, `packages/sim/src/bosses.test.ts`, `packages/sim/src/cupRewards.ts`, `packages/sim/src/reward-catchup.test.ts`, `packages/voxel/scripts/determinism-gate.ts`, `packages/voxel/src/frond.test.ts`, `packages/voxel/src/crab.test.ts`, `packages/voxel/src/smolder.test.ts`, `conductor/tracks/20261025-species-roster-expansion/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **R1.T1: Handbook tier connective matches granted egg count** — covers: F1, FR-8, AC-8
  - [x] **R1.T1.1: Failing test — a two-species tier reads as " and " and the connective agrees with the number of eggs the tier grants**
  - [x] **R1.T1.2: Join with " and "; update the three pins in `species-roster.test.ts:153-155`**
- [x] **R1.T2: Make the boss-signature invariant non-vacuous** — covers: F2, FR-5, NFR-4
  - [x] **R1.T2.1: Delete the dead loop that cannot fail; keep the live signature-uniqueness assertion**
  - [x] **R1.T2.2: Pin the exercised exemptions as data — the six recorded overlaps, each a signature that is a kit row of another species' element vocabulary**
- [x] **R1.T3: Gift chip seat shift keyed on a class, not inline style** — covers: F3, FR-7, NFR-6
  - [x] **R1.T3.1: Toggle `.is-hidden` in `syncGiftChip`; rewrite the five `:has()` seat rules to key on `.gift-chip:not(.is-hidden)`; re-verify the four-chip layout at 852×393 and 393×852**
- [x] **R1.T4: Reward queue sorts unknown species last** — covers: F4, FR-5
  - [x] **R1.T4.1: Failing test — an unknown species id in the queue sorts after every real reward**
  - [x] **R1.T4.2: `?? Number.MAX_SAFE_INTEGER`**
- [x] **R1.T5: Authoring mode verifies what it writes** — covers: F5, NFR-3
  - [x] **R1.T5.1: Regenerate-and-compare within `--write-missing`, or hard-fail at the end instructing a re-run without the flag**
- [x] **R1.T6: Boundary containment across all three stages** — covers: F6, FR-2, AC-2
  - [x] **R1.T6.1: Extend the containment assertion to juvenile and champion in `frond`, `crab` and `smolder` tests**

> **Result:** verified - all six round-1 findings resolved at root cause, each
> with a test that would have caught it. F1 joins the tier's reward species with
> " and " (the grant queues one egg per species, never a choice) and derives the
> connective from `REWARD_SPECIES` so copy and grant cannot drift. F2 deletes the
> vacuous `!ownKit.includes(move)` loop and replaces it with a data pin of the
> exemption surface, which surfaced six entries rather than the three named.
> F3 folds the gift chip through `.is-hidden` and keys all five seat rules on
> `:not(.is-hidden)`, re-verified live at 852x393 and 393x852. F4 sorts unknown
> reward species last. F5 re-reads the pair it just wrote so an authoring run
> verifies itself, plain gate unchanged. F6 asserts containment across all three
> stages and pins each stage's signature parts. No assertion weakened, no recipe
> touched, no GLB regenerated. Gates: test:phase 2799/239/0 fail; verify 0;
> build 0.
> **Checkpoint:** `3262768d`
> **Evidence:** `verification/phase-R1.md`


## Phase R2: Review Fixes (round 2)

- **Goal:** Resolve the two findings the round-2 delta review surfaced (F7, F8) so the track passes strict review with no known-false player-facing copy.
- **Depends on:** Phase R1
- **Covers:** F7, F8
- **Touches:** `apps/client/src/handbook/chart.ts`, `apps/client/src/species-roster.test.ts`, `packages/voxel/src/determinism-gate.test.ts`, `conductor/tracks/20261025-species-roster-expansion/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** in_progress

- [ ] **R2.T1: Handbook population note states something the catalog guarantees** - covers: F7, FR-8, AC-8
  - [ ] **R2.T1.1: Failing test - the note makes no element claim the reward catalog contradicts; assert against REWARD_SPECIES rather than a hardcoded string**
  - [ ] **R2.T1.2: Reword the note to a guarantee that holds for every starter**
- [ ] **R2.T2: Scope the F5 authoring-gate guard to the write branch** - covers: F8, NFR-3
  - [ ] **R2.T2.1: Assert absence of `continue` between the write branch and the first compare, not across the whole script; confirm the pin still fails against the base source**
