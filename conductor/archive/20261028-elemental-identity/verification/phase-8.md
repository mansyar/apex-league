# Phase 8 verification (assembled by primary; sections appended per task)

## P8.T1 — 48-move catalog (desktop + phone)

All 48 catalog specials are bespoke (AC-1 audit: per-element 8-move pins
in `fallback.test.ts` assert bespoke + not-fallback for every move; full
gate green). Evidence frames live per phase; every move has 4 frames
(travel/impact × desktop/phone) under a regular naming pattern:

`verification/phase-<N>/<move>-{d,p}-{travel,impact}.png`

| Element | Phase | Moves (alphabetical) | Frames |
| --- | --- | --- | --- |
| Fire | 2 | blaze_bolt, cinder_dive, cinder_shot, flame_charge, flare_dart, pyre_lance, pyre_wall, spark | 32 |
| Water | 3 | bubble, foam_volley, maelstrom, mist_spray, riptide_rush, splash_bolt, tide_aegis, tide_shot | 32 |
| Plant | 4 | bramble_dart, bramble_guard, root_quake, seed_shot, spore_burst, thorn_charge, thorn_volley, vine_lash | 32 |
| Electric | 5 | arc_shot, gigavolt, ion_dart, ion_wall, static_jolt, storm_bolt, storm_surge, volt_dash | 32 |
| Earth | 6 | basalt_guard, boulder_toss, clay_burst, dust_devil, pebble_shot, quake_stomp, sand_blast, tectonic_slam | 32 |
| Wind | 7 | cyclone_dive, feather_dart, gale_cutter, gust, hurricane_spiral, sky_bolt, talon_slash, zephyr_veil | 32 |
| Fallbacks | 1 | fire, water, plant, electric, earth, wind bodies | 12 |

Total: 192 catalog frames + 12 fallback frames = 204. Capture setups:
fire draconic→bovine, water axolotl→draconic, plant bovine→axolotl,
electric storm_hound→axolotl, earth tortoise→storm_hound, wind
falcon→tortoise; far, 1×, seeded, explicit 1280×800 / 390×844 viewports,
clean console. Basic Strike is excluded by design (own future track).

## P8.T2 — Grayscale readability (AC-2)

Method: 6 reference finishers/signature reads re-triggered in the Move
Lab with `document.documentElement.style.filter='grayscale(1)'` applied
before the screenshot (12 frames: travel + impact each —
`verification/phase-8/gray-<element>-{travel,impact}.png`). Judged blind
on geometry alone (panel labels ignored):

- Water `maelstrom` travel: STRONG — smooth floating orb, no facets.
- Plant `vine_lash` travel: STRONG — faceted seed rake on a spread.
- Earth `tectonic_slam` travel: STRONGEST — massive angular slab.
- Wind `hurricane_spiral` travel: STRONG — horizontal streak vortex.
- Fire `pyre_lance` travel: MEDIUM — lance flash + halo reads as an
  energy lance; beam moves converge toward white-hot cores at peak.
- Electric `gigavolt` travel: MEDIUM — hot orb; tendril character lives
  in the arrival burst + motion (crackle), not the charge peak.

Verdict: PASS. No element depends on hue alone — travel geometry differs
per element (orb vs seed-cluster vs slab vs streak-vortex vs shard-spray
vs tendril orb). Impact frames converge by design on the shared white
contact flash; identity at impact is carried by burst treatment (ring
sizes, gravity/sway) + the travel shape that precedes it. No row changes;
the motion (900ms/step) separates fire flicker from electric crackle
where stills converge. First capture attempt caught a stale lab state
for earth (dev-HMR reload from concurrent T4 edits reset the lab —
environment collision, not a lab bug); recaptured with read-back
verification (`stateOk: true` all 6).

## P8.T3 — Acceptance sweep

- AC-1 lookup audit: 48/48 specials resolve bespoke (per-element pins,
  gate green); `DEFAULT_FX` serves only unknown ids / element-less
  lookups; Basic Strike untouched.
- AC-3 verb spot-checks: all 6 guards 0-shot/shove-0/ring; lash verbs
  simultaneous single-beat; finishers top their element on every axis
  (explicit spiral>dive, slam>stomp ordering pins).
- AC-5 caps/schema/deps: all move-fx modules ≤ 12 KB (earth 7.9,
  electric 6.0, fire 5.8, plant 6.5, water 5.7, wind 6.5, verbs 4.1,
  fallback 5.3, looks 3.0, moves 4.6, shot-geometry 5.0 KB — test file
  `fallback.test.ts` 18.9 KB is test code, outside the cap);
  `SAVE_VERSION` still 25 (no save migration); zero package.json/lock
  diffs vs `origin/main` (no new deps); lab chunk still split from the
  prod bundle (NFR-6).
- P8.T4 (lab phone-toggle fix): see P8.T4 section below — kept the
  toggle, routed through the real resize path, regression-pinned.

## P8.T4

- Result: fixed (kept the toggle, wired it through the real responsive path).
- Diagnosis: the phone toggle only flipped `body.app-in-movelab-phone`,
  which CSS-constrains `#app` to 390px — but the scene's resize wiring
  (`scene/frame.ts` `onResize`: `cameraRig.resize` + `camera.aspect` +
  `renderer.setSize` + `composer.setSize`) runs exclusively on `window`
  resize events, reading the scene container's client size. A class flip
  never fires that event, so the camera/renderer kept desktop dimensions
  inside the narrowed shell (mis-framed arena, empty strip). A real
  `setViewportSize(390x844)` fires a genuine resize, which is why only the
  toggle diverged.
- Fix-or-remove rationale: fix — the wiring is a two-line lab-side change
  (no scene/arena edits needed; the responsive path itself is correct), so
  removal would have discarded a useful dev rig for no reason. New exported
  `setLabPhoneWidth(on)` in `apps/client/src/movelab/lab.ts` toggles the
  class then dispatches `window` `resize`, reusing the exact handler real
  viewports hit; the handler's `container.clientWidth` read forces layout,
  so the fresh 390px width applies synchronously. The change handler now
  calls it.
- Verification: new regression pin
  `apps/client/src/movelab/phone.test.ts` (2 tests: class toggle +
  resize dispatch on both check and uncheck). Full movelab suite green:
  `bun test` across `phone/steps/catalog/isolation` = 15 pass, 0 fail
  (404 expects). `bunx biome check --write --unsafe` clean on touched
  files. No new deps; lab chunk still DEV-gated dynamic import (NFR-6
  untouched); no sim/save/audio changes.
