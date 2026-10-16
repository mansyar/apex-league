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
- [x] Task: Graduation eligibility gate *(tests first)* — 699e5ab
  - Tests: eligible only for day-phase + creature + champion + day ≥ 60;
    reason precedence `no-creature > cup-phase > not-champion > too-young >
    eligible`; a champion at day 60+ stays eligible forever; a
    baby/juvenile is `not-champion`
  - Implement `canGraduate` + `GRADUATION_DAY = 60` + `GRADUATION_HINT_DAY = 55`
- [x] Task: Inheritance math *(tests first)* — 549d9c5
  - Tests: `inheritedFloor` = `round(0.5 × parent effective)` per stat,
    clamped into species `statBounds`, `+1`/stat at prestige ≥
    `PRESTIGE_ESTABLISHED_LINE`; `createInheritedCreature` never rolls below
    the floor, never exceeds the species max, raises the start bond to 20 at
    prestige ≥ `PRESTIGE_WARM_BLOODLINE`, and is seed-reproducible (same seed
    → identical successor)
  - Implement `INHERITANCE_FRACTION`, `inheritedFloor`,
    `createInheritedCreature` (built on `createCreature`)
- [x] Task: Succession *(tests first)* — 9a8080d
  - Tests: `graduate` appends a `RetiredRecord` (fields captured from the
    champion), increments `generation`, swaps in the successor, resets
    `actionPoints` to `ACTION_POINTS_PER_DAY`, and carries
    `day`/`cupsWon`/`lastCupDay`/`ladder`/`settings` untouched; the input
    state is never mutated; ineligible states reject with the correct reason
    and no change; records accumulate oldest-first across two graduations
  - Implement `graduate(state, speciesId, seed)`
- [x] Task: Save v10 migration + validation *(tests first)* — 5518301
  - Tests: a v9 payload migrates to v10 with `lineage` initialized
    (`generation 0`, empty `hallOfFame`); round-trip save/load preserves the
    lineage slice; malformed lineage (bad `generation` type, non-array
    `hallOfFame`, malformed record) is rejected with the existing
    corrupt-save tolerance; the migration step is individually reversible
    (per the audio-branch renumber note in spec R5)
  - Implement `SAVE_VERSION = 10` + the `v9 → v10` step in
    `packages/sim/src/save/migrate.ts` + `lineage` validation in
    `save/storage.ts`; update `docs/save-schema.md`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — **[checkpoint: af187f0]**
  - Tests: all sim suites green (legacy, gate, inheritance, succession,
    migration); `bun run check` clean; `bun run verify` green (1026 pass / 1 skip / 0 fail; determinism gate byte-identical)
  - Manual verification: scripted headless playthrough
    (`artifacts/legacy-demo.ts`) — Path 1 a day-60 champion graduates →
    successor inherits the 50% floor → generation 1; Path 2 a juvenile
    rejects with `not-champion`; Path 3 a day-59 champion rejects with
    `too-young`; Path 4 mid-cup rejects with `cup-phase`; Path 5 prestige ≥ 5
    yields the `+1`/stat floor

## Phase 2 — Client: Graduation Flow & Lineage Surfaces

*(presentation — manual verification path; copy stays unit-tested via
`hud.copy.test.ts`)*

- [x] Task: Lineage plate + family name — 4b98ce8
  - Broadcast-kit plate on the ranch HUD: family name with a Roman-numeral
    generation suffix (e.g. `"Bramble Ox II"`), generation, prestige, lifetime
    cups; aria-labeled; reduced-motion aware
  - Family-name formatting helper with unit tests (`hud.copy.test.ts`)
- [x] Task: Graduate affordance + hint — 4b98ce8
  - Chip in the command dock, rendered **only when eligible**; a
    direction-only hint from `GRADUATION_HINT_DAY = 55` deduped through the
    existing `seenHints` ledger; copy + hint logic unit-tested
