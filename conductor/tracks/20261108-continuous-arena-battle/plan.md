# Continuous Arena Battle — Implementation Plan

> **Branch:** `feat/20261108-continuous-arena-battle`
> **Base:** `main` @ `e5bda39d9849aa3a42d6e57cc66cda3475ddc55b`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Authored Frame Data

- **Goal:** every move in the catalog carries complete, validated frame data.
- **Depends on:** none
- **Covers:** FR-5, AC-5
- **Touches:** `packages/sim/src/battle/frames.ts`, `packages/sim/src/battle/frames.test.ts`, `packages/sim/src/battle/moves.ts`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P1.T1: Frame data model** — covers: FR-5
  - [x] **P1.T1.1: Define the frame-data shape** — startup, active, and recovery in ms; reach in mm; projectile speed; poise damage; stamina cost, beside the move catalog.
  - [x] **P1.T1.2: Add validation** — reject non-positive recovery, zero projectile speed on a non-melee move, and reach below the body radius.
- [x] **P1.T2: Author all 49 rows** — covers: FR-5
  - [x] **P1.T2.1: Author the six kit rows per element** — Spark through the element's heavy finisher.
  - [x] **P1.T2.2: Author the wider pool and both branch signatures per element.**
- [x] **P1.T3: Completeness test** — covers: FR-5, AC-5
  - [x] **P1.T3.1: Assert every catalog id has a row and every row passes validation.**

**Result:** verified
**Checkpoint:** 2696002b
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-1.md

## Phase 2: Fixed-Step Engine Core

- **Goal:** a deterministic stepper moves two fighters in continuous space.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, AC-1, AC-2, AC-3
- **Touches:** `packages/sim/src/battle/continuous/types.ts`, `packages/sim/src/battle/continuous/step.ts`, `packages/sim/src/battle/continuous/movement.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P2.T1: State model** — covers: FR-2
  - [x] **P2.T1.1: Fixed-point 3-vector position** — millimetres, `y` pinned to 0, plus velocity, facing, and arena bounds.
- [x] **P2.T2: Continuous movement** — covers: FR-3
  - [x] **P2.T2.1: Acceleration and deceleration toward an intent** — speed derived from `spd`.
  - [x] **P2.T2.2: Lateral strafing and bounds clamping** — clamped without oscillation.
- [x] **P2.T3: Fixed-step stepper** — covers: FR-1
  - [x] **P2.T3.1: 20 ms step loop** — one seeded RNG and a stable state hash.
- [x] **P2.T4: Determinism tests** — covers: AC-1, AC-2, AC-3
  - [x] **P2.T4.1: Repeat-run hash equality, `y === 0` sampling, and distinct positions per engagement.**

**Result:** verified
**Checkpoint:** c1b771f5
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-2.md

## Phase 3: Strikes, Commitment, Trades

- **Goal:** attacks resolve in space with interruptible timing.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-6, FR-7, AC-4, AC-6, AC-7
- **Touches:** `packages/sim/src/battle/continuous/strike.ts`, `packages/sim/src/battle/continuous/damage.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P3.T1: Reach and positional damage** — covers: FR-4
  - [x] **P3.T1.1: Euclidean reach check and flank/rear bonus** — applied to the existing integer damage formula.
- [x] **P3.T2: Attack lifecycle** — covers: FR-6
  - [x] **P3.T2.1: Startup, active, and recovery phases with commitment.**
  - [x] **P3.T2.2: Interruption during startup and counter bonus during recovery.**
- [x] **P3.T3: Trades** — covers: FR-7
  - [x] **P3.T3.1: Overlapping active frames both land in the same step.**

**Result:** verified
**Checkpoint:** 16603677
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-3.md

## Phase 4: Projectiles and Dodge

