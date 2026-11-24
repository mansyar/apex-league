# Integrated Verification: Telemetry Fixture Re-stratification

- **Track:** `20261124-telemetry-fixture-restratification` (chore, medium)
- **Branch:** `chore/20261124-telemetry-fixture-restratification`
- **Base:** `main` @ `d29042de1c9019189373beb763baa1805dd78541`
- **Date:** 2026-11-24
- **Result:** verified

## 1. Goal and disposition

D-4 was previously diagnosed and bounded without changing the telemetry fixture
(track `20261120-telemetry-fixture-debt`). This track re-stratifies the gated
sample to the matrix population — `midpoint` stats and `press` doctrine — while
preserving the historical `reference` + `split` sample as an ungated `--smoke`
diagnostic. The 42 stride-11 pairings and one seed each are unchanged. D-1
remains accepted standing debt with the ≤1/3 fence on the 1680-fight matrix;
no new product direction was introduced.

## 2. Baseline (Phase 1)

The before-column was reproduced on the unchanged tree: cap `11/42 (26.2%)`;
engagement `345 / 1102 / 3992` mm; exchange `0.3117 / 0.3193` per s; idle
`0.28795`; contact `0.05853`; retreats `20749 / 19631`; dead zone `24` misses
(`0.02617`); distinct positions min `31`; duration `9080 .. 45000` ms; all 14
bounds `ok`. `bun run balance` reproduced `370/1680 (22.0%)` with 21 species and
all gates green. `bun run fixture-audit` reproduced the four-cell arithmetic
`1680 / 580 / 370` and `+12.5 points`. Raw evidence:
`.conductor/evidence/20261124-telemetry-fixture-restratification/baseline/**`;
report: `verification/phase-1.md`.

## 3. Frozen bound table (42 pairings, one seed each)

| Metric / kind | Before bound | Before reading | After reading | After bound |
| --- | --- | --- | --- | --- |
| `engagementMin` ≤ | 900 | 345 | 340 | 900 (unchanged) |
| `engagementMedian` ≤ | 1500 | 1102 | 946 | 1500 (unchanged) |
| `engagementMax` ≤ | 4500 | 3992 | 6061 | **8000** |
| `exchangeHome` ≤ | 2.5 | 0.3117/s | 0.3488/s | 2.5 (unchanged) |
| `exchangeAway` ≤ | 2.5 | 0.3193/s | 0.3440/s | 2.5 (unchanged) |
| `idleShare` ≤ | 0.5 | 0.2880 | 0.3030 | 0.5 (unchanged) |
| `distinctPositions` ≥ | 20 | 31 | 19 | **16** |
| `contactShare` ≤ | 0.7 | 0.0585 | 0.1035 | 0.7 (unchanged) |
| `retreatHome` ≥ | 42 | 20749 | 14872 | 42 (unchanged) |
| `retreatAway` ≥ | 42 | 19631 | 15001 | 42 (unchanged) |
| `deadZoneShare` ≤ | 0.5 | 0.0262 | 0.0513 | 0.5 (unchanged) |
| `capShare` ≤ | 0.6 | 11/42 (26.2%) | 5/42 (11.9%) | 0.6 (D-1, unchanged) |
| `durationMin` ≥ | 8000 | 9080 | 12500 | 8000 (unchanged) |
| `durationMax` ≤ | 45000 | 45000 | 45000 | 45000 (unchanged) |

Exactly two values move. The other twelve are byte-identical, including the
D-1 cap-share fence. Both changed `why` strings cite before and after.

## 4. Representative gate, smoke diagnostic, and audit truth

- `measure()` pools `measureFight(matchup, { statBasis: "midpoint", doctrine: "press" })`.
- `measureSmoke()` pools the historical `{ statBasis: "reference", doctrine: "split" }`
  sample; `bun packages/sim/scripts/battle-telemetry.ts --smoke` prints an
  explicit `SMOKE` header, reports the historical readings, and returns 0
  without gate enforcement. No `package.json` script was added.
- `fixture-audit` names cell A as the historical smoke sample and cell D as the
  representative gate. Four cells: A `11/42 (26.2%)`, B `8/42 (19.0%)`, C
  `7/42 (16.7%)`, D `5/42 (11.9%)`; attribution `+14.3 / +7.1 / +7.1 / +2.4`;
  same-doctrine matrix check `580/1680 (34.5%) → 370/1680 (22.0%) = +12.5 points`.
- Failing-first proof: pre-change focused run `14 pass / 4 fail`; post-change
  focused run `24 pass / 0 fail`. Raw: `phase-2/failing-first.txt`,
  `phase-2/focused-tests-final.txt`.

## 5. Owner revision: the one documented artifact fight

`midpoint + press` produces exactly one zero-commit fight in 42:
`gale_moth v emberwing`, seed `20261146`, 45.00 s cap, 0–0 commits, 100% idle,
no contact. The other three cells have 0/42. `threatBandFor` lifts the press
safe floor to `opponentReachMm + REACH_STANDOFF_MM (80)` ≈ 826 mm; with
`DECISION_MS = 240` and midpoint speed 14, cadence samples alternate between
retreat below ≈ 826 mm and advance above ≈ 1270–1372 mm, so the in-band press
branch is never reached. This is cadence resonance at one pairing, not a
resolver, controller, species, or bound regression; the pooled metrics stay
green because one idle fight is ~2.4% of a 42-fight mean.

