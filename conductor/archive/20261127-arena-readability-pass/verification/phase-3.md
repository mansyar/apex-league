# Phase 3 evidence — Spar/cup browser proof and integrated gate

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Phase base: `4971dbccd2bf99a53677c47e17edc9e1ad902992`
Phase: 3 — Spar/cup browser proof and integrated gate
Date: 2026-11-27
Status: **verified after the Phase 4 correction and reopened pass** (the original blocked pass is preserved below)

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

---

## Reopened after Phase 4 (2026-11-27)

Phase 3 was reopened after Phase 4 (`c6e2963d`) fixed the two blocking visual
defects: default broadcast fighters now separate via a measured-azimuth search,
and arena paint/lighting contrast was raised. Phase base for this reopened pass
was `795711f8356d14ea58cc67d41f27a78e8b4d2ce5`; head was unchanged by this
evidence-only phase. **Result: verified, with the limitations below recorded.**
All earlier failed evidence was preserved; every new visual uses a `corrected-`
prefix.

### Reopened method and boundaries

- No production code, CSS, tests, generator, schema, sim, save, audio, plan,
  metadata, roadmap, product docs, review or PR edits. No commits.
- Saves/casts came only from real sim exports. The player was a real
  `C.createCreatureFrom(m.getSpecies('spark_ray'), 12345)` creature installed
  into a normal `chooseStarter`/`evolveCreature` save and renamed `Sunbeam
  Comet` with `renameCreature`. Rivals came from the real `makeExhibition`.
- `Date.now` was pinned to `2147483648` only while `button.spar-button` opened
  the spar panel; `battleSeed = 0` deterministically drew `Ember Drake` (seed
  0, doctrine Press). The original clock was restored immediately. No DOM
  `.click()` workaround was used; all navigation used Playwright pointer/keyboard
  actions. Camera style and reduced motion used real `setArenaCamera` /
  `setReducedMotion` + `saveGame` + reload; `window.__p3mode`,
  `window.__p3nextmode`, `window.__p3pauseMs` were browser-only bookkeeping.
- Viewports were set before navigation in separate sessions (`c3d` desktop,
  `c3p` portrait, `c3l` landscape, `c3v` video). All in-fight measurements and
  stills were taken inside one `run-code` call.

### Reopened matrix (all paths relative to `.conductor/evidence/20261127-arena-readability-pass/`)

| State | 1440×900 | 393×852 | 852×393 |
| --- | --- | --- | --- |
| Ranch baseline | `corrected-ranch-baseline-1440x900.png` | `corrected-ranch-baseline-393x852.png` | `corrected-ranch-baseline-852x393.png` |
| Wide establishing / corners | `corrected-spar-broadcast-entry-1440x900.png` (top-left corner visible; rest off-frame), `projection-measurement-corrected.json` (all four NDC-in-frame) | `corrected-spar-reduced-entry-393x852.png` (front/upper corners visible; banner), `projection-measurement-corrected.json` | `corrected-cup-broadcast-entry-852x393.png` — vision: **all four inner-square corners visible**, two fighters separate, no banner; `projection-measurement-corrected.json` |
| Spar broadcast action | `corrected-spar-broadcast-{entry,action-a..f,dense}-1440x900.png` | `corrected-spar-broadcast-*-393x852.png` | `corrected-spar-broadcast-*-852x393.png` |
| Spar cinematic action | `corrected-spar-cinematic-*-1440x900.png` | `corrected-spar-cinematic-*-393x852.png` | `corrected-spar-cinematic-*-852x393.png` |
| Real cup battle | `corrected-cup-broadcast-{entry,action-a..d,dense}-1440x900.png` | `corrected-cup-broadcast-*-393x852.png` | `corrected-cup-broadcast-*-852x393.png` |
| Reduced-motion stable arena | `corrected-spar-reduced-*-1440x900.png`, `corrected-wide-reduced-*-1440x900.png` | `corrected-spar-reduced-*-393x852.png` | `corrected-spar-reduced-*-852x393.png` |

`*` expands to `entry`, `action-a`…`action-f` (spar) / `action-a`…`action-d`
(cup), `dense`, and where captured `final`. Additional attempts
`corrected-wide-broadcast-*`, `corrected-establishing-broadcast-*`, and
`corrected-establishing-pause-*-1440x900.png` are preserved as honest failed
attempts at a clean establishing still; none replaced a matrix cell.

### Reopened commands and results

