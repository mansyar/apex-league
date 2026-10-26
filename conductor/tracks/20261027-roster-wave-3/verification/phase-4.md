# Phase 4 verification — Rivals, bosses & integrated evidence

- Track: 20261027-roster-wave-3 (Roster Wave 3, Breeding Discovery)
- Phase: 4 — Rivals, bosses & integrated evidence (P4.T1.1)
- Date: 2026-10-27 (UTC)
- Branch: feat/20261027-roster-wave-3
- Base: 6dff0f452707503cc7e16b5264856f885cc970e8
- Head: 92cd061c (phase-4 commit; base HEAD at work time was 6dff0f45)
- Result: PASS

## Task

P4.T1.1 — New species in generated fields; six boss pairings refreshed within
row discipline (Wave-2 precedent: generated-field widening first, authored
pairings second, full-sweep re-check third, visual evidence last).

## Commands

- `bun test --check --parallel=4 --timeout 120000` → 3146 pass, 1 skip,
  0 fail, 346055 expect() calls, 291 files, 91.80s. (The
  `scripts/smoke/smoke.test.ts` "RESULT fail" line in the output is that
  suite's own expected-case log for a `file:///` URL probe, not a test
  failure — the run reports 0 fail.)

## Acceptance criteria

- FR-6 (rival field uses the 12-species roster): `prepareCup` in
  `packages/sim/src/machine.ts` now passes
  `[...obtainableSpecies(tier), ...DISCOVERY_SPECIES]` for every non-Bronze
  tier. Bronze keeps the default three-starter pool, so pre-Silver brackets
  are byte-identical (pinned by the rival-roster byte-identity test).
- FR-6 (six refreshed boss pairings): all six authored pairings re-checked
  against the widened field within row discipline — every boss kit already
  carries ≥1 wider-pool row (koda flare_dart, hesse vine_lash, marlow
  mist_spray, delmar mist_spray, fenn pyre_lance, thessa root_quake), and no
  fire/plant/water boss wields a discovery signature
  (gigavolt/storm_bolt/hurricane_spiral/sky_bolt/tectonic_slam/boulder_toss),
  so the bosses.test.ts exemption table is untouched and `bosses.ts` is
  0-delta, exactly the Wave-2 precedent. Changing boss species/identity
  would be a product/design decision, so kits and species stand.
- NFR-5 (determinism gate): no RNG draw added, removed, or reordered —
  pool widening only changes *which* species ids the existing species-draw
  can land on. All draw-stream goldens (cup.test.ts, cup-contracts.test.ts)
  use the default starter pool and pass unchanged.
- AC-6 (browser evidence): the gatekeeper-reach suite drives the production
  `prepareCup → rival subtree → resolvePlayerMatch` path end to end for all
  six bosses against the widened 12-species fields (in-browser play is the
  primary's visual layer; shell here is restricted to git + verification
  commands, so no dev-server/browser run was possible from this phase).

## Evidence

- `packages/sim/src/machine.ts` — pool widened + comment (only production
  change; module stays far under the 12KB sim cap).
- `packages/sim/src/cup/rival-roster.test.ts` — tier-pool test now pins the
  reward + discovery union per tier; bounds lookup via `getSpecies` covers
  discovery stat bounds generically; bronze tests unchanged.
- `packages/sim/src/cup/gatekeeper-reach.test.ts` — legal-set, twelve-field,
  and contains/leak tests cover the 3 discovery lines in every non-Bronze
  stage field; climb/reach/probe tests re-run green against widened fields.
- Full-sweep re-check: entire `bun test` suite green (see Commands) —
  bosses.balance probes, cup goldens, lifecycle-integration, and balance
  suites all pass at 0-delta on authored content.

## Deviations

None. All changes are inside `packages/sim/src/**` plus this evidence file.
`bosses.ts` intentionally 0-delta (documented above, not scope creep).

## Notes for the primary

- P4.T1.1 (sim) is complete and verified. The plan's P4.T1.2 browser play
  (six bosses, visual evidence) remains the visual layer at acceptance —
  it needs the dev server + playwright, which this phase cannot run.
- Suggested follow-up (not this phase): the bosses.balance probe sweeps
  STARTER_SPECIES players only, so discovery-species players are unprobed;
  adding them would need new recorded pins - a design decision for a later
  track.

## Primary verification (2026-10-27)

- Result: **verified**. `bun run check` → exit 0. `bun test --check
  --parallel=4 --timeout 120000` → exit 0: 3146 pass, 1 skip, 0 fail
  (3147 tests / 291 files). `bun run build` → exit 0.
- Squash: single task commit (`92cd061c`) matching the report, no foreign
  commits — kept as-is; evidence commit (`1cf78b67`) preserved whole.
  Checkpoint: `92cd061c`.
- Touches review: `machine.ts` + two co-located cup tests, all inside
  `packages/sim/src/**`. No deviation. `bosses.ts` 0-delta accepted — the
  six kits already carry wider-pool rows and no boss wields a discovery
  signature (exemption table untouched, suite green).
- Visual layer (primary-run, per Verification Strategy): dev server
  `bun run dev` + `playwright-cli`. Drove draft → Handbook Raising (all
  three open recipe rows verbatim) → starter pick → spar setup → live
  battle ("Flare Dart hits Ember Drake for 10", HP bars moved, both voxel
  models rendered). Desktop shots: handbook + battle; phone (iPhone 15)
  shot: handbook recipes; console 0 errors / 0 warnings on both widths.
  - `.conductor/evidence/20261027-roster-wave-3/phase-4-handbook-desktop.png`
  - `.conductor/evidence/20261027-roster-wave-3/phase-4-battle-desktop.png`
  - `.conductor/evidence/20261027-roster-wave-3/phase-4-handbook-phone.png`

## Integrated verification (2026-10-27)

- `bun run verify` (the exact CI gate: check + full suite + bare
  `biome check` + determinism gate) → exit 0 on the final tree.
- Fallout fixed after phase acceptance, all inside the track except one
  recorded deviation:
  - `036fdde3` — biome import-order/format autofixes on 14 track files
    (phases 1–3 fallout the phase-scoped `bun test --check` does not run).
  - `bec13d67` — out-of-Touches deviation: PR #54 left
    `apps/client/src/ranch.css` with a descending-specificity pair that the
    unpinned `biome check` flags, reddening `verify` on main independent of
    this track. Fixed by reordering only (base `.hud-callout` before the
    gift-chip override); both rules set `top` and the override wins on
    specificity in either order, so computed styles are identical.
- Full-sweep re-check after the fallout: suite 3146 pass / 0 fail,
  determinism OK across all 36 pairs, build exit 0.
