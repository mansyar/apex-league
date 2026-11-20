# Phase 4 verification — Owner-approved Kite clamp and 45s cap extension

- **Track:** 20261120-kite-band-reachability
- **Phase:** 4 (P4.T1–P4.T5)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6` (main)
- **Candidate head:** `9c994da91c2cbdade9c267c14e747145412d9d11` (pre-evidence commit)
- **Owner decision:** 2026-11-20 — continue the track; apply **both** the Kite clamp
  re-application and the 45 s cap extension (supersedes the no-fence assumption for
  this track only). Executed, not re-decided.
- **Result:** **BLOCKED — no-ship.** Criterion 2 (strict capShare reduction) is MET;
  criterion 1 (all 34 gates green, every other fence unchanged) FAILS.

## Ship gate decision (FR-8 / FR-9 / FR-10, AC-11 / AC-12 / AC-13)

| # | Owner gate | Required | Measured | Verdict |
| --- | --- | --- | --- | --- |
| 1 | All 34 balance gates green | 34/34 ok | **32 ok / 2 FAIL** | **FAIL** |
| 2 | capShare strictly below baseline 517/1680 (30.8%) | < 30.8% | **357/1680 (21.3%)** | **PASS** |

The two red gates are `species:water_axolotl` (58.1%, 93/160, limit |rate-50%| <=
7.9%) and `species:dune_jerboa` (58.8%, 94/160, limit <= 7.9%). Both are outside
the untouched 45–55% design band. Per the brief this is a hard stop: no new fence,
target or workaround was invented, and D-2 stays open pending another owner
decision. No product/tech-stack doc update was applied (ship-only).

## Restoration proof (P4.T1 — exact 7fb66b04 clamp)

Restored by `git show 7fb66b04:<path>` read + direct file write (no `checkout` /
`reset` / `restore`):

- `packages/sim/src/battle/continuous/controller-reach.ts` — integer-only
  `maintainableGapMm`, Kite-only clamp in `threatBandFor`.
- `packages/sim/src/battle/continuous/controller-reach.test.ts` — failing-first
  regression tests.
- `packages/sim/src/battle/continuous/controller-profile.test.ts` — new at that
  checkpoint; re-created verbatim from the same blob.
- `packages/sim/src/battle/continuous/fixture-audit.test.ts` — documented
  diagnostic pins (subsequently re-pinned only for the 45 s cap; see Deviations).

Proof: `git diff 7fb66b04 -- <the three HEAD-present files>` is empty for all three;
the checkpoint-only new file was written from the identical `git show` blob. A
byte-level `git hash-object` comparison was permission-denied (see Blockers), so
identity is established by exact `git show` copy + empty `git diff`, not by hash.

## Exact cap and ghost edits (P4.T2 / P4.T3)

Production constants (only these three, 40_000 → 45_000):

- `resolve.ts`: `FIGHT_CAP_MS = 45000` (comment band 25-40 s → 25-45 s).
- `battle-balance-report.ts`: `BAND_MAX_MS = 45_000`, `DURATION_MAX_MS = 45_000`,
  and the printed median bound string `inside 25.00s..45.00s`.

Test pins updated to the new cap: `pacing.test.ts` (`MAX_MS = 45_000`),
`resolve.test.ts` (`toBe(45000)`), `battle-trace.test.ts` (`45_000` ms and `2250`
steps, comment/title 40→45), `telemetry.test.ts` (`<= 45_000`),
`balance-report.test.ts` (`median: 45_000`), plus the diagnostic re-pin of
`fixture-audit.test.ts` (see Deviations).

Replay guard: `ghost.ts` `SIM_VERSION 3 → 4` with a dated 2026-11-20 v4 note
(reachable Kite band + 45 s cap). `ghost.test.ts` pins 3/4 → 4/5: marker now 4,
future bundle 5, explicit legacy-v3 rejection added, v4 bundle replays
byte-identically; v1 rejection retained.

## Failure-before / pass-after pin counts

- Controller + ghost focused set, before restoration: `controller-profile.test.ts`
  absent at HEAD; after restoration and all pin work:
  **`30 pass / 0 fail`, 117 `expect()` calls, 3 files** —
  `bun test packages/sim/src/battle/continuous/controller-profile.test.ts packages/sim/src/battle/continuous/controller-reach.test.ts packages/sim/src/cup/ghost.test.ts --timeout 120000`.
- `fixture-audit.test.ts` before the 45 s re-pin: `34 pass / 1 fail` (150 expects)
  in the combined first focused run; the one failure was the four-cell pin
  (received A/B/C/D cap+KO counts differ from the 40 s values). After re-pinning
  the four cells: **`5 pass / 0 fail`, 33 `expect()` calls**.

## Five-command table

Run separately; no `&&` / pipes. Exit codes are exact.

| Command | Exit | Counts / result |
| --- | --- | --- |
| `bun run verify` | **1** | 4448 pass / 1 skip / **10 fail**, 670441 `expect()` calls, 4459 tests / 437 files (189.15 s). 10 failures are cap-extension consequences (below). |
| `bun run build` | 0 | Vite 8.3.4, 438 modules, `✓ built in 597ms`; only the standard >500 kB chunk warning. |
| `bun run balance` | **1** | 1680 fights (ko 1319, time 357, draw 4); **32 gates ok / 2 FAIL**; capShare 357/1680 (21.3%); decisiveShare 1600/1680 (95.2%); capWinQuality 281/357 (78.7%); median 32.82 s; durationMax 45.00 s; durationP05 16.44 s; damageBand 49/49. |
| `bun run gate:determinism` | `denied` | Standalone shell permission denied — not run, not claimed. Re-run needed by primary. |
| `bun run test:fuzz` | `denied` | Standalone shell permission denied — not run, not claimed. Re-run needed by primary. |

The 10 `verify` failures (all consequences of extending the cap; none may be
"fixed" by moving another fence/target/workaround):

1. `stream.test.ts` — replay record 81036 B > 72036 B bound (longer 2250-step fight).
2–5. `telemetry.test.ts` — (a) `durationMax` observed 45.00 s vs stale 40.00 s BOUNDS
   in `battle-telemetry.ts` (outside Touches); (b) capShare diagnostic pin
   `11*3 > 42` now 33 (caps genuinely fell); (c) `violations(measured)` non-empty on
   that same stale bound; (d) `run(sample())` exits 1 on it.
6. `gatekeeper-reach.test.ts` — real climb test timed out at 60000 ms (66828 ms).
7–10. `balance-report.test.ts` — `earth_tortoise` distinct 152 vs 144 pin;
   design-band-miss list now 7 rows; KNOWN_MISSES now 2 rows; gate exits 1 on the
   two species rows. Rows 7–10 are diagnostic pins around the 2 real gate failures.

Because `verify` is not green, the configured chain
`verify && build && balance && gate:determinism && test:fuzz` cannot be claimed green.

## Pinned trace result

`bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
— exit 0, 2250 steps / 45.00 s, median gap **1110 mm**, ending `time — Embercub wins`,
5/5 invariants ok, **trace hash `0x1d0cc2ed`** (candidate). Battle hash from the
embedded battle trace in `verify`: **`0xff6f3d62`** (unchanged).