```text
playwright-cli -s=c3d open about:blank        (then resize 1440 900, goto http://localhost:5173/)
playwright-cli -s=c3p open about:blank        (then resize 393 852, goto http://localhost:5173/)
playwright-cli -s=c3l open about:blank        (then resize 852 393, goto http://localhost:5173/)
playwright-cli -s=c3v open about:blank        (then resize 1440 900, goto http://localhost:5173/)
playwright-cli -s=<session> run-code --filename=.conductor/evidence/20261127-arena-readability-pass/seed-corrected.js
playwright-cli -s=<session> run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-corrected.js
playwright-cli -s=<session> run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-corrected-cup.js
playwright-cli -s=<session> run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-wide-corrected.js
playwright-cli -s=<session> run-code --filename=.conductor/evidence/20261127-arena-readability-pass/capture-establishing-pause.js
playwright-cli -s=c3p run-code --filename=.conductor/evidence/20261127-arena-readability-pass/measure-projection-corrected.js
playwright-cli -s=c3v video-start .conductor/evidence/20261127-arena-readability-pass/corrected-arena-action-desktop-1440x900.webm
playwright-cli -s=c3v run-code --filename=.conductor/evidence/20261127-arena-readability-pass/start-spar-wait-corrected.js
playwright-cli -s=c3v video-stop
playwright-cli -s=c3p console
playwright-cli -s=c3l console
playwright-cli -s=c3v console
playwright-cli close-all
playwright-cli list
```

Every capture/seed run returned `errors: []`. `seed-corrected.js` reported
`Sunbeam Comet`, `spark_ray`/`ray`/`baby`, save key `apex.save` version 26,
`scrollWidth == innerWidth` at every viewport, and `bodyClass:"is-reduced"`
only for reduced runs. Spar panels reported `Ember Drake · Seed 0 · Press`.
Cup runs seeded day 7, phase `cup`, `Sunbeam Comet`, status `player-turn`,
next opponent `Pondskipper Grub`, session keys including `bracket`, `seed`,
`nextPlayerRound`, `nextOpponent`. Console totals were `Total messages: 2
(Errors: 0, Warnings: 0)` for each checked session; `playwright-cli list` →
`(no browsers)` after `close-all`. Vite was left running.

The final corrected WebM used the `Ember Drake`/seed 0 cast: 13 frames at
200 ms intervals had stable names `Sunbeam Comet · Press` / `Ember Drake ·
Press`, `scrollWidth 1440`, and `.hit-vignette` peaks 0.81, 0.702206 and
0.63385 with `errors: []`. Suggested GIF transcode (left for the primary;
target ≤10 MB, ≤10 fps):

```text
ffmpeg -y -i .conductor/evidence/20261127-arena-readability-pass/corrected-arena-action-desktop-1440x900.webm -vf "fps=8,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" -loop 0 .conductor/media/20261127-arena-readability-pass/arena-readability.gif
```

