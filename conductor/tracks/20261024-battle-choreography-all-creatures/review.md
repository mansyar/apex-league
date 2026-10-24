# Review: Battle Choreography for All Creatures

- **Track:** `20261024-battle-choreography-all-creatures`
- **Type:** `feature`
- **Branch:** `feat/20261024-battle-choreography-all-creatures`
- **Range:** `4d6346b2dbe021a678888d6154e0d5d26090acd8..e20e7af`
- **Date:** `2026-10-24`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track delivers all eight FRs and ten ACs with genuine, non-vacuous test evidence and byte-frozen timing. The reviewer independently corroborated: sim/voxel untouched (`SAVE_VERSION = 25` unchanged, no diff in `packages/`), the move-fx split preserving the 15-name export surface (runtime `Object.keys` probe + type imports verified at 13 consumer sites), all six `BodyProfile`s frozen, in-band, and pairwise distinct with `reactionFor` slide/dash pinned global, and all five jitter call sites threading `step.tick` behind a non-vacuous source guard. Phase-4 evidence honesty verified against disk (per-archetype matrices on both viewports, reduced-motion A/B probe scripts, montage present uncommitted). One Medium finding: the newly authored wind look's `spin` is silently discarded by the projectile interpreter's per-frame `lookAt()`, so wind's "high-spin" property is dead config while the acceptance criterion itself (streak identity) still passes on its own terms.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit | `bun run test:phase` (capped-4 parallel) | pass — 2,517 pass / 0 fail / 1 skip, 129,166 expect, 197 files, 59 s | phase-4.md gate table |
| lint | `bunx biome check` | pass — 581 files clean | primary verification logs |
| typecheck | `bun run check` | pass — voxel 90 / sim 147 / client 362 files, 0 errors | phase-4.md |
| build | `bun run build` | pass — exit 0, 294 modules | phase-4.md |
| determinism | `bun run gate:determinism` (inside verify) | pass — 18 GLBs + 5 props byte-identical | phase-4.md, integrated.md |
| coverage | not configured (`coverage.gate: "none"`) | n/a | workflow.md |

