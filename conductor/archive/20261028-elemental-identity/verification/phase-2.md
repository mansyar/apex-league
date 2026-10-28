# Phase 2 verification — Fire (4 new + 4 upgrades)

- **Status:** verified (primary evidence review + gate)
- **Implementation:** subagent-built rows in
  `apps/client/src/move-fx/moves/fire.ts` (8 bespoke rows in sim-catalog
  order), `fallback.test.ts` AC-1/AC-3 pins, `move-fx.test.ts` guard-test
  trim; committed as `45b83b74`.
- **Gate:** `bun run verify` exit 0 (3427 pass / 0 fail, determinism gate
  OK), `bun run build` exit 0 (pre-existing chunk-size warning only).
- **Console:** clean (playwright `console`, 0 errors / 0 warnings).

## Evidence — Move Lab, far, 1×, seeds 11/23, drake vs ox

32 frames in this directory: `<move>-{d,p}-{travel,impact}.png`.

- `d` = desktop viewport; `p` = real 390×844 phone viewport via
  `setViewportSize` (device emulation, NO in-lab toggle).
- `travel` = projectile-staged + 500 ms (fireball mid-flight);
  `impact` = impact-staged + 100 ms (burst peak — +300 ms catches only
  aftermath halo, +100 ms catches the core).
- Deterministic: fixed seeds, status-text anchors
  (`staged approach` → `staged projectile` → `impact staged`),
  scripts in `%TEMP%/opencode` (`cap-fire-lab.js`, `cap-fire-phone.js`).

## Per-move read (AC-1 fire / AC-3 verbs)

- `spark` — stinger: faint halo at drake on travel, small bright core + halo
  on ox at impact. Modest by design (power 6); reads fire at a glance.
- `cinder_shot` — falling-ember arrival, bright orange core + embers.
- `blaze_bolt` — fast yellow-white bolt with ember trail; impact core small
  but unmistakable.
- `flare_dart` — fastest small dart; impact flash + halo.
- `pyre_lance` — beam/lance: biggest travel fireball, strong impact core.
- `flame_charge` — dashBody: drake-borne fireball, bright contact burst.
- `pyre_wall` — barrierBody: orange ring erupts around the foe with bright
  core — foe-targeted eruption per the amended spec edge case (sim targets
  opponent for every special; ring-on-foe is production-faithful).
- `cinder_dive` — diving dash: large bright fireball + impact core.

All 8 read as fire at a glance (additive orange/yellow, ember particles,
halo shells). Verbs distinct: stinger / bolt / dart / lance / dash / dive /
barrier + ember-fall.

## Known issues / follow-ups (not blocking)

- Impact bursts are modest in scale (bolt/dart especially) — burst-scale
  tuning is a Phase 8 catalog-review item, not a Phase 2 defect.
- The lab's in-page Phone-width toggle mis-frames the Broadcast camera
  (empty arena strip); real phone viewports render correctly. Phone evidence
  uses device emulation; toggle fix is a Phase 8 polish item (see plan
  P8.T4 and the note in phase-1.5.md).