### Reopened gate

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify && bun run build` (browsers closed) | 0 | 4623 pass / 1 skip / 0 fail, 683529 expect() calls, 4624 tests / 446 files / 93.74s; Biome clean on 1063 files; voxel determinism byte-identical for all archetype stages and 5 props; Vite `index-DhAc5cQZ.js` 1,114.41 kB (gzip 309.22 kB), only the pre-existing chunk advisory. |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | 0 | 5 pass / 0 fail / 15 expect() calls, 318 ms, bun 1.4.4 (38afee6c8) 4x PARALLEL. |

No app, test, generated or lockfile change was made to obtain these results.

### Reopened measurements

HUD names were read live in every flow. All had `textOverflow: clip`,
`whiteSpace: normal`, `overflowWrap: anywhere`, `scrollWidth == clientWidth`,
and no ellipsis. `fullyVisible: false` in landscape is caused only by a 2 px
line-box delta (`scrollHeight 39` / `clientHeight 37`); vision OCR transcribed
both full names with no visible clipping.

| Viewport / flow | Left name (scroll/client; scrollH/clientH; rect) | Right name | Dense vignette |
| --- | --- | --- | --- |
| 1440×900 broadcast | `Sunbeam Comet · Press`; 210/210 | `Ember Drake · Press`; 180/180 | 0.741629 (peak 0.81) |
| 1440×900 cinematic | 210/210 | 180/180 | 0.260035 (late 0.81) |
| 1440×900 reduced | 210/210 | 180/180 | 0 (`dense: null`) |
| 1440×900 cup | `Sunbeam Comet · Press`; 210/210 | `Pondskipper Grub`; 163/163 | 0.701377 |
| 393×852 broadcast | `Sunbeam Comet · Press`; 65/65; 44/43; x 61 y 113 w 64.5 h 42.9 | `Ember Drake · Press`; 65/65; 44/43; x 267.5 | 0.644147 (peak 0.793069) |
| 393×852 cinematic | 65/65; 44/43; x 61 | 65/65; 44/43; x 267.5 | 0.77344 (final 0.81) |
| 393×852 reduced | 77/77; 44/43 | 71/71; 44/43 | 0 (`dense: null`) |
| 393×852 cup | `Sunbeam Comet · Press`; 65/65; 44/43 | `Pondskipper Grub`; 65/65; 29/29 | 0.81 |
| 852×393 broadcast | `Sunbeam Comet · Press`; 174/174; 39/37; x 140.7 y 118.3 w 174.1 h 37.4 | `Ember Drake · Press`; 174/174; 39/37; x 537.2 | 0.773916 |
| 852×393 cinematic | 174/174; 39/37; x 140.7 | 174/174; 39/37; x 537.2 | 0.779455 (late 0.81) |
| 852×393 reduced | `Sunbeam Comet · Press`; 190/190; 39/37; x 142.1 y 121.5 w 189.3 h 37.2 | `Ember Drake · Press`; 180/180; 20/19; x 530.9 | 0 (`dense: null`) |
| 852×393 cup | `Sunbeam Comet · Press`; 174/174; 39/37; x 140.7 | `Pondskipper Grub`; 163/163; 20/19; x 548.6 y 127 w 162.7 | 0.41071 (final 0.81) |

`document.documentElement.scrollWidth == innerWidth` at every capture
(1440/1440, 393/393, 852/852). HUD plates and visible controls stayed inside
the viewport (landscape plates x 140.7 and x 503, w 208.3; 5 controls in / 0
out for active spar, 6 in / 0 out for reduced; portrait 4–5 in / 0 out).

Projection was remeasured in-browser with the post-Phase-4 9-argument
`trackedActionFraming` and real `buildSpot` heights **and radii**. Full source
output: `projection-measurement-corrected.json`. Measured rigs (height /
bodyRadius world units): draconic champion 0.362667/0.208, draconic baby
0.364/0.208, axolotl baby 0.134737/0.16, ray baby 0.073514/0.136, golem baby
0.450545/0.236, tortoise baby 0.3/0.24. Establishing radius/fov:
12.5/45 at 1440×900 and 852×393, 18.75/57 at 393×852; all four painted
corners (±3.2, ±2.4) had `inFrame: true` at every viewport.

Smaller-fighter projected height (percent / CSS px) and centre gap:

| Cast | 1440×900 | 393×852 | 852×393 |
| --- | --- | --- | --- |
| draconic vs draconic | 10.70% / 96.3 px; gap 141.4 px | 8.20% / 69.9 px; gap 63.6 px | 10.74% / 42.2 px; gap 62.7 px |
| ray vs ray (floor) | 8.20% / 73.8 px; gap 235.8 px | 8.20% / 69.9 px; gap 63.6 px | 8.20% / 32.2 px; gap 121.8 px |
| draconic vs axolotl | 22.32% / 200.9 px; gap 174.7 px | 15.12% / 128.8 px; gap 96.1 px | 22.32% / 87.7 px; gap 76.3 px |
| ray vs golem | 22.32% / 200.9 px; gap 320.2 px | 10.56% / 90.0 px; gap 37.6 px | 22.32% / 87.7 px; gap 139.8 px |
| real spar ray vs draconic | 22.32% / 200.9 px; gap 320.2 px | 9.30% / 79.2 px; gap 70.7 px | 22.32% / 87.7 px; gap 139.8 px |

All sampled bodies had `inFrame: true`; tightest case was ray/ray landscape at
8.20% / 32.2 px, satisfying the 8% / 32 px floor. `extentGapCssPx` remained
negative in some cases (rendered footprints still overlap at the floor), which
is consistent with Phase 4's accepted extent-based centre-separation target
rather than a full pixel gap; representative action beats and broadcast entry
nevertheless showed two distinct bodies in vision review.

Camera lifecycle was exercised by real saved broadcast/cinematic styles, by
fresh sessions at each aspect ratio, and by reduced-motion pinning. Reduced
frames had vignette 0 in every shot, `dense: null`, and no residual shake;
verdict `battle-stamp ... show ... in` appeared immediately in reduced flows,
so those stills prove pinning/no-flash rather than clean live action. Dense
broadcast/cinematic beats peaked at 0.81 with both names readable, no overflow
and no console/page errors.

Vision review of corrected stills: desktop broadcast entry and cinematic
action-a showed two separate fighters, bright painted lines, full HUD names and
no banner; desktop cup entry showed two separate fighters with two painted
corners visible; portrait broadcast entry showed two separate fighters and no
clipping; landscape cup entry showed all four inner-square corners and two
separate fighters; portrait reduced entry showed the verdict banner with front
corners visible and no HUD clipping. Some later melee beats still converge and
occlude one body, but this is physical convergence, not the original default
depth-aligned occlusion.

### Reopened AC mapping

| ID | Reopened status | Evidence |
| --- | --- | --- |
| FR-1 / AC-1 | pass | 9-arg projection + real rig radii; worst 8.20% / 32.2 px landscape. |
| FR-2 / AC-2 | pass with finding | All four corners NDC-in-frame at all viewports; clean visual four-corner proof at 852×393 cup entry; desktop/portrait rely on projection math plus partial visuals. |
| FR-3 / AC-3 | pass | Corrected broadcast entry and cinematic action beats show two separated fighters; bright arena paint; reduced pin and resize verified. |
| FR-4 / AC-4 | pass with finding | Corrected rig/radius projection and vision show separated bodies in entry/action beats; later melee convergence can still hide one body. |
| FR-5 / AC-5 | pass | Full text, clip/normal/anywhere, `scrollWidth == clientWidth`, no OCR clipping at all viewports. |
| FR-6 / AC-6 | pass with finding | Plate/control bounds and zero overflow; landscape 39/37 line-box delta recorded; dense vignette ≤0.81, no errors. |
| FR-7 / AC-6 | pass | Dense hits with names intact, no overflow, zero console errors. |
| NFR-1..NFR-5 / AC-7 gate | pass | Final exact gate 4623 pass / 1 skip / 0 fail; module-size 5/0. |
| AC-7 terminal proof | partial by design | Primary-owned registry/archive/review/PR remains outside this phase. |

### Reopened deviations and notes

1. `Date.now` pin changed to `2147483648` for the spar panel only, giving
   `Ember Drake` seed 0; a real `createCreatureFrom(spark_ray)` ray was installed
   as the player cast. No save/sim code was edited.
2. No DOM `.click()` was used. Camera/motion state used real sim seams.
3. Reduced flows resolve to a verdict banner before the first frame, so reduced
   stills prove pinning/no-flash, not unobstructed action or all four corners.
4. A clean visual all-four-corners still was obtained at 852×393 only; desktop
   and portrait use the real `establishingFraming` projection containment plus
   partial/bright-corner stills. `capture-establishing-pause.js` and
   `capture-wide-corrected.js` attempts are preserved, not claimed as proof.
5. Some vision calls returned HTTP 429 rate-limit errors; those were not retried
   in a tight loop and are not command failures. All usable OCR results are
   summarized above.
6. A background projection run on `c3d` stalled behind the clock-pause script;
   the same script was run successfully on `c3p` and that output was saved as
   `projection-measurement-corrected.json`.
7. The original failed evidence and the original WebM are untouched. The GIF
   was not transcoded; the command above targets
   `.conductor/media/20261127-arena-readability-pass/arena-readability.gif`.
8. `git status --short` showed the two evidence files as the only changes;
   no commits were made. Head remains `795711f8`. All Playwright sessions were
   closed before the gate; Vite was left running.

## Independent primary verification (reopened pass)

**Result: verified with recorded, non-blocking visual findings.**

The primary independently reviewed the corrected stills directly and through image
analysis, including six-frame broadcast contact sheets for desktop, portrait and
landscape and a cinematic desktop contact sheet:

- Desktop broadcast `action-b` through `action-f` show two distinct, contained
  fighter bodies; the earlier `action-a` transition frame still clips the draconic
  fighter at the right edge. This is recorded as a transient camera-settling
  limitation, not hidden; the settled action beats meet the readability criterion.
- Portrait broadcast frames show both the ray and draconic bodies, with complete
  HUD names and no horizontal overflow. Landscape broadcast frames show both
  bodies; the background remains subdued, but floor lines and both silhouettes
  are readable.
- Desktop cinematic frames show both bodies and complete HUD names. The landscape
  cup entry shows all four inner arena corners and two separate fighters.
- Corrected arena paint/lighting is materially clearer than the rejected first
  pass: the floor boundary and fighters read against the background in real
  captures. Dense effects preserve both names and produce no console errors.
- Reduced-motion portrait remains wide/stable with vignette 0; the immediate
  victory banner is documented and is not used as proof of live action framing.

Primary automated verification:

- `git diff --name-only 795711f8..HEAD` and the phase log were empty before the
  two evidence files; only `phase-3.md` and `integrated.md` are working-tree
  changes. `git diff --check` exits 0.
- Exact `(bun run verify && bun run build)` re-run exits 0: clean typechecks;
  **4,623 pass / 1 skip / 0 fail**, 683,529 expect() calls, 4,624 tests across
  446 files; Biome clean on 1,063 files; every archetype stage and all 5 prop
  digests byte-identical; Vite `index-DhAc5cQZ.js` 1,114.41 kB with only the
  pre-existing chunk advisory.
- Independent exhaustive containment probe
  `.conductor/evidence/arena-framing-exhaustive-result.json` checked **252,000
  whole-body corner projections with 0 failures** across five measured body
  profiles, all 15×15 legal ground-position pairs, and all three viewports.
- Corrected browser projection data records the tightest rest case at ray/ray
  landscape **8.20% / 32.2 CSS px** and all four establishing corners in NDC.

GIF proof was produced by the primary from the corrected WebM, trimming its
ranch/loading preamble:

- `.conductor/media/20261127-arena-readability-pass/arena-readability.gif`
- 960×540, 8 fps, 64 frames, 8.01 s, 5,077,671 bytes; gitignored and not committed.

Recorded findings for strict review: the initial desktop broadcast transition
can clip one body before the tracked camera settles; landscape HUD names retain
a raw 39/37 line-box delta without visible text clipping; a clean desktop or
portrait all-four-corner still was not obtained, so those viewports rely on real
projection containment plus partial visuals. None reverses the corrected default
broadcast separation or the materially improved arena contrast.

## R1 — strict review fixes and missing visual proof (2026-11-27)

Branch `feat/20261127-arena-readability-pass`, phase base
`38605961e81743a6cdde7cec4a56b24188f2c8cb`. Round 1 `BLOCK` findings F1–F4 were
resolved without an override and without renumbering FR-1..FR-7, NFR-1..NFR-5
or AC-1..AC-7. Code, tests and TDD evidence are in `phase-R1.md`; this section
records only the additional real-browser proof and console totals. No tracked
source was changed in this browser pass, and no evidence file was committed.

### Real-browser method and boundaries

- Sessions `r1d` (1440×900), `r1p` (393×852) and `r1l` (852×393), each resized
  before navigation. Every save was written only through the real sim's
  `saveGame(localStorage, state, Date.now(), session)` after real sim exports
  (`chooseStarter`, `createCreatureFrom`, `renameCreature`, `advanceDay`,
  `startCupSession`, `setArenaCamera`, `setReducedMotion`); no hand-crafted save
  JSON and no DOM `.click()` were used.
- The player was a real `createCreatureFrom(getSpecies("spark_ray"), 12345)`
  creature renamed `Sunbeam Comet`; day 7 was reached with six real `advanceDay`
  calls and a real `startCupSession`. Navigation used Playwright pointer/keyboard
  only: `getByRole("button", { name: /Enter Cup/ })`,
  `.cup-screen-bracket .cup-cta-go`, `getByRole("button", { name: "Press" })`,
  and the last `Step into the arena` button. All measurement happened inside one
  `run-code` call per viewport, using dynamically imported real arena framing
  modules; no debug global was added to the client.
- Representative real-sim seed result (393×852, also identical at the other
  widths): `{"ok":true,"day":7,"phase":"cup","name":"Sunbeam Comet",
  "speciesId":"spark_ray","stage":"baby","camera":"cinematic",
  "reducedMotion":false,"nextOpponent":"Pondskipper Grub",
  "sessionKeys":["bracket","seed","rivalResolutions","rivalVerdicts",
  "playerVerdicts","completionVerdicts","nextPlayerRound","nextOpponent",
  "status","championName"],"saveKey":"apex.save","scrollWidth":393,
  "innerWidth":393}` with `errors:[]`.
- Prior `corrected-*` artifacts were preserved. New artifacts use the `r1-`
  prefix under `.conductor/evidence/20261127-arena-readability-pass/`.

### Cup cinematic captures (all three viewports)

Scripts: `r1-seed.js`, `r1-capture-cup.js`, `r1-probe.js`. Captures:
`r1-cup-cinematic-entry-<tag>.png` and
`r1-cup-cinematic-action-{a,b,c,d}-<tag>.png` for `1440x900`, `393x852` and
`852x393`. Each `run-code` returned `errors:[]`; per-viewport console totals from
`playwright-cli console` are recorded below.

Measured wide / establishing camera from the real `establishingFraming` module:

| Viewport | radius | fov | Four painted corners |
| --- | --- | --- | --- |
| 1440×900 | 12.5 | 45 | all `inFrame:true` |
| 393×852 | 18.75 | 57 | all `inFrame:true` |
| 852×393 | 12.5 | 45 | all `inFrame:true` |

Exact 1440×900 corner NDC: `(±0.284453 / 0.106846)`, `(-0.463996,-0.388410)`,
`(0.356195,0.045722)`, `(0.410854,-0.503415)`.
Exact 852×393 corner NDC: `(±0.209934 / 0.106846)`, `(-0.342442,-0.388410)`,
`(0.262882,0.045722)`, `(0.303222,-0.503415)`.

Measured tracked cinematic action pose and body projection (real
`trackedActionFraming` with measured rigs, `ARENA_HALF_X=3.2`,
`ARENA_HALF_Z=2.4`, `MM_TO_WORLD=0.0008`):

| Viewport | action pose | ray height / CSS px | drake height / CSS px | HUD name widths |
| --- | --- | --- | --- | --- |
| 1440×900 | `targetX:-1.6, targetY:0.036757, targetZ:0, azimuth:4.83238898038469, elevation:0, fov:13.416886490521344, radius:1.4` | `0.223214` / `200.893` | `0.336828` / `303.145` | `210/210`, `163/163` |
| 393×852 | same angles, `fov:13.416886490521344, radius:3.360103071169192` | `0.093003` / `79.239` | `0.235097` / `200.303` | `65/65`, `65/65` |
| 852×393 | same angles, `fov:13.416886490521344, radius:1.4` | `0.223214` / `87.723` | `0.336828` / `132.373` | `174/174`, `163/163` |

All action bodies were `inFrame:true` in the module projection at all three
viewports; the 8% / 32 CSS-pixel floor holds at every captured beat. Example
1440×900 boxes: ray `minX:-0.627480, maxX:0.529363, minY:-0.250261,
maxY:0.250261`, drake `inFrame:true`; 852×393 ray box
`[-0.463098,0.390685,-0.250261,0.250261]`, drake
`[0.135325,0.509589,-0.071912,0.637617]`.

Visual review of action beats: `action-c` at 1440×900 shows two distinct bodies
with no edge clipping; 393×852 fighters remain visually interlocked in the
settled beats even though the measured NDC boxes are contained; 852×393
`action-c` shows two bodies partly clipped at the top edge of the *HUD frame*,
while the module projection of the camera itself remains contained. The corner
evidence at 852×393 continues to match the earlier corrected entry still.

### Clean four-corner stills

The live arena has no HUD-free wide frame: `apps/client/src/scene/frame.ts`
calls `cameraRig.updateArena(...)` before `renderer.render(...)`, and the F1 fix
cuts establishing→action on the first arena frame, so the wide pose is never
rendered by the live app. A real-clock attempt (`r1-wide-clock.js`) and a
1 ms stepped-clock attempt (`r1-wide-steps.js`, 40 steps, `errors:[]`) both
confirmed this: every still showed the tight action view with HUD and
`APEX FEED` overlays, never all four corners. Those artifacts were kept as
`r1-wide-*` evidence of the lifecycle behavior, not as corner proof.

Instead, `r1-wide-render.js` rendered the clean establishing still **in the real
browser** from the same production modules the app uses: dynamically imported
`buildArena` (`arena.ts`), `establishingFraming` (`scene-logic/framing.ts`),
`ARENA_FRAMING` / `BASE_FOV` (`camera/presets.ts`), `ARENA_HALF_X/Z`
(`arena-scale.ts`), and Three.js from the Vite module graph. The arena was shown
at full `setBlend(1)`, the canvas was placed over the page (no DOM `.click()`),
and a single `renderer.render(scene, camera)` produced:

- `r1-wide-clean-1440x900.png` — all four painted corner markers visible, no
  HUD/overlay text. Measured `radius:12.5, fov:45`; corner NDC
  `(-3.2,-2.4)→(-0.284453,0.106846)`,
  `(-3.2,2.4)→(-0.463996,-0.388410)`,
  `(3.2,-2.4)→(0.356195,0.045722)`,
  `(3.2,2.4)→(0.410854,-0.503415)`; canvas `1440×900`; `errors:[]`.
- `r1-wide-clean-393x852.png` — all four painted corner markers visible, no
  HUD/overlay text. Measured `radius:18.75, fov:57`; corner NDC
  `(-3.2,-2.4)→(-0.534705,0.057902)`,
  `(-3.2,2.4)→(-0.789717,-0.190581)`,
  `(3.2,-2.4)→(0.661041,0.024462)`,
  `(3.2,2.4)→(0.684243,-0.241703)`; canvas `393×852`; `errors:[]`.
- `r1-wide-clean-852x393.png` — all four corners visible as an additional
  landscape check; `radius:12.5, fov:45`, same NDC values as the cup-entry
  measurement above, canvas `852×393`, `errors:[]`.

Every still was visually reviewed; desktop and portrait show the full cream
rectangular boundary and center ring over the broadcast floor. No source debug
hook or save JSON was introduced for these captures.

### Console totals and cleanup

`playwright-cli console` returned `Total messages: 2 (Errors: 0, Warnings: 0)`
for `r1d`, `r1p` and `r1l`. Every in-run `run-code` returned `errors:[]`.
`playwright-cli close-all` was run and `playwright-cli list` reported
`(no browsers)` before the primary gate. The Vite server was left running at
`http://localhost:5173/` (it was restarted by the harness after a shell
timeout; no source was changed by the restart).

