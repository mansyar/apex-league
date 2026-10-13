# Spec — Legacy & Breeding (Retirement → Next Egg)

**Track ID:** `legacy_breeding_20261013` · **Type:** Feature · **Status:** approved 2026-10-13
**Branch:** `legacy_breeding_20261013`

## Overview

Close the last open Phase 1 deliverable: *"Retirement → next egg with stat +
trait inheritance (minimal legacy)."* Today a creature's story simply stops at
the top of the ladder — there is no send-off and no successor. This track adds
the **legacy phase** of the core loop: a champion that has lived a full career
can be **graduated** by the player (never automatic, never death — a proud
send-off, per the product-guidelines voice). The graduating creature's career
is archived to a **Hall of Fame**, its effective stats seed a **stat floor**
for the next egg, the **family name** and **generation** carry forward, and the
bloodline accrues **prestige** that grants small milestone perks to later
generations.

The fantasy: *you are the agent, not the athlete.* Raising one champion is the
tutorial; building a **dynasty** is the game. This is the smallest legacy
mechanic that makes the second run different from the first — the foundation
Phase 2's full breeding (`breeding between retired pairs`) will build on.

Existing groundwork this track builds on:

- `packages/sim/src/state.ts` — `GameState.creature` is a **single** field.
  This track keeps it single: succession *replaces* the creature, it does not
  introduce a simultaneous roster. (Deliberate scope cut — see Out of Scope.)
- `cupsWon` (save v5) and `ladder` (save v8) already persist **across days**;
  they carry across generations untouched, so a dynasty inherits standing.
- `packages/sim/src/creature.ts` — `createCreature` rolls each stat uniformly
  from the species' `statBounds`; inheritance layers a **floor** on top of the
  roll, so a seed still produces a distinct individual.
- `apps/client/src/starter.ts` — the starter/egg picker UX is reused for
  "choose the next creature".
- The evolution **ceremony** machinery (`scene.startEvolutionCeremony`) and the
  coach `seenHints` ledger (save v7) are reused for the send-off and hints.
- Save schema is at **v9** (`SAVE_VERSION`). See R5 for the version bump.

## Design decisions (confirmed 2026-10-13)

| Decision | Choice |
| --- | --- |
| Track type | Feature |
| Retirement trigger | **Player-triggered** once eligible (champion + age ≥ 60) |
| Succession scope | **Minimal legacy** — archive + next egg; no simultaneous roster |
| Inheritance | Parent-derived **stat floor (~50%)** + lineage name/generation |
| Legacy payoff | **Family prestige** with milestone perks (generations + cups) |
| Age floor | **Day 60**, no upper limit |
| Next creature | Player **picks any species**; inheritance still applies |
| Graduation UX | HUD chip → confirm → ranch ceremony → egg screen |

## Functional Requirements

### R1 — Graduation eligibility (sim, pure, DOM-free)

New module `packages/sim/src/legacy.ts`. `canGraduate(state): GraduationVerdict`
returns `{ eligible: boolean, reason: GraduationReason }`. Eligible iff **all**
hold:

| Condition | Constant | Value |
| --- | --- | --- |
| Phase | — | `"day"` (never mid-cup) |
| Has a creature | — | `creature !== null` |
| Stage | — | `"champion"` |
| Age | `GRADUATION_DAY` | 60 |

Reason precedence:
`no-creature > cup-phase > not-champion > too-young > eligible`.
The gate **delays but never blocks** — once eligible it stays eligible forever.

### R2 — Lineage slice (state + save)

Extend `GameState` with a `lineage` slice:

```ts
/** One archived career, appended on graduation (Hall of Fame entry). */
export interface RetiredRecord {
  name: string
  speciesId: string
  archetypeId: string
  element: Element
  stats: CreatureStats        // effective (base + trained) at retirement
  trained: CreatureStats
  cupsWon: number             // lifetime cups at the moment of retirement
  generation: number          // 0 = founder, 1 = first successor, ...
  retiredOnDay: number
}

/** The bloodline across generations (save v10). */
export interface LineageState {
  /** Completed graduations: 0 while the founder is active. */
  generation: number
  /** Archived careers, oldest first. */
  hallOfFame: RetiredRecord[]
}
```

`lineage` rides `GameState`. `creature` stays a single field; the
generation counter is the successor's identity (displayed as a family name of
the form `"<Given> II"`, `"<Given> III"`, … — see R6).

**Prestige** is **derived**, never stored (no drift):

```ts
lineagePrestige(state) = state.lineage.generation + state.cupsWon
```

Milestone perks (constants, tunable), keyed off prestige:

| Prestige | Perk | Effect |
| --- | --- | --- |
| `PRESTIGE_FOUNDED = 1` | Lineage founded | Hall of Fame recorded + Lineage plate appears |
| `PRESTIGE_WARM_BLOODLINE = 3` | Warm bloodline | the next egg starts with **bond 20** (vs 10) |
| `PRESTIGE_ESTABLISHED_LINE = 5` | Established line | the inherited stat floor gains **+1 per stat** |

Cups count toward prestige, so a strong competitive family ramps faster than a
pure caretaker one — matching the "generations + cups" decision.

### R3 — Inheritance math (sim, pure)

In `legacy.ts`:

- `INHERITANCE_FRACTION = 0.5`.
- `inheritedFloor(parentEffective: CreatureStats, species: SpeciesDef, prestige: number): CreatureStats`
  — per stat: `round(fraction × parent[stat])`, `+1` when prestige ≥
  `PRESTIGE_ESTABLISHED_LINE`, then **clamped into the species' `statBounds`**.
