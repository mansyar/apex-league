# Phase 2 verification — Artifact regeneration and deterministic gate

- Track: `20261126-falcon-silhouette-polish`
- Phase: 2 — `Artifact regeneration and deterministic gate`
- Date: 2026-11-26
- Branch: `feat/20261126-falcon-silhouette-polish`
- Base (phase): `bd5c7067196688abd480028bbfe1950053f2962c`
- Head: `bd5c7067196688abd480028bbfe1950053f2962c` (unchanged — this phase introduced no tracked code or artifact edit)
- Track base (scope range): `84a1d1948f22a109de66f65388573cdb823ea715`
- Result: **verified** after primary execution. The subagent's three canonical exporter commands and the exact phase verification command were rejected by its sandbox; the primary ran all four successfully with no working-tree change. See `## Primary verification`.

## Commands

| # | Command | When | Exit code | Result |
|---|---------|------|-----------|--------|
| 1 | `git status --short --untracked-files=no` | baseline, before exporter | 0 | empty — clean working tree |
| 2 | `git rev-parse HEAD` | baseline | 0 | `bd5c7067196688abd480028bbfe1950053f2962c` (equals phase base) |
| 3 | `bun packages/voxel/scripts/export-artifact.ts falcon 42 baby` | independent canonical regeneration | **N/A — no exit code** | `{"error":{"type":"permission.rejected","message":"Permission denied: shell"},"content":[]}`. Not retried. |
| 4 | `bun packages/voxel/scripts/export-artifact.ts falcon 42 juvenile` | independent canonical regeneration | **N/A — no exit code** | same `permission.rejected` denial. Not retried. |
| 5 | `bun packages/voxel/scripts/export-artifact.ts falcon 42 champion` | independent canonical regeneration | **N/A — no exit code** | same `permission.rejected` denial. Not retried. |
| 6 | `bun run gate:determinism` | exact phase verification command | **N/A — no exit code** | same `permission.rejected` denial. Not retried. No gate output lines were produced. |
| 7 | `git diff --name-status 84a1d1948f22a109de66f65388573cdb823ea715..HEAD` | change scope | 0 | six falcon artifact pairs, `falcon.ts`, `falcon.test.ts`, and track Conductor state only (full list below) |
| 8 | `git diff --stat 84a1d1948f22a109de66f65388573cdb823ea715..HEAD` | change size | 0 | 15 files; GLB deltas only on `falcon-42`, `-juvenile`, `-champion` |
| 9 | `git diff --name-only c81ab889^..c81ab889` | provenance of the six artifacts | 0 | exactly the six falcon GLB/manifest files plus `falcon.ts`, `falcon.test.ts`, `plan.md`, `verification/phase-1.md` |
| 10 | `git diff --name-only bd5c7067196688abd480028bbfe1950053f2962c..HEAD -- artifacts packages apps` | phase-only scope | 0 | empty — no artifact, generated, code or test change in Phase 2 |
| 11 | `git status --short --untracked-files=no` | after all executed commands | 0 | empty — no working-tree change |

`bun` commands in rows 3–6 never started a process, so there is no exit status to record. Git commands 1, 2 and 7–11 completed normally (exit 0). No denial was retried and no `--write` / `--write-missing` flag was used.

## Blockers

| Exact command | Why it is needed | Result / expected |
|---|---|---|
| `bun packages/voxel/scripts/export-artifact.ts falcon 42 baby` | Prove the committed baby GLB+manifest are byte-identical to fresh canonical-exporter output | Denied (`permission.rejected`); expected `wrote artifacts/falcon-42.glb (115200 bytes, tris 1622) and artifacts/falcon-42.manifest.json` with no `git status` delta |
| `bun packages/voxel/scripts/export-artifact.ts falcon 42 juvenile` | Same proof for the juvenile pair | Denied (`permission.rejected`); expected `116600 bytes, tris 1614` with no working-tree delta |
| `bun packages/voxel/scripts/export-artifact.ts falcon 42 champion` | Same proof for the champion pair | Denied (`permission.rejected`); expected `131296 bytes, tris 1818` with no working-tree delta |
| `bun run gate:determinism` | Exact phase verification: all archetype stage pairs byte-identical plus all five prop digests | Denied (`permission.rejected`); expected exit 0 and `determinism gate OK:` lines for falcon baby/juvenile/champion and the 5-prop line |

