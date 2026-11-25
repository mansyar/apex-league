# Integrated Verification — 20261126-stage-scaled-animation-ranch-profiles

- **Track:** `20261126-stage-scaled-animation-ranch-profiles` — Adopt stage-scaled animation and ranch body profiles
- **Phase:** 3 (final) — Visual evidence and integrated gate
- **Date:** 2026-11-26
- **Branch:** `feat/20261126-stage-scaled-animation-ranch-profiles`
- **Base commit:** `91e10a51194daf4bd41dd078535c7e5d4b54f481`
- **Head commit at verification time:** `91e10a51194daf4bd41dd078535c7e5d4b54f481` (the evidence commit follows this record)
- **Result:** **verified** — visual proof on both viewports with clean console, and the full configured stack green.

This is the track-level integrated record. Per-phase detail lives in
`verification/phase-1.md`, `verification/phase-2.md` and
`verification/phase-3.md`; raw (gitignored) captures live under
`.conductor/evidence/20261126-stage-scaled-animation-ranch-profiles/`.

## Integrated gate

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify && bun run build` | **0** | `bun check` clean; `bun test --check --parallel --timeout 120000` → **4531 pass, 1 skip, 0 fail**, `675694 expect() calls`, 4532 tests across 443 files (94.24 s); Biome `Checked 1053 files in 1356ms. No fixes applied.`; `bun packages/voxel/scripts/determinism-gate.ts` → all archetype×stage and prop digests `determinism gate OK`; `@apex/client` build → 441 modules transformed, built in 456 ms, `dist/assets/index-DADRLmAJ.js` 1,108.81 kB (gzip 306.82 kB). Vite emits only the pre-existing >500 kB chunk advisory; no error. |

`apps/client/src/module-size.test.ts` (12 KB byte cap over every non-test
module under `apps/client/src/`) passed within the test run; the three sibling
module-size suites (server, sim, voxel) also passed. No offender was reported.

## Commands (visual pass)

| Command | Exit | Summary |
| --- | --- | --- |
| `bun run dev` (background) | running | Vite v8.3.4 at `http://localhost:5173/`. |
| `playwright-cli --version` | 0 | `0.1.22`. |
| `playwright-cli open http://localhost:5173` → `resize 1440 900` → `goto` | 0 | Desktop session at the required viewport. |
| `playwright-cli eval "<dynamic import of sim barrel; chooseStarter + 2×evolveCreature + saveGame>"` → `reload` | 0 | Champion `draconic` / `pyre_warden`, `SAVE_KEY="apex.save"`, `SAVE_VERSION` 26; booted via `loadBoot`. |
| `playwright-cli eval "<same seam without evolveCreature>"` → `reload` | 0 | Baby `draconic`, same species and archetype. |
| `playwright-cli run-code "<idle + Play-beat captures; waitForTimeout(180)>"` | 0 | Desktop ranch champion and baby captures. |
| `playwright-cli run-code "<getByRole Spar/Press; waitForTimeout(700/500); screenshot>"` | 0 | Desktop arena spar (cinematic and broadcast after the Settings camera toggle persisted). |
| `playwright-cli console` | 0 | Desktop: `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| `playwright-cli -s=iphone open --device="iPhone 15" http://localhost:5173` → `resize 393 852` | 0 | Phone viewport verified `{width:393,height:852}`, DPR 3, iPhone UA. |
| `playwright-cli -s=iphone eval "<champion/baby seed; setArenaCamera('broadcast'); saveGame>"` → `reload` | 0 | Both phone ranch stages and the phone arena spar booted from real saves. |
| `playwright-cli -s=iphone run-code "<Actions → Play → collapse; waitForTimeout(140); screenshot>"` | 0 | Phone ranch beats; idle captures before expanding Actions. |
| `playwright-cli -s=iphone run-code "<DOM .click Spar/Press; waitForTimeout(500); screenshot>"` | 0 | Phone arena spar capture (HUD 175 vs 172). |
| `playwright-cli -s=iphone console` | 0 | Phone: `Total messages: 2 (Errors: 0, Warnings: 0)`. |
| `playwright-cli -s=iphone close`; `playwright-cli close` | 0 | Both sessions closed. |
| `bun run verify && bun run build` | 0 | See integrated gate above. |
| Follow-up: `playwright-cli open` → `resize 1440 900` → `goto http://localhost:5173` | 0 | Fresh desktop session; viewport set before navigation. |
| Follow-up: `playwright-cli eval "<exact champion seam, no setArenaCamera>"` → `reload` | 0 | `{"stage":"champion","archetypeId":"draconic","branch":"pyre_warden"}`; camera left at default cinematic. |
| Follow-up: `playwright-cli run-code "<Spar Free match → Press → waitForTimeout(1600) → screenshot('arena-contrast-desktop-cinematic-settled.png')>"` | 0 | Rival `Ember Drake`; HUD `Ember Drake · Press 163` vs `Ember Drake · Circle 166`, both fighters visible with VFX. |
| Follow-up: `playwright-cli console`; `playwright-cli close` | 0 | Console `Total messages: 2 (Errors: 0, Warnings: 0)`; session closed. |