- `createInheritedCreature(speciesId, seed, parentEffective, prestige)` — calls
  `createCreature` (normal seeded roll), then per stat applies
  `value = clamp(max(rolled, floor), lo, hi)`; the starting bond is raised to
  `WARM_BOND_START = 20` when prestige ≥ `PRESTIGE_WARM_BLOODLINE`. Mood and the
  other conditions use the standard `CONDITION_START`.
- Same `seed` → same individual (replay/determinism contract preserved).

### R4 — Succession (sim, pure)

`graduate(state, speciesId, seed): { ok: true; state: GameState } | { ok: false; reason: GraduationReason }`.

On success (input never mutated):

1. Append a `RetiredRecord` built from the current champion.
2. Create the successor via `createInheritedCreature` (R3).
3. Set `creature` to the successor, `lineage.generation += 1`.
4. Reset `actionPoints` to `ACTION_POINTS_PER_DAY` (the new generation starts
   the day fresh — **no day advance**, no cup interaction).
5. `day`, `cupsWon`, `lastCupDay`, `ladder`, and `settings` are **carried over
   untouched** — a dynasty inherits its standing.

Rejected (nothing changes) when `canGraduate` is not eligible.

### R5 — Save v10

- `SAVE_VERSION` → **10**. Pure `v9 → v10` migration initializes
  `lineage: { generation: 0, hallOfFame: [] }` for every existing save (no
  backfill — cups already won are history, exactly like the v8 ladder).
- Load-time validation of the `lineage` slice (integer `generation ≥ 0`,
  array `hallOfFame`, each record well-formed) with corrupt-save tolerance
  unchanged.
- `docs/save-schema.md` updated with the v10 field + migration note.
- **Coordination note:** the in-flight `audio_foundation_20261013` branch also
  claims `SAVE_VERSION = 10`. Whichever track lands **second** bumps to **11**
  and adds one more migration step. The migration steps must stay individually
  reversible so renumbering is mechanical.

### R6 — Client (`apps/client`)

Presentation — manual verification (per `conductor/workflow.md`).

- **Lineage plate** on the ranch HUD (broadcast kit): family name + Roman
  numeral (e.g. `"Bramble Ox II"`), generation, prestige, lifetime cups.
- **Graduate affordance**: a chip in the HUD command dock, **shown only when
  eligible**. A direction-only hint fires from `GRADUATION_HINT_DAY = 55` for a
  living champion ("a full career — a send-off awaits"), deduped by the
  existing `seenHints` ledger. Never a dead end, never nags.
- **Graduation flow**: chip → **confirm modal** → **ranch ceremony** (reuse the
  evolution ceremony machinery: walk to center → glow / farewell → the rig
  retires from the scene) → **egg screen** (starter-style) summarising the
  lineage and showing the **inherited stat floor** vs the species bounds →
  the player **picks any available species** → the new egg hatches, the HUD
  resets to the new baby.
- **Hall of Fame panel** (modal, reachable from the Lineage plate): lists
  retired records (name, species/element crest, stats, generation, retired
  day), newest first.
- The flow is **reduced-motion aware** (instant cuts), **keyboard/aria** per the
  shared kit, and cancels cleanly (a cancelled confirm changes nothing).
- Prestige milestone perks surface as coach callouts when first unlocked.

### R7 — Coach copy

Warm, non-legalese send-off voice per `product-guidelines.md`: graduation is
framed as a proud gradu­ation/hand-off, never loss. Copy lives beside the other
HUD copy helpers (`apps/client/src/hud.ts` / `hud.copy.test.ts`) so it stays
unit-tested.

## Non-Functional Requirements

- All sim code pure, DOM-free, deterministic (seeded fixtures); no new RNG
  streams beyond the successor's creation seed.
- The test suite stays fast (< 10 s target under `--parallel`); a slow test is a
  bug in the test.
- No new dependencies. **Voxel/asset pipeline untouched** — the determinism
  gate is unaffected.
- Styleguides under `conductor/code_styleguides/`; `bun run verify` is the
  definition of done.

## Acceptance Criteria

1. `canGraduate` returns `eligible` only for a day-phase, champion, day-≥-60
   creature; every failing condition yields its reason (tests cover success +
   each failure).
2. `inheritedFloor` = `round(0.5 × parent effective)` per stat, clamped to
   species bounds, `+1`/stat at prestige ≥ 5; the successor's bond starts at 20
   at prestige ≥ 3; the same seed reproduces the same successor.
3. `graduate` appends a `RetiredRecord`, increments `generation`, swaps in the
   successor, and resets AP while carrying `day`/`cupsWon`/`ladder`/`settings`
   untouched; it is mutation-pure and rejects ineligible states (mid-cup,
   too-young, not-champion) with no change.
4. `lineagePrestige` = `generation + cupsWon`; milestone perks apply at 1/3/5.
5. v9 saves migrate to v10 with an empty lineage; round-trip save/load verified;
   the corrupt-save path is unaffected; `docs/save-schema.md` documents v10.
6. Client: the Graduate chip appears only when eligible; confirm → ceremony →
   egg screen → new baby with inherited stats; the Lineage plate and Hall of
   Fame render; reduced-motion variant instant; browser-verified with a clean
   console.
7. `bun run verify` passes; suite time unchanged.

## Out of Scope

- **Simultaneous roster** — switching between multiple living creatures, a
  "box"/ranch of many creatures. Succession stays replace-in-place.
- **Breeding between two retired creatures**, trait inheritance + mutation,
  and type-affinity drift (Phase 2).
- **Run / season reset** — the in-game day clock keeps counting across
  generations; cups keep cycling every 7 days. No "new season" semantics.
- Backend / cloud lineage, leaderboards, or shared family data (Phase 3).
- New species, archetypes, or voxel stages.