Volume strategy: LARGE diff — reviewed per-phase checkpoint diffs (`0e0aa61..87232a5`, `e945a3b..563f195`, `7b34477..87121d0` incl. the plan-Touches amendment `e510006`), then the cross-phase integration diff; Phase 4 is evidence-only (`git diff c4897ef..HEAD -- apps packages` expected empty, corroborated via reflog + tree reads since direct git invocations were shell-denied in the reviewer sandbox — reported under Needs).

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2 | `choreo.test.ts` six-identity suite + registry-vs-table parity via `@apex/voxel` archetypes + unknown→DEFAULT | covered |
| FR-2 | P1.T1 | `steps/pure.test.ts` (exact ×1.5 scaling, phase-fraction invariance, arrival-point invariance) + the primary's deleted 220-expect differential vs pre-track formulas | covered |
| FR-3 | P1.T2.1, P4.T1 | `choreo.test.ts` (bands 0.5–1.6 / swayAmp 0.004–0.045, `Object.isFrozen`, pairwise ≥2 knobs; values re-read from choreo.ts) | covered |
| FR-4 | P2.T1 | `move-fx.test.ts:80-92` runtime `Object.keys` = 10 pre-split names + type imports at 13 consumer sites + module-size guard | covered |
| FR-5 | P2.T2 | `move-fx.test.ts:94-158` (six-element coverage, boulder non-luminous, fallback identity) | partial → F1 |
| FR-6 | P2.T3 | `move-fx.test.ts:218-255` (finisher grammar; `basalt_guard`/`zephyr_veil === DEFAULT_FX` by identity; every MOVE_FX key in sim catalog) | covered |
| FR-7 | P3.T1 | `steps/fire.test.ts` (10 tests incl. the non-vacuous call-site source guard); reviewer grep: 5/5 call sites pass `step.tick` | covered |
| FR-8 | P1.T1.4, P1.T2.3, P2.T2.3, P2.T3.3, P3.T1.3, P3.T2 | the six new/extended suites, exercised green in the primary's runs | covered |
| NFR-1 | P3.T2 | `battle-timing.test.ts` two-sided pins vs live `@apex/sim PLAYBACK_PHASES` — reviewer cross-read of sim source matches all 9 rows + 3 constants | covered |
| NFR-2 | P1.T3.1, P2.T1.3, P4.T3.2 | module-size guard + sizes re-verified at Phase 4 | covered |
| NFR-3 | plan constraints | no `any`/`@ts-ignore` in any changed production module (reviewer reads) | covered |
| NFR-4 | P1.T3.2, P2.T1.1 | choreo.ts zero imports; tables pure; looks.ts THREE-only as sanctioned | covered |
| NFR-5 | plan constraint | impulse() ×0.4 damping audited on every new beat impulse (melee.ts:69,90,93; fire.ts:78,104); reduced-instant.mjs A/B probe | covered |
| NFR-6 | P3.T1 | reviewer grep `Math.random|Date.now|performance.now` over steps → 3 hits all in fire.test.ts; determinism gate green | covered |
| AC-1 | P1.T2.1, P1.T2.2 | choreo.ts PROFILES = 6 keys + DEFAULT | covered |
| AC-2 | P1.T1 | neutral-math tests + differential | covered |
| AC-3 | P1.T2.3 | pairwise-difference ≥2 test + phase-4 on-screen distinctness | covered |
| AC-4 | P2.T1.2 | barrel runtime-surface test (10/10) + phase-2 evidence 0/0 | covered |
| AC-5 | P2.T2.1, P2.T2.2 | move-fx.test.ts:180-215 (boulder non-empty, no additive material; dust `NormalBlending`; builder determinism) | covered |
| AC-6 | P2.T3.3 | `getMove()` resolution test | covered |
| AC-7 | P3.T1 | fire.test.ts determinism/bounds/call-site tests + the phase-3 rework regression guard | covered |
| AC-8 | P4.T3 | primary gate: 2,517 pass / check 0 / biome 581 / build exit 0 | covered |
| AC-9 | P4.T2 | reviewer glob of the phase-4 evidence tree + montage-six.gif present under `.conductor/media` (uncommitted) | covered |
| AC-10 | P3.T2, P4.T3.1 | battle-timing pins vs sim source + gate green through all four phases | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Wind's authored `spin` never renders: the per-frame `lookAt()` in the projectile interpreter overwrites the quaternion**
  - **File:** `apps/client/src/fx/projectiles.ts:91-106`
  - **What:** The wind `ShotLook` (`move-fx/looks.ts:84-93`: stretch 2.1, spin 0.03, no pulse) takes the interpreter's stretch branch, whose per-frame `lookAt()` unconditionally rewrites the core quaternion — so the spin increments applied at lines 93-94 in the same frame are discarded before rendering. Wind's `spin` is dead config. (Fire keeps its spin only because its pulse branch never triggers the `lookAt`; earth has no stretch and spins fine.)
  - **Why:** FR-5 specifies wind as a "stretched high-spin flat-arc streak"; three of the four authored properties render (stretch via build-time scale + `lookAt` orientation, flat arc, wobble) but high-spin never appears, and nothing tests the interpreter end — the suite only pins the table row, so a dead authored value passes green. The streak identity itself was visually confirmed in P2.T3.4 and the Phase-4 matrix, which is why this is not a failing acceptance criterion.
  - **Fix:** The flight direction (from→to) is fixed per shot, so the per-frame `lookAt` is redundant: apply the face-downrange orientation once in `spawn()` (after core assembly, when `(look.stretch ?? 1) > 1.2`) and drop the per-frame `else-if`, letting `rotation.z`/`rotation.x` from the spin branch accumulate over the spawn-time orientation. This preserves today's behavior for water (pulse branch) and earth (no stretch) and makes wind's corkscrew real.
  - **Requirement:** FR-5
  - **Test gap:** An interpreter-level test asserting the wind core's orientation actually changes across two effect-loop frames (mesh rotation after two `projectileStep` ticks), instead of only asserting the look row's `spin` value.

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All four planned phases verified with real checkpoints: Phase 1 `87232a5`, Phase 2 `563f195`, Phase 3 `87121d0` (plus `e510006`, the mid-phase plan-Touches amendment recorded in the phase-3 evidence), Phase 4 `28c3fa3` — Phase 4 was evidence-only (no code commit), so no squash applied and its checkpoint is the phase's last commit. 11/11 tasks `[x]` with sub-tasks closed. The final diff sits within the union of the phases' Touches; the only out-of-Touches edit (`impact.ts`/`melee.ts` in Phase 3) was handled as a recorded plan amendment with rework, not a silent deviation. No task is marked complete without verification or recorded evidence. No Review Fixes phase existed at review time.

## Out of scope

- `steps/fire.ts` gains +4 bytes here relative to Phase 3's own record (`fire.ts` 6,930 → 7,024 B across phases) — measured growth from the Phase-3 wiring itself, already under cap; not a finding.
- Build module-count drift 301 (Phase 2) → 294 (Phases 3/4): both runs exit 0; recording only, no action implied.
- The pre-existing `choreo.test.ts` three-id legacy tests survive unchanged alongside the stronger six-profile suite — not reportable, as nothing was weakened.
- Falcon silhouette "chunky" art-pass and the pre-existing iPhone-15 HUD overlap are carry-over polish notes from earlier tracks, not this diff.
- Balance probes (`species-balance.test.ts`) are sim-side and out of this track's contract; untouched by the diff.

## Debt

- none — `review.strict` is `true`, so the single Medium finding is fixed in Phase R1 rather than deferred; `review.issues.enabled` is `false`, so no issues are filed.

## Doc sync

`pending` — pre-review sync landed as `e20e7af` (tech-stack dated entry); the review-fix changes are pending in Phase R1.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 0 | → Phase R1 |
