# Review: Roster Wave 1

- **Track:** 20261118-roster-wave-1
- **Type:** feature (medium)
- **Branch:** feat/20261118-roster-wave-1
- **Range:** 99c07b35bb01fc658cf646f9e89bb67c4d81eaad..3e08fb81
- **Date:** 2026-11-18
- **Verdict:** PASS (round 1 PASS WITH FINDINGS; round 2 delta BLOCK on an evidence-provenance error; round 3 delta PASS after R2)

## Summary

All three breeding-discovery species, six branch forms, three voxel archetypes, nine seed-42 artifact pairs, and client discoverability surfaces are present and consistent with the specification, plan, and evidence. The hard balance gate remains at 18/18 with no waivers or threshold changes; determinism and full fuzz gates are green. Round 1 raised one Low finding (stale 15-species telemetry doc block), fixed in R1. The round-2 delta confirmed F1 fixed but raised one Low evidence-provenance finding (pre-squash SHA in phase-R1.md), fixed in R2. The final delta re-review returned PASS with no new findings. No Critical, High, or Medium findings were raised in any round.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static | `bun run check` | pass | review run |
| Static | `bunx biome check` | pass — 974 files, no fixes | verification/integrated.md |
| Unit | `bun test --check --parallel --timeout 120000` | 4302 pass / 1 skip / 0 fail, 585613 `expect()` calls | verification/integrated.md |
| Determinism | `bun run gate:determinism` | OK — 54 seed-42 pairs + 5 props, hash `0xff6f3d62` | primary standalone re-run during review |
| Balance | `bun run balance` | 18/18, cap 384/1224 (31.4%), no waivers | verification/integrated.md |
| Build | `bun run build` | pass — Vite 423 modules | verification/integrated.md |
| Fuzz | `bun run test:fuzz` | 118 pass / 0 fail | verification/integrated.md |
| Visual | `playwright-cli` desktop 1440×900 + iPhone 393×852, primary 852×393 check | screenshots present, console 0 errors/0 warnings in phase flow | verification/phase-2.md |
| Phase gate | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | exit 0 at both phase heads | phase-1.md, phase-2.md |

## Requirements

| ID | Status | Note |
| --- | --- | --- |
| FR-1 | covered | three species definitions with unique IDs, kits, bounds |
| FR-2 | covered | three order-independent recipes, no collisions |
| FR-3 | covered | six branch forms, globally unique signatures |
| FR-4 | covered | three voxel archetypes, budgets, body/choreography profiles |
| FR-5 | covered | nine new seed-42 pairs, 45 existing pairs byte-identical |
| FR-6 | covered | 18/18 balance, no waivers or gate changes |
| FR-7 | covered | handbook recipe rows and per-archetype gallery URLs; rival-field tests updated |
| FR-8 | covered | desktop and 393px screenshots with clean console |
| FR-9 | covered | only approved sim/voxel/artifact/client content surfaces changed |
| NFR-1 | covered | determinism gate OK for 54 pairs + 5 props |
| NFR-2 | covered | module-size caps asserted in verify |
| NFR-3 | covered | no dependency, schema, SIM_VERSION, or threshold change |
| NFR-4 | covered | no page horizontal scroll at 393×852 or 852×393; console clean in phase flow |
| NFR-5 | covered | evidence records commands, counts, figures, hashes, paths |
| NFR-6 | covered | full fuzz 118 pass / 0 fail |
| AC-1 | covered | species catalog assertions |
| AC-2 | covered | recipe order-independence tests |
| AC-3 | covered | branch/boss signature tests |
| AC-4 | covered | archetype, boundary, proportion, choreography tests |
| AC-5 | covered | artifact hashes and determinism gate |
| AC-6 | covered | balance 18/18 |
| AC-7 | covered | handbook test and screenshots |
| AC-8 | covered | phase-2 visual evidence |
| AC-9 | covered | all required commands exit 0 |
| AC-10 | covered | scope proof against base |

## Findings

### Critical

None.

### High

None.

### Medium

None.

### Low

**F1 — stale telemetry pairing doc block**

- **File:** `packages/sim/scripts/battle-telemetry.ts:254-259`
- **What:** The matchup doc block was partly updated for 18 species and stride 11, but the code example still says `gcd(11, 15) = 1` and the Distinctness paragraph still describes `i % 15`, `floor(i / 15)`, modulo 15, and `below 225`.
- **Why:** The comment contradicts the implementation (`roster.length` = 18, 42 pairings, `gcd(11, 18) = 1`). Functional coverage was verified correct, so this is documentation-only, but strict mode requires resolution.
- **Fix:** Change the example to `gcd(11, 18) = 1`; rewrite the paragraph with 18 instead of 15 and `below 42` instead of `below 225`; optionally mention the mirror-hop start of 9.
- **Requirement:** general style rule (documentation matches code)
- **Test gap:** none

### Resolution (rounds 2 and 3)

- **F1** fixed in R1: the telemetry matchup doc block now uses `gcd(11, 18)`, 18-species modulo/lap formulas, `below 42`, and mentions mirror-hop start 9. No behavior changed; full gate green at checkpoint `b198c03f`.
- **F2** raised in the round-2 delta: `verification/phase-R1.md` cited pre-squash SHA `a1b2bbf2` as Head/F1 commit/git-log output. Fixed in R2 by recording reviewed HEAD `7d6c53c1` and real checkpoint `b198c03f`; evidence at `verification/phase-R2.md`, checkpoint `d66f37fc`. Final delta re-review PASS with no new findings.

## Overrides

None. `review.strict` is true, so both Low findings were fixed rather than deferred.

## Plan compliance

Both phases are verified with checkpoints `0dc9995c` and `51b03182` and complete evidence files. Post-phase stabilization `3e08fb81` changed only test timeouts (20 s→60 s, 120 s→240 s, implicit 120 s→240 s) with assertions, seeds, budgets, fixtures, and gates unchanged. All documented deviations were reviewed and accepted: choreography BodyProfile rows, narrow falcon co-fastest exception, pre-wave roster filter for the pacing debt diagnostic, telemetry mirror-hop start 9 with stride 11, and refreshed 18-species diagnostic pins.

## Out of scope

- Conductor prose and state files; gitignored evidence artifacts
- Binary GLB bytes reviewed through source, manifests, hashes, exporter commands, and gate proof
- Pre-existing 393px gallery specimen clipping and favicon 404; no page horizontal scroll and controls remain unoccluded
- Gallery mixed-mode registry rotation; new archetypes reachable via `?archetype=` URLs with no hardcoded species list
- Physical device-lab verification (human-only roadmap item)

## Debt

No debt recorded. Issues are disabled for this project.

## Doc sync

updated — product.md and tech-stack.md were synced pre-review with owner approval; post-review records resolved F1/F2 and final PASS in metadata with `doc_sync: updated`.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
| 2 (delta) | BLOCK | 0 | 0 | 0 | 1 | 1 |
| 3 (delta) | PASS | 0 | 0 | 0 | 0 | 1 |
