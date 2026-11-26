# Integrated verification — Falcon silhouette polish

- Track: `20261126-falcon-silhouette-polish`
- Phase: integrated (Phases 1–3)
- Date: 2026-11-26
- Branch: `feat/20261126-falcon-silhouette-polish`
- Track base (scope range): `84a1d1948f22a109de66f65388573cdb823ea715` (parent of track init `7fc4e2f6`)
- Phase 3 base / final head: `745164acbc9b9ea83ab00b5ffae3701d6253f9e4`
- Covers: FR-1..FR-7, AC-1..AC-7, NFR-1..NFR-5 as recorded across the three phase evidence files
- Result: **verified** — every configured gate layer is green and the final diff stays inside the accepted falcon-only scope.

## Commands

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `bun run check` (via `bun run verify && bun run build`) | 0 | `@apex/voxel` 214 files, `@apex/sim` 253 files, `@apex/server` 185 files, `@apex/client` 560 files — no type errors. |
| 2 | `bun test --check --parallel --timeout 120000` (via same gate) | 0 | `4585 pass`, `1 skip`, `0 fail`, `676332 expect() calls`, `Ran 4586 tests across 445 files [231.97s]`. |
| 3 | `biome check` (via same gate) | 0 | `Checked 1060 files in 1655ms. No fixes applied.` |
| 4 | `bun run gate:determinism` (via same gate) | 0 | All 21 archetype stage pairs byte-identical and 5 props digests match; falcon baby 115200 bytes / 1622 tris, juvenile 116600 / 1614, champion 131296 / 1818. |
| 5 | `bun run --filter @apex/client build` (via same gate) | 0 | `✓ built in 571ms`; `dist/assets/index-BL310Ok0.js` (1,109.86 kB). Only the chunk-size advisory was emitted. |
| 6 | `bun run verify && bun run build` (exact phase verification command) | 0 | Whole command exited 0; no output beyond the green layers above. |
| 7 | `bun run dev` | 0 | Vite v8.3.4 at `http://localhost:5173/`; used for the real-UI visual layer. |
| 8 | `playwright-cli open` / `resize 1440 900` / `goto` / `reload` / `console` | 0 | Desktop 1440×900 confirmed before navigation; final console `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| 9 | `playwright-cli -s=iphone open` / `resize 393 852` / `goto` / `reload` / `console` | 0 | Forced iPhone 15 393×852 confirmed with `page.viewportSize()` before navigation; console `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| 10 | `playwright-cli close-all` + `playwright-cli list` | 0 | `(no browsers)` — both sessions closed. |
| 11 | `git diff --name-status 84a1d194..HEAD` | 0 | Six falcon GLB/manifest files, `falcon.ts`, `falcon.test.ts`, and Conductor state only. |
| 12 | `git status --short` | 0 | Clean tracked tree; the two new evidence files remain uncommitted. |

Full command-by-command detail and exact output live in `verification/phase-1.md`, `verification/phase-2.md` and `verification/phase-3.md`.

**R1 follow-up (2026-11-26):** review finding F1 (worst-case template-max proportions were not combined with style extremes and champion maturity) is **covered**, not review-pending. Test-only commit `6556447b` adds a worst-case proportion set to the falcon sweep and explicit four-feather finite/boundary checks; TDD red and green runs plus evidence are in `verification/phase-R1.md`. The exact phase command is green (`37 pass / 0 fail`) and the voxel module-size gate is green (`5 pass / 0 fail`). No production code or artifact changed in R1.

## Acceptance criteria

| ID | Status | Evidence |
|----|--------|----------|
| AC-1 — four new feather parts, finite pivots/colors/parents, two legs/wings | pass | Phase 1 generator tests and manifest pivots; `verification/phase-1.md`, `verification/phase-2.md`. |
| AC-2 — bounded non-degenerate wing/tail styles, no new/renamed slots | pass | Phase 1 style sweep; `verification/phase-1.md` FR-2/AC-2. R1 extends it to template-max proportions × style extremes × champion (`verification/phase-R1.md`). |
| AC-3 — stage signatures head-parented, baby signature-free, untouched surfaces byte-identical | pass | Phase 1 tests plus the scope diff (no palette/gilded/DNA/budget/non-falcon/prop/sim/save/balance/audio change). |
| AC-4 — three canonical GLB+manifest pairs, plain determinism gate, no other artifact change | pass | Phase 2 primary exporter re-runs and determinism gate; re-verified in Phase 3 gate (all 21 pairs + 5 props). |
| AC-5 — boundary/fuzz/proportion-budget/module-size tests | pass | Phase 1 tests; full suite re-green in Phase 3 (4585 pass / 0 fail). R1 adds explicit worst-case four-feather finite/boundary checks and green module-size (`verification/phase-R1.md`). |
| AC-6 — desktop and phone ranch + arena captures with clean consoles and real-sim-seeded state | pass | `verification/phase-3.md` — six ranch PNGs, desktop and phone arena PNGs; both consoles `Errors: 0, Warnings: 0`; states produced only via `createGiftEgg` / `evolveCreature` / `saveGame`. |
| AC-7 — full gate green, no dependency/save/voxel-outside-falcon/audio diff | pass | `bun run verify && bun run build` exit 0; `git diff --name-status 84a1d194..HEAD` limited to six falcon artifacts, `falcon.ts`, `falcon.test.ts` and Conductor state. |

