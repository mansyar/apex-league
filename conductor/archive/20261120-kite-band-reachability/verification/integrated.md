# Integrated verification — Phase 5 (final)

- **Track:** 20261120-kite-band-reachability
- **Phase:** 5 (narrow roster re-tune for D-2)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6`
- **Verdict:** **VERIFIED — SHIP.** All 34 gates green; `capShare` strictly
  below baseline; only two species' stat bounds changed.

## Commands, exit codes, and counts

All commands were run separately on the final phase-5 tree (single conventional
commit `feat(sim): close D-2 with reachable kite band, 45s cap and roster
re-tune`). The configured chain is
`bun run verify && bun run build && bun run balance && bun run gate:determinism &&
bun run test:fuzz`; `&&` was not used.

| Command | Exit | Counts / result |
| --- | --- | --- |
| `bun run verify` | 0 | 4458 pass / 1 skip / 0 fail, 670470 `expect()` calls, 4459 tests / 437 files, 68.86 s. Includes check (4 packages), Biome (1032 files clean) and the determinism gate. |
| `bun run build` | 0 | Vite 438 modules, built in 347 ms; pre-existing non-blocking >500 kB chunk warning only. |
| `bun run balance` | 0 | 1680 fights (ko 1306, time 370, draw 4); **34/34 gates green**; capShare 370/1680 (22.0%); decisiveShare 1598/1680 (95.1%); capWinQuality 292/370 (78.9%); median 32.80 s; max 45.00 s; damage 49/49. |
| `bun run gate:determinism` | 0 | Primary independent re-run: all 21 species × 3 stages + 5 props byte-identical. Also embedded in green `verify`. |
| `bun run test:fuzz` | 0 | Primary independent re-run: 139 pass / 0 fail, 129015 `expect()` calls (full voxel sweep). |
| focused re-pin tests | 0 | 63 pass / 0 fail, 41727 `expect()` calls (clock.contract, stream, telemetry, fixture-audit, balance-report). |
| focused boss/form/species tests | 0 | 150 pass / 0 fail, 1363 `expect()` calls (bosses.balance, form.balance, bosses, species). |
| pinned trace (seed 20261120, kite v press) | 0 | 2250 steps / 45.00 s; ending `time — Embercub wins`; gap min 499 / median 1110 / max 3984 mm; 5/5 invariants ok; hash `0x1d0cc2ed`. |

## Metrics: baseline / Phase 4 candidate / final Phase 5

| Metric | Baseline (Phase 1) | Phase 4 candidate | Final Phase 5 |
| --- | --- | --- | --- |
| capShare (gated) | 30.8% (517/1680) | 21.3% (357/1680) | **22.0% (370/1680)** |
| decisiveShare | 93.7% (1574/1680) | 95.2% (1600/1680) | 95.1% (1598/1680) |
| capWinQuality | 80.3% (415/517) | 78.7% (281/357) | 78.9% (292/370) |
| medianDuration | 32.82 s | 32.82 s | 32.80 s |
| water_axolotl | in band | 58.1% (FAIL) | **51.2% (ok)** |
| dune_jerboa | in band | 58.8% (FAIL) | **53.8% (ok)** |
| gates | 34/34 | 32 ok / 2 FAIL | **34/34 green** |
| battle hash | `0xff6f3d62` | `0xff6f3d62` | `0xff6f3d62` |
| pinned trace (seed 20261120) | `0x1368d19b`, 1145 mm | `0x1d0cc2ed`, 1110 mm | `0x1d0cc2ed`, 1110 mm |

The final tree keeps the Phase 4 candidate's strict capShare reduction and
returns both red species to the unchanged 45–55% design band, satisfying AC-14.
AC-12 holds: 370 < 517 of 1680 (22.0% < 30.8%). AC-15 (blocked-with-grid) is not
triggered.

## Sim hash and replay guard

- Battle/final hash: `0xff6f3d62` (unchanged from baseline and Phase 4).
- Verify embedded trace (wind_falcon v water_axolotl, seed 20261111): 39680 ms,
  hash `0xff6f3d62`, median gap 1117 mm.
- Pinned trace (seed 20261120, kite vs press): `0x1d0cc2ed`, median gap 1110 mm,
  identical to the Phase 4 candidate because neither re-tuned species appears
  in that matchup.
- Replay guard: `SIM_VERSION` 4, ghost pins 4/5, v3 rejected, v5 rejected,
  v4 byte-identical.

## Module caps

Client / sim / server **12,288 B** each, voxel **24,576 B**; enforcement by size
only, no name allowlist, `*.test.*` exempt. No cap raised, no allowlist added,
no source module grew. The `stream.test.ts` replay-record pin (72,036 →
81,036 B) follows the 45 s cap's 2250-step frame count; it is not a module cap
or a balance fence. The only out-of-Touches code change was the telemetry
`BOUNDS.durationMax` value 40,000 → 45,000, recorded as a deviation in
`phase-5.md`.

## Screenshots

**N/A** — no player-facing visual change; no visual layer was touched and no PR
is produced by this phase.

## Scope proof

`git diff f64b7e21 --name-only` lists the 13 restored Phase 4 candidate files,
`clock.contract.test.ts` and `stream.test.ts` (candidate-derived pins), the two
allowed species files (`starters.ts`, `discovery.ts`), and the deviation
`battle-telemetry.ts` — plus the two verification files. The two ship-only doc
files were applied by the primary after independent verification. No client/server production file, no `packages/voxel/` file, no
dependency, lockfile, manifest, deploy file, save schema, protocol, API or CORS
change, no allowlist. No Conductor state edit beyond the two verification files;
no `plan.md`, `metadata.json`, `tracks.md`, `review.md`, `pr.md`, `spec.md` or
`conductor/index.md` edit; no push, PR, merge, branch switch, reset, rebase or
force-push. Working tree clean after the single commit.

## Ship-only doc updates (applied by primary)

The owner-approved ship-case notes were applied by the primary: `conductor/product.md`
records the dated 2026-11-20 D-2 closure (Kite clamp + 45 s cap + two-species
re-tune), and `conductor/tech-stack.md` records sim replay v4, ghost pins 4/5,
the 45 s fight cap and the two re-tuned species bounds. Both diffs were read back
and are limited to those notes.

## Final verdict

**VERIFIED — SHIP.** D-2 is closed here: the full Phase 4 candidate is restored,
the two species gates are back inside the unchanged design band (51.2% / 53.8%),
all 34 balance gates are green, and `capShare` is strictly lower than baseline
(22.0% vs 30.8%). All five configured commands were independently re-run by the
primary with exit 0, including standalone `gate:determinism` and `test:fuzz`;
focused tests 122 pass / 0 fail and the pinned trace hash `0x1d0cc2ed` with
5/5 invariants. Ship-only docs are applied. See `phase-5.md` for the full grid,
all tuning attempts, deviations and resolved blockers.

## Review

`review.md` records round-1 `PASS` with zero Critical/High/Medium/Low findings
on range `1310de206028d4b4cb10ee8aa7fad8ff927af3a6..1fe0d06b29eb3cb7c27a373c38cb06a6b3da8197`.
No review fixes were required; the owner-approved product/tech-stack notes were
already applied before the review and needed no change afterward.
