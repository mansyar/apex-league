# Phase 11 — Dense playback and staging (FR-13, AC-13)

- Track: `20261108-continuous-arena-battle`
- Branch: `feat/20261108-continuous-arena-battle`
- Phase base: `31bfa626`
- Commits: `7b707150` (dense stream in the resolver), `dbfaedd9` (client plays the
  stream, telegraphs, mm→world mapping), `4379fb0a` (instant dump and script
  check split out of the driver)
- Status: **blocked on the visual pass** — code and automated checks are green,
  but `playwright-cli` is not installed in this environment and the in-app
  browser has no connected tab, so no desktop/phone screenshot could be taken.
  See §6.

The fight already resolved to a `BattleResult` after Phase 10. This phase makes
that result *watchable*: the client now plays a 50 Hz sample stream instead of
stepping between poses, and the startup window of every attack is drawn on the
floor before the blow lands.

## 1. The dense stream (P11.T1)

`packages/sim/src/battle/continuous/stream.ts` (new module) records what the
resolver loop already has, at the moment it has it. `resolveContinuous` creates
a recorder with the opening state and pushes one record after every
`fight.advance`; the recorder is a pure read, so no simulation field, order or
random draw changed.

### Shape

One flat `Int16Array` for the whole fight. `STREAM_FIELDS = 9` per side per
step, sides interleaved:

| field | index | meaning |
|---|---:|---|
| `x` | 0 | position X, **millimetres** (integer) |
| `z` | 1 | position Z, millimetres |
| `facingX` | 2 | facing unit vector X × 1000 (`DIR_SCALE`) |
| `facingZ` | 3 | facing unit vector Z × 1000 |
| `phase` | 4 | `STREAM_PHASE` 0 none, 1 startup, 2 active, 3 recovery |
| `phaseT` | 5 | 0–255 progress through the named phase window |
| `hp` | 6 | hit points |
| `hitstunMs` | 7 | hitstun remaining, ms |
| `pinned` | 8 | 1 when the body was pinned against a fence this step |

`y` is not stored: the sim pins every body to `y = 0`. Nothing derivable is
stored — gait, lean, bob, squash, the topple and the camera all come from these
nine numbers plus the client's existing `fighter-driver` / `steps/pure` helpers.

`phaseT` is computed from `FRAME_DATA[moveId]` (the same frame table the strike
resolution uses), so a telegraph's fill is exactly the fraction of the startup
window the sim has consumed — the client never runs its own attack timer.

### Size

One frame = 2 sides × 9 int16 = **36 B**. A fight stores `steps + 1` frames
(the opening pose plus one per advanced step), so:

| fight | duration | frames | stream |
|---|---:|---:|---:|
| plant_ox v embercub (pacing sample) | 29.24 s | 1,463 | 52,668 B |
| fernstag v embercub (shortest sample) | 25.28 s | 1,265 | 45,540 B |
| fire_drake v earth_tortoise (time-out cap) | 40.00 s | 2,001 | 72,036 B |

`stream.test.ts` asserts the cap: "stays small enough to replay: a full fight is
under 72 KB". The trace is attached to the `BattleResult` through a
`WeakMap<BattleResult, FightStream>` (`rememberStream` / `streamOf`), never as a
field on the object, so `JSON.stringify(verdict)` still has exactly
`events / finalHp / reason / winner` and a saved cup session does not grow —
asserted by "the verdict is unchanged and a restored copy has no stream".

### Reading it back

- `readFrame(stream, step, side, out)` writes into a caller-owned object (the
  render loop reuses two of them; playback allocates nothing per frame) and
  clamps the step at both ends.
- `stepIndexAt(stream, elapsedMs)` maps fight time onto the step that owns it,
  clamped and NaN-safe, so a scaled or paused playhead can never run off the
  array.

## 2. mm → world (P11.T2)

