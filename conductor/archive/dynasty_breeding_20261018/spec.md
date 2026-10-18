# Spec: Dynasty Breeding & Nursery

**Track ID:** `dynasty_breeding_20261018` · **Type:** Feature · **Status:** new

## Overview

Complete the legacy phase: after a champion's send-off, the nursery lets the
player pair **any two Hall of Fame records** to hatch the next successor. The
egg inherits a dual-parent stat floor, one **lineage trait** from each parent, a
seeded **mutation**, and recorded **parentage** for the dynasty. The first
graduation (only one record) keeps today's free founder pick. Save v15.

## Background

- `packages/sim/src/legacy.ts` has `graduate(state, speciesId, seed)`:
  archives one `RetiredRecord`, creates a successor from a **single** parent at
  a 50% floor, increments the generation, and resets AP.
- `LineageState` is `{ generation, hallOfFame: RetiredRecord[] }`.
  `RetiredRecord` carries name/species/archetype/element/effective stats/
  trained/cups/generation/retiredOnDay but **no traits or parents**.
- `apps/client/src/graduation.ts` shows the confirm modal, the send-off
  ceremony, and a starter-grid egg screen; nothing commits until `onPick`.
- `docs/save-schema.md` still documents **v12**; `SAVE_VERSION` is 14. This
  track updates the doc to v15 and backfills the v13/v14 fields.
- The game remains single-creature: no living roster, no egg inventory.
  Breeding happens at graduation and replaces the active creature.

## Design decisions

1. **Pairing:** any two records in the pool (`hallOfFame` + the retiring
   champion). At generation 2+ the pool has at least two; the first graduation
   has one and uses the founder pick.
2. **Species:** the egg must be one of the two parents' species (fixed when
   identical). The founder pick stays any available species.
3. **Inheritance:** weighted floor — 50% of the stronger parent + 10% of the
   weaker, clamped to species bounds — plus a seeded mutation of +1..+2 to one
   stat.
4. **Scope:** core breeding + lineage trait badges. No battle-effect traits,
   extra prestige milestones, or affinity drift.

## Functional Requirements

### FR1 — Breeding pool & eligibility (sim)

- Add `breedingPool(state): RetiredRecord[]` —
  `[...hallOfFame, retireeRecord(state)]`, where the retiree is the active
  champion as it would be archived: effective stats, trained, cupsWon,
  generation, `retiredOnDay = state.day`, derived trait, and its own parents.
- Add `canBreed(state)` — `canGraduate(state).eligible &&
  breedingPool(state).length >= 2`.
- Parent references are **generation numbers** (unique per record); validate
  distinct, known, and non-negative.
- No AP cost. Breeding is part of graduation and remains player-triggered.

### FR2 — Nursery flow (client)

- After the send-off ceremony, open the **Nursery** when
  `breedingPool.length >= 2`; otherwise keep the existing founder egg screen.
- Nursery UI:
  - Parent cards for every pool record: name, species, element crest,
    generation, cups, effective stats, trait badge; the retiring champion is
    marked "Retiring".
  - Select exactly two parents (toggle, max 2, `aria-pressed`); the retiring
    champion is preselected, the player picks the second.
  - Species choice limited to the selected pair's species; one option when
    identical.
  - Preview: per-stat inherited floor, inherited trait badges, and a
    "Mutation: one random stat +1–2" note.
  - "Hatch egg" disabled until two parents and a species are chosen.
  - Closing the nursery before hatch keeps the champion (existing semantics;
    nothing commits).
- On hatch: seed = `Date.now() % 2**31` (as today), commit, close, sync the
  scene, announce the successor.
- Hall of Fame entries gain trait badges and a parentage line. The creature
  detail modal gains a "Lineage" row (generation + parent names) and trait
  badges.

### FR3 — Dual-parent inheritance (sim)

- `inheritedFloorFromPair(sire, dam, species, prestige, traits)`:
  - Per stat: `round(0.5 * max(a, b) + 0.1 * min(a, b))`.
  - Add trait bonuses (FR4) and the existing established-line `+1`.
  - Clamp to the species' `statBounds`.
- Single-parent founder path keeps `0.5 × parent + trait bonus + prestige`,
  clamped.
- `createBredCreature(speciesId, seed, pair, prestige)`:
  - Rolls base stats with `makeRng(seed)` (the same stream shape used by
    `createCreature`).
  - Applies the floor per stat.
  - Rolls a mutation: one stat (uniform over HP/ATK/DEF/SPD), `+1..+2`,
    clamped.
  - Sets `traits` (deduplicated union of parent traits) and `parents`
    (sorted generations).
  - Same seed → same individual, stats, mutation, traits, and parentage.
