# Phase 1.5 Verification — Move Lab (deterministic visual rig)

## Commands run

- `bun run verify && bun run build` — see "Tree-wide gate" below.
- `bunx biome check apps/client/src/movelab apps/client/src/main.ts` — clean
  ("Checked 10 files", no diagnostics).
- `bun run build` (alone) — pass. Production bundle splits the lab into its
  own chunks (`lab-Cw6OeiIs.js` 6.73 kB, `lab-B2IkTbut.css` 1.05 kB); the main
  `index-*.js` contains no `movelab-panel`, `Move Lab`, or `movelab-trigger`
  strings and no `movelab[-/._]` path reference (the single bare `movelab`
  substring in the main bundle sits inside minified three.js WebXR code).
- Playwright (`playwright-cli`, dev server already on `:5173`): opened
  `http://localhost:5173/?movelab=1`, triggered all 8 fire rows at far range /
  1× / seeds 11/23, one screenshot each in `.conductor/evidence/phase-1.5/`.
  Page console after all triggers: 0 errors, 0 warnings.

## Tree-wide gate (out-of-scope red)

Full `bun run verify` does not pass on this tree, but every failure is in
files outside this phase's Touches, which I must not modify:

- `cap-*.tmp.js`, `diag-spark.tmp.js`, `gen-*.tmp.ts`, `inspect-setup.tmp.js`,
  `mini-test.tmp.js` (untracked, repo root) — biome lint/format failures.
  Not created by this phase (all lab automation ran inline via
  `playwright-cli run-code`).
- `apps/client/src/move-fx/moves/fallback.test.ts` (modified, not by this
  phase) — 5 `useLiteralKeys` lints on `MOVE_FX["…"]` accesses.
- `apps/client/src/move-fx/moves/fire.ts`, `apps/client/src/move-fx.test.ts`
  show as modified by another hand; this phase never touched them.

In-scope results are green: `bun run check` clean for all 4 workspace
packages (463 client files), all 3440 unit tests pass (incl. the 3 new
`movelab/*.test.ts` files), biome clean on `movelab/*` + `main.ts`, and the
client production build succeeds. Needs the file owner(s) to land or remove
the foreign files; then the exact brief command should go green.

## AC-6 checklist (FR-8 / NFR-6)

- Lab mounts only on dev-server `?movelab` via `mountMoveLabIfRequested`
  (`movelab/entry.ts`, DEV-gated dynamic `import("./lab")`); production
  chunk-split verified above.
- Move dropdown is sourced from the real registries: every species-kit id in
  the sim catalog (48 moves, electric included as ○-fallback rows since
  Phase 5 has no bespoke electric rows yet) with the bespoke flag read from
  `MOVE_FX`. Fire group shows 8/8 bespoke.
- Triggering fabricates `approach` (far only) + `launch` + `impact` steps
  and feeds them to `staging.applyStep` — no sim, no AI, no feed timing.
  Point-blank range stages the impact alone so the unified-fire compressed
  body runs.
- No audio cues, no store/save writes, no `Math.random` in lab paths
  (unit-tested); seeded toggle uses fixed seeds 11/23, untoggled mode uses
  an incrementing counter.
- Slow motion 1×/0.5×/0.25×/0.1× via `staging.setPace`; pause/step via
  `staging.setPaused` plus a lab-side queue (no clock re-architecture).
- Camera presets reuse the existing arena styles (Broadcast/Cinematic);
  phone-width toggle constrains `#app` to 390 px.
- Starter overlay suppressed in lab mode; ranch creature hidden; lab enters
  the arena through `swap.enterArena`.

## How to open the lab

1. `bun run dev` (client), 2. visit `http://localhost:5173/?movelab=1`,
3. pick attacker/defender/range/move, press Trigger (Replay re-casts with the
same seeds). Status line reports each staged step.

## Fire-row evidence (all triggered far / 1× / seeds 11/23)

Screenshots taken +300 ms after the impact step stages (first pass at
+800 ms caught only the aftermath — timing note for Phase 2 captures).

| Row | Screenshot | Visible FX at capture |
|---|---|---|
| `spark` | `spark.png` | burst glow over the defender |
| `flame_charge` | `flame_charge.png` | charge glow on attacker + forward particle stream |
| `cinder_shot` | `cinder_shot.png` | orange fire particles around defender |
| `blaze_bolt` | `blaze_bolt.png` | fire burst around defender in the AoE ring |
| `flare_dart` | `flare_dart.png` | reddish impact aura around defender's lower body |
| `pyre_lance` | `pyre_lance.png` | fire particles clustered in the impact sphere |
| `cinder_dive` | `cinder_dive.png` | head/horn aura + reddish impact sphere |
| `pyre_wall` | `pyre_wall.png` | pinkish-orange barrier ring + floating sparks |

## Phone-toggle framing (known issue → Phase 8 P8.T4)

The in-page Phone-width toggle narrows the arena column but the Broadcast
camera keeps its wide framing, showing an empty arena strip with the
fighters out of frame. Real phone viewports (390×844 device emulation)
render and frame correctly, so this is lab-chrome-only. All phone evidence
uses device emulation until P8.T4 lands.

## Spark-visibility finding

No Phase 2 row bug: `spark` DOES produce visible FX in the lab (burst over
the defender at +300 ms post-impact). Nothing to surface — recorded here
because the brief asked for the check explicitly.

## Barrier-target finding (P1.5.T5)

The lab stages `pyre_wall`'s ring on the defender — investigated and
confirmed production-faithful, NOT a lab bug. Sim source:
`clock/engine.ts` targets `opponent` unconditionally for every special (no
guard exception); staging positions arrivals at `side.target` derived from
`actorKey` (`steps/index.ts`, `pure.ts`), never consulting `step.target`.
A SELF_TARGETED experiment (impact `target=attacker`) was built, gated
green, re-captured — ring still on defender — and fully reverted
(byte-identical to HEAD). Forcing the ring onto the caster would fabricate a
staging state production can never emit (plus a phantom self-hit), so the
lab stays faithful. Consequence: guard rows read as foe-targeted eruptions
("wall them in"); the spec edge case is amended accordingly. True self-cast
guards would be a sim/balance change for a future track.
