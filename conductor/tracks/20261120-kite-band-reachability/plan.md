# D-2 Kite Band Reachability — Implementation Plan

> **Branch:** `chore/20261120-kite-band-reachability`
> **Base:** `main` @ `1310de206028d4b4cb10ee8aa7fad8ff927af3a6`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Baseline and slow-kiter reproduction

- **Goal:** the current matrix `capShare` and the `spd 5` Kite-band defect are
  recorded from an unchanged source tree, before any controller policy moves.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `conductor/tracks/20261120-kite-band-reachability/verification/phase-1.md`, `.conductor/evidence/20261120-kite-band-reachability/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; plus `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
- **Status:** verified

- [x] **P1.T1: Record the unchanged full-matrix baseline** — covers: FR-1
  - [x] **P1.T1.1: Run `bun run balance` and record `capShare`, `decisiveShare`, `capWinQuality`, `medianDuration`, and all 34 gate results in `verification/phase-1.md`**
  - [x] **P1.T1.2: Record the Kite doctrine row and the current battle hash, and cite the exact command output or saved artifact for each number**
- [x] **P1.T2: Reproduce the unreachable slow-kiter band** — covers: FR-1
  - [x] **P1.T2.1: Run the pinned `earth_tortoise` (Kite) vs `embercub` (Press) trace and record reach edge, Kite floor/preferred gap, median gap, retreat count, commit count, and ending reason**
  - [x] **P1.T2.2: State the measured gap between doctrinal floor and the gap the `spd 5` body can maintain, naming the source lines that prove each side of the comparison**
- [x] **P1.T3: Write the baseline evidence and prove no source changed** — covers: FR-1, AC-1
  - [x] **P1.T3.1: Write `verification/phase-1.md` with the baseline table, reproduction, and the exact five-command results**
  - [x] **P1.T3.2: Confirm `git diff <base>..HEAD -- packages apps` is empty apart from the evidence file, so the baseline is not contaminated by a policy change**

**Result:** verified — baseline `capShare 30.8% (517/1680)` with all 34 gates green; slow-kiter trace pinned at hash `0x1368d19b`; source tree unchanged. Five configured commands independently re-run by primary, all exit 0.
**Checkpoint:** `474cfe21`
**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-1.md

## Phase 2: Speed-aware reachable Kite band

- **Goal:** a pure integer reachability clamp keeps Kite's floor and hold point
  within a gap the fighter's speed can maintain, with failing-first tests and
  every band invariant preserved.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, AC-2, AC-3
