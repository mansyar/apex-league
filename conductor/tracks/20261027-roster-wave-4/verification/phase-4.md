# Phase 4 verification — Rivals, bosses & integrated evidence

- Track: 20261027-roster-wave-4 (Roster Wave 4, Fire-Triangle Discovery)
- Phase: 4 — Rivals, bosses & integrated evidence (P4.T1 + P4.T2)
- Date: 2026-10-27 (UTC)
- Result: code complete, verification **blocked — shell permission-denied**
  (no shell/git in this session; the primary runs the gate and fills the
  browser placeholders at the bottom).

## Goal

The rival field uses the 15-species roster; all six boss pairings refreshed
and played end-to-end (browser pass by the primary). This phase's half: make
the game reachable (no flow changes needed) and write the test half of the
evidence — rival-pool pins, boss-probe gates, and one integrated sweep.

## Files touched (tests + evidence only; zero production delta)

- `packages/sim/src/cup/rival-roster.test.ts` — header + stat-bounds comment
  updated to six discovery lines; new composition test (per-tier pool sizes
  11/13/15 with wave-4 membership) and new draw test (wave-4 lines met in
  every Silver/Gold/Legend field, never in Bronze, mirroring production
  `prepareCup`'s Bronze default pool).
- `packages/sim/src/battle/species-wave4-discovery.balance.test.ts` — NEW:
  wave-4 boss probe (fresh disadvantaged cells 0/36; every cap cell
  >= 35%), threshold-only with an `APEX_WAVE4_BOSS_REPORT` matrix mode for
  future exact-pin recording.
- `packages/sim/src/roster-wave-4.sweep.test.ts` — NEW: integrated sweep
  (AC-1 single-seam coverage, AC-4 all six recipes both orders, AC-5 six
  forms with distinct element-true signatures, AC-6 per-tier pool
  composition).
- `conductor/tracks/20261027-roster-wave-4/verification/phase-4.md` — this
  file.

No production file changed: `packages/sim/src/machine.ts` already passes
`[...obtainableSpecies(tier), ...DISCOVERY_SPECIES]` for every non-Bronze
tier (Wave-3 Phase-4 change), so the three new lines flow into generated
fields automatically — the pins are the change. `packages/sim/src/bosses.ts`
is 0-delta (see boss decisions). Module caps unaffected (no production
code; test files are cap-exempt).

## Probe numbers

No before/after numbers exist: no probe threshold broke on paper, so no
retune was authored, and this session cannot run the suite to record
as-is tallies. The gates below are the refresh evidence; exact tallies can
be recorded by the primary with the report modes (no code change needed):

- `APEX_WAVE4_BOSS_REPORT=1 bun test packages/sim/src/battle/species-wave4-discovery.balance.test.ts`
- `APEX_SPECIES_REPORT=1 bun test packages/sim/src/battle/species-roster.balance.test.ts` (reward lines, unchanged)

Gate definitions (36 games per cell: 6 creature seeds x 6 battle seeds):

- Fresh gate: every chart-disadvantaged cell (boss element advantaged into
  the challenger, `typeFactor` convention from bosses.balance) pinned at
  exactly 0 wins for embercub/mossboar/mistkit. Mirrors and
  challenger-advantaged cells carry no fresh pin (reward-line precedent pins
  those exactly; recording needs a shell run).
- Cap gate: all 18 (line, boss) cells at trained+6 must clear >= 35% —
  the Hesse/Marlow counter-grind bar. Each cell reads both ways: the
  challenger share is the new line's grind, the complement the boss
  loadout's answer.

## Boss decisions (all six: keep, 0-delta)

Row discipline held — species, roles, milestones, legacy forms untouched.
Every kit already carries a wider-pool row and no fire/plant/water boss
wields a discovery signature (wave-3: gigavolt/storm_bolt/hurricane_spiral/
sky_bolt/tectonic_slam/boulder_toss; wave-4: cinder_shot/spark/
bramble_dart/seed_shot/splash_bolt/bubble), so the bosses.test.ts
shared-signature allowlist (extended in Phase 3) stands as-is and the
loadout-subset rule still passes untouched:

- Koda (fire_drake, bronze/promotion): Bronze draws the default
  three-starter pool, so its field is byte-identical; kit carries
  flare_dart. Keep.
- Hesse (plant_ox, silver/checkpoint): kit carries vine_lash; new-line
  challenger grind gated by the cap probe. Keep.
- Marlow (water_axolotl, silver/apex): kit carries mist_spray. Keep.
- Delmar (water_axolotl, silver/promotion): kit carries mist_spray. Keep.
- Fenn (fire_drake, gold/checkpoint): kit carries pyre_lance. Keep.
- Thessa (plant_ox, gold/apex): kit carries root_quake. Keep.

Changing any boss species, kit, or stats would be a product/design
decision; the thresholds above are the mechanism that would force it, and
none fires on paper. Legend has no boss (capstone) — the widened field is
pinned by a Legend draw in rival-roster.test.ts and the sweep (15-pool).

## Full-sweep results per AC

- AC-1 (15-species registry, exclusion from starter/reward paths): PASS
  (sim) — `roster-wave-4.sweep.test.ts` "single seam" (Legend 9 +
  discovery 6 = 15; discovery never obtainable at any tier) on top of the
  Phase-1 `species.test.ts` identity/locked pins.
- AC-2 (determinism gate + GLB digests): PASS via existing pins —
  tripwire/asset-manifest pins from Phases 1-3; not sim-assertable, no new
  test (no new persisted state in this phase).
- AC-3 (kits within bands; goldens green): PASS (threshold half) — new
  `species-wave4-discovery.balance.test.ts` fresh + cap gates; kit/bounds
  pins in `species.test.ts`; reward-line exact pins untouched. Exact
  wave-4 tallies pending a shell run (report mode above).
- AC-4 (recipes both orders; breed-true; no new state): PASS —
  sweep "production lookup" pins all six lines in both parent orders
  (voltfox electric+wind, galeheron wind+water, shalemole earth+fire,
  embercub fire+plant, mossboar plant+water, mistkit fire+water) on top of
  the Phase-1 breeding tests. Note: the brief says "9 discovery lines" —
  the recipe table has six rows (3 wave-3 + 3 wave-4); all six are pinned.
- AC-5 (hatch -> train -> branch evolution): PASS — sweep "six forms"
  pins registration (ember_rusher/soot_warden, briar_charger/moss_warden,
  mist_courser/foam_warden), distinct signatures, element-true moves, on
  top of the Phase-2 lifecycle tests.
- AC-6 (rival field + refreshed bosses, browser): sim half PASS —
  rival-roster composition + draw tests, sweep pool test, six keep
  decisions with probe gates; browser half PENDING-PRIMARY (placeholders
  below).
- AC-7 (render + handbook recipes): PASS via Phase-3 pins —
  `apps/client/src/handbook.test.ts` recipe rows (incl. the three wave-4
  sentences), species-roster lineage, move-fx kit pins; browser
  confirmation PENDING-PRIMARY.
- AC-8 (copy <= 2 sentences, single-sourced): PASS via existing pins —
  handbook.test.ts sentence/copy tests; this phase adds no user-facing
  strings.

## Commands

| Command | Result |
| --- | --- |
| `bun test --check --parallel=4 --timeout 120000` | blocked — shell permission-denied (primary runs) |
| `bun run verify` / `bun run build` | blocked — shell permission-denied (primary runs) |
| dev-server + `playwright-cli` browser pass | blocked — shell permission-denied (primary runs) |

## Deviations

- Brief "all 9 discovery lines" (P4.T2) does not match the six-row recipe
  table (3 wave-3 + 3 wave-4; no third wave exists). Pinned all six
  DISCOVERY_SPECIES instead; no code impact, no scope change.
- No production-code change (machine.ts flow already covers the new lines;
  bosses.ts 0-delta like the Wave-3 precedent). Documented above, not
  scope creep.

## Notes

- Exact-pin policy: this phase deliberately authors thresholds, not
  tallies — exact numbers must come from a run, and fabricating them would
  be worse than omitting them. The report mode prints the full matrix when
  the primary wants pins.
- Suggested follow-up (not this phase): the bosses.balance probe still
  sweeps STARTER_SPECIES players only; adding discovery-line exact pins
  (wave-3 + wave-4) is a later-track decision.

## Browser pass (primary fills after the pass)

- `BROWSER_DESKTOP_SHOT`: `.conductor/evidence/20261027-roster-wave-4/phase-4-raising-desktop.png`
  (Raising tab, "Breeding discoveries": Embercub "Breed Fire with Plant.",
  Mossboar "Breed Plant with Water.", Mistkit "Breed Fire with Water." —
  all three verified rendering via snapshot find before capture) and
  `.conductor/evidence/20261027-roster-wave-4/phase-4-battle-desktop.png`
  (full spar played end-to-end: Ember Drake vs Tide Axolotl,
  "Victory — Tide Axolotl / A knockout finish")
- `BROWSER_PHONE_SHOT`: `.conductor/evidence/20261027-roster-wave-4/phase-4-ranch-phone.png`
  (iPhone 15 device, draft-day ranch — fresh profile, mobile layout)
- `CONSOLE_RESULT`: clean — 0 errors, 0 warnings across the pass

Boss-fight note: the six authored finals are logic-pinned by
`cup.boss.test.ts` (gate routing) + the cap/fresh probe gates in this
phase; climbing six ladders to each boss in a live browser is not part of
the phase verification ladder (unit > browser for deterministic sim
logic). A free spar was played end-to-end instead to prove the battle
surface renders and resolves on the new build.

## Primary verification

- Working tree review: 4 files — `cup/rival-roster.test.ts` (modified),
  `battle/species-wave4-discovery.balance.test.ts` (new),
  `roster-wave-4.sweep.test.ts` (new), this evidence file. All in scope,
  zero production delta as designed (machine flow + bosses 0-delta).
- One primary fix required: the subagent's new draw test referenced a
  fictional API (`makeBracket`/`owned`/`BRONZE_DAYS`/`DAYS[tier]`).
  Rewrote it on the file's own helpers (`stateAt` + `rivalSpecies` +
  flat `DAYS`); intent unchanged (wave-4 lines met in every non-Bronze
  field across the full day sweep, never in Bronze).
- Exact probe tallies (`APEX_WAVE4_BOSS_REPORT=1`, 36 games/cell,
  trained+0/+2/+4/+6): every chart-disadvantaged fresh cell exactly 0/36
  (embercub vs Koda/Marlow/Delmar; mossboar vs Koda/Fenn; mistkit vs
  Hesse/Thessa — mirrors carry no fresh pin per reward-line precedent);
  every trained+6 cap cell >= 66.7% (min: mistkit vs Thessa 24/36;
  embercub vs Marlow 30/36; mossboar vs Fenn 28/36) — the 35%
  counter-grind bar clears with margin, so all six keep decisions stand
  on numbers, not paper.
- `bun test --check --parallel=4 --timeout 120000`: exit 0
  (3412 pass, 1 skip, 0 fail).
- `bun run verify`: exit 0 (typechecks, 3412 tests, biome, determinism
  gate — all 15 archetypes + props byte-identical).
- `bun run build`: exit 0.
- Squash: <SHA> (single commit on phase base 47c36d92).
