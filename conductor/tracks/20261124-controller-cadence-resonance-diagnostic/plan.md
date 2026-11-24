# Controller Cadence Resonance Diagnostic — Implementation Plan

> **Branch:** `chore/20261124-controller-cadence-resonance-diagnostic`
> **Base:** `main` @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Frozen baseline and resonance inventory

- **Goal:** A committed first-class baseline plus a deterministic gitignored diagnostic that counts resonance events under the exact frozen rule on both the 42-fight representative gate and the 1680-fight matrix.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, AC-1, AC-2, AC-3, NFR-1, NFR-4, NFR-5, NFR-8
- **Touches:** `conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-1.md`, `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/baseline/**`, `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/**`
- **Verification:** `bun run telemetry`; `bun packages/sim/scripts/battle-telemetry.ts --smoke`; `bun run fixture-audit`; `bun run balance`; `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts`; `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps`; `git status --porcelain`
- **Status:** verified

- [x] **P1.T1: Reproduce the frozen baseline** — covers: FR-1
  - [ ] **P1.T1.1:** Run `bun run telemetry`, `bun packages/sim/scripts/battle-telemetry.ts --smoke`, `bun run fixture-audit`, and `bun run balance` separately; record exit codes, representative `5/42`, smoke `11/42`, matrix `370/1680`, and hash `0xff6f3d62`.
  - [ ] **P1.T1.2:** Record the named artifact (`gale_moth v emberwing`, seed `20261146`) and the imported safe-floor/cadence explanation with citations to archived PR #91 evidence.
  - [ ] **P1.T1.3:** Confirm the tree is clean and the source diff against base is empty before and after the baseline sweep.
- [x] **P1.T2: Build the gitignored resonance scanner** — covers: FR-2
  - [ ] **P1.T2.1:** Implement `scan-resonance.ts` under `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/` using only existing exported harness functions and the frozen sample definitions.
  - [ ] **P1.T2.2:** Apply exactly the owner-approved rule: both `commits` zero, `idle` equal to 1, `contact` equal to 0; treat near-resonant stalls as notes, not events.
  - [ ] **P1.T2.3:** Run the scanner twice and confirm byte-identical counts and rows.
- [x] **P1.T3: Record the resonance inventory** — covers: FR-3
  - [ ] **P1.T3.1:** Print and save per-event fields (pairing, seed, stat basis, doctrine, speed, reach edge, safe floor, sampled gaps, commits, idle, contact, duration) for the gate and matrix.
  - [ ] **P1.T3.2:** State explicit counts and rates for both samples and whether the known fight is unique.
  - [ ] **P1.T3.3:** Write `verification/phase-1.md` with command table, AC-1..AC-3 mapping, scope proof, deviations, and verdict.
- [x] **P1.T4: Commit the baseline evidence** — covers: FR-1, FR-3
  - [ ] **P1.T4.1:** Commit only `verification/phase-1.md`; scratch artifacts stay gitignored.
  - [ ] **P1.T4.2:** Confirm `git status --porcelain` is empty after the commit.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-1.md
-->
**Result:** verified
**Checkpoint:** 4b7d83a9
**Evidence:** conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-1.md
## Phase 2: Mechanism decomposition and ranked decision options

- **Goal:** A committed per-event mechanism trace and a ranked, owner-facing options table that changes no runtime and defers the decision to the owner.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, AC-4, AC-5, AC-10, NFR-2, NFR-7
- **Touches:** `conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-2.md`, `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/**`, `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/options/**`
- **Verification:** `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts`; `bun run telemetry`; `bun run balance`; `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps`; `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD`; `git status --porcelain`
- **Status:** in_progress

- [ ] **P2.T1: Trace each resonance event** — covers: FR-4
  - [ ] **P2.T1.1:** Build a gitignored trace script that replays each event with the same seed, noise, and controller loop as `resolveContinuous`.
  - [ ] **P2.T1.2:** Record decision-tick excerpts with gap samples against the safe floor and hold point, cadence, and travel per tick.
  - [ ] **P2.T1.3:** State explicitly whether the signature is cadence resonance rather than a stat-bound violation.
- [ ] **P2.T2: Build the ranked options table** — covers: FR-5
  - [ ] **P2.T2.1:** Include "tolerate / do nothing (AC-11)" as the baseline option.
  - [ ] **P2.T2.2:** For every option, name the exact knob and code location, expected effect, validation commands, risk, and which prior decision or fence it would reopen.
  - [ ] **P2.T2.3:** Include the rejected global `DECISION_MS` rungs from `20261117-global-pacing` as evidence, not as a new proposal.
- [ ] **P2.T3: Commit the decision package** — covers: FR-4, FR-5
  - [ ] **P2.T3.1:** Write `verification/phase-2.md` with the trace, options table, AC-4/AC-5/AC-10 mapping, and an explicit statement that no option was implemented.
  - [ ] **P2.T3.2:** Commit only the evidence report and confirm a clean tree and empty source diff.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-2.md
-->

## Phase 3: Freeze proof, integrated evidence, and dated product pointer

- **Goal:** The full configured check suite is green with unchanged battle hash and empty source diff, and the committed integrated record plus dated product note hand the decision back to the owner.
- **Depends on:** Phase 2
- **Covers:** FR-6, FR-7, AC-6, AC-7, AC-8, AC-9, NFR-1, NFR-2, NFR-3, NFR-5, NFR-6, NFR-8
- **Touches:** `conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/integrated.md`, `conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/phase-3.md`, `conductor/product.md`, `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/final/**`
- **Verification:** `bun run verify`; `bun run build`; `bun run balance`; `bun run gate:determinism`; `bun run test:fuzz`; `bun run telemetry`; `bun packages/sim/scripts/battle-telemetry.ts --smoke`; `bun run fixture-audit`; `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD`; `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps`; `git status --porcelain`
- **Status:** pending

- [ ] **P3.T1: Re-run all configured checks** — covers: FR-6
  - [ ] **P3.T1.1:** Run `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism`, `bun run test:fuzz`, `bun run telemetry`, the `--smoke` command, and `bun run fixture-audit` separately; record exit codes and hash `0xff6f3d62`.
  - [ ] **P3.T1.2:** Isolate `gatekeeper-reach` once under low load only if the documented load-induced timeout recurs; never re-run the full sweep or widen a gate.
- [ ] **P3.T2: Prove scope and freeze** — covers: FR-6
  - [ ] **P3.T2.1:** Show `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` exits 0 and `git diff --check` is clean.
  - [ ] **P3.T2.2:** Show no change to bounds, sample, seeds, stride, fence, smoke semantics, module caps, dependencies, allowlists, or credentials.
  - [ ] **P3.T2.3:** Confirm a clean tree and that local branches and remote heads were not mutated.
- [ ] **P3.T3: Write integrated evidence** — covers: FR-7
  - [ ] **P3.T3.1:** Write `verification/integrated.md` covering baseline, inventory, mechanism, ranked options, freeze proof, scope proof, and an AC-1..AC-10 mapping.
  - [ ] **P3.T3.2:** Write `verification/phase-3.md` with the command table, AC mapping, and verdict.
- [ ] **P3.T4: Add the dated product pointer and commit** — covers: FR-7
  - [ ] **P3.T4.1:** Add one dated `conductor/product.md` note pointing to the track evidence and explicitly deferring the fix decision to the owner.
  - [ ] **P3.T4.2:** Commit the evidence and product note together, then confirm a clean tree and empty source diff.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261124-controller-cadence-resonance-diagnostic/verification/integrated.md
-->
