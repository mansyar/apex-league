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
- **Status:** in_progress

- [ ] **P3.T1: Measure the candidate and make the ship/no-ship decision** — covers: FR-5, FR-6, AC-5, AC-6, AC-7
  - [ ] **P3.T1.1: Run `bun run balance` on the final candidate and confirm all 34 gates are green and `capShare` is strictly below the Phase 1 baseline on the same full matrix**
  - [ ] **P3.T1.2: If no in-scope candidate is both green and lower, revert every game-code change, leave `SIM_VERSION` at 3, write the measured grid and fence-decision request in `phase-3.md`, and report the phase `blocked`**
- [ ] **P3.T2: Apply the replay-version guard when policy ships** — covers: FR-4, AC-4
  - [ ] **P3.T2.1: Bump `SIM_VERSION` 3 → 4 with a dated v4 note in `ghost.ts`, and update the ghost pins from 3/4 to 4/5 with mismatched v3 bundles still rejected**
  - [ ] **P3.T2.2: Record the new battle hash, run the trace invariant gate, and re-run only the version/pin tests moved by FR-4**
- [ ] **P3.T3: Commit integrated evidence and synchronize docs** — covers: FR-7, NFR-1..NFR-6, AC-8, AC-9, AC-10
  - [ ] **P3.T3.1: Write `verification/integrated.md` with exact commands, exit codes, counts, before/after `capShare`, new hash, module caps, N/A visual note, scope proof, and the final verdict**
  - [ ] **P3.T3.2: Apply the owner-approved dated D-2 closure note to `product.md` only if the fix ships, add a dated `tech-stack.md` note for the sim/replay change, and prove no dependency, save, protocol, API, CORS, deploy, client or server file changed**

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261120-kite-band-reachability/verification/phase-3.md
-->