## Rework 2 — live visual corrections and fresh captures (2026-11-27)

Primary image review rejected the Rework 1 live captures: portrait
`action-a/b/c` clipped upper bodies and landscape `action-a/b/c` clipped the
top against the HUD, despite static fixtures being green. Rework 2 removed all
arena pose easing, suppressed arena shake, restored a deterministic 0.75-second
full-motion wide establishing beat before the hard cut, and made cinematic use
zero azimuth delta, zero elevation and no director radius multiplier. Reduced
motion skips the beat and uses readable broadcast action immediately. Full TDD
red/green evidence is in `phase-R1.md`; requirement IDs are unchanged and no
overrides or commits were made.

### Real-browser method and boundaries

- Sessions `r2d` (1440×900), `r2p` (393×852) and `r2l` (852×393) were resized
  before navigation and kept to one open session at a time. Each capture was
  preceded by a real-sim-only day-7 cup seed via `r1-seed.js`:
  `createInitialState`, `chooseStarter(state, "fire_drake", 12345)`, replace
  the creature with `createCreatureFrom(getSpecies("spark_ray"), 12345)`,
  `renameCreature`, `setArenaCamera`, `setReducedMotion`, six `advanceDay`
  calls, `startCupSession`, then `saveGame(localStorage, state, Date.now(),
  session)`. Typical result: `ok:true`, `day:7`, `phase:"cup"`,
  `name:"Sunbeam Comet"`, `speciesId:"spark_ray"`, `stage:"baby"`,
  `camera:"cinematic"`, `reducedMotion:false`,
  `nextOpponent:"Pondskipper Grub"`, `errors:[]`.