Owner decision 2026-11-24 (recorded in `spec.md` AC-11): keep the representative
fixture and both frozen bounds; narrow the pre-existing per-fight assertions to
exactly this named fight; record cadence resonance as a separate follow-up. No
bound, game gate, controller or resolver was changed to force green. Raw
instrumentation: `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/root-cause.txt`.

## 6. Command table (Phase 3 integrated run)

Every command below was run separately from the primary shell with a real exit
code. Four commands were denied inside the Phase 3 subagent (its verbatim
envelopes are in `phase-3.md` §5); the primary ran them unchanged and recorded
the outputs here — the same fallback pattern used in earlier phases.

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun run verify` | 0 | 4462 pass / 1 skip / 0 fail, 670507 expect(), 4463 tests / 437 files; 4 typechecks clean; Biome 1037 files clean; voxel determinism gate OK; battle hash `0xff6f3d62`; all five invariants ok. |
| 2 | `bun run build` | 0 | 438 modules transformed in 484 ms; standard chunk-size advisory only. |
| 3 | `bun run balance` | 0 | 1680 fights, cap `370/1680 (22.0%)`; all 21 species and all pacing/gate/boss assertions ok. |
| 4 | `bun run gate:determinism` | 0 | All creature GLBs across 21 species × 3 stages and the 5 prop digests regenerated byte-identical. |
| 5 | `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 expect(), 135 files, 200.76 s; no gatekeeper-reach timeout. |
| 6 | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061` mm; idle `30.3%`; positions min `19`; duration `12.50 .. 45.00` s; 14/14 bounds `ok`. |
| 7 | `bun run fixture-audit` | 0 | Four cells A/B/C/D as in §4; matrix arithmetic `1680 / 580 / 370` and `+12.5 points`; diagnostic only. |
| 8 | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | 0 | `SMOKE` header, historical `11/42 (26.2%)` readings, ungated; no package manifest change. |

Raw captures:
`.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/**`
and `.../final/**` (gitignored scratch).

## 7. Scope and bounds proof

`git diff --check d29042de..HEAD` exits 0. The changed tracked files at review
range are: `conductor/tracks.md`; this track's `index.md`, `metadata.json`,
`plan.md`, `spec.md`, `verification/phase-1.md`, `verification/phase-2.md`,
`verification/integrated.md`, `verification/phase-3.md`; the dated notes in
`conductor/product.md` and `conductor/tech-stack.md`; the four approved source
and test files in `packages/sim`; and one reported, user-directed side change
to `conductor/workflow.md` switching PR merge policy from squash to merge
commit (explicit user decision 2026-11-24; no code, product behavior or Conductor
track state affected).

No `SIM_VERSION`, ghost pin, controller, species, `FIGHT_CAP_MS`, matrix seed,
pacing fence, schema, protocol, API, CORS, deploy, dependency, manifest, client
or server file changed. No module-cap allowlist was added; caps stay 12,288 B
for sim/client and 24,576 B for voxel. No credential, token or player data was
written. `git branch --list` shows only this chore branch and `main`;
`git ls-remote --heads origin` was read-only, with `origin/main` still at
`d29042de` at phase start; no fetch/push/reset/checkout/clean or ref mutation
occurred during the track implementation.

## 8. Acceptance criteria map

| ID | Status | Evidence |
| --- | --- | --- |
| AC-1 | satisfied | §2 and `phase-1.md`: baseline before-column and four-cell audit reproduced. |
| AC-2 | satisfied | §3/§6 command 6: representative midpoint + press sample, cap `5/42`, duration min 12500 ms. |
| AC-3 | satisfied | §4 and §6 command 8: `--smoke` CLI flag, historical readings, ungated, no manifest change. |
| AC-4 | satisfied | §3: exactly two bound values and directions move; `why` cites before/after. |
| AC-5 | satisfied | §4: red before (`14 pass / 4 fail`) and green after (`24 pass / 0 fail`). |
| AC-6 | satisfied | §4 and §6 command 7: audit names both samples; `1680/580/370` and `+12.5 points` preserved. |
| AC-7 | satisfied | Dated 2026-11-24 notes in `conductor/product.md` and `conductor/tech-stack.md`; D-4 closed as re-stratified, no new product direction. |
| AC-8 | satisfied | §7 scope proof: no controller, species, fence, matrix, schema, protocol, API, CORS, deploy or dependency change. |
| AC-9 | satisfied | §6: all five configured commands exit 0 with hash `0xff6f3d62`. |
| AC-10 | satisfied | `verification/integrated.md` and `verification/phase-3.md` committed with command tables, bound table, AC map, scope proof and disposition. |
| AC-11 | satisfied | §5: exactly one named zero-commit fight documented and pinned; cadence resonance recorded as a separate follow-up. |

## 9. Final verdict

**Verified.** All 11 acceptance criteria are satisfied, all configured checks
are green, the two approved bounds are the only changed bounds, historical
readings are labelled historical, and the branch contains no out-of-scope game
or infrastructure change beyond the reported workflow-policy edit made at the
user's explicit request. Next: documentation sync and `conductor-review`.
