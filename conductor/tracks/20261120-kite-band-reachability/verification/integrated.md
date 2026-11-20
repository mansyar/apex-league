# Integrated verification — Phase 4

- **Track:** 20261120-kite-band-reachability
- **Phase:** 4 (owner-approved Kite clamp + 45 s cap extension)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6`
- **Verdict:** **BLOCKED — no policy shipped** (AC-12 met, AC-11 failed).

## Commands, exit codes, and counts

All commands were run separately on the Phase 4 candidate tree
(`9c994da91c2cbdade9c267c14e747145412d9d11` plus code/test edits). Commands
denied to this subagent are marked `denied` and are not claimed as run.

| Command | Exit | Counts / result |
| --- | --- | --- |
| `bun run verify` | 1 | 4448 pass / 1 skip / 10 fail, 670441 `expect()` calls, 4459 tests / 437 files (189.15 s). 10 failures are cap-extension consequences; see `phase-4.md`. |
| `bun run build` | 0 | Vite 8.3.4 production build, 438 modules transformed, `✓ built in 597ms` (standard >500 kB chunk warning only). |
| `bun run balance` | 1 | 1680 fights (ko 1319, time 357, draw 4); 32 gates ok / 2 FAIL (water_axolotl 58.1%, dune_jerboa 58.8%); capShare 357/1680 (21.3%); decisiveShare 1600/1680 (95.2%); capWinQuality 281/357 (78.7%); median 32.82 s; durationMax 45.00 s; damageBand 49/49. |
| `bun run gate:determinism` | `denied` | Standalone shell permission denied — not run, not claimed. |
| `bun run test:fuzz` | `denied` | Standalone shell permission denied — not run, not claimed. |
| focused `bun test controller-profile.test.ts controller-reach.test.ts ghost.test.ts --timeout 120000` | 0 | 30 pass / 0 fail, 117 `expect()` calls, 3 files. |
| focused `bun test fixture-audit.test.ts --timeout 120000` | 0 | 5 pass / 0 fail, 33 `expect()` calls (after 45 s re-pin). |
| `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | 0 | 2250 steps / 45.00 s; median gap 1110 mm; ending `time — Embercub wins`; 5/5 invariants ok; hash `0x1d0cc2ed`. |

The exact configured chain is `bun run verify && bun run build && bun run balance &&
bun run gate:determinism && bun run test:fuzz`. `&&` was not used; commands were
run individually. The chain is **not green**: `verify` and `balance` exit 1 and
two commands were denied.

## Metrics: before / candidate / final

| Metric | Baseline (Phase 1 `474cfe21`) | Phase 2 candidate (`7fb66b04`) | Phase 4 candidate (final measured) |
| --- | --- | --- | --- |
| capShare (gated) | 30.8% (517/1680) | 30.8% (517/1680) | **21.3% (357/1680)** |
| decisiveShare | 93.7% (1574/1680) | 93.7% (1574/1680) | 95.2% (1600/1680) |
| capWinQuality | 80.3% (415/517) | 80.3% (415/517) | 78.7% (281/357) |
| medianDuration | 32.82 s | 32.82 s | 32.82 s |
| gates | 34/34 green | 34/34 green | **32 ok / 2 FAIL** |
| battle hash | `0xff6f3d62` | `0xff6f3d62` | `0xff6f3d62` |
| pinned trace (seed 20261120) | `0x1368d19b`, 1145 mm | `0x484717a7`, 1123 mm | `0x1d0cc2ed`, 1110 mm |

The Phase 4 candidate finally achieves the strict capShare reduction (30.8% →
21.3%, AC-12 met) but pushes two species rows outside the untouched 45–55% design
band (water_axolotl 58.1%, dune_jerboa 58.8%), flipping their gates red. AC-11
therefore fails and the candidate is not shipped.

## Sim hash

- Battle/final hash: `0xff6f3d62` (embedded battle trace in `bun run verify`;
  unchanged from baseline and Phase 2).
- Pinned trace hash (seed 20261120, kite vs press): candidate `0x1d0cc2ed`,
  median gap 1110 mm. Baseline was `0x1368d19b` (1145 mm), Phase 2 candidate
  `0x484717a7` (1123 mm).
- Replay guard: `SIM_VERSION` 4, ghost pins 4/5, v3 rejected, v4 byte-identical.

## Module caps

From `conductor/tech-stack.md`: client / sim / server **12,288 B** each, voxel
**24,576 B**; enforcement by size only, **no name allowlist**, `*.test.*` exempt.
No cap was raised, no allowlist added, no source module grew. The separate
`stream.test.ts` replay-record bound (72 KB) was not moved; its failure is a cap
consequence (81036 B at 2250 steps). No size-gate command was named in the brief.

## Screenshots

**N/A** — this phase has no player-facing visual change and produces no PR.

## Scope proof

Touches stayed inside the brief's allowed set: four clamp files,
`resolve.ts`, `pacing.test.ts`, `resolve.test.ts`, `battle-trace.test.ts`,
`telemetry.test.ts`, `balance-report.test.ts`, `ghost.ts`, `ghost.test.ts`,
`battle-balance-report.ts`, and the two verification files. No dependency,
save-schema, protocol, API, CORS, deploy, client, server or `packages/voxel/`
change. No Conductor state edit beyond the two verification files; no `plan.md`,
`metadata.json`, `tracks.md`, `review.md`, `pr.md`, `spec.md` or
`conductor/index.md` edit; no push, PR, merge, branch switch, reset, rebase or
force-push. No new fence, target or workaround was invented. The ship-only doc
updates to `conductor/product.md` and `conductor/tech-stack.md` were **not**
applied because the candidate is blocked.

## Final verdict

**BLOCKED — no policy shipped.** The owner-approved candidate strictly lowers
`capShare` (30.8% → 21.3%, AC-12 met) but fails AC-11: 32/34 gates green, with
`species:water_axolotl` (58.1%) and `species:dune_jerboa` (58.8%) outside the
untouched design band. `verify` and `balance` exit 1; `gate:determinism` and
`test:fuzz` were denied to this subagent and need a primary re-run. No policy,
doc update or new fence ships. D-2 stays open pending a new owner decision (e.g.
a roster re-tune track or formally accepting the debt). See `phase-4.md` for the
full measured grid, deviation and blockers.
