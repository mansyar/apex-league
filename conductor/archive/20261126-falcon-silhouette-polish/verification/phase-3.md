# Phase 3 verification — Visual evidence and integrated gate

- Track: `20261126-falcon-silhouette-polish`
- Phase: 3 — `Visual evidence and integrated gate`
- Date: 2026-11-26
- Branch: `feat/20261126-falcon-silhouette-polish`
- Phase base: `745164acbc9b9ea83ab00b5ffae3701d6253f9e4`
- Implementation head: `745164acbc9b9ea83ab00b5ffae3701d6253f9e4` (no code commit was made in Phase 3; this file and `integrated.md` are intentionally left uncommitted)
- Covers: FR-7, AC-6, AC-7, NFR-1, NFR-3 (AC-1..AC-5 cross-referenced to Phases 1 and 2)
- Result: **verified**

## Commands

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `bun run dev` | 0 | Real Vite dev server started in background shell `sh_21759245c0011g0bF7mhoMq42T` (PID 26788); output: `VITE v8.3.4 ready in 1497 ms`, `Local: http://localhost:5173/`. Still running at the end of this phase (see Notes). |
| 2 | `playwright-cli open` | 0 | Browser `default`, pid 12316, `about:blank` — viewport set **before** navigation. |
| 3 | `playwright-cli resize 1440 900` + `playwright-cli run-code "async page => { return JSON.stringify({viewport: page.viewportSize(), url: page.url()}) }"` | 0 | Confirmed `{width:1440,height:900}` at `about:blank`. |
| 4 | `playwright-cli goto http://localhost:5173` | 0 | Page title `Apex League`; cold Vite dependency optimization produced 30 transient `net::ERR_NETWORK_CHANGED` module requests. |
| 5 | `playwright-cli console` (cold) | 0 | `Total messages: 32 (Errors: 30, Warnings: 0)` — all transient cold-start module fetches, no application exception. |
| 6 | `playwright-cli reload` + `playwright-cli console` | 0 | `Total messages: 2 (Errors: 0, Warnings: 0)`; all desktop captures were made after this clean boot. |
| 7 | `playwright-cli eval "(async () => { const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts'); ... m.saveGame(localStorage, s, Date.now()) })()"` (3 invocations) | 0 | Real-sim `createGiftEgg('wind_falcon', 42)` plus zero, one or two `evolveCreature` calls, persisted via real `saveGame` under `apex.save`. Baby `148/13/8/19`; juvenile `151/15/11/19` (branch `aerie_warden`); champion `158/18/16/19` (branch `aerie_warden`). |
| 8 | `playwright-cli run-code "async page => { ... page.screenshot({ path: ... }) }"` (desktop ranch × 3) | 0 | `ranch-baby-desktop.png`, `ranch-juvenile-desktop.png`, `ranch-champion-desktop.png` at 1440×900; stage labels `Baby`, `Juvenile`, `Champion` read back from the live DOM. |
| 9 | `playwright-cli run-code "async page => { ... Spar ... Press ... page.screenshot({ path: ... }) }"` (desktop arena, broadcast + cinematic) | 0 | Real Spar Free match → Press doctrine → live fight. Broadcast frames show `Zephyr Falcon · Press 158` vs `Ember Drake · Circle 177` and feed `Zephyr Falcon closes the gap.`; cinematic frames show the same live fight at the director framing. |
| 10 | `playwright-cli console` (desktop, final) | 0 | `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| 11 | `playwright-cli -s=iphone open` | 0 | Browser `iphone`, pid 35656, `about:blank`. |
| 12 | `playwright-cli -s=iphone resize 393 852` + `playwright-cli -s=iphone run-code` viewport check | 0 | `page.viewportSize()` → `{width:393,height:852}` **before** navigation (forced iPhone 15 height, not the 393×659 preset). |
| 13 | `playwright-cli -s=iphone goto http://localhost:5173` + real-sim seeding evals + `playwright-cli -s=iphone reload` | 0 | Same real `createGiftEgg` / `evolveCreature` / `saveGame` path; three stages loaded through the real `loadBoot` path. |
| 14 | `playwright-cli -s=iphone run-code "async page => { ... page.screenshot({ path: ... }) }"` (phone ranch × 3, arena × 2 sequences) | 0 | `ranch-baby-iphone.png`, `ranch-juvenile-iphone.png`, `ranch-champion-iphone.png`; `arena-spar-champion-broadcast-iphone-01..04.png`; `arena-cine-seq-01..16.png`. Live DOM confirmed `BABY`, `JUVENILE`, `CHAMPION` labels and 393×852 viewport for every capture. |
| 15 | `playwright-cli -s=iphone console` | 0 | `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| 16 | `playwright-cli close-all` + `playwright-cli list` | 0 | `(no browsers)` — both sessions closed. |
| 17 | `bun run verify && bun run build` | 0 | Full gate green — exact layer results below. |
| 18 | `git diff --name-status 84a1d194..HEAD` | 0 | Only the six accepted `artifacts/falcon-42*` files, `packages/voxel/src/falcon.ts`, `packages/voxel/src/falcon.test.ts`, plus primary-owned Conductor state (track docs, `tracks.md`, `roadmap.md`). |
| 19 | `git status --short` | 0 | No tracked changes from this phase; evidence files remain uncommitted for the primary. |

### `bun run verify && bun run build` — exact layer results

```text
$ bun run check && bun test --check --parallel --timeout 120000 && biome check && bun run gate:determinism
@apex/voxel check: ✓ No type errors in 214 files
@apex/sim check: ✓ No type errors in 253 files
@apex/server check: ✓ No type errors in 185 files
@apex/client check: ✓ No type errors in 560 files
bun test v1.4.4 (38afee6c8) 20x PARALLEL
 4585 pass
 1 skip
 0 fail
 676332 expect() calls