The sim works in millimetres inside `ARENA_BOUNDS` (±4,000 X, ±3,000 Z). The
show floor is in world units. The factor lives in exactly one place,
`apps/client/src/dense-playback.ts`:

```ts
export const MM_TO_WORLD = 0.0008   // 1 world unit = 1,250 mm
export const simX = (mm: number) => mm * MM_TO_WORLD
export const simZ = (mm: number) => mm * MM_TO_WORLD
```

| sim | world | where it lands |
|---|---|---|
| ±4,000 mm X | ±3.2 | stage X bound (`BOUNDS_X`) |
| ±3,000 mm Z | ±2.4 | stage Z bound (`BOUNDS_Z`, raised from 1.8) |
| ±2,000 mm opening posts | ±1.6 | `HOME_X` 2.6 no longer used for a streamed fight |
| ~1,020 mm contact | 0.82 | bodies touch at arm's length, inside the ring |
| ring paint | 8.3 | unchanged; the sim arena is comfortably inside it |

`fighter-driver.clampStage` now clamps to ±3.2 / ±2.4 so a body pinned to the
sim fence still sits inside the broadcast framing (the camera preset documents
±3.4 X, ±2 Z of show floor). `dense-playback.test.ts` pins the mapping ("puts
the sim arena exactly on the show floor", "is uniform, so a diagonal keeps its
angle") and `fighter-driver.test.ts` pins the new clamp.

Movement is a **stage target**, not a teleport: `applyFrame` writes
`c.stage.x/z` and the existing `fighter-driver` glides the group toward it, so
the 20 ms samples read as continuous motion and the gait, lean, bob and squash
still come from measured speed. Asserted by "sets a stage target instead of
teleporting the body".

## 3. Startup telegraphs

The point of the phase. `dense-playback.ts` owns one floor arc per side:

- geometry `RingGeometry(0.3, 1.7, 18, 1, -π/2 - 0.55, 1.1)` — a 63° arc lying
  flat on the floor (`mesh.rotation.x = -π/2`, lifted 0.03 so it does not
  z-fight the paint);
- additive, transparent, depth-write off, amber `0xffb347`;
- the group sits at the attacker's feet and `rotation.y = atan2(facingX, facingZ)`,
  so the arc points at the blow;
- **visible only while `frame.phase === STREAM_PHASE.startup`** — it is the
  sim's own phase, not a client timer, so it cannot drift from the blow;
- across the window: `scale = 0.55 + t·0.45` (grows) and
  `opacity = 0.16 + t·0.62` (brightens), where `t = phaseT / 255`;
- it disappears the instant the phase turns `active`, i.e. exactly when the
  strike can land.

Because the client steps the stream at fight speed (50 Hz × speed factor), the
startup window is on screen for its real duration: a basic's 80 ms startup shows
for ~4 frames, a projectile's 100–400 ms for 5–20. At the fast setting the whole
fight is still played — only the clock is scaled — so the telegraph shrinks but
never vanishes.

## 4. Playback (P11.T1/T2)

`playbackDriver` now prefers the trace:

- `start()` reads `streamOf(verdict)`; when present it hands the run to
  `createDenseRunner(clock)` (`apps/client/src/dense-runner.ts`) instead of the
  legacy `setTimeout` chain, and still returns `"paced"`.
- the runner advances `elapsedMs += dt · factor` on `requestAnimationFrame`
  (`denseSpeedFactor` = 900/140 ≈ 6.43 for fast), maps it with `stepIndexAt`,
  speaks each log line at the tick it belongs to, and calls `onFrame(stream,
  step)` for the arena.
- KO slow motion (`KO_DILATION` 2.5) divides the factor when the terminal `ko`
  step is spoken; the end-of-fight stamp still waits `stampDelay`.
- `setPaused` cancels the frame handle and resumes from the same playhead (the
  hidden-tab hold is a test); `speedToggle` rescales live; `stop` clears.
- **legacy path untouched**: a verdict with no trace (a restored cup save, a
  pre-track ghost, the legacy gauge replay) falls back to `onPace` + the timer
  chain exactly as before — "a verdict with no trace falls back to the paced
  step path".
- `staging.applyStep` still runs in dense mode for the two event-driven effects
  that are not derivable from position (`projectile`, `impact`), and skips the
  pose choreography, which the stream now owns.

## 5. Reduced motion (P11.T3)

Unchanged contract, re-proven for the new endings: `playbackDriver.start()`
checks `resolveMotionPref` **before** the dense branch, so a reduced-motion
player never touches the stream. `instant-dump.ts` speaks the whole log and
applies every step with `instant = true`, then finishes with
`instant: true` — the arena lands on the final posture, and a `down`/`draw`/
`time` ending reads as text. The 1:1 script check (`playback-script.ts`) still
throws if an event kind has no playback step, so a new ending cannot silently
desync the log from the arena.

## 6. Verification

| command | exit | result |
|---|---:|---|
| `bun run verify` | 0 | 3,765 pass, 1 skip, 0 fail (350 files); biome clean; determinism gate byte-identical for 46 forms + 5 props |
| `bun run build` | 0 | 396 modules, `dist/index.html` 2.13 kB, `index-BBfH_jvj.js` 1,026.03 kB (280.78 kB gzip) |
| `playwright-cli -s=p11 open http://localhost:5174` | 1 | **not run** — `playwright-cli` is not on PATH; `npx --no-install playwright` and `bun x` are refused by this session's shell permissions, and the in-app browser reported "No desktop browser is connected to this session" |

The dev server for the visual pass was started (`bun run dev`, port 5174 because
5173 was taken) and left running. The visual pass is the only outstanding item:

- desktop 1280×800 and phone 390×844, one spar and one cup day;
- check: bodies glide rather than snap between poses, the amber arc is visible
  before every blow and gone when it lands, both fighters stay inside the
  painted ring, no console errors;
- screenshots to `conductor/tracks/20261108-continuous-arena-battle/verification/`.

## 7. AC-13 evidence

> **AC-13** — The client renders a continuous fight with startup telegraphs and
> no per-step position snapping, at desktop and phone widths.

| claim | evidence | kind |
|---|---|---|
| the sim exposes a dense, replayable stream | `stream.test.ts` "records one frame per step, and the last step is the ending", "opens on both fighters' starting posts", "keeps every body inside the arena it was fought in", "stays small enough to replay: a full fight is under 72 KB" | test |
| the stream never changes the fight or the save | `stream.test.ts` "the verdict is unchanged and a restored copy has no stream", "a result with no trace reads back undefined" | test |
| attack phase is on the wire, so a telegraph can be driven by it | `stream.test.ts` "phase progress is a 0-255 fraction of the window it names", "no attack reaches its active window without a startup first"; `playbackDriver-dense.test.ts` "the telegraph data is on the wire: startup frames reach the arena" | test |
| sim millimetres land on the show floor inside the ring | `dense-playback.test.ts` "puts the sim arena exactly on the show floor", "is uniform, so a diagonal keeps its angle"; `fighter-driver.test.ts` clamp to ±3.2/±2.4 | test |
| no per-step snapping: position is a target the body glides to | `dense-playback.test.ts` "sets a stage target instead of teleporting the body" | test |
| a startup telegraph is visible before the blow and gone when it lands | `dense-playback.test.ts` "shows a startup telegraph that grows before the blow" (hidden at `none`, opacity > 0.15 at `phaseT` 20, brighter at 220, hidden at `active`) | test |
| the fight plays continuously and finishes on its own verdict | `playbackDriver-dense.test.ts` "plays the trace and finishes on the same verdict", "the log speaks at the tick each line belongs to", "the playhead never runs past the recording" | test |
| speed and pause still work | `playbackDriver-dense.test.ts` "fast-forward scales fight time, not the log", "a hidden tab holds the playhead and resumes where it stood" | test |
| reduced motion keeps the instant text path | `playbackDriver-dense.test.ts` "reduced motion still dumps the fight instantly"; `playbackDriver.test.ts` reduced-motion dump for a legacy verdict | test |
| the legacy path still plays | `playbackDriver-dense.test.ts` "a verdict with no trace falls back to the paced step path"; `playbackDriver.test.ts` | test |
| **desktop and phone widths** | **not verified** — no browser available (§6) | visual |

## 8. Deviations

| file | why |
|---|---|
| `packages/sim/src/battle/continuous/resolve.ts` | The brief allows only the new `stream.ts` under `continuous/`. The recorder has to be created and fed where the state exists, so the loop gained one `createStreamRecorder(...)` call, one `recorder.push(state, result.pinned)` and a `rememberStream(...)` return. Behaviour is unchanged: the recorder only reads state. Four comments in the same file were shortened because the module sits on the 12 KB cap (`module-size.test.ts`) and the wiring had to fit — text only. |
| `packages/sim/src/battle/index.ts`, `packages/sim/src/index.ts` | Barrel re-exports for the new stream API (the client imports only through `@apex/sim`). |
| `apps/client/src/spar/types.ts`, `apps/client/src/spar.ts`, `apps/client/src/cup/shared.ts`, `apps/client/src/cup/arena.ts` | `onFrame` has to reach staging through the same handler chain `onStep` uses; four small type/forwarding lines. |
| `apps/client/src/app/screens.ts` | Wires `onFrame` to `staging.applyFrame` in both the spar and cup roots (the only two places staging is wired to playback). |
| `apps/client/src/battle-session.ts` | Pass-through of `onFrame` to the playback driver (anticipated by the brief). |
| `apps/client/src/fighter-driver.ts` | `BOUNDS_Z` 1.8 → 2.4 so the sim's ±3,000 mm Z maps inside the stage clamp; `clampStage` test updated. |
| `apps/client/src/playbackDriver.ts` | Gained the dense branch. The module was already near the 12 KB client cap, so its dense runner, pacing math, instant dump and script check were split into `dense-runner.ts`, `pacing.ts`, `instant-dump.ts`, `playback-script.ts`, and its director feed into `staging-director.ts`. Pure moves; `playbackDriver.test.ts` imports moved with them. |
| `apps/client/src/dense-playback.ts` | New module rather than growing `staging.ts` (also capped at 12 KB). |

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 3,765 pass, 1 skip, 0 fail across 350 files; biome clean; determinism gate byte-identical |
| build | `bun run build` | 0 | 396 modules, 1,026 kB / 281 kB gzip; chunk-size warning only |

Runtime evidence gathered live against the dev server. The dense path was driven
in a real browser session at desktop width, from draft day through a full spar:

- The fight ran to a knockout, not the cap. The feed ended with `Ember Drake is
  down!`, `VICTORY - TIDE AXOLOTL`, `A knockout finish.`
- The feed announced the new mechanics, not just impacts: `Tide Shot misses Ember
  Drake.` and `Ember Drake is knocked back.` So a miss and a knockback both reach
  the player.
- HP moved continuously rather than in jumps (78 -> 52 -> 12 -> 0 on the owned
  side) and the range indicator read `IN CLOSE` through the exchange.
- Zero console errors for the whole session.

Recorded limitation - the pixel pass did not run. `browser.screenshot` returned
`Screenshot needs a visible tab` on every attempt after the first, and the tool
has no viewport emulation, so neither the desktop screenshot nor the phone-width
check could be captured. `playwright-cli` is not on PATH for the phase agent, and
`playwright` is not a dependency of this repo, so installing it would be a repo
change outside this phase's scope.

AC-13 is therefore verified functionally but not visually. The checks the owner
must make at playtest are listed in `playtest.md`; the phone-width readability
question is the one that cannot be answered without a real narrow viewport and
stays open until someone looks at it.
