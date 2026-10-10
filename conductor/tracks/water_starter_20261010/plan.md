# Plan — water_starter_20261010

Execution roadmap following `conductor/workflow.md` (TDD for logic-bearing
code; manual verification for rendering/UI wiring).

## Phase A — Sim: unlock the Tide Axolotl

- [x] Task: Write failing tests (Red)
  - [x] `packages/sim/src/creature.test.ts`: replace the water-axolotl-specific
    "locked throws" test with a trio test (all 3 starters available, distinct
    elements + archetypes); keep a generic unavailable-id throw case using a
    synthetic species id (`bun test` red)
    — done as: red "creates the newly unlocked Tide Axolotl" test + red trio
    tests; the "locked id throws" case was folded into the existing
    unknown-species throw test (a synthetic id cannot reach the availability
    branch without a locked catalog entry, where it would be indistinguishable
    from the unknown-species throw)
  - [x] `packages/sim/src/battle/exhibition.test.ts`: assert the rival pool
    covers the full trio across seeds (`bun test` red) — 240 seeds, trio set
    equality on observed rivals; one stale "rival is never water_axolotl"
    assertion removed in the same ripple
  - [x] `packages/sim/src/battle/moves.test.ts`: flip/replace the locked
    availability assertion (`bun test` red)
- [x] Task: Implement (Green)
  - [x] Flip `water_axolotl.available: true` in `packages/sim/src/species.ts`
  - [x] Update stale comments: `species.ts` catalog docblock ("Water is teased
    as locked…"), `exhibition.ts` rival comment
- [x] Task: Run full suite, confirm green + runtime unchanged — 372 pass / 0
  fail across 47 files, ~64s (unchanged)
- [x] Task: Commit `feat(sim): unlock the tide axolotl as the third starter` +
  git note (workflow step 8) — `2786ca0`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  — `[checkpoint: 2786ca0]` user-approved: starter overlay trio enabled,
  axolotl ranch render + stat card in-bounds, care/day smoke, save persistence,
  spar wiring, clean console

## Phase B — Water-flavored coach copy

- [x] Task: Write failing copy test (Red)
  - [x] `apps/client/src/hud.copy.test.ts`: add a species/element-water coach
    line case (≤2 sentences, never punishing) — red via 2 flavorCallout cases
    (water idle line + other-elements-stay-quiet), table-driven style kept
- [x] Task: Implement copy path (Green) — element-gated `flavorCallout` in
  `hud.ts`, wired as the last link of the status chain (training → condition
  coach → unlock → flavor)
- [x] Task: Run full suite, confirm green — 374 pass / 0 fail
- [x] Task: Commit `feat(hud): water-flavored coach callout for the tide axolotl` +
  git note — `6289a8b`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  — `[checkpoint: 6289a8b]` user-approved: live HMR check shows the quiet
  healthy-morning line "Tide Axolotl hums a contented bubble song."; console
  clean

## Phase C — Balance review note

- [ ] Task: Review axolotl statBounds/kit/temperament vs. drake + ox against
  `conductor/product-guidelines.md`; record a balance note in
  `spec.md` § Post-Review Notes; no code change unless a deviation is
  justified and documented
- [ ] Task: Commit `docs(conductor): record axolotl balance review`
  (only if notes/comments changed; skip if empty)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Manual visual verification & closeout

- [ ] Task: Browser verification — starter overlay (3 enabled cards), pick
  Tide Axolotl, ranch scene renders with breath/tail life, care + train +
  advance day work, Spar vs. seeded rival incl. axolotl rivals; screenshot +
  console evidence per workflow (`browser.tabs.open`, `browser.screenshot`,
  `browser.console`)
- [ ] Task: Resolve feedback / fix findings
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