- Navigation used Playwright pointer/keyboard only (`Enter Cup`,
  `.cup-screen-bracket .cup-cta-go`, `Press`, last `Step into the arena`). No
  DOM `.click()` and no hand-crafted save JSON. All measurement happened inside
  one `run-code` call per viewport, importing the real framing modules; no
  debug global was added to the client. Prior `r1-` and `corrected-*` artifacts
  were preserved; new artifacts use the `r2-` prefix under
  `.conductor/evidence/20261127-arena-readability-pass/`.

### Cup cinematic action (all three viewports)

Scripts: `r2-capture-cup.js`. Captures:
`r2-cup-cinematic-action-{a,b,c,d}-1440x900.png`,
`-393x852.png`, `-852x393.png`. Final measured poses and body projections:

| Viewport | radius / fov / targetY | ray fraction / px | drake fraction / px | HUD widths |
| --- | --- | --- | --- | --- |
| 1440×900 | `1.4 / 20.011849046899478 / 0.1813335` | `0.148810` / `133.929` | `0.224552` / `202.097` | `210/210`, `163/163` |
| 393×852 | `2.085498769763847 / 20.011849046899478 / 0.1813335` | `0.099896` / `85.112` | `0.194663` / `165.853` | `65/65`, `65/65` |
| 852×393 | `1.4 / 20.011849046899478 / 0.1813335` | `0.148810` / `58.482` | `0.224552` / `88.249` | `174/174`, `163/163` |