- **Goal:** shots take real time to cross real distance.
- **Depends on:** Phase 3
- **Covers:** FR-8, AC-8
- **Touches:** `packages/sim/src/battle/continuous/projectile.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P4.T1: Projectile entities** — covers: FR-8
  - [x] **P4.T1.1: Travel from distance and authored speed** — resolved on arrival.
- [x] **P4.T2: Dodge** — covers: FR-8
  - [x] **P4.T2.1: Dodge judged against lateral motion relative to the shot's line.**

**Result:** verified
**Checkpoint:** 836bd774
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-4.md

## Phase 5: Poise and Stamina

- **Goal:** rhythm comes from meters that deplete and recover.
- **Depends on:** Phase 4
- **Covers:** FR-9, FR-10, AC-9, AC-10
- **Touches:** `packages/sim/src/battle/continuous/poise.ts`, `packages/sim/src/battle/continuous/stamina.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P5.T1: Poise** — covers: FR-9
  - [x] **P5.T1.1: Depletion, break window in ms, and the time-expressed grace period.**
- [x] **P5.T2: Stamina** — covers: FR-10
  - [x] **P5.T2.1: Cost on attacks and dodge, regeneration while not committing, refusal when insufficient.**

**Result:** verified
**Checkpoint:** 7066f1e8
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-5.md

## Phase 6: Real-Time Controller

- **Goal:** an AI that fights in real time instead of picking from a queue.
- **Depends on:** Phase 5
- **Covers:** FR-11, AC-11
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

- [x] **P6.T1: Intent model and cadence** — covers: FR-11
  - [x] **P6.T1.1: Advance, retreat, strafe, hold, commit, and dodge on a fixed decision cadence.**
- [x] **P6.T2: Commitment locks and archetype parameters** — covers: FR-11
  - [x] **P6.T2.1: No twitch re-decision inside a commitment; per-archetype tuning shared by rivals and bosses.**

**Result:** verified
**Checkpoint:** 5a2e6221
**Evidence:** conductor/tracks/20261108-continuous-arena-battle/verification/phase-6.md

## Phase 7: Endings and Resolver Integration

- **Goal:** the new engine produces the same `BattleResult` contract the game already consumes.
- **Depends on:** Phase 6
- **Covers:** FR-12, AC-12
- **Touches:** `packages/sim/src/battle/continuous/resolve.ts`, `packages/sim/src/battle/resolver.ts`, `packages/sim/src/battle/index.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** in_progress

- [ ] **P7.T1: Endings** — covers: FR-12
  - [ ] **P7.T1.1: KO, double KO, and time cap judged by HP%, then poise damage dealt, then seed.**
- [ ] **P7.T2: Resolver adapter** — covers: FR-12
  - [ ] **P7.T2.1: Emit the existing `BattleResult` shape and wire the exhibition and cup call sites.**

## Phase 8: Contact Geometry

- **Goal:** bodies and blows have volume, so a swing or a shot can actually miss.
- **Depends on:** Phase 7
- **Covers:** FR-17, FR-18, FR-19, AC-17, AC-18, AC-19
- **Touches:** `packages/sim/src/battle/continuous/contact.ts`, `packages/sim/src/battle/continuous/strike.ts`, `packages/sim/src/battle/continuous/projectile.ts`, `packages/sim/src/battle/frames.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P8.T1: Body volumes** — covers: FR-17
  - [ ] **P8.T1.1: Radius and height on the fighter, seeded from species and form.**
  - [ ] **P8.T1.2: A height band on every move's frame data, validated.**
- [ ] **P8.T2: Swept melee arcs** — covers: FR-18
  - [ ] **P8.T2.1: Per-step sector test through the active window, reach measured edge to edge.**
  - [ ] **P8.T2.2: A swing whiffs when the victim leaves the arc or the height band.**
  - [ ] **P8.T2.3: Facing follows the opponent, not the movement intent, so circling no longer turns the body away.**
- [ ] **P8.T3: Swept projectiles** — covers: FR-19
  - [ ] **P8.T3.1: Segment-versus-capsule per step, no tunnelling, height-aware.**
- [ ] **P8.T4: Type identity** — covers: FR-4, FR-8
  - [ ] **P8.T4.1: Restore the secondary-element collapse so a dual-element body's resistance and weakness count.**
- [ ] **P8.T5: Event fidelity and version gate** — covers: FR-13, FR-15
  - [ ] **P8.T5.1: Emit launch, approach, and hold beats so a replay shows shots and movement.**
  - [ ] **P8.T5.2: Bump `SIM_VERSION` at the switch, not after the cup has been writing new ghosts.**

