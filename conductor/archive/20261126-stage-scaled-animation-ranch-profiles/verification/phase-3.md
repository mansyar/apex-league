# Phase 3 Verification — Visual evidence and integrated gate

- **Track:** `20261126-stage-scaled-animation-ranch-profiles`
- **Phase:** 3 — Visual evidence and integrated gate
- **Date:** 2026-11-26
- **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles` (already checked out; never switched)
- **Base commit:** `91e10a51194daf4bd41dd078535c7e5d4b54f481`
- **Head commit at verification time:** `91e10a51194daf4bd41dd078535c7e5d4b54f481` (same as base — this phase adds evidence only; the evidence commit is made after this file is written)
- **Result:** **verified** — four required captures present with clean console; `bun run verify && bun run build` exit 0.

## Scope

Live-UI proof only. No production code or tests were edited in this phase; the
two code phases were exercised through the real ranch and spar screens under a
real Vite dev server, on a 1440×900 desktop viewport and an iPhone 15
(393×852, DPR 3, iPhone UA) emulation. The ranch captures show the *same*
archetype (`draconic`, Ember Drake, `fire_drake`) at baby and champion stages:
the physical holder scale (`mount.ts:45`, `frame.ts:136` `stageScale(stage)`)
is unchanged, so the visible difference is the new visual profile — amplitude
and tempo — layered on that pre-existing ladder. The arena captures show a
stage-contrasted spar: the owned champion's `CastInfo.stage` is composed via
`composeStageProfile`, while the generated rival defaults to the baby build
(factor 1). No `?movelab` debug view was used.

## Commands

| # | Command | Exit | Notes |
| --- | --- | --- | --- |
| 1 | `bun run dev` (background shell) | running | Vite v8.3.4 ready at `http://localhost:5173/`; left running (see Deviations). |
| 2 | `playwright-cli --version` | 0 | `0.1.22`. |
| 3 | `playwright-cli open http://localhost:5173` | 0 | Default desktop session; starter picker reached. |
| 4 | `playwright-cli resize 1440 900` | 0 | Viewport set **before** navigating/capturing. |
| 5 | `playwright-cli goto http://localhost:5173` | 0 | Reload at the fixed viewport. |
| 6 | `playwright-cli eval "(async () => { const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts'); let s = m.chooseStarter(m.createInitialState(), 'fire_drake', 42); s = { ...s, creature: m.evolveCreature(m.evolveCreature(s.creature)) }; m.saveGame(localStorage, s, Date.now()); return JSON.stringify({ stage: s.creature.stage, archetypeId: s.creature.archetypeId, branch: s.creature.branch }); })()"` | 0 | `{"stage":"champion","archetypeId":"draconic","branch":"pyre_warden"}`; `SAVE_KEY="apex.save"`. |
| 7 | `playwright-cli reload` | 0 | Boots via `loadBoot` → real save; champion shown. |
| 8 | `playwright-cli run-code "async page => { ... .click() 'Got it'; screenshot('ranch-champion-desktop-idle.png') ... }"` | 0 | Idle champion capture. |
| 9 | `playwright-cli run-code "async page => { ... Play click; waitForTimeout(180); screenshot('ranch-champion-desktop-play-beat.png') ... }"` | 0 | Play beat capture. |
| 10 | `playwright-cli eval "<same seam, no evolveCreature>"` + `reload` | 0 | `{"stage":"baby","archetypeId":"draconic","branch":null}`; baby shown. |
| 11 | `playwright-cli run-code "async page => { ... idle + Play-beat screenshots for baby ... }"` | 0 | Two baby desktop captures. |
| 12 | `playwright-cli eval "<champion seed again>"` + `reload` | 0 | Champion restored for arena. |
| 13 | `playwright-cli run-code "async page => { getByRole('button',{name:/^Spar Free match/}).click(); ... getByRole('button',{name:/^Press/}).click(); waitForTimeout(700); screenshot('arena-contrast-desktop.png') ... }"` | 0 | Cinematic camera; same-species rival; HUD champion 175 vs baby 162. |
| 14 | `playwright-cli run-code "async page => { ... 3 × waitForTimeout(400) + screenshots ... }"` | 0 | Follow-up beats / victory overlay (`arena-contrast-desktop-t1..t3.png`). |
| 15 | Settings UI → `button "Camera: cinematic"` click via eval | 0 | Persisted `state.settings.arenaCamera === "broadcast"` in the save (confirmed by eval over `localStorage`). |
| 16 | `playwright-cli run-code "async page => { ... open spar; retry until rival name matches /Ember Drake/i; Press; waitForTimeout(500); screenshot('arena-contrast-desktop-broadcast.png') ... }"` | 0 | Attempt 0: `Ember Drake` rival (baby) vs owned champion `Ember Drake`. |
| 17 | `playwright-cli console` (desktop session) | 0 | **Total messages: 2 — Errors: 0, Warnings: 0.** |
| 18 | `playwright-cli -s=iphone open --device="iPhone 15" http://localhost:5173` | 0 | iPhone UA / DPR 3; device preset reports 393×659. |
| 19 | `playwright-cli -s=iphone resize 393 852` | 0 | Forced to the brief's 393×852; `page.viewportSize()` → `{width:393,height:852}`. |
| 20 | `playwright-cli -s=iphone eval "<champion seed + m.setArenaCamera(s,'broadcast') + saveGame>"` + `reload` | 0 | `{"stage":"champion","camera":"broadcast"}`; booted through `loadBoot`. |
| 21 | `playwright-cli -s=iphone run-code "async page => { ... 'Got it' dismiss; idle screenshot; Actions → Play → Actions collapse; waitForTimeout(140); play-beat screenshot ... }"` | 0 | Two champion iPhone captures. |
| 22 | `playwright-cli -s=iphone eval "<baby seed + broadcast>"` + `reload` + equivalent capture run-code | 0 | Two baby iPhone captures. |
| 23 | `playwright-cli -s=iphone eval "<champion seed + broadcast>"` + `reload` | 0 | Restored champion for arena. |
| 24 | `playwright-cli -s=iphone run-code "async page => { ... DOM .click() 'Spar', waitFor '.spar-panel', DOM .click() 'Press', waitForTimeout(500), screenshot('arena-contrast-iphone.png') ... }"` | 0 | HUD `Ember Drake · Press 175` vs `Bramble Ox · Counter 172`; both fighters visible. |
| 25 | `playwright-cli -s=iphone console` | 0 | **Total messages: 2 — Errors: 0, Warnings: 0.** |
| 26 | `playwright-cli -s=iphone close` then `playwright-cli close` | 0 | Both sessions closed; snapshots remain under gitignored `.playwright-cli/`. |
| 27 | `bun run verify && bun run build` | **0** | Full configured stack green — see `verification/integrated.md`. |

