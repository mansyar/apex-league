# Review: Fire Move Identity

- **Track:** `20261028-fire-move-identity`
- **Type:** `feature`
- **Branch:** `feat/20261028-fire-move-identity`
- **Range:** `50e083d8..9dfbec38`
- **Date:** `2026-10-29T00:30:00Z`
- **Verdict:** `PASS`

## Summary

All 8 fire identities delivered with unit pins, Move Lab GIFs, user sign-off,
and a green gate. The per-row look override, four geometry pieces, zero-shot
dash trio, spear, and grounded tower all read correctly in review of the diff
and evidence. Four Low nits found (dead gather builder, stale jet comment,
unjustified cast, plan typo); nothing above Low, so no fix round is forced by
severity — a single R1 round addresses them for strict-mode compliance.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun run verify` | pass | 3503 pass / 1 skip / 0 fail; determinism gate OK (all species x stages + 5 props) |
| lint | `biome check` (inside verify) | pass | clean |
| typecheck | `bun run check` (inside verify) | pass | 160+169+44+468 files, no errors |
| build | `bun run build` | pass | exit 0, pre-existing chunk-size warning only |

Note: the `smoke: RESULT fail` line in verify output is the known
negative-path probe inside `smoke.test.ts` itself, not a failure (0 fail).

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1–T3 (`looks.ts` override table + `lookFor`; `moveId` threading in `projectiles.ts`, `staging-fx.ts`) | `look-override.test.ts` fallthrough/merge/identity pins | covered |
| FR-2 | P2.T1 (spark fork row) | `fallback.test.ts` + `fire-spark.gif` | covered |
| FR-3 | P3.T1 (cinder chunk row) | `fallback.test.ts` + `fire-cinder_shot.gif` | covered |
| FR-4 | P2.T2 (flare needle row) | `fallback.test.ts` + `fire-flare_dart.gif` | covered |
| FR-5 | P3.T2 (blaze gather + jet bloom) | `fallback.test.ts` + `fire-blaze_bolt.gif` | covered |
| FR-6 | P4.T1 + P7.T3 (grounded tower) | `fallback.test.ts` grounded-height pins + `fire-pyre_wall.gif` | covered |
| FR-7 | P5.T1–T3 + P7.T1–T2 (transit trail, spear, zero-shot bodies) | `fallback.test.ts` trio/transit/exit/envelope/spear pins + 3 re-captured GIFs | covered |
| FR-8 | P6.T1 | 8-GIF catalog (`phase-6.md`) + 4 re-captures (`phase-7.md`) | covered |
| NFR-1 | P7.T4 extraction | `module-size.test.ts` 12,288 B cap, gate green | covered |
| NFR-2 | — | name-only diff: client + conductor only | covered |
| NFR-3 | — | name-only diff: no save/deps changes; hues single-sourced | covered |
| NFR-4 | — | name-only diff: no audio paths | covered |
| NFR-5 | reduced-motion dampening | reduced-motion pins; no perf harness exists | partial |
| AC-1 | P2.T1 | spark GIF + grayscale | covered |
| AC-2 | P3.T1 | cinder GIF + grayscale | covered |
| AC-3 | P2.T2 | flare GIF + grayscale | covered |
| AC-4 | P3.T2 | blaze GIF + grayscale | covered |
| AC-5 | P4.T1 + P7.T3 | wall GIF (ground eruption frame-verified) + grayscale | covered |
| AC-6 | P5 + P7.T1–T2 | charge/dive/lance GIFs + grayscale | covered |
| AC-7 | P6.T2 | gate green + user "good" on 4 rework GIFs | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — dead exported gather builder inflates a size-capped module**
  - **File:** `apps/client/src/fx/shot-geometry.ts:240-294`
  - **What:** `buildGather`/`GATHER_MOTES` (plus the `jitter` import used only by
    it) have zero production call sites; only `look-override.test.ts`
    references them. Blaze Bolt's draw-in renders via the generic charge orb.
  - **Why:** Dead code in a size-capped module; leaves FR-5's gather mechanism
    ambiguous for future readers.
  - **Fix:** Delete `buildGather`, `GATHER_MOTES`, the `jitter` import, and the
    orphaned pins (deletion preferred over wiring: safer in a fix round).
  - **Requirement:** FR-5
  - **Test gap:** remove orphaned pins with the deletion
- **F2 — stale comment misattributes the jet geometry**
  - **File:** `apps/client/src/fx/shot-geometry.ts:188-191`
  - **What:** Comment labels the jet core as Pyre Wall's pillar; jet is Blaze
    Bolt's flight geometry and the wall flies zero shots.
  - **Fix:** Reword to name Blaze Bolt's charged comet head.
  - **Requirement:** FR-5
- **F3 — unjustified `as` cast on a partial object**
  - **File:** `apps/client/src/steps/fire.ts:252-254`
  - **What:** `{ group: { position: exit } as THREE.Group }` — a type lie with
    no justification; runtime-safe today (spawn only reads `.group.position`).
  - **Fix:** Widen `spawn`/`spawnProjectile` signatures to accept
    `{ group: { position: THREE.Vector3 } }` and drop the cast, or add the
    justification comment.
  - **Requirement:** FR-7
- **F4 — plan typo (doc-only, implementation correct)**
  - **File:** `conductor/tracks/20261028-fire-move-identity/plan.md:75`
  - **What:** Phase-5 Touches lists `apps/client/src/move-fx/steps/fire.ts`;
    the real module is `apps/client/src/steps/fire.ts`.
  - **Fix:** Correct the path.
  - **Requirement:** none

## Overrides

- <none>

## Plan compliance

All 7 phases verified with per-phase evidence docs; per-phase checkpoint
ranges line up with the claimed task commits. Touches respected — one typo
(F4). Minor doc drift (not a finding): `phase-7.md` "Files changed" omits the
two extraction modules and its Changes section says the spear builder lives in
`shot-geometry.ts` while it now lives in `shot-spear.ts` via delegation —
touched up in R1.

## Out of scope

None. Name-only diff confirms zero changes outside `apps/client/src` +
`conductor/`. NFR-5 is `partial`: reduced-motion is pinned, but the repo has
no frame-rate harness, so "no regression" rests on the green gate plus the
legibility passes.

## Debt

- <none> (all 4 Lows addressed in R1 below; nothing deferred)

## Doc sync

`pending` — product/tech-stack dated notes after R1 fixes land.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 4 | 4 |
| 2 | PASS | 0 | 0 | 0 | 0 | — |