- **Touches:** `packages/sim/src/battle/continuous/controller-profile.ts`, `packages/sim/src/battle/continuous/controller-reach.ts`, `packages/sim/src/battle/continuous/controller-profile.test.ts`, `packages/sim/src/battle/continuous/controller-reach.test.ts`, `conductor/tracks/20261120-kite-band-reachability/verification/phase-2.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; plus `bun test packages/sim/src/battle/continuous/controller-profile.test.ts packages/sim/src/battle/continuous/controller-reach.test.ts --timeout 120000`
- **Status:** verified

- [x] **P2.T1: Add failing-first pure tests** — covers: FR-2, FR-3, AC-2, AC-3
  - [x] **P2.T1.1: Add a slow-kiter test that fails before the fix: a `spd 5` Kite floor/hold beyond the maintainable gap against a faster Press foe**
  - [x] **P2.T1.2: Add invariant cases for equal speed, fast Kite vs slow foe, very slow Kite vs much faster foe, all three temperaments, and differing radii; assert floor ≤ preferred ≤ ceiling and floor never inside the reach edge**
- [x] **P2.T2: Implement the reachability clamp** — covers: FR-2, FR-3
  - [x] **P2.T2.1: Add a deterministic integer helper that derives the maximum maintainable gap from own/foe top speed and the pair's reach edge, with no floating-point policy decision, real timer, network or RNG use**
  - [x] **P2.T2.2: Apply it only to the Kite doctrine's band construction in `bandFor`/`threatBandFor`; leave movement kinematics, dodge, stamina, frame data, damage, other doctrines and every fence untouched**
- [x] **P2.T3: Verify the focused change** — covers: AC-2, AC-3, NFR-3, NFR-5
  - [x] **P2.T3.1: Run the focused controller tests and record the before/after pass counts in `verification/phase-2.md`**
  - [x] **P2.T3.2: Run the five configured verification commands separately; if any gate is red, report `blocked` with the exact failure and do not proceed to ship**

**Result:** verified as a candidate — failing-first slow-kiter test moved from `11 pass / 5 fail` to `16 pass / 0 fail`; integer-only Kite clamp preserves all band invariants; five configured commands independently re-run with exit 0. `capShare` remains 30.8%, so ship/no-ship is Phase 3.
**Checkpoint:** `7fb66b04`
**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-2.md

## Phase 3: Measured decision, replay guard, and evidence

- **Goal:** the candidate either ships with a strictly lower matrix `capShare`
  and all gates green, or it is reverted and the phase reports `blocked` with a
  measured grid; a shipped policy also carries the replay-version guard and
  owner-approved documentation closure.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, FR-6, FR-7, NFR-1..NFR-6, AC-4..AC-10
- **Touches:** `packages/sim/src/cup/ghost.ts`, `packages/sim/src/cup/ghost.test.ts`, `conductor/tracks/20261120-kite-band-reachability/verification/integrated.md`, `conductor/tracks/20261120-kite-band-reachability/verification/phase-3.md`, `conductor/product.md`, `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; plus `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
- **Status:** blocked

- [x] **P3.T1: Measure the candidate and make the ship/no-ship decision** — covers: FR-5, FR-6, AC-5, AC-6, AC-7
  - [x] **P3.T1.1: Run `bun run balance` on the final candidate and confirm all 34 gates are green and `capShare` is strictly below the Phase 1 baseline on the same full matrix**
  - [x] **P3.T1.2: If no in-scope candidate is both green and lower, revert every game-code change, leave `SIM_VERSION` at 3, write the measured grid and fence-decision request in `phase-3.md`, and report the phase `blocked`**
- [ ] **P3.T2: Apply the replay-version guard when policy ships** — covers: FR-4, AC-4
  - [ ] **P3.T2.1: Bump `SIM_VERSION` 3 → 4 with a dated v4 note in `ghost.ts`, and update the ghost pins from 3/4 to 4/5 with mismatched v3 bundles still rejected**
  - [ ] **P3.T2.2: Record the new battle hash, run the trace invariant gate, and re-run only the version/pin tests moved by FR-4**
- [x] **P3.T3: Commit integrated evidence and synchronize docs** — covers: FR-7, NFR-1..NFR-6, AC-8, AC-9, AC-10
  - [x] **P3.T3.1: Write `verification/integrated.md` with exact commands, exit codes, counts, before/after `capShare`, new hash, module caps, N/A visual note, scope proof, and the final verdict**
  - [x] **P3.T3.2: Apply the owner-approved dated D-2 closure note to `product.md` only if the fix ships, add a dated `tech-stack.md` note for the sim/replay change, and prove no dependency, save, protocol, API, CORS, deploy, client or server file changed**

**Result:** blocked by design - no policy shipped. Candidate `capShare` equalled the baseline (30.8% / 517 of 1680), so all game-code changes were reverted; final tree has no source diff and all five configured commands plus the pinned trace are green. P3.T2 (replay guard) is not applicable because no policy ships; `SIM_VERSION` remains 3. Owner decision recorded in evidence: move a named pacing fence in a new product-decision track, or accept D-2 as open debt.
**Checkpoint:** `a5ee16ca`
**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-3.md

## Phase 4: Owner-approved Kite clamp and 45s cap extension

- **Goal:** re-apply the validated speed-aware Kite clamp, extend the single
  approved pacing fence from 40s to 45s, carry the replay-version guard, and
  ship only if all 34 gates stay green and `capShare` is strictly below the
  Phase 1 baseline on the same 1680-fight matrix.
- **Depends on:** Phase 3
- **Covers:** FR-8, FR-9, FR-10, FR-4..FR-7, NFR-1..NFR-6, AC-11, AC-12, AC-13, AC-4..AC-10
- **Touches:** `packages/sim/src/battle/continuous/controller-reach.ts`, `controller-reach.test.ts`, `controller-profile.test.ts`, `fixture-audit.test.ts`, `resolve.ts`, `pacing.test.ts`, `resolve.test.ts`, `battle-trace.test.ts`, `telemetry.test.ts`, `balance-report.test.ts`, `packages/sim/src/cup/ghost.ts`, `ghost.test.ts`, `packages/sim/scripts/battle-balance-report.ts`, `conductor/tracks/20261120-kite-band-reachability/verification/phase-4.md`, `conductor/tracks/20261120-kite-band-reachability/verification/integrated.md`, `conductor/product.md`, `conductor/tech-stack.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; plus the focused controller/ghost tests and `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check`
- **Status:** blocked

- [x] **P4.T1: Re-apply the Phase 2 Kite clamp** — covers: FR-8, AC-12
  - [x] **P4.T1.1: Restore the exact four-file source/test diff from checkpoint `7fb66b04` (`controller-reach.ts`, `controller-reach.test.ts`, `controller-profile.test.ts`, `fixture-audit.test.ts`), including the failing-first regression suite and its green post-fix counts**
  - [x] **P4.T1.2: Confirm the pure integer helper and Kite-only clamp remain unchanged and that no fence or replay change is bundled into this step**