### Follow-up capture — settled cinematic arena (no camera-state change)

Reopened a fresh desktop session at the default cinematic camera (no
`setArenaCamera` call), seeded with the exact champion seam above, and waited
for the director to settle before capturing.

| Command | Exit | Notes |
| --- | --- | --- |
| `playwright-cli open` | 0 | New default session, `about:blank`. |
| `playwright-cli resize 1440 900` | 0 | Viewport set **before** navigating. |
| `playwright-cli goto http://localhost:5173` | 0 | App loaded at 1440×900. |
| `playwright-cli eval "(async () => { const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts'); let s = m.chooseStarter(m.createInitialState(), 'fire_drake', 42); s = { ...s, creature: m.evolveCreature(m.evolveCreature(s.creature)) }; m.saveGame(localStorage, s, Date.now()); return JSON.stringify({ stage: s.creature.stage, archetypeId: s.creature.archetypeId, branch: s.creature.branch }); })()"` | 0 | `{"stage":"champion","archetypeId":"draconic","branch":"pyre_warden"}`; camera left at the default cinematic style. |
| `playwright-cli reload` | 0 | Boots from the real save. |
| `playwright-cli run-code "async page => { ... dismiss 'Got it'; getByRole /^Spar Free match/ click; waitFor '.spar-panel'; getByRole /^Press/ click; waitForTimeout(1600); screenshot('arena-contrast-desktop-cinematic-settled.png') ... }"` | 0 | Rival `Ember Drake`; HUD `Ember Drake · Press 163` vs `Ember Drake · Circle 166`, fight still live with a projectile/impact VFX. |
| `playwright-cli console` | 0 | **Total messages: 2 — Errors: 0, Warnings: 0.** |
| `playwright-cli close` | 0 | Session closed. |

