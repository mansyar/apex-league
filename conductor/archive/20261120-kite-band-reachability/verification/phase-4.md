# Phase 4 verification — Owner-approved Kite clamp and 45s cap extension

- **Track:** 20261120-kite-band-reachability
- **Phase:** 4 (P4.T1–P4.T5)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6` (main)
- **Candidate head:** `9fbaabdd7b122739aac3dbad73880017aaaca3b5` (single phase commit)
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
| `bun run verify` | **1** | 4449 pass / 1 skip / **9 fail**, 670441 `expect()` calls, 4459 tests / 437 files. 9 failures are cap-extension consequences (below). |
| `bun run build` | 0 | Vite 438 modules; only the standard >500 kB chunk warning. |
| `bun run balance` | **1** | 1680 fights (ko 1319, time 357, draw 4); **32 gates ok / 2 FAIL**; capShare 357/1680 (21.3%); decisiveShare 1600/1680 (95.2%); capWinQuality 281/357 (78.7%); median 32.82 s; durationMax 45.00 s; damageBand 49/49. |
| `bun run gate:determinism` | **0** | Primary re-run: all 21 species × 3 stages + 5 props byte-identical. |
| `bun run test:fuzz` | **0** | Primary re-run: 139 pass / 0 fail, 129015 `expect()` calls. |

The 9 `verify` failures in the primary run (all consequences of extending the
cap; none may be "fixed" by moving another fence/target/workaround):

1. `stream.test.ts` — `the recorded stream > stays small enough to replay: a full fight is under 72 KB`
   (longer 2250-step fight).
2–5. `telemetry.test.ts` — `the duration band and the cap share are separate bounds (AC-7)`;
   `the cap share stays inside its re-derived smoke ceiling (AC-24)`;
   `a violated threshold is named with its observed value (AC-14)`;
   `the harness exits non-zero when a bound is violated (AC-14)`.
6–9. `balance-report.test.ts` — `a distinct fight is more than its winner and duration (R3 T1)`;
   `the report names the design-band misses it computes (FR-5, R2 T3)`;
   `today's target misses are named with their observed values`;
   `the gate is green end to end (R5)`.

The subagent additionally saw a transient `gatekeeper-reach.test.ts` timeout; the
primary run did not reproduce it, and it is not included in the authoritative
9-failure count.

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

Resolved by the primary on the final tree: `bun run gate:determinism` and
`bun run test:fuzz` both exit 0 (see Primary verification below). The
`git hash-object` denial was only a hash-level restoration-proof convenience;
byte identity was established by verbatim `git show` writes and empty `git diff`.

The remaining blocker is the owner gate itself: AC-11 fails because two species
rows are red. No new fence, target, workaround or owner decision is invented here.

## Primary verification (final tree, HEAD `9fbaabdd`)

The primary independently re-ran every command separately; output dir
`C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-p4-verify\`.

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 1 | 4449 pass / 1 skip / 9 fail, 670441 `expect()` calls, 4459 tests / 437 files; final hash `0xff6f3d62`. |
| `bun run build` | 0 | Vite 438 modules, pre-existing >500 kB chunk warning only. |
| `bun run balance` | 1 | 32/34 gates ok; capShare 357/1680 (21.3%); decisiveShare 95.2%; capWinQuality 78.7%; median 32.82 s. |
| `bun run gate:determinism` | 0 | All species/props byte-identical. |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls. |
| focused controller + ghost tests | 0 | 30 pass / 0 fail, 117 `expect()` calls. |
| pinned trace | 0 | 2250 steps, median gap 1110 mm, hash `0x1d0cc2ed`. |

Scope proof: `git diff 9c994da9..HEAD -- packages apps` contains only the 14
allowed sim source/test/script files; product.md and tech-stack.md are unchanged
(`DOCS_UNCHANGED=0`). Tree is clean. The capShare reduction is real, but AC-11
fails, so no policy ships.

## Final verdict

**BLOCKED — no-ship.** The owner-approved candidate strictly lowers `capShare`
from 30.8% to 21.3% (AC-12 met) but turns two species gates red, so AC-11
("all 34 gates green, every other fence unchanged") fails. `verify` and `balance`
exit 1 in both the subagent and primary runs; `gate:determinism`, `test:fuzz`,
focused tests and trace are green. No policy, doc update or new fence ships.
Next step requires a new owner decision (e.g. a roster re-tune track or formally
accepting D-2 as debt); this phase does not invent one.

## Final tree — candidate withdrawn

Per AC-7 / FR-6 ("no game change ships"), the primary reverted all 13 Phase 4
source/test/script files to base `1310de20` and removed the Phase 2-only
`controller-profile.test.ts`. Verification of the final tree, output dir
`C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-p4-final\`:

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, hash `0xff6f3d62`. |
| `bun run build` | 0 | Vite build OK. |
| `bun run balance` | 0 | 1680 fights, capShare 30.8% (517/1680), 34/34 gates ok. |
| `bun run gate:determinism` | 0 | Byte-identical. |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls. |

`git diff 1310de20 -- packages apps` is empty (`SOURCE_UNCHANGED=0`). `SIM_VERSION`
is back to 3, ghost pins to 3/4, the fight cap to 40 s, and no product/tech-stack
doc was changed. The measured candidate grid above is retained only as evidence.
