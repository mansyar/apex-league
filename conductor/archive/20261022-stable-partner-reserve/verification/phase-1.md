# Phase 1 — Per-Pet Age — Verification Report

- **Track:** 20261022-stable-partner-reserve — Stable & Partner Reserve
- **Phase:** 1 — Per-Pet Age (covers FR-5, FR-12, NFR-3, NFR-4, AC-3, AC-4)
- **Date:** 2026-10-22
- **Branch:** `feat/20261022-stable-partner-reserve`
- **Base commit:** `f1218f4` (conductor: mark phase "Per-Pet Age" in progress)
- **Head commits:**
  - `6ae733b` — `feat(sim): give every creature its own age counter` (P1.T1)
  - `aa63103` — `feat(sim): move the growth gates onto the pet's own age` (P1.T2)
  - `9e3b1fe` — `feat(save): persist the pet's age in save v23` (P1.T3)
  - `8b0f687` — `style(sim): sort the creature test imports` (Biome's
    `organizeImports` rule; the same file, re-ordered members only)
- **Result:** `verified`

## What changed

The growth gates no longer read the world clock. Every pet carries its own
`ageDays` — the days it has been alive, one on its hatch day — the night
settlement advances the active pet's age by exactly one, and the juvenile,
champion and graduation gates read that age. A pet hatched on day 24 now
stays a baby through its first nine nights and matures on its own tenth
night; the day-1 starter still matures on the day-10 night, with the
existing golden's day numbers unchanged. Save v23 persists the age, and the
linear v22 → v23 migration stamps the world day — today's effective age — so
a migrated pet matures on precisely the night it matures on today.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static (types) | `bun run check` | 0 | `@apex/voxel` 71 files, `@apex/sim` 99 files, `@apex/client` 305 files — no type errors |
| unit | `bun test --timeout 120000` | 0 | 2255 pass, 1 skip, 0 fail — 170 files, 90,563 `expect()` calls |
| unit (parallel, CI form) | `bun test --check --parallel --timeout 120000` | 0 | 2255 pass, 1 skip, 0 fail — 170 files, 66.5 s |
| lint (format) | `biome check` | 1 | **One pre-existing finding outside this phase**: `conductor/tracks/20261022-stable-partner-reserve/metadata.json` is not Biome-formatted (it arrived with the track-setup commits `0a224bc` / `a8072d4`). It is Conductor state this phase must not edit — the primary owns the fix. The phase's own files are Biome-clean (the one complaint inside the phase, the import order in `creature.test.ts`, is fixed in `8b0f687`). |
| unit (sim only, per-task loop) | `bun test --timeout 120000 packages/sim/src` | 0 | 1173 pass, 1 skip, 0 fail — 58 files |
| unit (client only, per-task loop) | `bun test --timeout 120000 apps/client/src` | 0 | 842 pass, 0 fail — 64 files |
| unit (voxel only, per-task loop) | `bun test --timeout 120000 packages/voxel/src` | 0 | 240 pass, 0 fail — 48 files (untouched by this phase) |

The phase verification command — `bun run check && bun test --timeout 120000`
— is the combined form of the first two rows and exited 0 on the final
committed state (`8b0f687`).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-4 | A pet hatched on day 24 matures on its own tenth night, not its first; the day-1 starter still matures on the day-10 night. | `packages/sim/src/evolution.test.ts` → `describe("the pet's own age — a late hatch grows at its own pace")`: *"a pet hatched on day 24 stays a baby through its first nine nights"*, *"a pet hatched on day 24 matures on its own tenth night"* (day 24 → juvenile on day 34), *"the day-1 starter still matures on the day-10 night"* (baby on day 10, juvenile on day 11). The pre-existing goldens keep their day numbers: *"a well-cared baby evolves on the night of day 10"*, *"a qualified juvenile becomes a champion on the night of day 25"*. | pass |
| AC-3 | A stashed pet is frozen: a night tick changes neither its conditions nor its age. | Phase 1 half only — the stable does not exist until Phase 2. The seam is explicit: `packages/sim/src/ticker.ts` ages **only** the settled (active) creature, so a pet that is not settled never ages. `packages/sim/src/evolution.test.ts` pins the increment to exactly one per night. | partial (Phase 2 owns the stable) |
| FR-5 | Age is per pet: every pet carries its own days alive, incremented by the night settlement while it is active; the juvenile, champion and graduation gates read that age. | `packages/sim/src/creature.ts` (`ageDays`, `AGE_AT_HATCH`), `packages/sim/src/ticker.ts` (the night increment), `packages/sim/src/evolution.ts` (the two evolution gates), `packages/sim/src/legacy.ts` (`canGraduate` reads `state.creature.ageDays`). | pass |
| FR-12 | The cups-won tally stays the family's: prestige and the champion title remain lineage measures. | `packages/sim/src/evolution.ts` — the champion gate still reads `cupsWon` (the family's tally), never the pet's own counters; `packages/sim/src/evolution.test.ts` → *"no cup win blocks the champion gate"*. | pass |
| NFR-3 | Sim logic stays pure, seeded and DOM-free; the age consumes no RNG. | The age is a counter: `ticker.ts` adds one to `settled.ageDays` with no draw, so no seeded stream moves. The sim imports nothing new. | pass |
| NFR-4 | Existing balance invariants hold; every existing golden stays green, except the evolution goldens, which are re-pinned onto the pet's age with the same day numbers for a day-1 starter. | The full suite is green (2255 pass / 0 fail). The evolution goldens keep their day numbers: day 10 and day 25 for a day-1 starter (`evolution.test.ts`), re-pinned from the world day onto `ageDays`. | pass |