The primary ran all four commands successfully and appended the real output under **## Primary verification**, closing this gap without this agent retrying a denied action. All four blockers are resolved.

## Requirement / acceptance mapping

| ID | Evidence | Status |
|----|----------|--------|
| FR-5 — regenerate three GLB+manifest pairs through the canonical exporter | Phase 1 commit `c81ab889` regenerated all six files through `export-artifact.ts` (recorded deviation in `plan.md`); the primary independently re-ran all three exporter commands with byte-identical output and no working-tree change. | pass |
| AC-4 — canonical pairs, plain gate passes, no other artifact change | No other artifact outside the six falcon files changed (`git diff --name-only 84a1d194..HEAD`); primary ran `bun run gate:determinism` → exit 0 with byte-identical lines for all 21 archetype stage pairs and 5 prop digests. | pass |
| NFR-4 — reproducibility from seed 42 / canonical exporter | Manifests pin `seed: 42`, `generatorVersion: 2`, stable `dnaHash`/`glbHash`; primary's exporter re-run produced identical byte sizes/tris and `git status` stayed clean apart from the evidence file. | pass |
| NFR-5 — no cross-species or prop drift | `git diff --name-only 84a1d194..HEAD` lists no other archetype GLB/manifest, no `artifacts/props-42.json`, no generated file, no save, sim, balance or audio file; `git diff --name-only bd5c7067..HEAD -- artifacts packages apps` is empty. | pass (scope evidence) |

## Evidence paths — committed artifact state (read, not regenerated by this agent)

- `artifacts/falcon-42.manifest.json` — `seed 42`, `generatorVersion 2`, `glbHash 482f2c1f9cdd8d954e08cf52459e6ed9b0c616660fefb98b5f81d1148e791aab`, `triCount 1622`; pivots include `wingFeatherLeft/Right`, `tailFeatherLeft/Right`; no stage signature.
- `artifacts/falcon-42-juvenile.manifest.json` — `glbHash 567feb0640647462e323f0abefda2139371dfa00fcf113cb41154ffef8b42bf7`, `triCount 1614`; four feathers plus head-parented `pinionBudLeft/Right`.
- `artifacts/falcon-42-champion.manifest.json` — `glbHash 794ae898967ea3a9aa8836dabaf6e27c0e24e7352c41e7f479df8475cedffd07`, `triCount 1818`; four feathers plus `pinionBudLeft/Right` and `crownPlumeLeft/Right`.
- All three manifests share `dnaHash bb733d85ca8b29385965cb49a5f8b228cd9d611cb1800f0df4c45e5456479b64`, confirming unchanged seed/DNA identity.
- `artifacts/props-42.json` — committed 5-prop digests (expected gate comparison targets, **not** regenerated here): `tuft b873d128…` tris 100; `bush 449fcac6…` tris 462; `broadleafTree 5ceb7ec1…` tris 1264; `rock 010d27fd…` tris 52; `foodPile ebdb5685…` tris 232. This file is unchanged in the scope range.
- The primary captured `determinism gate OK:` lines for all archetype stage pairs, including falcon baby/juvenile/champion, and the 5-prop digest line; see `## Primary verification`.

## Change scope (`84a1d194..HEAD`)

Exactly 15 files changed:

- Six falcon artifact files: `artifacts/falcon-42.glb`, `.manifest.json`, `artifacts/falcon-42-juvenile.glb`, `.manifest.json`, `artifacts/falcon-42-champion.glb`, `.manifest.json`.
- Phase 1 source/test: `packages/voxel/src/falcon.ts`, `packages/voxel/src/falcon.test.ts` (owned by Phase 1, not Phase 2).
- Track Conductor state (primary-owned): `conductor/roadmap.md`, `conductor/tracks.md`, and the track's `index.md`, `metadata.json`, `plan.md`, `spec.md`, `verification/phase-1.md`.

No other archetype, prop, generated file, manifest, save, sim, balance or audio file changed. Phase 2 itself changed nothing: `bd5c7067..HEAD` is empty and the working tree stayed clean.

## Deviations

- Phase 1 regenerated the six falcon GLB/manifest files in commit `c81ab889` although its original `Touches` listed only `falcon.ts` and `falcon.test.ts`. This is the documented, gate-enabling deviation already recorded in `plan.md`; Phase 2 records it as the provenance of the current bytes and does **not** create a second generation policy. No hand-edit of a binary or manifest was made.
- The literal requirement "no code, test … file changed" in the scope instruction cannot hold for the whole track range because Phase 1 necessarily changed `falcon.ts` and `falcon.test.ts`; those are Phase 1-owned and were already accepted. Phase 2 added zero code/test changes.
- No files outside `Touches` were modified by this phase. The evidence file itself is the only new file and is the phase's permitted artifact.

## Notes

- Four permitted `bun` invocations were denied at the shell-permission layer. Per the brief they were not retried, no workaround was attempted, and no `--write` / `--write-missing` flag was used.
- The committed manifests prove the new feather pivots and unchanged DNA/template identity are present. The primary's successful exporter re-run plus `gate:determinism` now prove byte-identical regeneration, so AC-4, FR-5 and NFR-4 are recorded as verified above.
- The full `bun run verify && bun run build` gate and the phase plan state remain primary-owned. This evidence file is left uncommitted for the primary to append `## Primary verification` and squash.

## Primary verification

- Date: 2026-11-26
- The primary ran the four commands denied to the phase agent:
  - `bun packages/voxel/scripts/export-artifact.ts falcon 42 baby` → `wrote artifacts/falcon-42.glb (115200 bytes, tris 1622) and artifacts/falcon-42.manifest.json`, exit 0.
  - `bun packages/voxel/scripts/export-artifact.ts falcon 42 juvenile` → `wrote artifacts/falcon-42-juvenile.glb (116600 bytes, tris 1614) and artifacts/falcon-42-juvenile.manifest.json`, exit 0.
  - `bun packages/voxel/scripts/export-artifact.ts falcon 42 champion` → `wrote artifacts/falcon-42-champion.glb (131296 bytes, tris 1818) and artifacts/falcon-42-champion.manifest.json`, exit 0.
  - `bun run gate:determinism` → exit 0, with `determinism gate OK` for all 21 archetype baby/juvenile/champion GLBs (including `falcon seed 42 baby/juvenile/champion regenerated byte-identical`) and `5 props seed 42 regeneration digests match`.
- `git status --porcelain` after the exporter re-runs and gate showed only `?? conductor/tracks/20261126-falcon-silhouette-polish/verification/`: no artifact byte changed, so the committed falcon pairs are canonically reproducible.
- Scope re-check: `bd5c7067196688abd480028bbfe1950053f2962c..HEAD` contains only this evidence file; `84a1d1948f22a109de66f65388573cdb823ea715..HEAD` contains only the six falcon artifact pairs, the two Phase 1 falcon source/test files, and primary-owned Conductor state. No other archetype, prop digest, generated file, code, test, save, sim or audio file changed.
- Full gate: `(bun run verify && bun run build)` was already re-run green after Phase 1 artifact regeneration (`gate_exit=0`, determinism OK for every GLB and 5 props, Vite build `dist/assets/index-BL310Ok0.js`); Phase 2 added no code or artifact delta, so the same gate result stands.
- Conclusion: FR-5, AC-4, NFR-4 and NFR-5 are satisfied; Phase 2 is accepted at checkpoint `bd5c7067`.