All commands ran from `D:\Projects\battle-pets`. Screenshots used the explicit
`--filename=<path>` form (or Playwright `page.screenshot({ path })` inside
`run-code`); a bare path is misparsed as a CSS selector and was avoided.

### Seeding — exact method, real sim seams only

No save JSON was hand-crafted. Every state was produced by the sim's own
functions, reached by a dynamic import of the Vite-served barrel
`/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts`, and written with the
sim's `saveGame(localStorage, state, Date.now())` (key `apex.save`,
`SAVE_VERSION` 26). Reload then boots through the app's real `loadBoot` path.

```js
// champion (desktop and iPhone)
(async () => {
  const m = await import('/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts');
  let s = m.chooseStarter(m.createInitialState(), 'fire_drake', 42);
  s = { ...s, creature: m.evolveCreature(m.evolveCreature(s.creature)) };
  s = m.setArenaCamera(s, 'broadcast');          // iPhone and broadcast arena captures
  m.saveGame(localStorage, s, Date.now());
  return JSON.stringify({ stage: s.creature.stage, archetypeId: s.creature.archetypeId });
})()
```

The baby save is the same snippet with the `evolveCreature` line omitted. The
desktop spar was opened through the Settings UI camera toggle instead of
`setArenaCamera`; the iPhone sessions used the seam above. Work notes and the
first snippet are preserved in
`.conductor/evidence/20261126-stage-scaled-animation-ranch-profiles/capture-log.md`.

## Screenshots

All artifacts are gitignored under
`.conductor/evidence/20261126-stage-scaled-animation-ranch-profiles/`.

| Artifact | Viewport | Observable content |
| --- | --- | --- |
| `ranch-champion-desktop-idle.png` | 1440×900 | Champion Ember Drake (`draconic`), CHAMPION plate, 175/17/22/11, large voxel body and idle pose. |
| `ranch-champion-desktop-play-beat.png` | 1440×900 | Same champion mid-play beat ~180 ms after Play: ball airborne above the head, body in the exaggerated play pose, energy 60 / bond 20. |
| `ranch-baby-desktop-idle.png` | 1440×900 | **Same archetype and species**, BABY plate, 165/13/13/11, visibly smaller body on the same ranch field. |
| `ranch-baby-desktop-play-beat.png` | 1440×900 | Baby play beat at the same ~180 ms offset: smaller leap, different body phase/position (further left) than the champion beat. |
| `ranch-champion-iphone-idle.png` | 393×852 (DPR 3) | Mobile layout; champion Ember Drake, CHAMPION plate, large body, Actions collapsed. |
| `ranch-baby-iphone-idle.png` | 393×852 (DPR 3) | Mobile layout; same Ember Drake at BABY, markedly smaller body and BABY plate. |
| `ranch-champion-iphone-play-beat.png` | 393×852 (DPR 3) | Champion play beat with the Actions sheet collapsed after the click; body visible mid-pose. |
| `ranch-baby-iphone-play-beat.png` | 393×852 (DPR 3) | Baby play beat with the same capture timing; offset shadow/pose versus the champion frame. |
| `arena-contrast-desktop-cinematic-settled.png` | 1440×900 | **Settled cinematic proof** (follow-up, default camera): both fighters visible mid-beat with a projectile/impact VFX trail; HUD `Ember Drake · Press 163` vs `Ember Drake · Circle 166` (same species, owned champion vs baby-generated rival). Framing is still wide and dark, so the fighters remain small — see limitation in Deviations. |
| `arena-contrast-desktop.png` | 1440×900 | Cinematic-camera spar: HUD `Ember Drake · Press 175` vs `Ember Drake · Kite 162` (same species, owned champion vs baby-generated rival). Dark close framing captured before the director settled; retained as a mid-beat extra. |
| `arena-contrast-desktop-t1.png` … `-t3.png` | 1440×900 | Follow-up frames through the knockout / `VICTORY — YOUR EMBER DRAKE` overlay (extras). |
| `arena-contrast-desktop-broadcast.png` | 1440×900 | **Primary arena proof**: broadcast framing, both voxels visible in the ring — champion drake (right) visibly larger than the baby drake (left); HUD `Ember Drake · Press 175` vs `Ember Drake · Kite 162`. |
| `arena-contrast-iphone.png` | 393×852 (DPR 3) | **Primary phone arena proof**: broadcast framing, owned champion Ember Drake 175 (left, larger) vs generated baby Bramble Ox 172 (right, smaller); APEX FEED active. |