Ran 4586 tests across 445 files. [231.97s]
Checked 1060 files in 1655ms. No fixes applied.
determinism gate OK: falcon seed 42 baby regenerated byte-identical (115200 bytes, tris 1622)
determinism gate OK: falcon seed 42 juvenile regenerated byte-identical (116600 bytes, tris 1614)
determinism gate OK: falcon seed 42 champion regenerated byte-identical (131296 bytes, tris 1818)
determinism gate OK: 5 props seed 42 regeneration digests match (tuft tris 100, bush tris 462, broadleafTree tris 1264, rock tris 52, foodPile tris 232)
[all 21 archetype stage pairs regenerated byte-identical]
$ bun run --filter @apex/client build
✓ built in 571ms
dist/assets/index-BL310Ok0.js   1,109.86 kB │ gzip: 307.24 kB
[chunk-size advisory only; build exit 0]
```

## Acceptance criteria

| ID | Status | Evidence |
|----|--------|----------|
| AC-1 — four feather parts with finite pivots/colors/parents; two legs and two wings | pass (Phase 1) | `verification/phase-1.md` rows FR-1/AC-1 and FR-3/AC-3; full suite re-green in this phase (4585 pass / 0 fail). |
| AC-2 — bounded, non-degenerate style variants; no new/renamed slots | pass (Phase 1) | `verification/phase-1.md` row FR-2/AC-2; 3 wing × 3 tail × 3 stage × 2 bound sweep. |
| AC-3 — signature parts head-parented, baby signature-free, untouched surfaces byte-identical | pass (Phase 1) | `verification/phase-1.md` rows FR-3/AC-3 and FR-4/AC-1/AC-3; scope diff below shows no palette/gilded/DNA/budget/non-falcon/prop/sim/save/balance/audio file touched. |
| AC-4 — canonical GLB+manifest regeneration; plain determinism gate; no other artifact change | pass (Phase 2, re-run this phase) | `verification/phase-2.md` row AC-4; `bun run verify && bun run build` exit 0 with all 21 archetype stage pairs and 5 props byte-identical, including the three falcon pairs. |
| AC-5 — boundary, fuzz, proportion-budget and module-size tests | pass (Phase 1) | `verification/phase-1.md` row FR-6/AC-5; full suite re-green (4585 pass / 1 skip / 0 fail). |
| AC-6 — desktop and phone ranch + arena captures, real-sim-seeded state, clean consoles | pass (this phase) | Six ranch PNGs (three stages × two viewports) plus desktop and phone arena PNGs below. All states produced via `createGiftEgg` / `evolveCreature` and persisted only with `saveGame`; `playwright-cli console` and `-s=iphone console` each `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| AC-7 — full gate green with no dependency/save/voxel-outside-falcon/audio diff | pass (this phase) | `bun run verify && bun run build` exit 0 (typecheck ×4, 4585 tests, Biome 1060 files, determinism gate, Vite build); `git diff --name-status 84a1d194..HEAD` lists only the six falcon artifacts, `falcon.ts`, `falcon.test.ts` and Conductor state. |

