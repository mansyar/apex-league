# Controller Cadence Resonance Diagnostic — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

An evidence-only chore that characterizes the controller cadence resonance first documented by track `20261124-telemetry-fixture-restratification` (PR #91), quantifies its prevalence on both the 42-fight representative gate and the 1680-fight balance matrix, and produces a ranked, owner-facing decision package. The track commits only reports and a dated product pointer; it changes no shipped runtime, gate, bound, fence, sample composition, dependency, or deployment.

## Problem / Motivation

PR #91 re-stratified `bun run telemetry` to midpoint stats with press doctrine over the same 42 stride-11 pairings and one seed each, and preserved the historical reference + split sample as an ungated `--smoke` diagnostic. Under the new representative composition exactly one fight — `gale_moth v emberwing`, seed `20261146` — ends at the 45 s cap with zero commits, zero contact, and 100% idle. The archived root-cause probe shows `threatBandFor` lifting the press safe floor to `opponentReachMm + REACH_STANDOFF_MM` (80 mm), about 826 mm for that body pair; at midpoint speed 14 a body travels roughly 450 mm per 240 ms decision tick, so every tick samples the gap either below the retreat floor or above the ~1270-1372 mm hold point and never reaches the press branch in `controller.ts`. Pooled means over 42 fights hide the artifact; only the per-fight structural assertion sees it.

Track `20261117-global-pacing` already tried global `DECISION_MS` changes (240 to 200, and 220) and rejected them because four species win-rate bands broke; product.md requires a controller-family change or a new product decision for any future pacing attempt, and the 2026-11-24 note records this resonance as a separate follow-up. Without a prevalence map and ranked options, any fix would be guesswork and could reopen D-1/D-2 or break the frozen balance gates.

## Goals & Success Metrics

- **Goal:** Turn the single known artifact into reproducible, first-class evidence of where and how often cadence resonance occurs, plus a decision package that lets the owner choose whether and how to act.
- **Metrics:**
  - Resonance count and rate under the exact detection rule on the 42-fight representative gate and the 1680-fight balance matrix.
  - Per-event distribution by species pairing, seed, speed, reach edge, safe floor, and sampled gaps.
  - Ranked options table where every option lists its exact knob, code location, validation cost, risk, and which prior decision or fence it would reopen; includes "tolerate / do nothing" as the baseline option.
  - Zero shipped changes: `git diff --quiet <base>..HEAD -- packages apps` exits 0; all configured checks stay green with battle hash `0xff6f3d62`.

## Scope

### In Scope

- Reproduce the known artifact and mechanism from imported PR #91 evidence with first-class commands.
- Write gitignored scratch instrumentation that scans both frozen samples using the exact detection rule.
- Record a per-event inventory and decomposed decision trace for every resonance event.
- Produce a ranked decision-options table with validation cost and prior-decision impact.
- Re-run all configured checks, prove the freeze and scope boundaries, and commit integrated evidence.
- Add one dated `conductor/product.md` note pointing to the evidence and explicitly deferring any decision to the owner.

### Out of Scope

- Any tracked change under `packages/` or `apps/`, including controller cadence, reach standoff, hysteresis, species stats, body profiles, kits, tactics, resolver, gates, or `SIM_VERSION`.
- Any change to `BOUNDS`, the D-1 `≤1/3` cap-share fence, the 1680-fight matrix, the 42-fight representative sample, its stride-11 walk, one-seed budget, or the `--smoke` historical sample.
- Implementing any fix option, re-pinning a band, widening a bound, or changing a game gate to force a resonance away.
- Reopening D-1, D-2, D-3, or D-4 closures, or changing the hardware device-lab pass status.
- New dependency, manifest, schema, API, CORS, deployment, client, or server change; new allowlist; credential, token, or player data.
- Remote mutation of any kind (push, force-push, reset, rebase, clean, branch delete, remote ref write).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Reproduce the baseline artifact and mechanism from PR #91 with first-class command output: representative gate `5/42`, smoke `11/42`, the named zero-commit fight, frozen hash `0xff6f3d62`, and the safe-floor/cadence explanation. | must |
| FR-2 | Provide a deterministic, gitignored scratch diagnostic that scans the 42 representative fights and the 1680 matrix fights under their existing frozen compositions and applies the exact resonance rule: both `commits` zero, `idle` equal to 1, and `contact` equal to 0. | must |
| FR-3 | Record a committed resonance inventory with per-event fields (pairing, seed, stat basis, doctrine, speed, reach edge, safe floor, sampled gaps, commits, idle, contact, duration) and explicit counts for both samples, including whether the known fight is unique. | must |
| FR-4 | Decompose the mechanism per event with a decision-tick trace excerpt showing retreat/advance gap samples against the safe floor and hold point, cadence and travel-per-tick figures, and an explicit statement distinguishing resonance from a stat-bound violation. | must |
| FR-5 | Produce a committed, ranked decision-options table including the "tolerate / do nothing (AC-11)" baseline; every option names the exact knob and code location, expected effect, validation commands, risk, and which prior decision or fence it would reopen. | must |
| FR-6 | Prove the frozen state is unchanged by re-running all configured checks and showing an empty source diff, unchanged bounds/sample/fence/hash, unchanged module caps, and no new dependency or allowlist. | must |
| FR-7 | Commit `verification/integrated.md` and one dated `conductor/product.md` note that points to the evidence and explicitly defers any fix decision to the owner. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No tracked change under `packages/` or `apps/`; `git diff --quiet <base>..HEAD -- packages apps` exits 0. |
| NFR-2 | No change to `SIM_VERSION`, `BOUNDS`, `CAP_MAX`, the D-1 `≤1/3` fence, sample size/seeds/stride, smoke semantics, species bands, controller constants, reach tables, or body profiles. |
| NFR-3 | No dependency, manifest, schema, API, CORS, deployment, client, or server change; no new allowlist; module caps remain 12,288 B for client/sim/server and 24,576 B for voxel. |
| NFR-4 | Scratch diagnostics live only under gitignored `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/`; no scratch runtime code is committed. |
| NFR-5 | No credential, token, passphrase, or player data in any artifact; no remote-mutating command is executed. |
| NFR-6 | All configured checks pass: `bun run verify` (hash `0xff6f3d62`), `bun run build`, `bun run balance`, `bun run gate:determinism`, `bun run test:fuzz`, `bun run telemetry`, `bun packages/sim/scripts/battle-telemetry.ts --smoke`, `bun run fixture-audit`; plus `git diff --check` clean and a clean worktree. |
| NFR-7 | Any scratch TypeScript follows the Google TypeScript style summary in `conductor/code_styleguides/typescript.md`: double quotes, named exports, `const`/`let`, no `any`, no default exports, no `var`, no `namespace`, no `#private`, no `const enum`, and triple equals; Biome wins on any conflict. |
| NFR-8 | The 42-fight budget and one-seed budget stay fixed; the diagnostic adds no runtime work to shipped code paths. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Baseline record shows first-class exit-0 outputs for the representative gate, smoke, and fixture audit, the named zero-commit fight, and the safe-floor/cadence mechanism with hash `0xff6f3d62`. | FR-1 |
| AC-2 | Gitignored scratch diagnostic exists, runs deterministically, and prints resonance counts for the 42-fight gate and 1680-fight matrix under the exact rule from FR-2. | FR-2 |
| AC-3 | Committed resonance inventory contains the per-event table and explicit counts, including a clear statement of whether `gale_moth v emberwing` at `20261146` is the only event. | FR-3 |
| AC-4 | Committed mechanism decomposition contains a decision-trace excerpt with gap/floor/hold-point figures, cadence and travel per tick, and the resonance-vs-bound-violation conclusion for every event. | FR-4 |
| AC-5 | Committed ranked options table includes the tolerate baseline and satisfies the per-option fields in FR-5; no option is implemented in this track. | FR-5, FR-7 |
| AC-6 | `git diff --quiet <base>..HEAD -- packages apps` exits 0, all NFR-6 checks exit 0 with hash `0xff6f3d62`, and the diff shows no bound, fence, sample, module-cap, dependency, or allowlist change. | FR-6, NFR-1, NFR-2, NFR-3, NFR-6 |
| AC-7 | `verification/integrated.md` is committed with baseline, inventory, mechanism, options, freeze proof, scope proof, and an AC-1..AC-10 mapping. | FR-7 |
| AC-8 | One dated `conductor/product.md` note points to the track evidence and explicitly defers the fix decision to the owner without changing any roadmap, fence, or debt status. | FR-7 |
| AC-9 | Final name-status shows only Conductor artifacts plus the scratch evidence under gitignored paths; `git status --porcelain` is empty and `git diff --check` exits 0. | NFR-1, NFR-4, NFR-5 |
| AC-10 | No fix, band re-pin, bound change, gate change, or sample change was made; the track stops and reports even if a seemingly safe fix is found. | FR-5, NFR-2 |

## Edge Cases

- If the full matrix reveals additional resonance events, record every event and do not widen the detection rule to make the count smaller.
- If a candidate option looks trivially safe, stop and report it; do not implement it in this track.
- If `bun run verify` reproduces the known load-induced `gatekeeper-reach` timeout, isolate that single test once under low load as prior tracks did; do not re-run the full sweep or change a gate to force green.
- If a read-only command is denied by a phase subagent's shell permission layer, record the exact command and outcome; the primary may run the identical command unchanged as an autonomous fallback, with first-class output appended to evidence.
- If the imported archived scratch evidence is missing from the local worktree, fall back to the committed `verification/` reports and state the substitution explicitly.
- If no resonance event appears in the matrix, report zero explicitly rather than omitting the row.

## Dependencies

- **Tracks:** `20261124-telemetry-fixture-restratification`, `20261117-global-pacing`, `20261111-minimum-reach`, `20261120-kite-band-reachability` — all complete and merged; imported as evidence only.
- **External:** none. `gh` remains authenticated for the eventual PR, but no external service is required for the diagnostic.

## Open Questions & Assumptions

- **Question (owner, intentionally left open):** Should the resonance be tolerated under AC-11, or should a future product decision authorize one of the ranked controller changes?
- **Assumption:** The 1680-fight matrix continues to use the standard press doctrine with typical midpoint stats, as implemented by `bun run balance`; the diagnostic reads that existing composition rather than inventing a new one.
- **Assumption:** The exact detection rule from the owner's 2026-11-24 decision is both commits zero, idle exactly 1, and contact exactly 0; near-resonant stalls are recorded as notes but are not counted as events.

## References

- PR #91: https://github.com/mansyar/apex-league/pull/91
- `conductor/archive/20261124-telemetry-fixture-restratification/spec.md` — frozen bound derivation and AC-11.
- `conductor/archive/20261124-telemetry-fixture-restratification/verification/integrated.md` — §3 bound table and §AC-11 artifact.
- `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/root-cause.txt` — four-cell counts, decision trace, and cadence mechanism.
- `conductor/archive/20261117-global-pacing/verification/integrated.md` §3 — rejected global `DECISION_MS` rungs.
- `conductor/product.md` 2026-11-24 note — owner direction and hardware device-lab out of scope.
- Source references: `packages/sim/src/battle/continuous/controller.ts`, `controller-reach.ts`, `controller-profile.ts`, `controller-state.ts`, `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/scripts/battle-balance-report.ts`.