### Console results per session

| Session | Command | Result |
| --- | --- | --- |
| Desktop, default (`1440×900` ranch + arena) | `playwright-cli console` | `Total messages: 2 (Errors: 0, Warnings: 0)` — clean. |
| Phone, `-s=iphone` (`393×852` ranch + arena) | `playwright-cli -s=iphone console` | `Total messages: 2 (Errors: 0, Warnings: 0)` — clean. |
| Desktop follow-up (`1440×900`, settled cinematic arena) | `playwright-cli console` | `Total messages: 2 (Errors: 0, Warnings: 0)` — clean. |

## Acceptance map

| ID | Requirement | Concrete evidence | Status |
| --- | --- | --- | --- |
| FR-6 | Desktop 1440×900 and iPhone 15 captures show ranch baby-vs-champion contrast and arena stage contrast with clean console | Four required screenshots exist (ranch pair desktop + phone, arena pair desktop + phone); both console sessions 0 errors / 0 warnings. | pass |
| AC-6 | Four screenshots with stage/archetype differences visible | Same `draconic` archetype pair: champion 175/17/22/11 vs baby 165/13/13/11, body-size and beat-phase differences on both viewports. Arena: owned champion's composed `CastInfo.stage` vs the baby-default rival, with visible size and HUD contrast on both viewports (same-species desktop pair; phone pair champion vs generated baby). The follow-up `arena-contrast-desktop-cinematic-settled.png` additionally shows both fighters at the default cinematic camera after the director settled, with live HUD `Ember Drake · Press 163` vs `Ember Drake · Circle 166` and a visible VFX beat; it does **not** establish larger on-screen bodies than the broadcast frame. Exact amplitudes are pinned by Phase 1/2 table tests, not inferred from pixels. | pass |
| AC-7 | Full configured gate green; module caps; no dependency/save/voxel/audio diff | `bun run verify && bun run build` exit 0; `git diff --name-only c0a01518 HEAD` lists only client `ranch/`, `stage-motion*`, `roster*` and Conductor state (see unchanged-lines statement). | pass |
| NFR-2 | Client module caps (12 KB) green | `apps/client/src/module-size.test.ts` (`CAP_BYTES = 12 * 1024`) passed inside the 4531-test `verify` run; no offender reported. | pass |
| NFR-3 | No new dependency or generated file | No `package.json`, lockfile or generated/source-file addition in the track diff; evidence artifacts are gitignored capture output. | pass |
| NFR-4 | Full configured stack green, including `module-size.test.ts` | `bun run verify && bun run build` exit 0 — `bun check`, full `bun test` (4531 pass / 1 skip / 0 fail), Biome (1053 files, no fixes), determinism gate (all archetype×stage digests OK), and client build (441 modules). | pass |