## Visual evidence — desktop (1440×900)

- **Ranch, baby:** `ranch-baby-desktop.png`. Live plate `Zephyr Falcon`, `Baby`, `Steady · ATK +0`, stats `HP 148 / ATK 13 / DEF 8 / SPD 19`; blocky bird silhouette with beak, folded wings and short feathered tail. Vision check: frame clear and unobstructed.
- **Ranch, juvenile:** `ranch-juvenile-desktop.png`. `Juvenile`, `Aerie Warden · HP + DEF`, stats `151 / 15 / 11 / 19`; stubby wings, upturned feather tail, small head pinion buds.
- **Ranch, champion:** `ranch-champion-desktop.png`. `Champion`, `Aerie Warden · HP + DEF`, stats `158 / 18 / 16 / 19`; defined wing blocks, layered feather/tail plumes, distinct head buds.
- **Arena, falcon spar:** `arena-spar-champion-broadcast-03.png` (plus `-01`, `-02`, `-04`). HUD `Zephyr Falcon · Press 158` vs `Ember Drake · Circle 177`, `IN CLOSE`, feed `Zephyr Falcon closes the gap.`; the falcon is rendered in the inner ring mid-exchange. Cinematic-branch frames `arena-spar-champion-cinematic-01..04.png` are supplementary. `arena-spar-champion-desktop.png` records the KO verdict frame (`VICTORY — ZEPHYR FALCON`, 129 vs 0).

## Visual evidence — forced iPhone 15 (393×852)

- Viewport forced to 393×852 and confirmed with `page.viewportSize()` before `goto`; preserved for every phone capture.
- **Ranch, baby:** `ranch-baby-iphone.png`. Plate `ZEPHYR FALCON`, `BABY`; voxel bird visible in the ranch clearing below the HUD.
- **Ranch, juvenile:** `ranch-juvenile-iphone.png`. `JUVENILE` label read from live DOM; same silhouette progression at phone scale.
- **Ranch, champion:** `ranch-champion-iphone.png`. `CHAMPION` label read from live DOM; feather/tail silhouette readable at 393 px.
- **Arena, falcon spar:** `arena-spar-champion-broadcast-iphone-02.png` (plus `-01`, `-03`, `-04`) — HUD `Zephyr... 158` vs `Ember... 162`, feed `Ember Drake closes the gap.` `arena-cine-seq-16.png` captures the falcon's `Feather Dart` hitting mid-fight (`Zephyr Falcon's Feather Dart hits.`, falcon 158 vs rival 137); the 16-frame cinematic sequence is retained as scratch.

## Evidence paths

All screenshots and scratch scripts are under the gitignored `.conductor/evidence/20261126-falcon-silhouette-polish/` directory:

- `capture-log.md` — scratch run log with exact seeding snippets, viewport confirmations and vision notes.
- Desktop: `ranch-baby-desktop.png`, `ranch-juvenile-desktop.png`, `ranch-champion-desktop.png`, `arena-spar-champion-desktop.png`, `arena-spar-champion-broadcast-01.png` … `-04.png`, `arena-spar-champion-cinematic-01.png` … `-04.png`.
- Phone: `ranch-baby-iphone.png`, `ranch-juvenile-iphone.png`, `ranch-champion-iphone.png`, `arena-spar-champion-broadcast-iphone-01.png` … `-04.png`, `arena-cine-seq-01.png` … `-16.png`.
- Prior phases: `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-1.md`, `verification/phase-2.md`.

## Deviations

- A real-sim `setArenaCamera(state, 'broadcast')` / `'cinematic'` export was applied through `saveGame` for arena framing, because the default presentation was too dark/small to read. Both are real sim exports and the save was still written only via `saveGame`; no hand-crafted save JSON.
- The arena uses a fixed wide broadcast pit framing; the falcon is necessarily small inside the ring at both viewports. No in-app zoom control is available in arena mode, so evidence pairs in-context HUD/feed capture with the close, unobstructed ranch silhouettes. No CSS or camera production code was changed.
- Cold-start Vite dependency optimization produced 30 transient `ERR_NETWORK_CHANGED` console errors on the first desktop navigation. A warm reload cleared them; both final per-session console reads are `Errors: 0, Warnings: 0`. This is a dev-server startup artifact, not an application error.

## Notes

- Falcon `wind_falcon` is a Gold-tier reward species and is not starter-pickable, so the real unchecked gift-egg seam `createGiftEgg('wind_falcon', 42)` was used to produce the creature. Stages were advanced only with `evolveCreature`; every save was persisted with `saveGame(localStorage, state, Date.now())` under `SAVE_KEY = "apex.save"`.
- The client renders voxels live through `@apex/voxel` (`visualSeedOf` derives the visual seed from stats/stage); the six committed GLB+manifest artifacts remain determinism-gate fixtures and are not loaded by the UI.
- HUD/onboarding overlays intercepted pointer input during some steps, so DOM `.click()` via `page.evaluate` was used for `Got it`, `Spar` and `Press`, consistent with prior tracks.
- Dev-server state: `bun run dev` is **still running** in background shell `sh_21759245c0011g0bF7mhoMq42T` (PID 26788) at `http://localhost:5173/`; it was not stopped by this agent. Both browser sessions were closed (`playwright-cli list` → `(no browsers)`).
- This phase made no code, test, CSS, config, save, schema, sim, balance, audio or artifact change; both evidence files are left uncommitted for the primary to append `## Primary verification` and squash.