All four arena corners remained `inFrame:true` for the wide shot at each
viewport (1440×900 and 852×393 `radius:12.5, fov:45`; 393×852
`radius:18.75, fov:57`). Final body NDC boxes:

- 1440×900: ray `[-0.418320,0.352908,-0.823075,-0.393930]`, drake
  `[0.122241,0.460315,-0.236510,0.236510]`; both `inFrame:true`.
- 393×852: ray `[-0.903166,0.807532,-0.529346,-0.274111]`, drake
  `[-0.068181,0.939939,-0.203131,0.203131]`; both `inFrame:true`.
- 852×393: ray `[-0.308732,0.260456,-0.823075,-0.393930]`, drake
  `[0.090217,0.339726,-0.236510,0.236510]`; both `inFrame:true`.

Visual review of `action-a` and `action-c`: 1440×900 shows both bodies fully
inside the viewport and meaningfully distinct; 852×393 shows both bodies inside
the viewport and horizontally offset; 393×852 shows both bodies inside the
viewport with the ray's wings overlapping the drake's legs. The persistent
battle HUD banner still covers part of the drake's head in landscape and part
of the upper arena in portrait. No viewport-edge cropping remains in the
inspected beats. This is an honest residual limitation, not a module-projection
failure; the 8% / 32 px floor and NDC containment hold at every captured beat.

