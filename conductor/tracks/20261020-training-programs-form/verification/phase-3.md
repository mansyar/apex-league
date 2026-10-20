# Phase 3 — Battle Wiring and Balance Evidence

- **Track:** `20261020-training-programs-form` (Raising Depth: Training Programs & Form)
- **Phase:** 3 — Battle Wiring and Balance Evidence (incl. P3.T4, the ATK-only amendment)
- **Date:** 2026-10-20
- **Branch:** `feat/20261020-training-programs-form`
- **Phase base:** `cca42c1468f844692a03217327d9937f4df08a54`
- **Amendment base:** `c43931aeea14c70365e977901d56be0b2178cfa1` (spec FR-9/AC-2/AC-9, plan P3.T4, brief Amendment)
- **Amendment 2 base:** `744314a` (brief Amendment 2; AC-9's per-tier floor lowered to 15%)
- **Result:** Form reaches the arena through exactly one seam; draws, seeds, and
  rival stats are provably form-neutral; every committed cup/spar golden still
  passes unchanged. Two product amendments landed during the phase: the lever
  became ATK-only (SPD is discrete in the initiative order and turned the FR12
  band into a cliff, F1), and AC-9's per-tier floor became 15% (the ATK-only
  ladder's worst gatekeeper cell is 16.7%, F4). Against those criteria the phase
  is **met**: steady form holds the FR12 band on all six gatekeeper cells, the
  ladder is monotonic on all six, and no tier-cell falls under 15%.

## Amendment (2026-10-20) — form is ATK-only

The first run of this phase shipped FR-9's original lever (sharp +1 ATK +1 SPD,
flat −1/−1, sluggish −2/−2) and reported `blocked`: ±1 SPD is discrete in the
initiative order, so it turned the FR12 band into a cliff. Measured then, on the
six gatekeeper cells (won of 36) — kept here so the decision stays auditable:

| boss (disadvantaged species) | sharp | steady | flat | sluggish |
|---|---|---|---|---|
| Sear Marshal Koda (plant_ox) | 33 — 91.7% | 23 — 63.9% | 16 — 44.4% | 0 — 0.0% |
| Verdant Dame Hesse (water_axolotl) | 27 — 75.0% | 21 — 58.3% | 19 — 52.8% | 10 — 27.8% |
| Tide Regent Marlow (fire_drake) | 21 — 58.3% | 20 — 55.6% | 18 — 50.0% | 13 — 36.1% |
| Squall Herald Delmar (fire_drake) | 20 — 55.6% | 17 — 47.2% | 8 — 22.2% | 6 — 16.7% |
| Cinder Abbot Fenn (plant_ox) | 22 — 61.1% | 22 — 61.1% | 13 — 36.1% | 4 — 11.1% |
| Grove Sovereign Thessa (water_axolotl) | 33 — 91.7% | 20 — 55.6% | 16 — 44.4% | 9 — 25.0% |

Product decision: **ATK only**. FR-9 now reads sharp +1 ATK, flat −1 ATK,
sluggish −2 ATK, steady 0, HP and DEF untouched, and SPD never moves; AC-2
requires the no-SPD-change property; AC-9 was rewritten as three clauses (band
at steady, no tier under 15% on a gatekeeper cell, monotonic ladder per boss).
Code change: `FORM_DELTAS`/`FORM_COPY`/`battleStats` lost their SPD term and
`battleStats` now passes `effective.spd` through verbatim (`packages/sim/src/form.ts`),
with `form.test.ts` asserting the invariant at every tier and across all starter
species.

## Amendment 2 (2026-10-20) — AC-9's per-tier floor is 15%

With the lever narrowed to ATK, the re-probe showed the ladder stays smooth but
one ATK point is still a damage threshold at the two lowest-tuned bosses: four
gatekeeper tier-cells sat under the amended AC-9's 25% floor (Delmar flat 22.2%,
Delmar sluggish 16.7%, Fenn sluggish 16.7%, Thessa sluggish 22.2%), and the
then-drafted P3.T4.3 fallback (−1 ATK sluggish) was measured to be worse — it
left Delmar at 22.2% and made sluggish battle-identical to flat. Since the ATK
deltas are pinned by FR-9/AC-2 and bosses are out of this track's scope, the
floor moved instead: `conductor(spec): Lower the form guardrail to a 15 percent
floor` (`744314a`) sets AC-9's per-tier floor at 15% and records why. The probe
now asserts that floor per cell; the worst cell clears it by one battle (Delmar
× fire_drake sluggish, 6 of 36 = 16.7%). No lever, boss or band was retuned.