Seeding used only real sim seams — a dynamic import of
`/@fs/D:/Projects/battle-pets/packages/sim/src/index.ts` followed by
`chooseStarter`, `createInitialState`, `evolveCreature`, `setArenaCamera` and
`saveGame(localStorage, state, Date.now())`. No hand-crafted save JSON. Full
snippets and work notes are in `verification/phase-3.md` and in the gitignored
`capture-log.md`.

## Required screenshots

| Artifact (under `.conductor/evidence/20261126-stage-scaled-animation-ranch-profiles/`) | Viewport | Observable content |
| --- | --- | --- |
| `ranch-champion-desktop-idle.png` + `ranch-baby-desktop-idle.png` | 1440×900 | Same `draconic` Ember Drake at CHAMPION (175/17/22/11) and BABY (165/13/13/11): large vs small body on the same field. |
| `ranch-champion-iphone-idle.png` + `ranch-baby-iphone-idle.png` | 393×852 (DPR 3) | The same stage pair on the phone layout: CHAMPION large, BABY small, plates legible. |
| `arena-contrast-desktop-broadcast.png` | 1440×900 | Stage-contrasted spar, both fighters in frame: owned champion `Ember Drake · Press 175` (larger) vs generated baby `Ember Drake · Kite 162`. |
| `arena-contrast-iphone.png` | 393×852 (DPR 3) | Stage-contrasted spar on phone: owned champion `Ember Drake · Press 175` (larger) vs generated baby `Bramble Ox · Counter 172`. |
| `arena-contrast-desktop-cinematic-settled.png` (extra) | 1440×900 | Settled default-cinematic spar, both fighters visible mid-beat with projectile/impact VFX; HUD `Ember Drake · Press 163` vs `Ember Drake · Circle 166`. Framing is wide/dark and the bodies remain small — see Deviations. |

Extras: `ranch-{champion,baby}-desktop-play-beat.png`,
`ranch-{champion,baby}-iphone-play-beat.png` (beat-phase contrast),
`arena-contrast-desktop.png` (pre-settle cinematic framing),
`arena-contrast-desktop-cinematic-settled.png` (settled cinematic framing), and
`arena-contrast-desktop-t1..t3.png` (through the victory overlay).
Console: **0 errors and 0 warnings in all three sessions** (desktop, phone, and
the cinematic follow-up).

## Acceptance map (track level)

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| FR-6 | Desktop 1440×900 and iPhone 15 captures show ranch baby-vs-champion and arena stage contrast with clean console | Required four screenshots plus extras; all three console sessions 2 messages, 0 errors, 0 warnings. | pass |
| AC-6 | Four screenshots, stage/archetype differences visible | Same-archetype ranch pair (size, plate, stats, beat phase) on both viewports; arena champion-vs-baby pair on both viewports, visible size/HUD contrast. The settled cinematic extra shows both fighters and the live stage-contrasted HUD (`Ember Drake · Press 163` vs `Ember Drake · Circle 166`) at the default camera, but does not show a larger size delta than the broadcast frame. Exact amplitude/tempo values are pinned by Phase 1/2 unit tables rather than pixel measurement. | pass |
| AC-7 | Full gate, module caps, no dependency/save/voxel/audio diff | `bun run verify && bun run build` exit 0; module-size suites green; `git diff --name-only c0a01518 HEAD` scope check (below). | pass |
| NFR-2 | Client module caps (12 KB) | `CAP_BYTES = 12 * 1024` in `apps/client/src/module-size.test.ts`, green in the passing run. | pass |
| NFR-3 | No new dependency or generated file | No manifest/lockfile/generated-file change in the whole-track diff. | pass |
| NFR-4 | Full configured stack green including `module-size.test.ts` | 4531 pass / 1 skip / 0 fail, Biome clean, determinism gate OK, client build exit 0. | pass |

## Unchanged-lines statement