## Primary verification

- Date: 2026-11-26
- Scope check: `git status --porcelain` listed only the two untracked evidence files; `git diff --name-only 745164acbc9b9ea83ab00b5ffae3701d6253f9e4..HEAD` was empty; no code, artifact, Conductor state or browser scratch file was tracked-changed by Phase 3.
- The primary independently re-ran `(bun run verify && bun run build)` → `gate_exit=0`: typecheck clean in all four workspaces (voxel 214, sim 253, server 185, client 560 files), `4585 pass / 1 skip / 0 fail` with `676332 expect()` calls in the subagent's identical gate run, Biome `Checked 1060 files ... No fixes applied.`, determinism gate OK for all archetype stage pairs including `falcon seed 42 baby/juvenile/champion regenerated byte-identical` and 5 props, Vite build `dist/assets/index-BL310Ok0.js` (1,109.86 kB), `index-D45x_3yC.css`, `lab-BiS8jmah.js` and `lab-B2IkTbut.css` with only the pre-existing chunk advisory.
- Independent image inspection confirmed the visual claims:
  - `ranch-baby-desktop.png` / `ranch-baby-iphone.png`: `Zephyr Falcon`, `BABY`, 148/13/8/19, blocky green bird with beak and short tail feathers.
  - `ranch-juvenile-desktop.png` / `ranch-juvenile-iphone.png`: `JUVENILE`, 151/15/11/19, stubby wings, upturned feather tail and small head pinion buds.
  - `ranch-champion-desktop.png` / `ranch-champion-iphone.png`: `CHAMPION`, 158/18/16/19, defined wing blocks, layered tail plumes and head crests.
  - `arena-spar-champion-broadcast-03.png`: HUD `Zephyr Falcon · Press 158` vs `Ember Drake · Circle 177`, `IN CLOSE`, feed `Zephyr Falcon closes the gap.`; falcon visible mid-exchange in the inner ring.
  - `arena-spar-champion-broadcast-iphone-02.png`: HUD `Zephyr... 158` vs `Ember... 162`, feed `Ember Drake closes the gap.`; both tiny fighters visible in the arena ring.
- Console evidence: after warm reload, both desktop and phone sessions reported `Total messages: 2 (Errors: 0, Warnings: 0)`. The 30 cold-start `ERR_NETWORK_CHANGED` messages were transient Vite dependency-optimization requests and are documented as a deviation.
- Deviations accepted: real-sim `setArenaCamera` persisted via `saveGame` (no hand-crafted JSON), DOM `.click()` where overlays intercepted input, fixed wide arena framing keeps bodies small, and the dev server was left running for primary cleanup. None changes production code or generated artifacts.
- Conclusion: FR-7, AC-6, AC-7 and NFR-1/NFR-3 are confirmed. Every AC-1..AC-7 is now evidenced across the three phases; the track is ready for post-review doc sync.