## Measured grid (same 1680-fight matrix)

| Metric | Baseline (Phase 1 `474cfe21`) | Phase 2 candidate (`7fb66b04`) | Phase 4 candidate |
| --- | --- | --- | --- |
| capShare (gated) | 30.8% (517/1680) | 30.8% (517/1680) | **21.3% (357/1680)** |
| decisiveShare | 93.7% (1574/1680) | 93.7% (1574/1680) | 95.2% (1600/1680) |
| capWinQuality | 80.3% (415/517) | 80.3% (415/517) | 78.7% (281/357) |
| medianDuration | 32.82 s | 32.82 s | 32.82 s |
| durationMax | 40.00 s | 40.00 s | 45.00 s |
| gates | 34/34 green | 34/34 green | **32 ok / 2 FAIL** |
| battle hash | `0xff6f3d62` | `0xff6f3d62` | `0xff6f3d62` |
| pinned trace (seed 20261120) | `0x1368d19b`, 1145 mm | `0x484717a7`, 1123 mm | `0x1d0cc2ed`, 1110 mm |

Fights: baseline/Phase 2 (ko 1159, time 517, draw 4) → Phase 4 (ko 1319, time 357,
draw 4). `water_axolotl` moved 55.3%→58.1% and `dune_jerboa` 55.3%→58.8% (both
previously inside band), flipping their gates red. `design-band misses` grew from
1 to 7 rows.

## Module caps

Client / sim / server **12,288 B** and voxel **24,576 B** in `conductor/tech-stack.md`;
enforced by size only, **no name allowlist**, `*.test.*` exempt. No cap was raised,
no allowlist added, no source module grew past a cap (no size-gate command was
named in the brief). The `stream.test.ts` record-size bound (72 KB) is a replay
record bound, not a module cap, and was not moved.

## Scope proof

Touches stayed inside the brief's allowed set: the four clamp files,
`resolve.ts`, `pacing.test.ts`, `resolve.test.ts`, `battle-trace.test.ts`,
`telemetry.test.ts`, `balance-report.test.ts`, `ghost.ts`, `ghost.test.ts`,
`battle-balance-report.ts`, and the two verification files. No dependency, save
schema, protocol, API, CORS, deploy, client, server or `packages/voxel/` file was
changed; no `plan.md` / `metadata.json` / `tracks.md` / `review.md` / `pr.md` /
`spec.md` / `conductor/index.md` edit; no push, PR, merge, branch switch, reset,
rebase or force-push. No new fence, target or workaround was invented. The
ship-only doc updates to `conductor/product.md` and `conductor/tech-stack.md`
were **not** applied because the candidate is blocked.

## Deviations

- `fixture-audit.test.ts`: P4.T1 was to restore this file byte-for-byte from
  `7fb66b04`; after the 45 s cap the four diagnostic cells re-measured (A 16→11
  caps / 26→31 KO, B 12→6 / 30→36, C 11→6 / 31→36, D 7→5 / 35→37; medians
  unchanged). The drift pins were re-pinned to the new reality and their comments
  updated. This is required by the brief's "let the failing tests enumerate the
  pins" and adds no bound or target (the file remains diagnostic, never gated).

## Blockers

- `bun run gate:determinism` — standalone shell permission denied; needed for the
  five-command chain; expect all species/props byte-identical. Primary to re-run.
- `bun run test:fuzz` — standalone shell permission denied; needed for the
  five-command chain; expect 139 pass / 0 fail. Primary to re-run.
- `git hash-object <file>` — permission denied; needed only for hash-level
  restoration proof (substitute: empty `git diff` vs checkpoint + verbatim write).

## Final verdict

**BLOCKED — no-ship.** The owner-approved candidate strictly lowers `capShare`
from 30.8% to 21.3% (AC-12 met) but turns two species gates red, so AC-11
("all 34 gates green, every other fence unchanged") fails. `verify` and `balance`
exit 1; two further commands were denied to this subagent. No policy, doc update
or new fence ships. Next step requires a new owner decision (e.g. a roster
re-tune track or formally accepting D-2 as debt); this phase does not invent one.
