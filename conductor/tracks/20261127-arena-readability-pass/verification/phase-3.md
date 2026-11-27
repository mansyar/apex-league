# Phase 3 evidence — Spar/cup browser proof and integrated gate

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Phase base: `4971dbccd2bf99a53677c47e17edc9e1ad902992`
Phase: 3 — Spar/cup browser proof and integrated gate
Date: 2026-11-27
Status: **blocked** (evidence files remain intentionally uncommitted for the primary)

Phase 3 is evidence-only. No production code, CSS, tests, generator, schema,
sim, save, audio, plan, metadata, roadmap, product docs, review, or PR files
were edited. `git status --short` at the end of the phase showed only the
untracked `phase-3.md` report; all binary/script evidence lives in the
gitignored `.conductor/evidence/20261127-arena-readability-pass/` directory.

## Method and boundaries

- Saves were seeded only through real sim exports imported from
  `/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts` (`chooseStarter`,
  `evolveCreature`, `renameCreature`, `setArenaCamera`, `setReducedMotion`,
  `advanceDay`, `startCupSession`, `saveGame`). No hand-crafted save JSON.
- Browser interactions used real Playwright pointer/keyboard actions
  (`button.spar-button`, `button.cup-button`, `.cup-screen-bracket .cup-cta-go`,
  doctrine buttons, `getByRole('button', { name: 'Step into the arena' })`).
  **No DOM `.click()` workaround was used.** Onboarding was dismissed with
  `page.getByRole('button', { name: 'Got it' }).click()`.
- The only browser-environment override was a temporary `Date.now` pin while
  the real spar panel opened (`makeExhibition` still generated the rival), plus
  `window.__p3mode` bookkeeping for the capture scripts. Both are recorded
  under Deviations.
- Every in-fight measurement and still was taken inside one `run-code` call;
  cross-shell screenshots after a fight started were found to land post-KO and
  were discarded from the proof set.
- Console capture: each `run-code` script registered `console` (error/warning)
  and `pageerror` listeners before driving the flow. All three named sessions
  ended with `playwright-cli -s=<session> console` → `Total messages: 2
  (Errors: 0, Warnings: 0)`. `playwright-cli list` → `(no browsers)` after
  `close-all`; the pre-existing Vite server was left running.

## Viewport/status matrix

Required matrix rows are all present. File names below are relative to
`.conductor/evidence/20261127-arena-readability-pass/`.

| State | 1440×900 | 393×852 | 852×393 |
| --- | --- | --- | --- |
| Ranch baseline | `ranch-baseline-desktop-1440x900.png` | `ranch-baseline-393x852.png` | `ranch-baseline-852x393.png` |
| Wide establishing / corners | `mixed-reduced-action-*-1440x900.png` (all four corners visible by vision) | `projection-measurement.json` (all four corners NDC-in-frame); `mixed-reduced-*-393x852.png` | `wide-broadcast-*-852x393.png`, `wide-reduced-*-852x393.png` (attempts); `projection-measurement.json` gives all-corner containment |
| Spar broadcast action | `spar-broadcast-*` and `mixed-broadcast-*` | `mixed-broadcast-*` | `mixed-broadcast-*` |
| Spar cinematic action | `mixed-cinematic-*` | `mixed-cinematic-*` | `mixed-cinematic-*` |
| Real cup battle | `cup-battle-*` | `cup-battle-*` | `cup-battle-*` |
| Reduced-motion stable arena | `mixed-reduced-*` | `mixed-reduced-*` | `mixed-reduced-*` |

`*` expands to the captured beats `entry`, `action-a`, `action-b`, `action-c`,
`action-d`, `action-e` (spar) / `action-a..d` (cup), `dense`, and where noted
`final`. Every still was captured from a live in-fight state except the ranch
baseline and the explicit wide-shot attempts.

## Commands and results

### Seeding and camera/motion control

```text
playwright-cli -s=p3d open about:blank
playwright-cli -s=p3d resize 1440 900
playwright-cli -s=p3d goto http://localhost:5173/
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/seed-baseline.js
playwright-cli -s=p3p resize 393 852
playwright-cli -s=p3p goto http://localhost:5173/
playwright-cli -s=p3l resize 852 393
playwright-cli -s=p3l goto http://localhost:5173/
```

`seed-baseline.js` uses real sim seams only; desktop exact result:

```json
{"viewport":{"w":1440,"h":900,"dpr":1},"scrollWidth":1440,"name":"Thunderbolt Ace","nameLength":15,"stage":"champion","archetypeId":"draconic","day":1,"phase":"day","camera":"broadcast","reducedMotion":false,"saveKey":"apex.save"}
```

Camera style and reduced motion were seeded with
`seed-mode.js` (`setArenaCamera` / `setReducedMotion` + `saveGame` + reload),
because `button.camera-chip` is `display:none` in the ranch and the Settings
modal exposes only Motion/Sound/Done. Results:
`{"mode":"cinematic","viewport":{"width":393,"height":852},"scrollWidth":393,"bodyClass":""}`;
reduced runs reported `bodyClass:"is-reduced"` at all three viewports.

### Browser capture scripts (all exit 0, `errors: []` per run)

```text
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-spar.js
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-mixed.js
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-cup.js
playwright-cli -s=p3p run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-mixed.js
playwright-cli -s=p3p run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-cup.js
playwright-cli -s=p3l run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-mixed.js
playwright-cli -s=p3l run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-cup.js
playwright-cli -s=p3l run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-wide.js
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/measure-projection.js
```

Cup seed (real sim; day 7 via `advanceDay`, `startCupSession`, `saveGame`):
`{day:7, phase:"cup", name:"Thunderbolt Ace", status:"player-turn",
nextOpponent:"Pondskipper Grub"}`, session keys include `bracket`, `seed`,
`nextPlayerRound`, `nextOpponent`.

### Video

```text
playwright-cli -s=p3d video-start .conductor/evidence/20261127-arena-readability-pass/arena-action-desktop-1440x900.webm
playwright-cli -s=p3d run-code --filename=.conductor/evidence/20261127-arena-readability-pass/start-spar-wait.js
playwright-cli -s=p3d video-stop
```

`start-spar-wait.js` opened a real mixed spar (`Tide Axolotl`, seed
`1340434432`) and sampled 13 frames at 200 ms intervals (t=27750…30485 ms,
≈2.7 s): names stayed `Thunderbolt Ace · Press` / `Tide Axolotl · Press`,
`scrollWidth` stayed 1440, `.hit-vignette` peaked at 0.774113 / 0.773837 and
returned to 0, `errors: []`. WebM:
`.conductor/evidence/20261127-arena-readability-pass/arena-action-desktop-1440x900.webm`.

Suggested ffmpeg transcode (left for the primary; target GIF ≤10 MB, ≤10 fps;
`.conductor/media/20261127-arena-readability-pass/` is the permitted GIF
destination and was not written by this phase):

```text
ffmpeg -y -i .conductor/evidence/20261127-arena-readability-pass/arena-action-desktop-1440x900.webm -vf "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" -loop 0 .conductor/media/20261127-arena-readability-pass/arena-readability.gif
```