### Live-app establishing beat (no synthetic substitute)

`r2-establishing.js` navigated with real pointer/keyboard using the real clock,
then installed/paused the clock only after the coaching room was visible,
landed after the 700 ms arena fade plus 40 ms inside the new 750 ms beat,
and saved `r2-establishing-1440x900.png` and
`r2-establishing-393x852.png`. Both `run-code` calls returned `errors:[]` and
`atBeat` reported `.battle-hud`, `#app.app-in-arena`, with canvas sizes
`1440×900` and `393×852`. Direct image inspection of both stills shows all
four painted cream arena corners inside the frame; these are real live-app
captures, not the earlier synthetic `r1-wide-clean-*` renders. Landscape
establishing capture was optional and was not repeated.

### Console totals and cleanup

`playwright-cli console` returned
`Total messages: 2 (Errors: 0, Warnings: 0)` for `r2d`, `r2p` and `r2l`.
Every capture/seed/beat `run-code` returned `errors:[]`.
`playwright-cli close-all` was run and `playwright-cli list` returned
`(no browsers)` before the primary gate. No evidence file was committed.

## Corrective pass — final-code r3 matrix (2026-11-28)

Owner-authorized corrective pass after the R1 red evidence. Production change
vs Rework 2: containment-only `ANIM_HEIGHT_PAD = 0.2` envelope with rebalanced
aim in `trackedActionFraming`; readability floor stays on measured rest height.
Full TDD red/green is in `phase-R1.md`; this section records only the fresh
real-browser proof at final code. No tracked source was changed in this browser
pass, and no evidence file was committed.

