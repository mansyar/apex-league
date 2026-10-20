# Integrated Verification — Client Module Decomposition & Size Guard

- Track: `20261020-client-decomposition`
- Branch: `feat/20261020-client-decomposition`
- Range: `dde88d1` (base, `origin/main` at track start) → `57ac657` (final phase checkpoint)
- Date: 2026-10-20

## Commands

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| typecheck | `bun run check` (inside verify) | 0 | all three workspaces clean |
| lint | `bunx biome check` | 0 | 448 files checked, 0 errors, 7 pre-existing warnings |
| unit | `bun test --timeout 120000` | 0 | 1788 pass, 1 skip, 0 fail (1789 tests), 84,605 `expect()` calls, 142 files, 138.27 s |
| unit (CI mode) | `bun test --check --parallel --timeout 120000` | 0 | same counts, 22.86 s |
| determinism | `bun run gate:determinism` (inside verify) | 0 | axolotl champion byte-identical (221,284 B, 3,286 tris); five prop digests match |
| build | `bun run build` | 0 | @apex/client built; only the pre-existing chunk-size advisory |
| full gate | `bun run verify` | 0 | typecheck + biome + suite + determinism |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | No non-test `.ts` under `apps/client/src` exceeds 12,288 B | `module-size.test.ts` green over 167 modules; measured independently at each phase acceptance (largest now `battleHud.ts` 12,064 B) | met |
| AC-2 | Guard scans the whole tree, excludes `*.test.*` and `vite-env.d.ts`, reports paths + sizes | `module-size.test.ts:43-81` (recursive walk that follows `statSync` targets and measures `.ts`/`.tsx`/`.mts`, `capReport`) and its first four tests | met |
| AC-3 | Oversized module fails the guard; the control leaves nothing behind | Guard's own negative control builds an oversized `oversized.tsx` in an OS temp folder, asserts rejection via the same walk and report, removes the folder recursively in `finally`, re-asserts absence. Primary reproduced the failing path independently: a 12,321 B `__primary-probe.ts` produced the offender line, then the suite was green again after deletion | met |
| AC-4 | `bun run verify` and `bun run build` pass; determinism output unchanged | commands table above | met |
| AC-5 | Browser smoke: draft → starter → feed/day → detail tabs → spar → cup → graduation | final-tree Playwright pass: boot HUD, starter, Feed + Advance day (day 2, AP 3, hunger 85), detail modal with `Stats* / Growth / Moves` and the Growth page, spar to `VICTORY — TIDE AXOLOTL`, cup bracket (`Bronze Cup DAY 7 · SINGLE ELIMINATION …`), graduation modal (`GRADUATE EMBER DRAKE …`), plus `mock.html`, `gallery.html` and `preview.html`; zero console or page errors | met |
| AC-6 | `hud.ts`, `cup.ts`, `spar.ts`, `graduation.ts`, `scene.ts` export the same names | export-name diff vs `dde88d1` over those five plus `cup-screens.ts`, `orbit-camera.ts`, `staging-fx.ts`, `mock.ts`: every file same count, zero missing names (33/33, 3/3, 3/3, 11/11, 3/3, 10/10, 7/7, 7/7, 0/0) | met |
| AC-7 | No new import cycles in the client graph | per-phase audits of the new folders (`app/`, `hud/`, `scene/`+`camera/`+`fx/`, `cup/screens/`+`spar/`+`graduation/`+`mock/`): shared types live in leaf `types.ts`/`screen-deps.ts` modules and no facade imports its own leaves | met |
| AC-8 | `size-probe.test.ts` gone, guarantee covered by the new guard | file deleted in Phase 5; the guard covers `creature-detail.ts`, `growth.ts`, `growth-panel.ts` and `ui/tabs.ts` by walking the tree | met |

## Final module sizes (largest ten, non-test)

| Module | Bytes |
| --- | --- |
| `battleHud.ts` | 12,064 |
| `staging.ts` | 11,640 |
| `graduation/nursery.ts` | 11,613 |
| `hud/update.ts` | 10,568 |
| `mock/sections.ts` | 9,089 |
| `main.ts` | 8,690 |
| `spar.ts` (facade) | 7,675 |
| `scene.ts` | 6,365 |
| `hud/shell.ts` | 7,110 |
| `camera/rig.ts` | 7,079 |

Before the track, eleven production modules were over the cap, the largest at 25,204 B
(`main.ts`). One hundred and sixty-seven modules are now measured on every test run.

## Phase checkpoints

| Phase | Commit | Gate |
| --- | --- | --- |
| 1 Composition root | `d5b0117` | verify + build + smoke |
| 2 HUD trio | `9511846` | verify + build + smoke |
| 3 Scene, camera and effects | `97a9bba` | verify + build + headless battle |
| 4 Screens and dev harness | `3466438` | verify + build + headless screens |
| 5 The guard | `57ac657` | verify + build + negative control |

## Deviations worth keeping

- Extra leaf modules appeared where the prescribed seam did not fit: `hud/types.ts`,
  `hud/hints.ts` (brief allowed shared-type and lifecycle modules), `fx/charge.ts`,
  `camera/shake.ts`, `scene/frame.ts`, `spar/types.ts`, `spar/casting.ts`,
  `graduation/types.ts`, `mock/data.ts`.
- `spar/setup.ts` now takes the panel refs as a parameter because the nodes belong to
  `spar/panel.ts`; `spar/casting.ts` gained `fightNowFor()` to lift an inline payload.
- `mock/data.ts` renamed a private `ELEMENTS` list to `CREST_ELEMENTS` to avoid reading
  like the `el()` helper; values and order unchanged.
- Formatting-only fixes (export order, one reflow) were folded into the Phase 4 checkpoint `3466438`.

## Notes

- `battleHud.ts` sits 224 B under the cap: the next edit there will trip the guard by
  design. If a change needs room, split it rather than raising the cap.
- `vite.config.ts` declares no extra build inputs, so `mock.ts` is covered by the
  typecheck and the browser smoke rather than `bun run build`.
- The guard measures bytes with `statSync().size`, so line-ending churn counts; that is
  the same rule the cap was always stated in.