## Tasks

| Task | Status | Commit |
|---|---|---|
| P1.T1 — Give every creature an age counter (T1.1 failing tests first, T1.2 `ageDays` stamped by every creation seam) | done | `6ae733b` |
| P1.T2 — Move the gates onto the pet's age (T2.1 the night increments the active pet, T2.2 juvenile/champion/graduation gates read the age) | done | `aa63103` |
| P1.T3 — Save the age and migrate it (T3.1 save v23 + the linear v22 → v23 migration, T3.2 validation + `docs/save-schema.md`) | done | `9e3b1fe` |
| — Biome import-order fix on the same test file | done | `8b0f687` |

The growth-hint constants (`EVOLUTION_HINT_DAY` 5, `CHAMPION_HINT_DAY` 20,
`GRADUATION_HINT_DAY` 55) now carry the pet's own age as their meaning and
say so in their docs; the surfaces that read them live in the client and
move in Phase 3 (see the notes).

### The creation seams (P1.T1.2)

Every seam stamps one day of life — asserted in
`packages/sim/src/creature.test.ts` (*"the pet's own age"*), plus
`packages/sim/src/breeding.test.ts` for the bred egg and the gift hatch:

| Seam | Age on hatch |
|---|---|
| `chooseStarter` (day 1) | 1 |
| `createGiftEgg` / `hatchGiftEgg` | 1 |
| `graduate` (successor) | 1 |
| `graduateWithPair` / `createBredCreature` | 1 |

## Evidence paths

- This report: `conductor/tracks/20261022-stable-partner-reserve/verification/phase-1.md`
- The gate tests: `packages/sim/src/evolution.test.ts`,
  `packages/sim/src/legacy.test.ts`, `packages/sim/src/creature.test.ts`,
  `packages/sim/src/breeding.test.ts`
- The save tests: `packages/sim/src/save/save.test.ts` (the `save v23 — the
  pet's own age` block), `packages/sim/src/save/transfer.test.ts`
- The schema: `docs/save-schema.md` (the `ageDays` row, the v22 → v23
  migration row, the v23 validation rule)

No screenshot layer: this phase touches no player-facing surface (the
client's age readout and stable surfaces are Phase 3).

## Deviations

| File | Reason |
|---|---|
| `apps/client/src/growth.ts` | The Growth panel's age row read `state.day`; the gate it mirrors now reads the pet's age, so the row would have disagreed with the verdict (its own contract: *"a row can never disagree with the verdict that actually blocks the gate"*). The row now reads `creature.ageDays`. Outside the phase's Touches; the smallest change that keeps the client honest. |
| `apps/client/src/growth.test.ts`, `apps/client/src/creature-detail.test.ts`, `apps/client/src/growth-panel.test.ts` | These client fixtures hand-build a creature and a world day; they now stamp the pet's age (`ageDays: day`, a day-1 starter's timeline) so the panel and the gate agree. Required to keep the suite green after the gate moved. |
| `packages/sim/src/evolution.ts` | `evaluateEvolution(creature, day, cupsWon)` keeps the brief's signature, but the world day no longer decides anything, so the parameter is renamed `_day` (the repo's existing convention for an intentionally unused parameter) and documented as the settlement seam. |
| `packages/sim/src/ticker.ts` (ordering) | The brief asks for the increment "after the settlement and before the evolution check". The increment lands **after** the check instead: the evolution check lives inside `settleCreature`, and the brief's own acceptance criteria (AC-4: the day-1 starter still matures on the day-10 night) and its migration rule (`ageDays = state.day` preserves today's effective behaviour) both require the gate to read the age the pet had lived at the start of that night. An increment before the check would make the gate read `D + 1` on the night that ends day `D`, maturing the starter one night early and forcing the migration to stamp `day + 1`. The pet's age therefore advances by one at the end of the night it sleeps — the value it carries during the next day. |
| `docs/save-schema.md` | Instructed by the phase brief ("Update `docs/save-schema.md` (field, migration row, validation rule) in this phase"), outside the Touches list. |
| `packages/sim/src/ap.test.ts`, `packages/sim/src/species-electric.balance.test.ts`, `packages/sim/src/stats.test.ts`, `packages/sim/src/graduation.test.ts`, `packages/sim/src/breeding.test.ts`, `packages/sim/src/save/breedingSave.test.ts`, `packages/sim/src/save/evolutionKnowledge.test.ts`, `packages/sim/src/save/legacySave.test.ts` | Hand-built fixtures that construct a `Creature` literal or a champion state: they now carry the pet's age, because the graduation gate reads it. Inside the phase's Touches. |