- [x] **P4.T2: Extend the approved 40s pacing fence to 45s** — covers: FR-9, AC-11
  - [x] **P4.T2.1: Change `FIGHT_CAP_MS` in `resolve.ts`, `BAND_MAX_MS` and `DURATION_MAX_MS` in `battle-balance-report.ts` from 40_000 to 45_000 and update every pinned test that asserts those values**
  - [x] **P4.T2.2: Prove no other balance fence moves; `capShare <= 1/3`, decisiveShare, capWinQuality, duration minimum and damage bands stay at their existing values**
- [x] **P4.T3: Carry the replay-version guard** — covers: FR-10, AC-4, AC-13
  - [x] **P4.T3.1: Bump `SIM_VERSION` 3 -> 4 with a dated v4 note in `ghost.ts`; update ghost pins 3/4 -> 4/5 and prove v3 rejection plus v4 byte-identical replay**
  - [x] **P4.T3.2: Record the new battle and trace hashes in `phase-4.md`**
- [x] **P4.T4: Measure the ship/no-ship gate** — covers: FR-5, FR-6, AC-5, AC-11, AC-12
  - [x] **P4.T4.1: Run the full 1680-fight matrix and require all 34 gates green and `capShare` strictly below 30.8% (517/1680)**
  - [x] **P4.T4.2: If equal or higher, or any gate red, stop the phase as `blocked` with the measured grid and do not ship or change another fence**
- [x] **P4.T5: Record integrated evidence and owner-approved docs** — covers: FR-7, NFR-1..NFR-6, AC-8, AC-9, AC-10
  - [x] **P4.T5.1: Update `verification/integrated.md` and write `verification/phase-4.md` with exact commands, counts, hashes, module caps, scope proof and final verdict**
  - [x] **P4.T5.2: If shipped, apply the owner-approved dated D-2 closure note to `product.md` and a dated sim/replay note to `tech-stack.md`; otherwise leave both untouched**

**Result:** blocked - owner decision executed but not shipped. The clamp + 45s cap strictly lowered `capShare` to 21.3% (357/1680, AC-12 met) but turned two species gates red (32/34, AC-11 failed). All game-code changes were reverted to base `1310de20`; final tree is source-clean with all five configured commands green (verify 4448 pass / 1 skip / 0 fail, hash `0xff6f3d62`). `SIM_VERSION` stays 3, ghost pins 3/4, fight cap 40s; no product/tech-stack doc changed. A new owner decision is required (roster re-tune or accept D-2 as debt).

**Checkpoint:** `88158b57`

**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-4.md

## Phase 5: Narrow roster re-tune for D-2

- **Goal:** re-apply the Phase 4 candidate and bring the two red species gates
  inside the unchanged 45–55% band by editing only `water_axolotl` and
  `dune_jerboa` stat bounds, while keeping `capShare` strictly below baseline.
- **Depends on:** Phase 4
- **Covers:** FR-11, FR-12, AC-11, AC-12, AC-14, AC-15
- **Touches:** all Phase 4 source/test/script files plus
  `packages/sim/src/species/starters.ts`, `packages/sim/src/species/discovery.ts`,
  their focused tests, `verification/phase-5.md`, `verification/integrated.md`,
  and shipped-only `conductor/product.md` / `conductor/tech-stack.md`.
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; focused species/controller/ghost tests; pinned trace; full 1680-fight matrix with all 34 gates green and `capShare < 517/1680`.
- **Status:** in_progress

- [ ] **P5.T1: Re-apply the Phase 4 candidate** — covers: FR-11
  - [ ] **P5.T1.1: Restore the 13 game-code/test/script files from commit `9fbaabdd` (including the new `controller-profile.test.ts`) so clamp + 45s cap + v4 replay guard are active**
  - [ ] **P5.T1.2: Confirm the baseline failure grid (32/34 gates, water/dune red) is reproduced before any stat change**
- [ ] **P5.T2: Re-tune only the two red species** — covers: FR-11, FR-12, AC-14
  - [ ] **P5.T2.1: Adjust `water_axolotl` and `dune_jerboa` stat bounds only; no other species, move, kit, temperament, element or fence changes**
  - [ ] **P5.T2.2: Let failing focused tests enumerate required pins; record before/after counts and every changed value**
- [ ] **P5.T3: Prove the ship gate** — covers: AC-11, AC-12
  - [ ] **P5.T3.1: Run the full matrix and require 34/34 gates green, both species inside 45–55%, and `capShare` strictly below `517/1680`**
  - [ ] **P5.T3.2: If unattainable within the two-species scope, stop as `blocked` with the measured grid and do not touch a third species or fence**
- [ ] **P5.T4: Record evidence and shipped docs** — covers: AC-13, AC-14, AC-15
  - [ ] **P5.T4.1: Write `verification/phase-5.md` and update `verification/integrated.md` with commands, counts, hashes, module caps, scope proof and verdict**
  - [ ] **P5.T4.2: Only if shipped, apply the owner-approved dated D-2 closure note to `product.md` and v4/45s note to `tech-stack.md`**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-5.md
-->
