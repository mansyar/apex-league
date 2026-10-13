# Plan — Legacy & Breeding (Retirement → Next Egg)

**Track ID:** `legacy_breeding_20261013`
**Spec:** [./spec.md](./spec.md) · **Status:** approved 2026-10-13 · **Branch:** `legacy_breeding_20261013`

Workflow: TDD for logic-bearing tasks (tests first, red → green → refactor),
manual verification for presentation tasks, phase checkpoints per
`conductor/workflow.md`. `bun run verify` is the definition of done.

## Phase 1 — Sim Core: Lineage, Eligibility & Succession

*(all logic-bearing — strict TDD)*

- [x] Task: Lineage slice + prestige model *(write failing tests first)* — 4a67a35
  - Tests: `LineageState`/`RetiredRecord` shapes; `createInitialState` starts
    `{ generation: 0, hallOfFame: [] }`; `lineagePrestige = generation +
    cupsWon`; milestone resolution returns the right perk set at prestige
    0/1/3/5 (and holds at higher values)
  - Implement `packages/sim/src/legacy.ts` (types + `lineagePrestige` +
    `PRESTIGE_*` constants + a `lineagePerks(prestige)` helper), extend
    `state.ts`, export from `index.ts`
- [~] Task: Graduation eligibility gate *(tests first)*
  - Tests: eligible only for day-phase + creature + champion + day ≥ 60;
    reason precedence `no-creature > cup-phase > not-champion > too-young >
    eligible`; a champion at day 60+ stays eligible forever; a
    baby/juvenile is `not-champion`
  - Implement `canGraduate` + `GRADUATION_DAY = 60` + `GRADUATION_HINT_DAY = 55`
- [ ] Task: Inheritance math *(tests first)*
  - Tests: `inheritedFloor` = `round(0.5 × parent effective)` per stat,
    clamped into species `statBounds`, `+1`/stat at prestige ≥
    `PRESTIGE_ESTABLISHED_LINE`; `createInheritedCreature` never rolls below
    the floor, never exceeds the species max, raises the start bond to 20 at
    prestige ≥ `PRESTIGE_WARM_BLOODLINE`, and is seed-reproducible (same seed
    → identical successor)
  - Implement `INHERITANCE_FRACTION`, `inheritedFloor`,
    `createInheritedCreature` (built on `createCreature`)
- [ ] Task: Succession *(tests first)*
  - Tests: `graduate` appends a `RetiredRecord` (fields captured from the
    champion), increments `generation`, swaps in the successor, resets
    `actionPoints` to `ACTION_POINTS_PER_DAY`, and carries
    `day`/`cupsWon`/`lastCupDay`/`ladder`/`settings` untouched; the input
    state is never mutated; ineligible states reject with the correct reason
    and no change; records accumulate oldest-first across two graduations
  - Implement `graduate(state, speciesId, seed)`
- [ ] Task: Save v10 migration + validation *(tests first)*
  - Tests: a v9 payload migrates to v10 with `lineage` initialized
    (`generation 0`, empty `hallOfFame`); round-trip save/load preserves the
    lineage slice; malformed lineage (bad `generation` type, non-array
    `hallOfFame`, malformed record) is rejected with the existing
    corrupt-save tolerance; the migration step is individually reversible
    (per the audio-branch renumber note in spec R5)
  - Implement `SAVE_VERSION = 10` + the `v9 → v10` step in
    `packages/sim/src/save/migrate.ts` + `lineage` validation in
    `save/storage.ts`; update `docs/save-schema.md`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Tests: all sim suites green (legacy, gate, inheritance, succession,
    migration); `bun run check` clean
  - Manual verification: scripted headless playthrough
    (`artifacts/legacy-demo.ts`) — Path 1 a day-60 champion graduates →
    successor inherits the 50% floor → generation 1; Path 2 a juvenile
    rejects with `not-champion`; Path 3 a day-59 champion rejects with
    `too-young`; Path 4 mid-cup rejects with `cup-phase`; Path 5 prestige ≥ 5
    yields the `+1`/stat floor

## Phase 2 — Client: Graduation Flow & Lineage Surfaces

*(presentation — manual verification path; copy stays unit-tested via
`hud.copy.test.ts`)*

- [ ] Task: Lineage plate + family name
  - Broadcast-kit plate on the ranch HUD: family name with a Roman-numeral
    generation suffix (e.g. `"Bramble Ox II"`), generation, prestige, lifetime
    cups; aria-labeled; reduced-motion aware
  - Family-name formatting helper with unit tests (`hud.copy.test.ts`)
- [ ] Task: Graduate affordance + hint
  - Chip in the command dock, rendered **only when eligible**; a
    direction-only hint from `GRADUATION_HINT_DAY = 55` deduped through the
    existing `seenHints` ledger; copy + hint logic unit-tested
- [ ] Task: Confirm modal + graduation ceremony
  - Confirm → ranch ceremony reusing the evolution ceremony machinery (walk to
    center → glow / farewell → rig retires); instant variant under reduced
    motion; cancel changes nothing; focus trap / Escape per the shared modal
    contract
- [ ] Task: Egg screen + successor hatch
  - Starter-style screen: lineage summary + the inherited stat floor vs the
    species bounds, player picks any available species, the egg hatches the
    successor through `graduate`, HUD resets to the new baby
- [ ] Task: Hall of Fame panel
  - Modal reachable from the Lineage plate; lists retired records newest-first
    (name, element crest, stats, generation, retired day); empty state before
    the first graduation
- [ ] Task: Prestige perk callouts
  - Coach callouts when a milestone first unlocks (Hall of Fame / Warm
    bloodline / Established line), routed through the status-ticker
    precedence chain
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Browser-driven verification: dev server + a sim-generated save seeded into
    localStorage; screenshots of hint → chip → confirm → ceremony → egg
    screen → successor on the ranch → Lineage plate → Hall of Fame; reduced
    motion instant; console clean

## Phase 3 — Wrap-up

- [ ] Task: Full `bun run verify` green; end-to-end manual playthrough plan
  (fresh run → day-60 champion → graduate → generation 2; blocked paths: not
  champion / too young / mid-cup; reduced motion)
- [ ] Task: Docs sync — `product.md` Phase 1 annotation (legacy phase
  landed), README roadmap note, `docs/save-schema.md` v10 entry, tech-stack
  dated note only if warranted
- [ ] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready
  for `conductor-review`