## Unchanged-lines statement

Verified with `git diff --name-only c0a01518 HEAD` (whole track, code + state):
the only changed source/test files are
`apps/client/src/stage-motion.ts(+test)`, `apps/client/src/roster.ts(+test)`,
and `apps/client/src/ranch/{frame,idle,mount,poses,profile}.ts` plus their
tests. Therefore:

- **No** dependency manifest or lockfile change; no generated file added.
- **No** save schema, `SAVE_VERSION`, version migration or storage adapter change (the capture wrote through the existing `saveGame` seam, `SAVE_VERSION` 26).
- **No** voxel template, GLB, manifest or determinism digest change — `bun run gate:determinism` printed `determinism gate OK` for every archetype×stage and prop digest.
- **No** audio cue id added or changed; no new state field or sim payload key.
- **No** ceremony trigger, order or completion change — `ranch/poses.ts` changes are optional trailing visual factors on existing pose writers; the machine `advance(dt)` order, callbacks and outcomes are untouched (pinned by Phase 2 tests).
- **No** new physical scale ladder — the ranch holder still writes `stageScale(stage)` at `mount.ts:45` and `frame.ts:136`; `orientation`/`bodyScaleFor` values are unchanged.

## Deviations / notes

- **Capture workarounds:** viewport set before navigation; desktop required `resize 1440 900`. The `--device="iPhone 15"` preset yields 393×659, so `resize 393 852` was applied to meet the brief. HUD/onboarding elements intercept pointer clicks on both viewports, so DOM `.click()` via `eval` was used for `Got it`, `Play`, `Spar`, tactics and the camera toggle; Playwright `getByRole` was used where it did not intercept. On mobile the Actions sheet covers the creature after clicking Play, so it was collapsed again before the beat capture. The default "cinematic" arena framing was too dark/tight to show both fighters, so the real Settings UI toggle switched to "broadcast" (persisted in the save) for the primary arena screenshots; cinematic frames are retained as extras. Rival species/archetype varies with the `Date.now()` battle seed; the desktop broadcast capture retried the spar until the rival was the same species (Ember Drake), while the phone capture used the first generated rival (Bramble Ox).
- **Settled-cinematic limitation:** `arena-contrast-desktop-cinematic-settled.png` was taken ~1600 ms after the tactic press with the camera left at the default cinematic style and no camera-state change. Both fighters and the stage-contrasted HUD are visible, but the cinematic framing remains wide and dark and the bodies remain small — it is a stronger *moment* (settled director, live VFX, both fighters in frame) than a stronger *size* comparison. No claim of a larger on-screen stage-size difference is made from it.
- **Seeding:** real sim seams only, as reproduced above; no hand-crafted save JSON. Scratch artifact: `capture-log.md` in the gitignored evidence directory (working notes, kept there).
- **Dev server:** `bun run dev` was launched in the background and left running for the primary agent to stop (stopping it was not attempted here). Snapshots under gitignored `.playwright-cli/` remain on disk; both browser sessions were closed.
- **No command was denied during this phase** (an exploratory `Get-ChildItem` file listing was rejected; the native `glob`/`read` tools covered the need, so it was not retried).

## Primary verification

- Scope: only the two evidence files changed from phase base
  `91e10a51194daf4bd41dd078535c7e5d4b54f481` through head `dca449bb`.
- Exact gate re-run by primary: `(bun run verify && bun run build)` → exit 0,
  `4531 pass / 1 skip / 0 fail`, `675694 expect()` calls, Biome clean,
  determinism OK for all archetype GLBs and 5 props, Vite build
  `dist/assets/index-DADRLmAJ.js`.
- Independent visual inspection of the ranch champion/baby pair, the arena
  broadcast pair and the settled cinematic frame confirmed every claim in
  the screenshot table; the cinematic size-comparison limitation is recorded
  honestly in Deviations.
- See `verification/integrated.md` for the full primary verification and
  track-level conclusion. Phase 3 is ready for acceptance.
