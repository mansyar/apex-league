# Phase 3 — Measured decision, replay guard, and evidence

- **Track:** 20261120-kite-band-reachability
- **Phase:** 3 (P3.T1 / P3.T2 / P3.T3)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6`
- **Phase 2 checkpoint:** `7fb66b04` (current HEAD `e676beb3` is the plan status commit)
- **Result:** **BLOCKED — no policy shipped** (the required outcome under FR-6/AC-7). The Phase 2 candidate was green but did not lower `capShare`; all game-code changes are reverted, the final tree is green, and the phase is reported blocked by design, not by tooling.

## Decision (FR-6 / AC-6 / AC-7)

The approved ship rule is: a policy may ship **only if** `bun run balance` is green **and** `capShare` is **strictly lower** than the Phase 1 baseline `30.8% (517/1680)` on the same 1,680-fight matrix. The Phase 2 candidate is green but its `capShare` is **unchanged** at `30.8% (517/1680)`. Therefore the required outcome is **no-ship**: every game-code change is reverted, `SIM_VERSION` stays at 3, and no fence, ghost pin, product doc, or tech-stack doc is touched.

## Measured grid

| Point | Source state | capShare (gated) | decisiveShare | capWinQuality | medianDuration | Gates | Battle hash | Pinned trace (seed 20261120) | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline (Phase 1) | track base `1310de20` | **30.8% (517/1680)** | 93.7% (1574/1680) | 80.3% (415/517) | 32.82 s | 34/34 green | `0xff6f3d62` | `0x1368d19b`, median gap 1145 mm, `time — Embercub wins` | reference |
| Candidate (Phase 2) | checkpoint `7fb66b04` | **30.8% (517/1680)** | 93.7% (1574/1680) | 80.3% (415/517) | 32.82 s | 34/34 green | `0xff6f3d62` | `0x484717a7`, median gap 1123 mm, `time — Embercub wins` | **rejected** — not strictly lower |
| Final (this phase) | game code reverted to `1310de20` | **30.8% (517/1680)** | 93.7% (1574/1680) | 80.3% (415/517) | 32.82 s | 34/34 green | `0xff6f3d62` | `0x1368d19b`, median gap 1145 mm, `time — Embercub wins` | no-ship |

Exact candidate `bun run balance` lines (re-run on the Phase 2 tree, exit 0):

```
fights:            1680 (ko 1159, time 517, draw 4)
cap share:         517/1680 (30.8%)
decisive share:    1574/1680 (93.7%; 1159 ko + 415 cap wins at >= 5.00 pts)
cap-win quality:   415/517 cap wins clear the floor (80.3%)
duration:          min 3.96s  median 32.82s  max 40.00s
```

All 34 gates reported `ok` (21 species + `capShare` + `decisiveShare` + `capWinQuality` + `medianDuration` + `durationP05` + `durationMax` + `damageBand` + 6 boss). The clamp was live in the candidate, the trace shape changed (hash `0x1368d19b` → `0x484717a7`, median gap 1145 → 1123 mm, attack rate 0.17/s vs 0.30/s on that trace), and the metric did not move. Rejection reason: **`capShare` is equal to, not strictly lower than, baseline.**

## Revert proof

Reverted to the exact `1310de20` baseline content (read with `git show 1310de20:<path>`, written back verbatim):

- `packages/sim/src/battle/continuous/controller-reach.ts` — baseline `REACH_STANDOFF_MM`/`opponentReachMm`/`threatBandFor`; no speed-aware clamp.
- `packages/sim/src/battle/continuous/controller-reach.test.ts` — baseline 7 tests.
- `packages/sim/src/battle/continuous/fixture-audit.test.ts` — baseline drift pins A/B/C/D restored.

**Deletion completed by primary:** `packages/sim/src/battle/continuous/controller-profile.test.ts` was a Phase 2-only new file that did not exist at baseline; the subagent's deletion attempts were permission-denied, so the primary ran `git rm` on it. Final proof: `git diff --quiet 1310de206028d4b4cb10ee8aa7fad8ff927af3a6 -- packages apps` exits `0`; there is no source change in the final tree.

**Untouched by design:** `ghost.ts`, `ghost.test.ts`, `SIM_VERSION` (still 3), all fence files, `conductor/product.md`, `conductor/tech-stack.md`, all manifests, deploy/client/server files, and everything under `packages/voxel/`.

## Owner decision needed

Do **not** choose for the owner. To move D-2 forward, the owner must do exactly one of:

1. **Open a new product-decision track** that explicitly moves a **named pacing fence** (for example the `capShare` bound on the 1,680-fight matrix), with its own rationale and re-baseline; or
2. **Formally accept D-2 as open debt**, recording the acceptance in the appropriate owner-owned document.

This phase does not invent a new fence or a new target.

## AC-4 — replay guard not applicable

No policy ships, so FR-4/AC-4 does not apply. `SIM_VERSION` remains **3**; ghost pins 3/4 and `ghost.ts`/`ghost.test.ts` are unchanged. No replay-version change was made and none is needed.

## Commands run this phase

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| balance (candidate) | `bun run balance` | 0 | 1,680 fights, 34/34 gates green, capShare 30.8% (517/1680) — not strictly lower |
| balance (final tree) | `bun run balance` | 0 | identical: 34/34 green, capShare 517/1680, battle hash `0xff6f3d62` |
| verify (final tree) | `bun run verify` | `0` | Primary: 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files, hash `0xff6f3d62`; Biome clean |
| build (final tree) | `bun run build` | `0` | Vite production build, 438 modules, pre-existing >500 kB chunk warning only |
| trace (final tree) | `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | `0` | hash `0x1368d19b`, median gap 1145 mm, 5/5 invariants ok, `time — Embercub wins` |
| gate:determinism | `bun run gate:determinism` | `0` | Primary: 21 species × 3 stages + 5 props byte-identical |
| test:fuzz | `bun run test:fuzz` | `0` | Primary: 139 pass / 0 fail, 129015 `expect()` calls |

