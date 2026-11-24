# Phase 2 Evidence: Representative gate and failing-first tests

- **Phase:** 2
- **Result:** verified
- **Phase base:** `06bdf759`
- **Base:** `main` @ `d29042de1c9019189373beb763baa1805dd78541`
- **Date:** 2026-11-24

## 1. What changed

| Area | Change |
| --- | --- |
| `packages/sim/scripts/battle-telemetry.ts` | `measure()` now pools `measureFight(matchup, { statBasis: "midpoint", doctrine: "press" })`; the 42 stride-11 pairings and one seed each are unchanged. |
| Same | New exported `measureSmoke()` preserves the historical `reference` + `split` sample; `main(smoke = false, out = console.log)` prints an ungated `SMOKE` header and returns 0 in smoke mode. `process.exitCode = main(process.argv.includes("--smoke"))`; no `package.json` change. |
| Same (`BOUNDS`) | Exactly two values move: `engagementMax` 4500 → 8000 (`max`) and `distinctPositions` 20 → 16 (`min`); their `why` strings cite both the before readings (3992 mm / 31 cells) and after readings (6061 mm / 19 cells). All twelve other values, including `capShare = 0.6`, are byte-identical. |
| `packages/sim/src/battle/continuous/telemetry.test.ts` | Pins the representative composition, both bound values and directions, the unchanged smoke composition, and the changed `why` text. Per-fight commit/winner assertions are narrowed to the single documented artifact under AC-11. |
| `packages/sim/scripts/fixture-audit.ts`, `packages/sim/src/battle/continuous/fixture-audit.test.ts` | P2.T5 (plan amendment 2026-11-24, FR-6 moved from Phase 3): cell A is named as the historical reference + split smoke sample, cell D as the representative gate; agreement is asserted against `measureSmoke()` / `measure()`. The `1680/580/370` matrix arithmetic and `+12.5 points` remain unchanged. |
| `conductor/tracks/20261124-telemetry-fixture-restratification/spec.md` | Dated owner revision with AC-11 and the per-fight artifact record; no requirement renumbered. |

## 2. Failing-first proof

Pre-change focused run (`bun test --timeout 120000 packages/sim/src/battle/continuous/telemetry.test.ts`, before any script edit): **exit 1, 14 pass / 4 fail, 848 expect() calls, 18 tests, 5.31 s**. Failures: representative composition (received reference + split), AC-10 bound pin (`8000` vs `4500`), AC-4 `why` pin, and `TypeError: script.measureSmoke is not a function`. Raw: `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/failing-first.txt`.

After implementation: **exit 1, 17 pass / 1 fail**; the remaining failure was the pre-existing per-fight assertion `fight.commits[0] > 0` for `gale_moth v emberwing` under midpoint + press. Raw: `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/focused-test-after-implementation.txt`.

## 3. Root cause and owner disposition of the artifact fight

Four-cell instrumentation (`.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/root-cause.txt`) isolates one zero-commit fight in the representative cell only: `gale_moth v emberwing`, seed `20261146`, 45.00 s cap, 0–0 commits, 100% idle. The other cells have 0/42. The same pairing: reference + split 24.06 s / 8–7 commits, reference + press 45.00 s / 12–10, midpoint + split 15.52 s / 7–8.

Mechanism: `threatBandFor` raises the press safe floor to `opponentReachMm + REACH_STANDOFF_MM` (80 mm) ≈ 826 mm; with `DECISION_MS = 240` and midpoint speed 14, cadence samples alternate between retreat below ≈ 826 mm and advance above ≈ 1270–1372 mm, so the in-band press branch is never selected. This is controller cadence resonance at one pairing, not a regression in resolver, controller, species, or bound logic; the pooled telemetry stays green because one idle fight is ~2.4% of a 42-fight mean.

Owner decision 2026-11-24: keep the 42-fight representative fixture, keep both frozen bounds, document the artifact under AC-11, and record cadence resonance as a separate follow-up. No bound, gate, controller, species, or resolver change was made to force green.

## 4. Commands and results

All commands were run separately from the primary shell; exit codes are process exits.

