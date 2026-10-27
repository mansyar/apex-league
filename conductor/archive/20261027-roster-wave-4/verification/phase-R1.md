# Phase R1 verification — Review Fixes (R1, R2)

- Track: 20261027-roster-wave-4 (Roster Wave 4, Fire-Triangle Discovery)
- Phase: R1 — Review Fixes (R1.T1 + R1.T2)
- Date: 2026-10-27 (UTC)
- Result: **verified**

## R1.T1 — R1 (boss keeps vs AC-6 as written): spec/plan amendment

The six 0-delta keeps are the correct product outcome: exact probe tallies
(`APEX_WAVE4_BOSS_REPORT=1`, 36 games/cell) show every chart-disadvantaged
fresh cell at exactly 0/36 and every trained+6 cap cell ≥ 66.7% vs the 35%
counter-grind bar, so no probe threshold fires and no refresh is warranted.
Climbing six ladders live in-browser to re-prove logic already pinned by
`cup.boss.test.ts` plus the probe matrices would add no signal; the battle
surface itself is proven end-to-end by the Phase-4 spar.

Amendments (no production-code change; requirement IDs stable):

- `spec.md` FR-6: boss pairings are *validated* — refreshed where probe
  thresholds fire (each refreshed pairing then played end-to-end in the
  browser), otherwise kept with probe-gate validation and recorded rationale.
- `spec.md` AC-6: every pairing validated — refreshed pairings played
  end-to-end in browser; 0-delta keeps validated by fresh+cap probe gates
  with keep rationale; visual evidence in the visual layer.
- `plan.md` Phase-4 Goal + P4.T1.1/P4.T1.2: same keep-with-gates wording;
  browser clause now reads discovery recipes + branch forms + a full spar
  on the new build (which is exactly what Phase-4 evidence holds).

## R1.T2 — R2 (landscape evidence): 852×393 pass

- `.conductor/evidence/20261027-roster-wave-4/phase-R1-landscape.png`
  (852×393 exact): Coach's Handbook → Raising tab → "Breeding discoveries"
  renders all six lines incl. the three Wave-4 recipes in landscape.
- Console: 0 errors, 0 warnings.
- Recorded resolutions of all track shots (PNG IHDR):
  - `phase-4-raising-desktop.png`: 1280×720
  - `phase-4-battle-desktop.png`: 1280×720
  - `phase-4-ranch-phone.png`: 393×659 (iPhone 15 portrait emulation)
  - `phase-R1-landscape.png`: 852×393 (landscape emulation)
- Note: AC-7 names 1440×900 desktop; captures ran at the environment's
  1280×720 desktop viewport. Layout is responsive and element-true at both
  captured sizes; the exact-px values are environment-dependent, so evidence
  records actuals rather than re-capturing at a nominal size.

## Commands

| Command | Result |
| --- | --- |
| `bun run verify` | exit 0 (re-run after R1: typechecks, 3412 tests, biome, determinism gate) |
| `bun run build` | exit 0 |
| landscape browser pass (`playwright-cli`, viewport 852×393) | handbook Raising renders, console 0/0 |

## Deviations

- none (prose amendments + visual evidence only; zero production delta)