### Gate (exact commands from the brief)

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify && bun run build` — attempt 1 | 1 | `4615 pass / 1 skip / 1 fail`, 682379 expect() calls, 4617 tests / 446 files / 314.37s. One timeout: `packages\sim\src\cup.test.ts` — `session resolution > on a loss the reported champion is the real tournament winner [86401.21ms]` (`timed out after 60000ms`). Three headless Playwright sessions were still open; captured verbatim in `gate-attempt-1.txt`. |
| `bun run verify && bun run build` — attempt 2, after `playwright-cli close-all` | 0 | `4616 pass / 1 skip / 0 fail`, 682379 expect() calls, 4617 tests / 446 files / 153.63s; Biome clean on 1063 files; voxel determinism byte-identical for all archetype stages and 5 props; Vite built `index-BpBJx2Fi.js` at 1,112.80 kB (gzip 308.52 kB) with only the pre-existing chunk advisory. |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | 0 | 5 pass / 0 fail / 15 expect() calls, 316 ms, bun 1.4.4 (38afee6c8) 4x PARALLEL. |

No source, test, generated file or lockfile was changed to make the retry pass;
the second attempt is the configured final gate result.

## Measurements

### HUD names, overflow, control bounds

Every `.battle-hud-name` was read via computed style and `getBoundingClientRect`
inside the live fight. Every recorded name had `textOverflow: clip`,
`whiteSpace: normal`, `overflowWrap: anywhere`, `scrollWidth == clientWidth`,
and no ellipsis. `fullyVisible` is the script helper's strict boolean
(`scrollHeight <= clientHeight + 1`); raw values are reported verbatim below.

| Viewport / flow | Left name (text; scroll/client; scrollH/clientH; rect) | Right name | Vignette (dense) |
| --- | --- | --- | --- |
| 1440×900 broadcast, same species | `Thunderbolt Ace · Press`; 215/215; 18.6 h; x 301.1 y 44.1 w 213.8 | `Ember Drake · Circle`; 183/183; x 936.4–963.3 | 0.81 |
| 1440×900 broadcast, mixed | `Thunderbolt Ace · Press`; 215/215; x 301.1 y 44.1 | `Tide Axolotl · Press`; 177/177; x 963.2 y 44.1 | 0.74155 |
| 1440×900 cinematic, mixed | `Thunderbolt Ace · Press`; 215/215; x 299 | `Tide Axolotl · Press`; 177/177; x 964.4 | 0.81 |
| 1440×900 reduced, mixed | left x 301.1 | right x 963.2 | 0 (dense null) |
| 1440×900 cup | `Thunderbolt Ace · Press`; 215/215; x 299 y 41 | `Pondskipper Grub`; 163/163; x 978.3 y 41 | 0.542307 |
| 393×852 broadcast, mixed | `Thunderbolt Ace · Press`; 65/65; 44/43; x 61 y 113 w 64.5 h 42.9 | `Tide Axolotl · Press`; 65/65; 44/43; x 267.5 y 113 | 0.81 |
| 393×852 cinematic, mixed | 65/65; 44/43; x 61 y 113 | 65/65; 44/43; x 267.5 y 113 | 0.81 |
| 393×852 reduced, mixed | 71/71; 44/43 | 77/77; 44/43 | 0 (dense null) |
| 393×852 cup | `Thunderbolt Ace · Press`; 65/65; 44/43 | `Pondskipper Grub`; 65/65; 29/29 | 0.337791 |
| 852×393 broadcast, mixed | `Thunderbolt Ace · Press`; 174/174; 39/37; x 140.7 y 118.3 w 174.1 h 37.4 | `Tide Axolotl · Press`; 174/174; 39/37; x 537.2 | 0.774067 |
| 852×393 cinematic, mixed | 174/174; 39/37; x 140.7 | 174/174; 39/37; x 537.2 | 0.259272 |
| 852×393 reduced, mixed | 182/182; 39/37 | 177/177; 20/19 | 0 (dense null) |
| 852×393 cup | `Thunderbolt Ace · Press`; 174/174; 39/37; x 140.7 y 118.3 | `Pondskipper Grub`; 163/163; 20/19; x 548.6 y 127 | 0.476857 |

- `document.documentElement.scrollWidth == innerWidth` at every capture:
  1440/1440, 393/393, 852/852. No horizontal page overflow anywhere.
- HUD plates were inside the viewport in every live capture; portrait plates
  at x 61 and x 238.5 (w 93.5) wrap names to two lines; landscape plates at
  x 140.7 and x 537.2 leave the center chip clear.
- Portrait ranch drawer buttons with negative x or right > 393 are collapsed
  off-canvas UI, not HUD occlusion; landscape ranch visible buttons were all
  `inViewport: true`.
- Vision OCR on `mixed-broadcast-action-a-852x393.png` transcribed both full
  names with no visible clipping or ellipsis despite the 39/37 line-box delta.
  This 2 px delta is recorded as a metric finding, not user-visible clipping.
- Dense effects: vignette peaks up to 0.81 with both names still present,
  no overflow, no console/page errors. Reduced runs had vignette 0 and a
  `battle-stamp ... show ... in` banner from entry; no flash or residual shake.

### Fighter readability — real rig heights and live framing math

`measure-projection.js` imported the real `framing.ts`, `camera/presets.ts`,
`roster.ts` and sim modules in the browser, measured post-normalization rig
heights with `buildSpot` (stub arena group `{add(){}}`), then projected feet
and head through the real `establishingFraming` and `trackedActionFraming`
poses at all three viewports. Full JSON:
`.conductor/evidence/20261127-arena-readability-pass/projection-measurement.json`.

Measured rig heights (world units): draconic champion 0.362667, draconic baby
0.330667, axolotl baby 0.134737, ray baby 0.08, golem baby 0.450545, tortoise
baby 0.3. Species mapping: `spark_ray→ray`, `siltback→golem`,
`earth_tortoise→tortoise`. A separate live `buildSpot` check measured the
seeded champion at 0.32893024045911334 (home x −2.6) and the axolotl rival at
0.17454545709385688 (home x +2.6).

Establishing shot: radius/fov 12.5/45 at 1440×900 and 852×393, 18.75/57 at
393×852; all four painted corners (±3.2, ±2.4) had `inFrame: true` at every
viewport (worst landscape NDC corners −0.21/0.11, 0.263/0.049, 0.304/−0.5,
−0.343/−0.385; portrait −0.535/0.059, 0.661/0.026, 0.685/−0.24, −0.79/−0.189).
Landscape corner CSS positions ≈ (336,175), (538,187), (556,295), (280,272),
between the HUD plates (y≈118–156) and the bottom edge.

Tracked action (smaller fighter, % viewport height / CSS px):

| Cast | 1440×900 | 393×852 | 852×393 |
| --- | --- | --- | --- |
| draconic vs draconic (same height) | 11.40% / 102.6 px | 11.40% / 97.1 px | 11.40% / 44.8 px |
| ray vs ray (same-height floor case) | 8.44% / 75.9 px | 8.44% / 71.9 px | 8.44% / 33.2 px |
| draconic champion vs axolotl baby (mixed) | 22.32% / 200.9 px | 22.32% / 190.2 px | 22.32% / 87.7 px |
| ray baby vs golem baby (mixed) | 22.32% / 200.9 px | 22.32% / 190.2 px | 22.32% / 87.7 px |

Every sampled body had `centered: true` (both feet and head inside the NDC
frustum) including mirrored positions; the 8%/32 px floor is cleared by the
tightest case (ray/ray landscape, 33.2 px). The arena-boundary rectangle is
the painted `ARENA_HALF_X/Z` frame, not the larger circular wall/floor disc.

### Camera lifecycle and dense effects

- Broadcast tracked action and cinematic intents both produced live HUD and
  arena frames at all three viewports; cinematic used the real saved camera
  style and the `radiusMult ≥ 1` shot table, no cropped fighter in measurements.
- Resize was exercised by running separate fresh sessions at the three fixed
  viewports and by the projection solve recomputing from each aspect ratio.
- Reduced motion pinned the wide establishing shot, suppressed vignette
  flashes and HUD shake, and reported `bodyClass:"is-reduced"`; no residual
  shake was measured in the reduced frame series.
- `capture-wide.js` attempted to grab the brief arena-entry establishing beat
  at landscape; the wide shot is overridden almost immediately in normal
  broadcast and reduced mode lands a VICTORY banner, so the landscape all-four-
  corners proof is the NDC/CSS containment math rather than a clean still.

## AC mapping

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 / AC-1 (readability floor) | pass | Real `buildSpot` heights + live `trackedActionFraming` projection: worst case ray/ray 8.44% / 33.2 px at 852×393; all bodies centered. |
| FR-2 / AC-2 (legal positions, establishing corners) | pass | All sampled legal bodies centered; four painted corners inside NDC at all three viewports; desktop reduced frames visually show all four corners. |
| FR-3 / AC-3 (arena contrast, camera styles) | blocked | Retuned arena remains visibly dark in independent review; broadcast action frames can show only one fighter because the two bodies occlude. Cinematic samples show both, but the default broadcast path does not meet the readability criterion. |
| FR-4 / AC-4 (silhouette / fighter scaling) | blocked | Real rig measurement and projection pass, but independent image review confirms fighter occlusion in default broadcast action frames. |
| FR-5 / AC-5 (full HUD names) | pass | Full `textContent` on both plates in every capture, `clip`/`normal`/`anywhere`, `scrollWidth == clientWidth`; portrait wraps to two legible lines; no ellipsis by vision. |
| FR-6 / AC-6 (safe area, controls, lens/lifecycle/dense effects) | pass with finding | Plate/control bounds and overflow measured at all viewports; lens/lifecycle and reduced-motion pin measured; dense vignette ≤0.81 with no errors; landscape HUD raw 39/37 line-box delta recorded. |
| FR-7 / AC-6 (dense effects, no errors) | pass | Dense beats with active hit vignette, names intact, no overflow, zero console errors/warnings across all sessions. |
| NFR-1 / NFR-2 / NFR-3 | pass by scope | No sim/save/balance/audio/voxel/ranch/generated/lockfile edit; gate determinism digests byte-identical. |
| NFR-4 / NFR-5 / AC-7 (full gate) | pass (retry) | Final exact `bun run verify && bun run build` exit 0: 4616 pass / 1 skip / 0 fail, 682379 expect() calls, Biome 1063 files, Vite build green; module-size 5/0. First attempt timed out in one cup test with browsers open; retry clean. |
| AC-7 terminal proof (registry/archive/review/PR) | partial by design | Owner-owned Conductor terminal actions are not part of this phase; see `integrated.md`. |

## Deviations

1. `Date.now` was pinned to `1700000000000` only while `button.spar-button`
   opened the real spar panel, so `makeExhibition` deterministically drew a
   mixed-species rival (`Tide Axolotl`). The original `Date.now` was restored
   immediately; no app/sim code changed.
2. `window.__p3mode` and `window.__p3nextmode` were browser-side bookkeeping
   for capture scripts; camera/motion state itself was changed only via real
   sim `setArenaCamera` / `setReducedMotion` + `saveGame` + reload.
3. No DOM `.click()` was used. Three earlier attempts to click
   `button.camera-chip` in the Settings UI timed out (`element is not
   visible`); those attempts were abandoned and the real sim seam used instead.
4. Landscape HUD names report `scrollHeight 39` / `clientHeight 37` (2 px
   line-box delta) at 852×393; vision OCR confirms full text and no ellipsis.
   Reported as a raw metric, not claimed as user-visible clipping.
5. Landscape reduced/cup frames resolve into a VICTORY banner immediately and
   the ranch baseline has no arena, so the all-four-corner claim in landscape
   rests on the live framing projection math and captured wide-shot attempts,
   not a clean four-corner landscape still.
6. The first full gate attempt hit a 60 s timeout in one cup test with three
   headless browsers open; browsers were closed and the exact command rerun
   green. No code or test was modified.
7. The GIF was not transcoded by this phase; the exact ffmpeg command and
   ≤10 MB / ≤10 fps target are left for the primary.

## Notes for primary

- Evidence inventory: PNGs named in the matrix, one WebM, `projection-measurement.json`,
  capture/seed scripts, `gate-attempt-1.txt`, and `README.md` under
  `.conductor/evidence/20261127-arena-readability-pass/` (gitignored).
- Both `phase-3.md` and `integrated.md` are intentionally uncommitted. No
  commits were created in Phase 3; head is unchanged from the phase base.
- All Playwright sessions were closed (`playwright-cli list` → `(no browsers)`);
  the Vite dev server was left running as instructed.
- One visual finding worth carrying to review: at `ACTION_FRAMING.azimuth = π/2`
  same- or near-height fighters can overlap on screen, so a single 3D body is
  visible in some sampled action frames even though both HUD identities remain
  readable. This is not a HUD truncation or an overflow regression.

## Primary verification

**Result: blocked — visual acceptance criteria are not met.**

The primary independently inspected ten captured frames with image analysis and
read three representative PNGs directly:

- `mixed-broadcast-action-a-1440x900.png`: both HUD names are complete, but the
  two fighter bodies heavily overlap.
- `mixed-broadcast-action-c-1440x900.png`: only the blue axolotl body is
  visible; the brown draconic fighter is occluded.
- `mixed-broadcast-action-a-393x852.png`: only one fighter body is visible and
  it is clipped by the left edge; the arena remains very dark.
- `cup-battle-action-a-852x393.png`: only one small fighter body is visible in
  a wide, dark arena.
- `mixed-cinematic-action-a-1440x900.png` does show two separated bodies, so the
  problem is specifically the default broadcast action composition, not a
  universal rendering failure.

Independent vision review also described the arena as low-contrast/dim in the
sampled broadcast, portrait, landscape, and reduced-motion frames. Full HUD
names, no ellipsis, no horizontal page overflow, projection math, clean
consoles, and the automated gate are confirmed, but they do not compensate for
the core visual failure: the default battle view can hide one fighter and the
arena contrast remains weak.

Scope check: `git diff --name-only 4971dbcc..HEAD` is empty and the phase range
contains no commits; only the two evidence files are untracked. No code, test,
CSS, generated file, dependency, or frozen surface changed during Phase 3.

The primary did not transcode the GIF because the phase is not accepted. The
WebM and the exact ffmpeg command remain available for a corrected capture
phase.

**Blocking items:**

1. Default broadcast action framing must keep both fighter silhouettes visibly
   separated/readable at rest and during representative action beats.
2. Arena contrast must be materially improved in real captures, not only in
   palette constants.
3. A corrected Phase 3 pass must repeat the three-viewport evidence matrix and
   produce the GIF before acceptance.