- [x] Task: Confirm modal + graduation ceremony — 4b98ce8
  - Confirm → ranch ceremony reusing the evolution ceremony machinery (walk to
    center → glow / farewell → rig retires); instant variant under reduced
    motion; cancel changes nothing; focus trap / Escape per the shared modal
    contract
- [x] Task: Egg screen + successor hatch — 4b98ce8
  - Starter-style screen: lineage summary + the inherited stat floor vs the
    species bounds, player picks any available species, the egg hatches the
    successor through `graduate`, HUD resets to the new baby
- [x] Task: Hall of Fame panel — 4b98ce8
  - Modal reachable from the Lineage plate; lists retired records newest-first
    (name, element crest, stats, generation, retired day); empty state before
    the first graduation
- [x] Task: Prestige perk callouts — c3074d1
  - Coach callouts when a milestone first unlocks (Hall of Fame / Warm
    bloodline / Established line), routed through the status-ticker
    precedence chain
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — **[checkpoint: 31289c8]**
  - Browser-driven verification: dev server + a sim-generated save seeded into
    localStorage; screenshots of hint → chip → confirm → ceremony → egg
    screen → successor on the ranch → Lineage plate → Hall of Fame; reduced
    motion instant; console clean

## Phase 3 — Wrap-up

- [x] Task: Full `bun run verify` green; end-to-end manual playthrough plan
  (fresh run → day-60 champion → graduate → generation 2; blocked paths: not
  champion / too young / mid-cup; reduced motion) — f24ab5f
  - Evidence: `bun run verify` green (1043 pass / 1 skip / 0 fail; determinism
    gate byte-identical). Browser playthrough with
    `artifacts/legacy-phase3-fixture.ts` (three seeded v10 saves):
    **blocked** — day-1 founder baby, no Graduate chip and no "graduate" copy;
    **too-young** — day-59 champion, no chip; **eligible** — day-60 champion
    generation 1, chip live → confirm modal (focus trap, Escape) → egg screen
    (warm-bloodline badge, per-species inherited floors) → Tide/Bramble pick →
    **generation 2** persisted with Hall of Fame ×2, successor bond 20, stats
    at or above the inherited floor, and `day`/`cupsWon`/`ladder` carried
    while AP resets. Hall of Fame lists gen 1 then gen 0 (newest first).
    **Reduced motion** — chip → confirm → egg screen in **19 ms**, no ceremony
    interlude; graduation to **generation 3** with a Tide Axolotl successor.
    Console clean across every step (only Vite's connect debug lines).
- [x] Task: Docs sync — `product.md` Phase 1 annotation (legacy phase
  landed), README roadmap note, `docs/save-schema.md` v10 entry, tech-stack
  dated note only if warranted — f24ab5f
  - `docs/save-schema.md` v10 field + migration row already landed in Phase 1
    (5518301), so no change here; `tech-stack.md` needs no dated note — the
    track added no dependency or architectural seam.
- [x] Task: Final review readiness — all tasks `[x]` with commit SHAs, ready
  for `conductor-review` — f24ab5f

## Phase: Review Fixes

- [x] Task: Apply review suggestions a9053ab

Review pass (`conductor-review`) over the whole track: no correctness or
security defects; five maintainability/a11y findings and one coordination
risk, all recorded below. Every acceptance criterion's failure path is
tested (reason precedence, both clamp directions, cross-species succession,
unknown-species throw, mutation purity, corrupt-save rejection).

### Phase notes (review)

- **Fixed — milestone constants.** `hud.ts` hardcoded the callout
  thresholds (3/5) instead of the sim's `PRESTIGE_WARM_BLOODLINE` /
  `PRESTIGE_ESTABLISHED_LINE`. The *effect* already used the shared
  `lineagePerks`; now the teaching does too, so retuning a milestone can't
  leave the coach announcing a stale one.
- **Fixed — the send-off was cut short by a timer.** `main.ts` opened the egg
  screen on a flat `2200ms`, but the reused ceremony runs
  walk (distance-dependent) + `GLOW_TIME 1.4s` + `SETTLE_TIME 0.6s` ≈
  2.5–5s, so a champion standing far from the center had its farewell
  truncated mid-walk. `startEvolution`/`startEvolutionCeremony` now take an
  `onDone` that fires on the machine's settle edge and the flow sequences
  off it — measured **2966ms** in the browser (vs the old fixed 2200ms) and
  **667ms** under reduced motion, with no special case and no timer left.
  The callback deliberately survives a plain rebuild's `clearEvolution()`,
  so a send-off can never be stranded with no egg screen.
- **Fixed — `effectiveStats` reuse.** The egg screen re-added the four
  stat/trained pairs by hand; it now derives the previewed floor from the
  sim's own sum, so the preview can't drift from what `graduate` applies.
- **Fixed — focus return.** The modals trapped Tab and closed on Escape but
  left focus on `<body>`; Escape / backdrop / "Not yet" now hand it back to
  the opener (the spar overlay's established practice), and the egg screen
  opens with focus on the first pickable egg. Browser-verified:
  `focusAfterEscape` = the Graduate chip, `focusedWhenEggOpened` = the first
  `starter-card`.
- **Fixed — the first runtime cycle in `@apex/sim`.** `state.ts` imported
  `initialLineage` as a value while `legacy.ts` imports the action-point
  constant from `state`, so the two were mutually dependent at runtime.
  `state.ts` now inlines the fresh-lineage literal (as it already inlines
  `cupsWon`/`lastCupDay`) and imports `LineageState` as a type only, leaving
  `legacy → state` as the single direction. Safe before the fix in both
  evaluation orders, but fragile in a way nothing else in the package was.
- **Open — save v10 collides with `audio_foundation_20261013`.** Verified,
  not hypothetical: that branch's worktree (`3c6eff4`) also ships
  `SAVE_VERSION = 10` with its own `migrations[9]`. This track is complete
  and verified, so it should land as v10; the audio track rebases and takes
  11 with a `v10 → v11` step. Both steps stay individually reversible, so
  the renumber is mechanical (spec R5 anticipated exactly this).
- **Fixed beyond the review — the top-band collision the user reported.**
  The lineage plate (top: 58px, left: 18px) grew rightward into the centered
  score bug once a dynasty name got long, and the fixed top-center teaching
  callout sat on top of the bug's day/AP/ladder readout. The plate now sits
  below the top band (top: 100px) with a bounded, ellipsized family name,
  and the callout stacks in the left column under it (the fix this plan's
  Phase 3 note proposed). Measured clear at 1400 / 925 / 420 px against the
  score bug, the plate, the spar chip, the lower-third, and the dock; no
  horizontal overflow.

### Phase notes (Phase 3)

- **Accepted divergence — Lineage plate visibility.** The spec's prestige table
  pairs `PRESTIGE_FOUNDED = 1` with "Lineage plate appears"; the implementation
  shows the plate whenever a creature exists (gen 0 founder included) and lets
  the milestone govern the Hall of Fame archive instead. Rationale: the plate is
  the only readout of generation/prestige, and hiding your own bloodline status
  until the first graduation withholds information the player needs to plan it.
  The perk's *effect* (a recorded Hall of Fame) is unchanged.
- **Post-checkpoint lint cleanup.** The final `bun run verify` surfaced one
  warning this track introduced: the `.dock-graduate` base rule sat *after* the
  `.command-dock.is-collapsed` group it belongs before, which Biome reads as
  descending specificity. Reordered in `ec96514` — declarations untouched and
  no property overlap, so the collapsed/expanded rendering is unchanged — then
  re-verified green. The remaining warnings in `ranch.css` are pre-existing and
  untouched.
- **Known cosmetic nit — callout vs. plate.** A teaching callout is a fixed
  top-center banner (`z-index: 60`) and momentarily overlaps the lineage plate
  on the desktop band, exactly as it already overlaps the centered score bug.
  Established behavior in this codebase, not a new regression; if the collision
  is worth removing, the clean fix is to collapse the banner to the left column
  alongside the plate rather than to reshape it.