## Notes

- **Phase 2 handoff (the freeze seam).** The age advances only on the
  creature the ticker settles — the active pet. A pet in the stable is never
  settled, so it never ages: `packages/sim/src/ticker.ts` is the single seam
  Phase 2 has to guard.
- **Phase 3 handoff (the hint copy).** `EVOLUTION_HINT_DAY` (5),
  `CHAMPION_HINT_DAY` (20) and `GRADUATION_HINT_DAY` (55) are now the pet's
  own age; their doc comments say so. Their **consumers** live in the client
  (`apps/client/src/hud/copy-growth.ts`, `apps/client/src/hud/copy-branch.ts`,
  which read the world day) — `apps/client/src/hud/*` is Phase 3's Touches, so
  the hint copy moves there. The Growth panel's gate row already reads the
  pet's age in this phase.
- **The graduation consequence is approved and visible.** A late-hatched pet
  now needs 60 of its own days; a day-1 starter's timing is unchanged.
  `packages/sim/src/legacy.test.ts` → *"reads the pet's own age, not the world
  day (save v23)"* pins it.
- **The age is a counter, not a roll.** No RNG is consumed, so every seeded
  stream (cup draws, rival kits, sickness rolls) is byte-identical to before
  this phase.
- **`biome check` has one open complaint that this phase may not fix:**
  `conductor/tracks/20261022-stable-partner-reserve/metadata.json` is not
  Biome-formatted. It came in with the track-setup commits (`0a224bc`,
  `a8072d4`), before this phase started, and it is Conductor state the phase
  executor must not edit — the primary should reformat it before the track's
  integrated verification (Phase 4) so `bun run verify` is green.
- The phase commits are task-level and land in the plan's order; the primary
  squashes them into the phase commit on acceptance.

## Primary verification

Run by the primary agent, independently of the phase report.

| Check | Command | Exit | Result |
|---|---|---|---|
| Working tree | `git status --porcelain` | 0 | clean — no uncommitted work outside the phase's commits |
| Files vs Touches | `git diff --name-only f1218f4..HEAD` | — | 33 files, all inside Touches or the three reported deviations (`apps/client/src/growth.ts` + its fixtures, `docs/save-schema.md`); no unreported file outside Touches |
| Commits reported | `git log --oneline f1218f4..HEAD` | — | 5 commits, all reported by the phase agent; no merge commit, no foreign commit |
| Static (types) | `bun run check` | 0 | voxel 71 files, sim 99 files, client 305 files — no type errors |
| Unit | `bun test --timeout 120000` | 0 | 2,255 pass / 1 skip / 0 fail across 170 files |
| Lint (format) | `biome check conductor/tracks/20261022-stable-partner-reserve/metadata.json` | 0 | the one open complaint (the track's own `metadata.json`, unformatted since the track-setup commits) is fixed by the primary, which owns Conductor state |

Behaviour verified directly, not only through the suite:

- **The late-hatch defect is gone.** `.conductor/evidence/phase-r1/age-probe.ts`
  hatches the Storm Gift on day 24 and advances one night. Before this phase
  the probe reported `after one night (day 25): stage juvenile`; it now
  reports `after one night (day 25): stage baby, mood 65` — the gift keeps its
  baby stage and matures on its own tenth night.
- **The day-1 starter's timing is unchanged.** The pre-existing goldens keep
  their day numbers ("a well-cared baby evolves on the night of day 10", "a
  qualified juvenile becomes a champion on the night of day 25"), and the
  migration stamps `ageDays = state.day`, so a v22 save matures on precisely
  the night it matures on today.

Verdict: **verified** — the phase's goal, its acceptance criteria and the
biome complaint are all satisfied. The one deviation with a design
consequence (the age increment lands at the end of the night the pet sleeps)
is accepted: it is the only ordering that satisfies AC-4 and the migration
rule together, and it is recorded in the phase's deviations table.

**Result:** verified
**Checkpoint:** (recorded in `plan.md`)
**Evidence:** conductor/tracks/20261022-stable-partner-reserve/verification/phase-1.md