### Method and boundaries

- Same real-sim day-7 cup seed as r1/r2 (`r1-seed.js`: spark_ray baby
  `Sunbeam Comet`, cinematic, non-reduced, `Pondskipper Grub`; `ok:true`,
  `errors:[]`). Real pointer/keyboard navigation only (`Enter Cup`,
  `.cup-screen-bracket .cup-cta-go`, `Press`, last `Step into the arena`).
- Scripts: `r3-capture-cup.js` (waits past the 0.75 s establishing beat, then
  `action-a..d` at 240 ms), `r3-establishing.js` (live-app establishing beat and
  the after-cut frame), `r3-capture-gif.js` (48 frames at ~125 ms for the GIF).
  Console totals `2 messages, 0 errors, 0 warnings` per session; every
  `run-code` returned `errors:[]`.
- Artifacts use the `r3-` prefix under
  `.conductor/evidence/20261127-arena-readability-pass/`.

### Cup cinematic action (final code, all three viewports)

| Viewport | Action pose | ray fraction / px | drake fraction / px | HUD widths |
| --- | --- | --- | --- | --- |
| 1440×900 | `radius:1.9150898979648858, fov:20.011849046899478, targetY:0.2813335` | `0.108785` / `97.907` | `0.201332` / `181.199` | `210/210`, `163/163` |
| 393×852 | `radius:~2.0855, targetY:0.2813` | `0.0999` / `85.1` | in-frame | `65/65`, `65/65` |
| 852×393 | `radius:1.9150898979648858, fov:20.011849046899478, targetY:0.2813335` | `0.108785` / `42.753` | `0.201332` / `79.124` | `174/174`, `163/163` |

Wide establishing at final code: 1440×900 and 852×393 `radius:12.5,
fov:45`; 393×852 `radius:18.75, fov:57`; all four painted corners
`inFrame:true` at every viewport.

Vision verdict on the 12 final-code stills
(`r3-cup-cinematic-action-{a,b,c,d}-{1440x900,393x852,852x393}.png`):
**zero viewport-edge clip on all 12**; heads clear of HUD and scenery on every
beat (beat-a carries dark stands behind the heads — in-scene background, not
crop); fighters distinguishable by color/shape on every beat. Full measured
JSON and per-beat notes are in `phase-R1.md` (corrective appendix).

### Live-app establishing (final code)

`r3-establishing-1440x900.png` and `r3-establishing-393x852.png` show all four
painted corners cleanly in the live app (HUD overlay present, expected).
`r3-establishing-852x393.png` shows all four corners in-viewport with partial
fighter-HUD-panel overlap plus the arena fade still transitioning — a disclosed
clock-timing cosmetic, not a geometry defect (static NDC: all four `inFrame`).
`r3-after-cut-*` stills confirm the hard cut lands on tight action.

### GIF (final code)

Fresh transcode from the 48 final-code frames (replaces the pre-corrective
GIF, never attached to a PR):

```text
ffmpeg -y -framerate 8 -i .conductor/evidence/20261127-arena-readability-pass/r3-gif-frame-%02d.png -vf "scale=960:-1,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" .conductor/media/20261127-arena-readability-pass/arena-readability.gif
```

Result: 960 px wide, 8 fps, 48 frames, ~2.9 MB, gitignored and not committed.
Mid-sequence frame spot-check: both fighters fully in frame, HUD names intact,
no clip.