- Calibration task: verify a realistic champion pair produces floors above the
  species minimum on at least ATK/SPD; if HP/DEF floors clamp uniformly, switch
  to a min-relative variant documented in the task. The formula above is the
  starting contract.

### FR4 — Lineage traits (sim + UI)

- Catalog: `sturdy` (+2 HP floor), `fierce` (+1 ATK), `guarded` (+1 DEF),
  `quick` (+1 SPD).
- Derivation: the parent's highest **trained** stat (tie-break
  HP > ATK > DEF > SPD); if all trained are 0, the highest effective stat with
  the same tie-break.
- Each parent contributes its trait; the egg inherits the deduplicated union.
  The founder path inherits the founder's trait.
- Traits have **no battle effect**; they shape the egg floor and are display
  badges only.
- `effectiveTraits(record)` derives a trait for pre-v15 records with an empty
  `traits` array, so old Hall records still contribute meaningfully.
- UI: badges in the nursery parent cards, hatch preview, Hall entries, and
  creature detail.

### FR5 — Parentage (sim + save)

- Add `parents: number[]` to `Creature` and `RetiredRecord` (sorted
  generations; `[]` for the founder; `[gen]` for the first founder-pick
  successor; `[genA, genB]` for bred successors).
- Add `traits: string[]` to `Creature` and `RetiredRecord`.
- At hatch, append the retiree record with its derived trait and its own
  parents; the successor's `parents` points at the pair.
- Parentage is display data; it never affects stats or battles.

### FR6 — Save v15

- `SAVE_VERSION = 15`.
- v14 → v15 migration:
  - Active creature: `traits: []`, `parents: []`.
  - Every Hall record: `traits: []`, `parents: []` (traits derive on read for
    old records).
  - Everything else forwarded untouched.
- Extend `isValidRetiredRecord` and creature validation: known trait ids;
  `parents` is an array of 0–2 unique non-negative integers; `traits` is an
  array of known ids.
- Update `docs/save-schema.md` to v15 and backfill the v13
  `settings.muted` and v14 `legendTitles` / Gold–Legend changes.
- Update the README roadmap line that still says the Silver ladder is in
  progress.

### FR7 — Determinism & balance gates

- Golden stream test: a fixed save + seed → exact successor stats, traits,
  parents, and mutation.
- Migration tests: v14 → v15 preserves records, active creature, and session.
- Balance probe: a sample of realistic champion pairs reports floor
  distributions and flags stats that always clamp; no hard balance threshold
  is required, but the result is recorded in the phase checkpoint.
- `bun run verify` green; existing founder-path tests updated for the new
  fields.

## Non-Functional Requirements

- All new sim code is pure, DOM-free, deterministic, and exported through
  `packages/sim/src/index.ts`.
- No per-frame work in the client; nursery updates are event-driven.
- Nursery UI uses the shared kit (`ui/kit.ts`), focus trap, keyboard selection,
  and reduced-motion behavior.
- No new art assets; no new species; no living roster.
- New/changed files stay under the project's ~12 KB guidance where practical;
  the nursery UI should be split from `graduation.ts` into a view-model +
  surface module.

## Surfaces

- `packages/sim/src/breeding.ts` (new), `legacy.ts`, `creature.ts`,
  `save/schema.ts`, `save/migrate.ts`, `save/storage.ts`, `index.ts`
- `apps/client/src/graduation/nursery-vm.ts` (new),
  `graduation/nursery.ts` (new), `graduation.ts`, `main.ts`,
  `creature-detail.ts`, `graduation.css`
- `docs/save-schema.md`, `README.md`

## Acceptance Criteria

- First graduation behaves exactly as today (free species pick, single-parent
  floor, ceremony).
- Second and later graduations open the Nursery; any two pool records can be
  paired; species is limited to the parents; the previewed floor matches the
  hatched creature.
- Traits from both parents appear on the egg and in the Hall/detail surfaces;
  duplicate traits appear once.
- The same seed reproduces the same successor; mutation is baked into stats.
- v14 saves load after migration with no data loss; invalid trait/parent arrays
  are rejected.
- `docs/save-schema.md` matches v15; README roadmap no longer claims Silver is
  the ceiling.
- `bun run verify` passes, and a manual browser pass covers: founder
  graduation, pair graduation, trait badges, close-before-hatch, save/reload
  mid-nursery.

## Out of Scope

- Living roster / multiple simultaneous creatures.
- Egg inventory or breeding outside graduation.
- New species, art, moves, or elements.
- Battle-effect traits or a full trait catalog.
- Extra prestige milestones and type affinity drift.
- Lineage tree visualization beyond parentage labels.
- Cloud saves or save export/import.