## Phase 9: Evasion and Pacing

- **Goal:** dodging works, and fights last as long as the spec says.
- **Depends on:** Phase 8
- **Covers:** FR-20, FR-21, AC-20, AC-21
- **Touches:** `packages/sim/src/battle/continuous/controller.ts`, `packages/sim/src/battle/continuous/advance.ts`, `packages/sim/src/battle/continuous/movement.ts`, `packages/sim/src/battle/continuous/resolve.ts`, co-located tests
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P9.T1: Dodge burst** — covers: FR-20
  - [ ] **P9.T1.1: Burst speed, duration, cooldown, and stamina price, aimed clear of the incoming line.**
  - [ ] **P9.T1.2: A dodge inside a shot's flight or a swing's active window turns the hit into a miss.**
- [ ] **P9.T2: Melee evasion balance** — covers: FR-20
  - [ ] **P9.T2.1: Arc, reach, and timing tuned so evading a swing is possible and not free.**
- [ ] **P9.T3: Pacing** — covers: FR-21
  - [ ] **P9.T3.1: Fights land in the 25-40 s band with both sides landing blows.**
  - [ ] **P9.T3.2: Re-pin the cup and lifecycle outcomes the new contact model moves.**

## Phase 10: Dense Playback and Staging

- **Goal:** the client renders the continuous fight without snapping.
- **Depends on:** Phase 9
- **Covers:** FR-13, AC-13
- **Touches:** `packages/sim/src/battle/continuous/stream.ts`, `apps/client/src/staging.ts`, `apps/client/src/playbackDriver.ts`, `apps/client/src/fighter-driver.ts`
- **Verification:** `bun run verify && bun run build`, then a `playwright-cli` pass at desktop and phone widths
- **Status:** pending

- [ ] **P10.T1: Dense state stream** — covers: FR-13
  - [ ] **P10.T1.1: Sample positions and phases per step into a compact replayable stream.**
- [ ] **P10.T2: Staging mapping** — covers: FR-13
  - [ ] **P10.T2.1: Map sim millimetres to world units and add startup telegraphs.**
- [ ] **P10.T3: Reduced motion** — covers: FR-13
  - [ ] **P10.T3.1: Keep the instant text path readable for the new endings.**

## Phase 11: Telemetry Harness

- **Goal:** "not turn-based" is measured, not asserted.
- **Depends on:** Phase 9
- **Covers:** FR-14, AC-14
- **Touches:** `packages/sim/scripts/battle-telemetry.ts`, `packages/sim/src/battle/continuous/telemetry.test.ts`, `.github/workflows/ci.yml`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P11.T1: Recorder** — covers: FR-14
  - [ ] **P11.T1.1: Engagement distance, exchange rate, idle time, and distinct positions.**
- [ ] **P11.T2: Thresholds** — covers: FR-14
  - [ ] **P11.T2.1: Seeded sample across matchups with CI-enforced bounds.**

## Phase 12: Legacy Freeze and Version Bump

- **Goal:** old battles keep replaying; new ones never touch the gauge clock.
- **Depends on:** Phase 10
- **Covers:** FR-15, FR-16, AC-15, AC-16
- **Touches:** `packages/sim/src/battle/clock/`, `packages/sim/src/battle/playback.ts`, `packages/sim/src/cup/ghost.ts`, `conductor/product.md`, `conductor/learnings.md`
- **Verification:** `bun run verify && bun run build`
- **Status:** pending

- [ ] **P12.T1: Freeze the clock** — covers: FR-15
  - [ ] **P12.T1.1: Mark `clock/` and `playback.ts` replay-only and route new fights away from them.**
- [ ] **P12.T2: Version bump** — covers: FR-15
  - [ ] **P12.T2.1: Bump `SIM_VERSION` and skip mismatched ghost bundles.**
- [ ] **P12.T3: Compatibility test** — covers: FR-16
  - [ ] **P12.T3.1: A pre-track save loads and its in-flight cup completes.**
- [ ] **P12.T4: Docs truth pass** — covers: FR-15
  - [ ] **P12.T4.1: Update the product roadmap and learnings.**