`git diff --name-only c0a01518 HEAD` over the whole track reports changes only
in `apps/client/src/stage-motion.ts`, `apps/client/src/roster.ts`,
`apps/client/src/ranch/{frame,idle,mount,poses,profile}.ts`, their co-located
tests, and Conductor state (`roadmap.md`, `tracks.md`, track
`metadata.json`/`plan.md`, `verification/phase-1.md`, `verification/phase-2.md`).
This phase adds only `verification/phase-3.md`, this file, and gitignored
captures.

Consequently there is **no** change to: dependency manifests or lockfiles;
save schema, `SAVE_VERSION`, version migration or storage adapters; voxel
templates, GLBs, manifests or determinism digests; audio cue ids; sim payload
keys; or ceremony triggers, order and completion (the `ranch/poses.ts` edits
add optional trailing visual factors, not machine transitions). The ranch
physical scale ladder (`mount.ts:45`, `frame.ts:136` `stageScale(stage)`) and
`orientation`/`bodyScaleFor` values are unchanged — Phase 2 dampening and
ceremony invariants remain pinned by its table tests, so no new audio/state
inspection was attempted.

## Deviations

- Viewport forced before navigation (`resize 1440 900`; `resize 393 852` because the iPhone device preset reports 393×659).
- DOM `.click()` via `eval` for HUD/onboarding-intercepted controls; mobile Actions sheet collapsed again before capturing a beat.
- Settings UI camera toggle used to persist `arenaCamera: "broadcast"` on desktop; `setArenaCamera` seam used on phone; both are real user/sim paths.
- Rival species varies with the `Date.now()` battle seed; the desktop broadcast capture retried until the rival was the same species, the phone capture used the first generated rival. The cinematic follow-up happened to draw an `Ember Drake` rival again.
- The follow-up `arena-contrast-desktop-cinematic-settled.png` was taken ~1600 ms after the tactic press with the camera untouched at its default cinematic style (no `setArenaCamera`). Both fighters and the stage-contrasted HUD are visible with a live VFX beat, but the framing stays wide and dark and the bodies remain small; it strengthens the *moment*, not the size comparison. No app code or camera state was changed for it.
- Scratch `capture-log.md` and all screenshots are gitignored under `.conductor/evidence/...`; `.playwright-cli/` snapshots left on disk.
- Dev server left running in the background for the primary agent to stop.
- One exploratory `Get-ChildItem` directory listing was rejected by permissions; native `glob`/`read` covered the need, and it was not retried. No other command was denied.

## Primary verification

- **Date / head:** 2026-11-26, evidence commits `b21f9bf6` and `dca449bb`.
- **Scope check:** `git status --porcelain` empty before acceptance;
  `git diff --name-only 91e10a51194daf4bd41dd078535c7e5d4b54f481..HEAD`
  listed only `verification/phase-3.md` and `verification/integrated.md`.
  No code, test, save, voxel or audio diff was introduced in this phase.
- **Required gate re-run by primary:**
  `(bun run verify && bun run build)` → exit 0. Full suite
  `4531 pass / 1 skip / 0 fail` with `675694 expect() calls`, typecheck and
  Biome check clean, determinism gate OK for every archetype baby/juvenile/
  champion regeneration and all 5 props seed 42 digests, and Vite build
  `dist/assets/index-DADRLmAJ.js 1,108.81 kB` plus `lab-*` assets with only
  the pre-existing chunk-size warning.
- **Independent image inspection by primary:**
  - `ranch-champion-desktop-idle.png` / `ranch-champion-iphone-idle.png`
    show the `CHAMPION` badge and stats 175/17/22/11; the matching baby
    captures show `BABY` and 165/13/13/11 for the same draconic archetype.
  - `arena-contrast-desktop-broadcast.png` and `arena-contrast-iphone.png`
    show both fighters and stage-contrasted HUD values (175 vs 162; 175 vs
    172) on a real spar.
  - `arena-contrast-desktop-cinematic-settled.png` shows both fighters
    simultaneously after the director settled, with live HUD `Ember Drake ·
    Press 163` vs `Ember Drake · Circle 166` and a visible VFX beat. As the
    deviations state, the framing stays wide/dark, so this frame is proof of
    the live stage-contrasted moment, not of larger on-screen bodies.
- **Conclusion:** the physical scale ladder and authored set pieces are
  unchanged; stage/profile motion factors are exercised by the Phase 1/2
  table tests, and the visual captures satisfy FR-6/AC-6 within their
  documented limits. All AC-1..AC-7 are confirmed; ready for doc sync and
  review.
