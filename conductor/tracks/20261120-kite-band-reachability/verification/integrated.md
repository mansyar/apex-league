# Integrated verification — Phase 3

- **Track:** 20261120-kite-band-reachability
- **Phase:** 3 (P3.T3)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6`
- **Verdict:** **BLOCKED — no policy shipped.**

## Commands, exit codes, and counts

All commands below were run separately on the stated tree. Commands denied to this subagent are marked `denied` and are not claimed as run.

| Layer | Command | Tree | Exit | Counts / result |
| --- | --- | --- | --- | --- |
| balance | `bun run balance` | Phase 2 candidate `7fb66b04` | 0 | 1680 fights (ko 1159, time 517, draw 4); **34/34 gates ok**; capShare 517/1680 (30.8%); decisiveShare 1574/1680 (93.7%); capWinQuality 415/517 (80.3%); median 32.82 s; damageBand 49/49 |
| balance | `bun run balance` | final (game code reverted) | 0 | identical: 1680 fights; **34/34 gates ok**; capShare 517/1680 (30.8%); decisiveShare 1574/1680 (93.7%); capWinQuality 415/517 (80.3%); median 32.82 s |
| verify | `bun run verify` | final (game code reverted) | `0` | Primary: 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files, hash `0xff6f3d62`, Biome clean |
| build | `bun run build` | final (game code reverted) | 0 | Vite 8.3.4 production build; 438 modules transformed; `✓ built in 477ms` |
| trace | `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | final (game code reverted) | 0 | hash `0x1368d19b`; median gap 1145 mm; ending `time — Embercub wins`; 5/5 invariants ok |
| gate:determinism | `bun run gate:determinism` | final | `0` | Primary: all species/props byte-identical |
| fuzz | `bun run test:fuzz` | final | `0` | Primary: 139 pass / 0 fail, 129015 `expect()` calls |

The exact configured chain is `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`. `&&` was not used; commands were run individually. On the final reverted tree all five commands exited `0`, so the chain is green; the phase remains BLOCKED by the approved no-ship decision, not by a failing check.

## Metrics: before / candidate / final

| Metric | Baseline (Phase 1, `1310de20`) | Candidate (Phase 2, `7fb66b04`) | Final (this phase) |
| --- | --- | --- | --- |
| capShare (gated) | 30.8% (517/1680) | 30.8% (517/1680) | 30.8% (517/1680) |
| decisiveShare | 93.7% (1574/1680) | 93.7% (1574/1680) | 93.7% (1574/1680) |
| capWinQuality | 80.3% (415/517) | 80.3% (415/517) | 80.3% (415/517) |
| medianDuration | 32.82 s | 32.82 s | 32.82 s |
| gates | 34/34 green | 34/34 green | 34/34 green |
| battle hash | `0xff6f3d62` | `0xff6f3d62` | `0xff6f3d62` |
| pinned trace (seed 20261120) | `0x1368d19b`, 1145 mm | `0x484717a7`, 1123 mm | `0x1368d19b`, 1145 mm |

The candidate's live clamp changed the trace shape but did **not** lower `capShare`. The strict-reduction rule (FR-6 / AC-6) is therefore not met and no game change ships.

## Sim hash

- Battle/final hash: `0xff6f3d62` (reconfirmed by `bun run balance` and the battle trace embedded in `bun run verify` on the final tree).
- Pinned trace hash after revert: `0x1368d19b` (median gap 1145 mm), matching the expected baseline value.

## Module caps

From `conductor/tech-stack.md`: client / sim / server **12,288 B** each, voxel **24,576 B**; enforcement is by size only, with **no name allowlist** and only `*.test.*` exempt. No cap was raised and no allowlist was added. No size-gate command was named in this phase's brief, so caps were not re-measured here; no source module grew.

## Screenshots

**N/A** — this phase has no visual layer and produces no PR.

## Scope proof

`git diff --quiet 1310de206028d4b4cb10ee8aa7fad8ff927af3a6 -- packages apps` on the final working tree exits `0`: **the final diff contains no source change.** All four Phase 2 game-code changes were reverted (three files restored to exact baseline content and the Phase 2-only new `controller-profile.test.ts` deleted by the primary with `git rm`). Subagent deletion attempts were permission-denied but resolved by the primary; see `phase-3.md`.

No dependency manifest, save schema, protocol, API, CORS, deploy, client, or server file was changed (AC-10 green). `SIM_VERSION` remains 3 and ghost pins are untouched (AC-4 not applicable).

## Final verdict

**BLOCKED — no policy shipped (by design).** The candidate was green but did not strictly lower `capShare`; all game-code changes are reverted, the final tree has no source diff, and all five configured commands plus the pinned trace are green on the final tree. Owner decision needed: move a named pacing fence in a new product-decision track, or formally accept D-2 as open debt. No new fence or target was invented here.