## Change scope (`84a1d194..HEAD`)

```text
M  artifacts/falcon-42-champion.glb
M  artifacts/falcon-42-champion.manifest.json
M  artifacts/falcon-42-juvenile.glb
M  artifacts/falcon-42-juvenile.manifest.json
M  artifacts/falcon-42.glb
M  artifacts/falcon-42.manifest.json
M  conductor/roadmap.md
M  conductor/tracks.md
A  conductor/tracks/20261126-falcon-silhouette-polish/index.md
A  conductor/tracks/20261126-falcon-silhouette-polish/metadata.json
A  conductor/tracks/20261126-falcon-silhouette-polish/plan.md
A  conductor/tracks/20261126-falcon-silhouette-polish/spec.md
A  conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-1.md
A  conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-2.md
M  packages/voxel/src/falcon.test.ts
M  packages/voxel/src/falcon.ts
```

No dependency or lockfile, no save/schema or sim file, no balance or audio file, no other archetype voxel/GLB, no prop digest, no CSS and no production code outside the accepted falcon generator change. Conductor docs are primary-owned state. Phase 3 added no tracked change.

## Evidence paths

- `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-1.md` — generator, tests, reworks and primary verification.
- `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-2.md` — artifact manifests, exporter provenance, determinism gate and primary verification.
- `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-3.md` — real-UI captures, console reads, integrated gate and scope diff.
- `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-R1.md` — review fix F1: worst-case proportion sweep, TDD red/green and module-size evidence.
- `.conductor/evidence/20261126-falcon-silhouette-polish/` — gitignored screenshots and scratch capture log.

## Deviations

- Phase 2's exporter and determinism commands were denied for the subagent; the primary ran all four successfully and recorded the exact output under that file's `## Primary verification`. No denial was retried.
- Phase 3 used real sim `setArenaCamera` via `saveGame` for readable arena framing, and DOM `.click()` via `eval` where HUD/onboarding overlays intercepted pointer input. No hand-crafted save JSON and no production code change.
- Cold Vite startup emitted transient `ERR_NETWORK_CHANGED` console errors on first desktop navigation; after a warm reload both session consoles were clean (0 errors / 0 warnings).
- The Vite build emitted only the standard >500 kB chunk advisory.

## Notes

- Visual states were seeded exclusively from real sim exports loaded from `/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts`; `wind_falcon` is a Gold-tier reward species, so `createGiftEgg` was used instead of `chooseStarter`. Stages came from `evolveCreature`; all saves were written by `saveGame(localStorage, state, Date.now())` under `apex.save`.
- Both evidence files for this integrated pass are left uncommitted for the primary to append `## Primary verification` and squash.
- Dev server `bun run dev` remains running in background shell `sh_21759245c0011g0bF7mhoMq42T` (PID 26788) at `http://localhost:5173/`; both Playwright sessions were closed.

## Primary verification

- Date: 2026-11-26
- The primary re-ran `(bun run verify && bun run build)` → `gate_exit=0` with typecheck clean across voxel/sim/server/client, `4585 pass / 1 skip / 0 fail`, Biome clean on 1060 files, determinism gate OK for every archetype baby/juvenile/champion GLB and 5 props (including falcon 115200/116600/131296 bytes at 1622/1614/1818 tris), and Vite build `dist/assets/index-BL310Ok0.js` (1,109.86 kB) plus CSS/lab assets with only the chunk advisory.
- Scope check: Phase 3 itself changed no tracked file; `84a1d194..745164ac` contains only the six falcon artifacts, `falcon.ts`, `falcon.test.ts` and primary-owned Conductor state. No dependency, save/schema, sim, balance, audio, other-archetype voxel, prop digest or CSS change exists.
- Independent image inspection of eight captures confirmed the stage labels/stats (`BABY 148/13/8/19`, `JUVENILE 151/15/11/19`, `CHAMPION 158/18/16/19`) and visible falcon silhouette progression on desktop and phone, plus the arena HUD `Zephyr Falcon · Press 158` vs `Ember Drake · Circle 177` with feed `Zephyr Falcon closes the gap.` (desktop) and `Zephyr... 158` vs `Ember... 162` with feed `Ember Drake closes the gap.` (phone).
- Final console reads after warm reload were `Total messages: 2 (Errors: 0, Warnings: 0)` in both sessions. The cold-start transient errors, wide arena framing, real-sim camera seeding, DOM click workaround and running dev server are recorded as deviations and do not affect the evidence.
- Conclusion: all FR-1..FR-7, NFR-1..NFR-5 and AC-1..AC-7 are covered; the gate is green and the integrated proof is ready for review.

## Doc sync

- Date: 2026-11-26T21:37:11.6791041+11:00
- `conductor/tech-stack.md` gained a dated `## Asset Pipeline` note recording the four base feather parts, preserved contracts and signatures, canonical artifact regeneration with determinism re-proof, and desktop/forced-iPhone capture coverage. No product, product-guideline or workflow change is needed; RM-11 stays linked until the completion commit retires it.