## Commands

| Command | Exit | Result |
|---|---|---|
| `bun test --timeout 120000 packages/sim/src` | 0 | 915 pass, 1 skip, 0 fail (46 files) |
| `bun run verify` | 0 | typecheck clean (voxel 62, sim 86, client 288 files); 1882 pass, 1 skip, 0 fail (1883 tests, 147 files); Biome 0 errors, 7 pre-existing `noNonNullAssertion` warnings; determinism gate byte-identical (9 GLBs + 5 prop digests) |
| `bun run build` | 0 | 234 modules, `index-CruLJnHM.js` 827.35 kB / 225.84 kB gzip, CSS 56.48 kB / 11.08 kB gzip |

The literal phase command `bun test --timeout 120000 packages/sim/src && bun run verify`
is the first two rows; the sandbox refuses a bare `bun test <path>` ("Permission
denied: shell"), the same limitation Phases 1 and 2 recorded.

Probe regeneration is `APEX_FORM_BALANCE_REPORT=1 bun test packages/sim/src/battle/form.balance.test.ts`.
The sandbox also refuses `$env:`-prefixed commands, so the tables below were
captured by temporarily forcing the report test open and reverting it before
commit; the committed guard is the documented one.

## Acceptance criteria

| AC | Status | Evidence |
|---|---|---|
| AC-1 — a fresh creature's `battleStats` equals `effectiveStats`, tier steady | Met | `form.test.ts` steady deep-equal across all starter species; `battle/form-seam.test.ts` "a fresh owner's spar is unchanged" over seeds 0/3/15/42; `cup/form-seam.test.ts` "a fresh creature's slot is unchanged"; the probe's steady mix reproduces all six recorded FR12 tallies exactly (`23/21/20/17/22/20` of 36) |
| AC-2 — sharp +1 ATK / flat −1 / sluggish −2, SPD unchanged, sick pinned | Met | `form.test.ts` "sharp pays +1 ATK only — never SPD, never HP", per-tier delta table, "SPD, DEF and HP are `effectiveStats` at every tier (FR-9, AC-2)" loop, "floors the ATK penalty at 1 and passes SPD through untouched", sickness pin |
| AC-9 clause 1 — every gatekeeper cell inside the FR12 40–70% band at steady | Met | 63.9 / 58.3 / 55.6 / 47.2 / 61.1 / 55.6 %, and the exact recorded tallies (`the neutral mix holds the 40-70% band (FR12)`, `... reproduces the recorded FR12 tallies (AC-1)`) |
| AC-9 clause 2 — no form tier below 15% on any gatekeeper cell | Met | All 24 tier-cells clear 15%; worst is Delmar×fire_drake sluggish at 16.7% (6 of 36), one battle above the floor. The three other sub-25% cells (Delmar flat 22.2%, Fenn sluggish 16.7%, Thessa sluggish 22.2%) are asserted too (`no gatekeeper cell sits under the 15% floor (AC-9)`) |
| AC-9 clause 3 — monotonic sharp ≥ steady ≥ flat ≥ sluggish per boss | Met | strict on all six gatekeeper cells and on every pooled species ladder (`the tier ladder never reverses on a gatekeeper cell (AC-9)`, `care moves power in the one direction form promises`) |

Reading note: AC-9's "every playable species inside the FR12 band at steady" is
applied to the disadvantaged gatekeeper cell per boss — the matchup FR12 records
and bands. Advantaged matchups are 100% at cap with or without form (18-cell
table below) and were never banded by FR12.

## Wiring (one seam, three call sites)

| Call site | Before | After |
|---|---|---|
| `battle/exhibition.ts` `makeExhibition` | `stats: effectiveStats(owned)` | `stats: battleStats(owned)` — rival untouched (`rival.stats`), documented form-neutral by construction |
| `cup/bracket.ts` `makeBracket` | `playerSlot.stats: eff` | `playerSlot.stats: battleStats(owned)`; `RIVAL_RAMP` and the seven rival slots keep `effectiveStats(owned)` |
| `apps/client/src/cup/arena.ts` `fight()` | `maxHp: effectiveStats(creature).hp` | `maxHp: battleStats(creature).hp` |

`machine.ts` (`prepareCup` seed identity), `bracket.ts` ramp math, `verdicts.ts`,
`session.ts`, rivals, bosses, and the pre-resolved rival subtree are untouched:
form is read in exactly one place per path, and every later read consumes the
frozen snapshot. Nothing under `battle/` reads conditions; form stays pure in
`form.ts`. HP is still never moved, so the doubled-HP tuning is untouched.

## FR-10 / NFR-2 invariants

`packages/sim/src/cup/form-seam.test.ts` ("the draws are form-neutral"):

- `mood`/`bond` never move a bracket draw: for days 7/14/21 × seeds 101/202/1 a
  sharp and a sluggish creature draw identical `slots.slice(1)` and an
  identical `finalRival`.
- Rival slots keep reading effective stats: a sharp bracket's rivals are equal
  to a fresh creature's rivals; only `slots[0]` differs.
- The cup seed identity stays on effective stats: `prepareCup` on sharp vs
  sluggish yields the same `session.seed`, the same rival slots, and different
  player slots.
- A neglected creature's frozen slot fights two ATK down and keeps its SPD, and
  the frozen slot is what the resolver actually fights with.

`packages/sim/src/battle/form-seam.test.ts`: the owner's mood and bond never
reach the rival (`rivalSide`, `rival`, `rivalSpeciesId`, `rivalTactic` equal
across four seeds; `rivalSide.stats === rival.stats`), sharp/sluggish deltas are
`+1 ATK` and `−2 ATK` with a floor of 1 and `spd === effective.spd`, and the
delta reaches `resolveBattle`.

Existing goldens: `cup-contracts.test.ts`, `cup.test.ts` (including the
"draw stream is stable" slot golden) and `battle/exhibition.test.ts` all pass
**unmodified in their recorded numbers** — verified by the full suite above.

## Balance probe (FR16)

`packages/sim/src/battle/form.balance.test.ts` mirrors the boss probe: the same
six creature seeds, six battle seeds, six authored bosses, the
`bosses.balance.test.ts` profile (every stat at `TRAINING_CAP`, birth kit), the
bundled loadout and the balanced tactic, all resolved through `resolveBattle`.
Band constants are mirrored verbatim (floor `0.35`, band `0.40–0.70`, the six
recorded disadvantaged-cap tallies); the only new constant is AC-9's `0.25`
floor. Only the care routine varies, because form is the only thing this track
adds to a battle. 2592 battles per profile.

### Species × program mix (FR12 calibration profile, ATK-only lever)

| species | mix | form | games | won | lost | drew | win rate | decisive | worst boss cell | FR12 floor |
|---|---|---|---|---|---|---|---|---|---|---|
| fire_drake | power | steady | 216 | 181 | 35 | 0 | 83.8% | 83.8% | 47.2% | in band |
| fire_drake | endurance | flat | 216 | 170 | 46 | 0 | 78.7% | 78.7% | 22.2% | BELOW |
| fire_drake | sprint | sluggish | 216 | 161 | 55 | 0 | 74.5% | 74.5% | 16.7% | BELOW |
| fire_drake | ring | sharp | 216 | 185 | 31 | 0 | 85.6% | 85.6% | 55.6% | in band |
| plant_ox | power | steady | 216 | 189 | 27 | 0 | 87.5% | 87.5% | 61.1% | in band |
| plant_ox | endurance | flat | 216 | 177 | 39 | 0 | 81.9% | 81.9% | 38.9% | in band |
| plant_ox | sprint | sluggish | 216 | 164 | 52 | 0 | 75.9% | 75.9% | 16.7% | BELOW |
| plant_ox | ring | sharp | 216 | 201 | 15 | 0 | 93.1% | 93.1% | 66.7% | in band |
| water_axolotl | power | steady | 216 | 185 | 18 | 13 | 85.6% | 91.1% | 55.6% | in band |
| water_axolotl | endurance | flat | 216 | 179 | 29 | 8 | 82.9% | 86.1% | 44.4% | in band |
| water_axolotl | sprint | sluggish | 216 | 162 | 46 | 8 | 75.0% | 77.9% | 22.2% | BELOW |
| water_axolotl | ring | sharp | 216 | 202 | 5 | 9 | 93.5% | 97.6% | 75.0% | in band |

"Worst boss cell" is the slowest gatekeeper-or-not matchup for that species and
mix; a tier is "in band" when that cell clears FR12's `0.35` grind floor.

### Gatekeeper cells by tier (AC-9, won of 36)

| boss | disadvantaged species | sharp | steady | flat | sluggish |
|---|---|---|---|---|---|
| Sear Marshal Koda | plant_ox | 91.7% (33) | 63.9% (23) | 52.8% (19) | 38.9% (14) |
| Verdant Dame Hesse | water_axolotl | 75.0% (27) | 58.3% (21) | 52.8% (19) | 27.8% (10) |
| Tide Regent Marlow | fire_drake | 58.3% (21) | 55.6% (20) | 50.0% (18) | 36.1% (13) |
| Squall Herald Delmar | fire_drake | 55.6% (20) | 47.2% (17) | **22.2% (8)** | **16.7% (6)** |
| Cinder Abbot Fenn | plant_ox | 66.7% (24) | 61.1% (22) | 38.9% (14) | **16.7% (6)** |
| Grove Sovereign Thessa | water_axolotl | 86.1% (31) | 55.6% (20) | 44.4% (16) | **22.2% (8)** |

Bold = under 25%, i.e. the cells the pre-amendment floor would have failed; all
four still clear the shipped 15% floor (16.7% is the worst, one battle above).
The steady column is inside the 40–70% band on
all six and equals the FR12 recorded tallies exactly; the ladder is monotonic
(and in fact strict) on all six.

### P3.T4.3 — the −1 ATK fallback, measured and not shipped

Reducing sluggish to −1 ATK was re-probed as the brief allows:

| boss | steady | flat | sluggish (−1) | sluggish (−2, shipped) |
|---|---|---|---|---|
| Koda (plant_ox) | 63.9% | 52.8% | 52.8% | 38.9% |
| Hesse (water_axolotl) | 58.3% | 52.8% | 52.8% | 27.8% |
| Marlow (fire_drake) | 55.6% | 50.0% | 50.0% | 36.1% |
| Delmar (fire_drake) | 47.2% | 22.2% | 22.2% | 16.7% |
| Fenn (plant_ox) | 61.1% | 38.9% | 38.9% | 16.7% |
| Thessa (water_axolotl) | 55.6% | 44.4% | 44.4% | 22.2% |

−1 ATK does not clear the floor either (Delmar still 22.2%, and flat is 22.2%
there regardless), and it makes sluggish and flat the *same battle* everywhere,
collapsing the ladder into three effective tiers and contradicting FR-9/AC-2's
−2. So the −2 ATK lever shipped: the miss is a property of Delmar's tuning, not
of the magnitude.

### Model gap: real program builds

The FR12 profile above holds `trainingDays` at 0, so `defaultLoadout` slices the
birth two-move kit. A real program-built creature has spent 24 paying nights, so
its four-move default kit is much stronger. Measured for information, not
asserted (the bands do not describe this profile):

| species | steady | flat | sluggish | sharp | worst boss cell |
|---|---|---|---|---|---|
| fire_drake | 90.3% | 89.8% | 85.6% | 93.1% | 61.1% |
| plant_ox | 95.8% | 94.0% | 91.7% | 97.2% | 66.7% |
| water_axolotl | 99.5% | 98.6% | 96.8% | 100.0% | 86.1% |

## Findings

**F1 — RESOLVED by the amendment.** The original ATK+SPD lever turned the FR12
band into a cliff (Koda 63.9% steady → 0.0% sluggish, 91.7% sharp) because ±1
SPD crosses a discrete initiative boundary at this tuning. Dropping SPD (the
amendment table above) restores the band at steady and leaves a smooth ATK
ladder. Nothing retuned; bosses untouched.

**F2 — the day-7 contract fixture had drifted to a starving, sick creature.**
`cupDayCreature()` calls `advanceDay` six times, and the nightly tick never
feeds: the fixture arrives at `hunger 0, health 60, mood 45, bond 0`, which the
Phase 1 form model pins to **sluggish** (health < `SICK_HEALTH`), not the steady
tier the brief assumed. Wiring form therefore moved two player-lifecycle goldens
(seed 17 champion → eliminated, seed 3 SF exit → QF exit). The fixture was
repaired to `CONDITION_START` — matching its own docstring ("a fresh creature")
and every committed number, which then pass unchanged. Neglect coverage moved
to `cup/form-seam.test.ts` (`neglected()` builds exactly that starved/sick
creature) and to the probe's sluggish column, so nothing was dropped.

**F3 — the FR12 profile is not reachable by a real program build** (see the
model-gap table): cap-level stats require 24 trained days, which also unlocks the
four-move kit, and that kit clears every boss far above 70%. Pre-existing boss
calibration issue, out of this track's scope; reported so the primary can decide
whether a boss-probe follow-up is warranted.

**F4 — RESOLVED by the 15% floor (Amendment 2).** At the ATK-only lever four
gatekeeper tier-cells sat under the then-amended 25% floor: Delmar flat 22.2%,
Delmar sluggish 16.7%, Fenn sluggish 16.7%, Thessa sluggish 22.2%. Cause: at
this tuning one ATK point is a damage threshold rather than a slope, and the
three affected bosses sit lowest in the FR12 band already (Delmar 47.2%). The
levers available inside this phase cannot fix it — the ATK deltas are pinned by
FR-9/AC-2, bosses are out of scope, and `battleStats` may not touch HP/DEF/SPD —
and −1 ATK was measured (P3.T4.3) and fails its own purpose. The spec then set
the per-tier floor at 15% (`744314a`), which all 24 tier-cells clear; the probe
asserts the floor per cell *and* the identity of the worst cell
(`no gatekeeper cell sits under the 15% floor (AC-9)`), so the one-battle margin
(Delmar × fire_drake sluggish, 6 of 36 = 16.7%) cannot silently erode. Nothing
was retuned to make a test pass.

## Deviations

| File | Reason |
|---|---|
| `packages/sim/src/cup-contracts.test.ts` | In Touches, but used to repair `cupDayCreature` back to `CONDITION_START` (F2). No golden number changed: every expectation still passes as committed. |
| `apps/client/src/cup/arena.ts` | Explicitly in Touches (T1.3): owned `maxHp` now reads `battleStats`. No display surface outside the arena was touched. |
| `packages/sim/src/form.ts`, `packages/sim/src/form.test.ts` | Added to Touches by the amendment (P3.T4.1): SPD removed from `FORM_DELTAS`/`FORM_COPY`/`battleStats`, tests assert SPD is `effectiveStats` at every tier. |

## Notes

- Phase 3 commits: `048800e` (fixture repair), `767333a` (seam + seam tests),
  `66e8186` (probe), `f783479` (first evidence), `bf02872` (ATK-only lever),
  `7f258b7` (probe on the ATK-only lever), `e34bb22` (amendment evidence),
  `b911b22` (15% floor assertion), then this evidence update. Task-level,
  conventional, no amend, no rebase.
- Module sizes stay well under 12,288 B for every non-test module; the new test
  files are exempt by `apps/client/src/module-size.test.ts`'s own rule.
- No client display surface changed in this phase (`spar/setup.ts`,
  `cup/coach-room.ts`, `hud/*` are untouched) — spar casting already reads
  `setup.ownedSide.stats`, so it inherits the seam for free.
- `bun run verify` and `bun run build` were run after the final edit; the tree
  reported by the phase subagent is the tree that was verified.

## Primary verification

Re-ran the phase independently after the subagent report (branch head 47e7cb6, tree clean):

| Command | Result |
|---|---|
| `bun run verify` | exit 0 — check clean (62/86/288 files), 1882 pass / 1 skip / 0 fail across 147 files, Biome 0 errors and the 7 pre-existing `noNonNullAssertion` warnings, determinism gate byte-identical for nine GLBs and the five prop digests |
| `bun run build` | exit 0 — 234 modules, 827.35 kB JS / 225.84 kB gzip, only the standard chunk-size advisory |

Diff scope `cca42c1..HEAD` is the phase Touches (`form.ts`, `form.test.ts`,
`battle/`, `cup/bracket.ts`, `cup-contracts.test.ts`, `apps/client/src/cup/arena.ts`)
plus track docs; no file outside scope changed, `cup/session.ts` needed no edit.

AC-9 is met against the amended 15% floor: steady holds the FR12 band on all six
gatekeeper cells and reproduces the recorded tallies exactly, all 24 tier-cells
clear 15% (worst 16.7%), and the ladder is strict per boss. The two decisions
recorded in the plan (ATK-only, 15% floor) came from the probe's measured
cliffs, not from re-baselining: no golden was touched and no boss stat changed.

Squash: nine phase commits were folded into `47e7cb6` with the track docs in
`a0c13ee`; the resulting tree is byte-identical to the pre-squash head
(`git diff --stat b64d577 HEAD` empty).
