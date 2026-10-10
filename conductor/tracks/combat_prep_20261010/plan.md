# Plan — Combat Prep (`combat_prep_20261010`)

Execution roadmap for the track. `conductor/workflow.md` governs: logic-bearing
tasks are test-first (failing tests before implementation, committed as a red
commit then a green commit); commits follow `<type>(<scope>): <desc>` and get a
git note + plan checkoff per task; each phase closes with a verification
checkpoints per the workflow; `spec.md` is the contract — divergence means
updating the spec first, then the code.

Ground rules for this track:

- New sim code lands in the existing seams: the counter in `care.ts`
  (Training lives there), `effectiveStats` on the creature module, the loadout
  helpers in a new `packages/sim/src/loadout.ts`, schema/migration in
  `packages/sim/src/save/`, and the kit-slicing glue in
  `packages/sim/src/battle/exhibition.ts`. The resolver, clock, policy, and
  damage files are untouched.
- Exports surface through `packages/sim/src/index.ts` only as tasks call for.
- Client work is `apps/client/src/spar.ts` (loadout row + stat cards) and
  `apps/client/src/hud.ts` (unlock callout), `apps/client/src/main.ts` wiring.
- The suite keeps the recorded runtime deviation (voxel partition); added
  tests stay small and table-driven.
- `SAVE_VERSION` moves 3 → 4 with a migration that credits 6 trained days.

## Phase A — Trained days & effective stats (sim)

- [ ] Task: Failing tests — trained-days counter and effectiveStats (sim)
  - Creature gains `trainingDays` (0 at creation) in `creature.ts` type +
    `createCreature` + `TRAINED_START`-style frozen defaults (v3 save schema
    untouched yet; the field is added in Phase C).
  - `effectiveStats(creature)` in `creature.ts` = per-stat `stats + trained`.
  - Care tests in `care.test.ts`: first assignment of a day bumps
    `trainingDays` by exactly 1 along with the AP spend; a same-day free swap
    leaves it; an already-focused no-op and a capped-stat rejection leave it;
    two assignment days accumulate to 2.
- [ ] Task: Implement trained days and effectiveStats (sim)
  - `care.ts` accounting next to the AP logic; `creature.ts` helper; friendly
    rejections unchanged; JSDoc on the new seam per style guides.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — Unlock gate & loadout helpers (sim)

- [ ] Task: Failing tests — unlockedKit, defaultLoadout, setLoadout (sim)
  - New `packages/sim/src/loadout.test.ts`: `MOVE_TIER3_DAYS = 3`,
    `MOVE_TIER4_DAYS = 6`; `unlockedKit` slicing by `trainingDays` (0–2 →
    tiers 1–2, 3 → +tier 3, 6 → all four) across all three species; rivals are
    not handled here (they never read this path — assert the slice has no
    seed); `setLoadout` accepts 2–4 unique unlocked ids in any order, stores
    them, and rejects unknown/repeat/locked/mis-sized lists with the friendly
    error strings from the spec; `clearLoadout` restores `null`.
- [ ] Task: Implement loadout.ts and relax validateLoadout (sim)
  - `loadout.ts` helpers; `battle/moves.ts` `validateLoadout` accepts 2–4
    (dated spec revision of battle_core FR3 — update the moves.test counts and
    the spec reference accordingly); export the new API from
    `packages/sim/src/index.ts`.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Save v4 migration (sim)

- [ ] Task: Failing tests — schema v4 + migration v3→v4 (save)
  - `save/schema.ts`: `SAVE_VERSION = 4`; creature schema adds
    `trainingDays: number` and `loadout: readonly string[] | null`.
  - `save/migrate.ts` + `save.test.ts`: a v3 save migrates to `trainingDays: 6`
    and `loadout: null` (pre-gate creatures knew their kit; no surprise loss);
    a v4 round-trip preserves both fields; older saves still load without
    damage.
- [ ] Task: Implement schema v4 and migration (save)
  - Version bump, migration function, storage untouched; `bun run
    gate:determinism` is voxel-only but `verify` runs all gates anyway.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Exhibition reads prep (sim)

- [ ] Task: Failing tests — effectiveStats + chosen kit in makeExhibition (sim)
  - `battle/exhibition.test.ts`: the owned side's stats equal
    `effectiveStats(owned)` across seeds (trained fixture creatures); an
    explicit loadout argument overrides the kit (chosen four — or two), and
    `loadout: null` resolves to `defaultLoadout`; the rival side is untouched
    (full species kit, raw stats) in every case.
- [ ] Task: Implement makeExhibition prep consumption (sim)
  - `exhibition.ts` consumes the helpers; no seed changes for the rival;
    export updates as needed.

- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase E — Spar panel loadout row & stat cards (client — manual verification)

- [ ] Task: Effective stat cards + progress line in the Spar panel
  - `statLine` shows `ATK 13 (+2)` when a bonus exists (none on the rival);
    an unlocked-progress line under the rival detail: next locked tier and
    remaining days (hidden when everything is unlocked).
- [ ] Task: Loadout row + picker with locked rows
  - Slots row above the tactic buttons; click opens a picker of the species
    kit; unlocked toggles write through `setLoadout`; locked rows render
    disabled with "Locked — train N more day(s)"; chosen kit feeds
    `makeExhibition` for this spar; `main.ts` wiring persists via the existing
    state flow (spar result state never touches the save).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Manual: `bun run verify` green; browser pass — pick a loadout, spar, read
    the announcer log's moved names, reload and confirm the choice returns.

## Phase F — Unlock callout (client)

- [ ] Task: Coach callout at tier thresholds
  - `hud.ts` status callout derivation: at `trainingDays` exactly 3 or 6 the
    day-phase callout adds the present-tense unlock copy ("New move
    available: Cinder Shot. Train 3 more days for the next tier."); other
    callouts (unwell/sluggish/hungry) keep precedence per existing rules;
    add a table-driven test/legal review for the copy thresholds.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase G — Integration & Verification Gate

- [ ] Task: `bun run verify` green (types, typed tests, Biome, determinism)
- [ ] Task: Browser verification with evidence
  - Panel flows: default kit on a fresh game, unlock growth after the 3rd
    assignment day, picker states (unlocked/disabled-locked), choose → spar →
    reload persistence; rival cards chip-less; HUD callout at threshold; save
    purity (no battle artifacts in localStorage, version 4).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - Manual verification report; docs propagation proposal (product.md combat
    bullet, tech-stack.md save v4 note) for the user's approval.