Screenshots: **N/A** (no visual layer in this phase).

## AC status

| AC | Status | Note |
| --- | --- | --- |
| AC-5 | green | 34/34 gates, fences byte-identical (balance run, both candidate and final tree) |
| AC-6 | satisfied by no-ship | no candidate achieved a strictly lower capShare |
| AC-7 | satisfied | measured grid and owner decision request present; all game-code changes reverted; source diff empty |
| AC-4 | N/A | no policy ships; version 3 and pins unchanged |
| AC-8 | green | integrated.md records exact commands, counts, hash, caps, scope proof and no-ship verdict |
| AC-9 | green | final-tree verify/build/balance/gate/fuzz all exit 0; determinism byte-identical; no allowlist |
| AC-10 | green | no manifest/schema/protocol/API/CORS/deploy/client/server change |

## Deviations

- `.conductor/evidence/kite-profile-delete.patch` — gitignored scratch reverse patch left by a denied subagent deletion attempt; not part of the tracked deliverable and not referenced by any result.

## Blockers

Resolved. The Phase 2-only test file was deleted by the primary with `git rm`, and
the two verification commands denied to the subagent were re-run by the primary
with exit 0. No open tooling blocker remains; the phase is blocked only by the
approved no-ship rule.

## Primary verification (final tree, after revert)

The primary independently re-ran every configured command separately on the
final reverted tree. All exited `0`:

| Command | Exit | Primary observation |
| --- | --- | --- |
| `bun run verify` | `0` | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files, hash `0xff6f3d62`, Biome clean |
| `bun run build` | `0` | Vite 438 modules, pre-existing >500 kB chunk warning only |
| `bun run balance` | `0` | 1680 fights, capShare 30.8% (517/1680), decisiveShare 93.7%, capWinQuality 80.3%, median 32.82s, all 34 gates ok |
| `bun run gate:determinism` | `0` | byte-identical for all species/props |
| `bun run test:fuzz` | `0` | 139 pass / 0 fail, 129015 `expect()` calls |
| pinned trace | `0` | hash `0x1368d19b`, median 1145 mm, 5/5 invariants ok |

Full output: `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-p3-verify\`.
`git diff --quiet 1310de206028d4b4cb10ee8aa7fad8ff927af3a6 -- packages apps`
exits `0`: the final tree has no source change. **Verdict: Phase 3 accepted as
BLOCKED by design (no-ship).**