| # | Command | Exit | Result / evidence |
| --- | --- | --- | --- |
| 1 | `bun run telemetry` | 0 | 42 distinct pairings; cap `5/42 (11.9%)`; engagement `340 / 946 / 6061` mm; idle `30.3%`; contact `10.3%`; retreats `14872 / 15001`; dead zone `5.1%`; positions min `19`; duration `12.50s .. 45.00s`; all 14 bounds `ok`. Raw: `phase-2/telemetry.txt`. |
| 2 | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | 0 | Header `SMOKE: historical reference + split sample (ungated)`; cap `11/42 (26.2%)`; engagement `345 / 1102 / 3992` mm; positions min `31`; all 14 bounds `ok`; returns 0. Raw: `phase-2/smoke.txt`. |
| 3 | `bun test --timeout 120000 packages/sim/src/battle/continuous/telemetry.test.ts packages/sim/src/battle/continuous/fixture-audit.test.ts` | 0 | 24 pass, 0 fail, 915 expect() calls, 24 tests across 2 files, 12.05 s. Raw: `phase-2/focused-tests-final.txt`. |
| 4 | `bun run verify` | 0 | 4 packages typecheck exit 0; 4462 pass, 1 skip, 0 fail; Biome 1037 files clean; voxel determinism gate OK; final battle hash `0xff6f3d62`; all five trace invariants ok. Raw: `phase-2/verify.txt`. |
| 5 | `bun run build` | 0 | 438 modules transformed, built in 521 ms; standard chunk-size advisory only. Raw: `phase-2/build.txt`. |
| 6 | `bun test --timeout 120000 packages/sim/src/battle/continuous/fixture-audit.test.ts` | 0 | 6 pass, 0 fail, 44 expect() calls, 4.72 s; A `11/42` and D `5/42`, attribution `+14.3 / +7.1 / +7.1 / +2.4`, same-doctrine `+12.5 points`. |

The first post-implementation `bun run verify` (m0553) was red solely because the audit still pinned cell A to the gate; that was repaired in P2.T5 and the re-run above is authoritative. The raw red output was overwritten by the re-run.

## 5. Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| AC-1 | satisfied | Phase 1 evidence remains authoritative; baseline reproduction unchanged. |
| AC-2 | satisfied | Command 1: representative midpoint + press composition, cap `5/42 (11.9%)`, duration min `12500 ms`. |
| AC-3 | satisfied | Command 2 plus dynamic-import test: `measureSmoke()` historical composition, `main(true, out)` returns 0, `SMOKE` header, no `FAIL` lines; no manifest change. |
| AC-4 | satisfied | Script diff: exactly two `BOUNDS` values move; other twelve byte-identical; `why` cites before and after. |
| AC-5 | satisfied | Section 2 red/green proof and Command 3. |
| AC-6 | satisfied | Command 6 and P2.T5: A/D named correctly, `1680/580/370` and `+12.5 points` preserved. |
| AC-11 | satisfied | Section 3 owner revision in spec and narrowed per-fight assertions; cadence resonance recorded as a follow-up. |
| NFR-1 | satisfied | No `SIM_VERSION`, ghost, controller, species, fight-cap, fence, boss, or resolver source change. |
| NFR-2 | satisfied | Matrix gate and D-1 fence untouched; `capShare` bound stays `0.6`. |
| NFR-3 | satisfied | No `package.json`, dependency, manifest, schema, API, CORS, deploy, client, or server change. |
| NFR-4 | satisfied | Google TS style; `bun run verify` Biome clean; no allowlist; module caps unchanged (no source outside the four listed files). |
| NFR-6 | satisfied | Commands 4–5 exit 0 with hash `0xff6f3d62`. |
| NFR-7 | satisfied | Still 42 fights, one seed each, no runtime growth or fixture expansion. |

## 6. Boundary proof and verdict

`git diff --check 06bdf759..HEAD` exits 0 and Prettier/Biome formatting is clean after `bunx biome check --write` on the four changed source/test files. The tree contains only the six in-scope tracked modifications listed in §1 before this evidence commit. No credential, player data, remote ref, branch, or dependency changed.

**Phase 2 verdict: verified.** The representative gate, historical smoke diagnostic, frozen two-bound change, failing-first proof, audit truth, and owner artifact revision are all in place. Next: Phase 3 (dated documentation and final integrated evidence).
