# Phase R2 evidence — Review Fixes (round 2)

- Track: 20261111-presentation-mapping
- Phase: R2 (Review Fixes, round 2)
- Date: 2026-11-11
- Branch: `feat/20261111-presentation-mapping`
- Base: `139f8682`
- Head: `139f8682` (no new commits — executor file-write denied, see Blockers)
- Result: **blocked** (no files changed, no commits, verification not run)

## Base / Head

Phase base `139f8682` confirmed: clean tree (`git status --short` empty),
branch `feat/20261111-presentation-mapping`, HEAD `139f8682`
(`docs(conductor): restore round-1 review detail and record round-2 findings`).
No code changes were possible in this attempt; Head == Base.

## F6 (spec carve-out — NOT APPLIED, ready to apply)

One-line amendment to the Out-of-Scope bullet (spec.md line 33). No other
spec edits.

Old:

```text
- Any change under `packages/sim` (no stream fields, no frame data, no numbers).
```

New:

```text
- Any change under `packages/sim` (no stream fields, no frame data, no numbers) — except additive spare-bit exports (no new fields, no frame-data/number changes), recorded as D1.
```

Intended commit: `docs(presentation): carve D1 spare-bit exports out of the sim-change ban`
(touching `conductor/tracks/20261111-presentation-mapping/spec.md` only).

## F7 (pose-application extraction — NOT APPLIED, ready to apply)

Goal: `fighter-driver.ts` (12,272 B at base, 16 B headroom — review.md F7)
regains comfortable headroom; new co-located module `pose-apply.ts` owns the
upright pose application, same pattern as `pose-track.ts` (leaf module:
runtime imports only from `anim`/`choreo`/`choreo-poses`, plus an erased
`import type { DriveFighter }` — no runtime cycle with `fighter-driver.ts`).

What moves (verbatim, comments included):
- Consts used only by the pose math: `BREATH_AMP`, `BREATH_FREQ`,
  `GAIT_AMP`, `SQUASH_DIP`, `FACE_RATE`.
- Pure helpers used only by the pose math (kept importable from
  `./fighter-driver` via a re-export so all existing test imports pass
  unchanged): `shortestAngle`, `composeScale`, `composePosition`, `yawStep`.
- The upright compose+apply block (base lines ~266–313: `rest`/`padj`/
  gait/breath/sway/`composePosition`/group position+scale/face-the-rival
  yaw/pitch/roll) becomes `applyUprightPose(c, other, { now, dt, life, speed })`.

What stays in `fighter-driver.ts`: module docstring, `GLIDE`,
`LEAN_PER_SPEED/LEAN_MAX`, `SQUASH_K/SQUASH_D`, `BOUNDS_X/BOUNDS_Z`,
`DOWN_LIFT`, `GAIT_PER_SPEED`, `leanTarget`, `advanceWalkPhase`,
`clampStage`, `topplePose`, `DriveFighter`, `FighterDriver`,
`createFighterDriver` (glide, lean, downed branch, one call into
`applyUprightPose`), plus the four-symbol re-export.

Sizes (before per review.md F7 + phase-R1.md §Sizes, tree clean at base;
after estimated from moved line counts — primary to confirm via the
module-size guard in `bun run verify`):
- Before: `fighter-driver.ts` 12,272 B.
- After (estimate): driver ≈ 9.2 KB (moves ≈ 100 lines / ≈ 3.8 KB out,
  adds ≈ 19 lines of imports + re-export + call site); `pose-apply.ts`
  ≈ 5 KB. Both comfortably under the 12,288 B cap; driver comfortably
  under the 11,500 B brief target.

Consumers checked (grep `from "./fighter-driver"` under `apps/client/src`):
only `fighter-driver.test.ts` imports moved helpers (covered by the
re-export), `dense-playback.test.ts` imports `clampStage` (stays put),
everything else imports `createFighterDriver`/`DriveFighter`/types only.

Seam test to add (in `fighter-driver.test.ts`, inside the existing
`stream poses in the driver` describe so `fighterAt`/`stepOnce` are in
scope; add `import { applyUprightPose } from "./pose-apply"` after the
`./fighter-driver` import):

```ts
test("the extracted pose seam applies a flinch identically (R2/F7)", () => {
  const via = fighterAt(0)
  via.pose = "flinch"
  via.poseK = 1
  stepOnce(via, fighterAt(0))
  const direct = fighterAt(0)
  direct.pose = "flinch"
  direct.poseK = 1
  applyUprightPose(direct, fighterAt(0), {
    now: 1016,
    dt: 0.016,
    life: 1,
    speed: 0,
  })
  expect(direct.group.rotation.x).toBeCloseTo(via.group.rotation.x)
  expect(direct.group.position.x).toBeCloseTo(via.group.position.x)
  expect(direct.group.position.y).toBeCloseTo(via.group.position.y)
})
```

Rationale for the pinned values: `stepOnce` syncs the clock at 1000 and
steps at 1016, so `dt = 16/1000 = 0.016`, `life = 1` (full pref); the
fighter starts with `smooth == stage`, so measured speed is exactly 0.
Both paths run identical arithmetic, so `toBeCloseTo` has full exact
equality underneath with tolerance to spare.

Full `pose-apply.ts` source for the primary to create (all moved code is
verbatim from base `fighter-driver.ts`; only the two leading block comments
are new, and `driver's own channels` in the transplanted comment should read
`fighter's own channels`):

```ts
import { approach, breath as breathSine, gait as gaitBob } from "./anim"
import { idleSway } from "./choreo"
import { poseAdjust } from "./choreo-poses"
import type { DriveFighter } from "./fighter-driver"

/**
 * Upright pose application for one fighter (presentation mapping Phase R2).
 * Split from `fighter-driver.ts` when that module neared the client size
 * cap: the per-frame pose math (gait/breath/sway compose, stream-pose ride,
 * facing ease) lives here, the drive loop (glide, lean, downed branch)
 * stays there. Presentation-only — pose application never feeds the sim —
 * so replay hashes stay byte-identical.
 */

/** Idle breathing + gait amplitudes (reduced motion zeroes the gait). */
const BREATH_AMP = 0.03
const BREATH_FREQ = 2.2
const GAIT_AMP = 0.085

/** How deep the squash spring dips the body into the floor. */
const SQUASH_DIP = 0.42

/** Yaw-follow strength of the face-the-rival ease. */
const FACE_RATE = 9

/** Wrap an angle delta into [-π, π) so yaw always takes the short way. */
export function shortestAngle(a: number): number {
  const turn = Math.PI * 2
  return ((((a + Math.PI) % turn) + turn) % turn) - Math.PI
}

/** Squash-and-stretch scale for a fighter: x/z widen, y flattens. A
 * downed body floors its collapse so the topple never inverts the mesh. */
export function composeScale(
  base: number,
  squash: number,
  downed: boolean,
): { x: number; y: number; z: number } {
  return {
    x: base * (1 + squash * 0.34),
    y: downed
      ? base * Math.max(0.05, 1 - squash * 0.5)
      : base * (1 - squash * 0.5),
    z: base * (1 + squash * 0.34),
  }
}

/** Compose the body position: walk position + action offset + gait bob +
 * breath at rest, all minus the squash dip (weight). The floor is a hard
 * clamp — no pose may sink the creature below it. */
export function composePosition(
  smooth: { x: number; y: number; z: number },
  offset: { x: number; y: number; z: number },
  gait: number,
  breath: number,
  sway: number,
  squashS: number,
): { x: number; y: number; z: number } {
  return {
    x: smooth.x + offset.x,
    y: Math.max(0, smooth.y + offset.y + gait + breath - squashS * SQUASH_DIP),
    z: smooth.z + offset.z + sway,
  }
}

/** One step of the face-the-rival ease: yaw closes on the desired angle
 * along the wrapped short path, weighted by the approach factor. */
export function yawStep(
  current: number,
  desired: number,
  factor: number,
): number {
  return current + shortestAngle(desired - current) * factor
}

/** Inputs the drive loop owns; the pose math only reads them. */
export interface UprightPoseInput {
  /** Wall-clock now in ms (breath/sway phases). */
  now: number
  /** Clamped frame dt in seconds (the yaw ease). */
  dt: number
  /** Visual intensity: 1 full, 0 reduced (gait/sway parked). */
  life: 0 | 1
  /** Frame speed from measured motion (the gait tempo + rest gate). */
  speed: number
}

/**
 * Apply one upright frame: compose walk + offset + gait + breath + sway
 * under the squash spring, ride the live stream pose on top, and face the
 * rival. Moved verbatim from the fighter-driver step loop (R2/F7) — the
 * driver keeps the glide, the lean, and the downed branch.
 */
export function applyUprightPose(
  c: DriveFighter,
  other: DriveFighter,
  input: UprightPoseInput,
): void {
  const { now, dt, life, speed } = input
  // Compose the pose: walk position + action offset + gait bob +
  // breath at rest, all scaled by the squash spring (weight). The
  // archetype's body-language profile (FR5) weights every term. A roll
  // tucks while the glide carries the travel and a recoil plants its
  // feet — the gait bob would skate either, so both poses park it.
  const rest = speed < 0.15 ? 1 : 0
  const padj = poseAdjust(
    c.pose ?? "none",
    c.poseK ?? 0,
    c.away,
    life,
    c.poseLateral ?? 0,
  )
  const gait =
    gaitBob(c.walkPhase, GAIT_AMP * c.profile.gaitAmp, life) *
    (c.pose === "roll" || c.pose === "recoil" ? 0 : 1)
  const breath = breathSine(
    now,
    BREATH_FREQ * 2 * c.profile.breathFreq,
    BREATH_AMP * c.profile.breathAmp * rest,
    c.phase,
  )
  const sway = idleSway(c.profile, now, c.phase) * rest
  const pos = composePosition(
    c.smooth,
    c.offset,
    gait,
    breath,
    sway,
    c.squash.s,
  )
  // Phase-1 stream poses ride on the fighter's own channels, over the
  // composed pose — a flinch can never fight the gait it interrupts.
  // (padj is composed above so the roll/recoil can park the gait.)
  c.group.position.set(pos.x + padj.dx, Math.max(0, pos.y + padj.dy), pos.z)
  const upScale = composeScale(c.baseScale, c.squash.s + padj.squash, false)
  c.group.scale.set(upScale.x, upScale.y, upScale.z)
  // Face the rival every frame; yaw leads, pitch/roll support.
  const dx = other.group.position.x - c.group.position.x
  const dz = other.group.position.z - c.group.position.z
  const desired = Math.atan2(dx, dz)
  c.group.rotation.y = yawStep(
    c.group.rotation.y,
    desired,
    approach(0, 1, FACE_RATE, dt),
  )
  c.group.rotation.x = c.lean.pitch + padj.pitch
  c.group.rotation.z = c.lean.roll + padj.roll
}
```

Driver edits for the primary (all in `apps/client/src/fighter-driver.ts`):
1. Imports become:
   `import { approach, stepSquash } from "./anim"`;
   `import type { BodyProfile } from "./choreo"`;
   `import type { StreamPose } from "./choreo-poses"`;
   drop `breath as breathSine`, `gait as gaitBob`, `idleSway`, `poseAdjust`;
   append `import { applyUprightPose, composeScale } from "./pose-apply"` plus
   the re-export block:
   `export { composePosition, composeScale, shortestAngle, yawStep } from "./pose-apply"`
   (with the `pose-math helpers owned by pose-apply.ts` doc comment).
2. Delete the `BREATH_AMP`/`BREATH_FREQ`/`GAIT_AMP`, `SQUASH_DIP`, and
   `FACE_RATE` const blocks (keep their neighbours).
3. Delete `shortestAngle`, `composeScale`, `composePosition`, `yawStep`
   (with doc comments), joining the surrounding code.
4. Replace the upright block (base lines ~266–313, from the
   `// Compose the pose:` comment through
   `c.group.rotation.z = c.lean.roll + padj.roll`) with:
   the `lives in pose-apply.ts` comment plus
   `applyUprightPose(c, other, { now, dt, life, speed })`.

Intended commit: `refactor(client): extract upright pose application to pose-apply`.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit/static | `bun run verify` | not run | shell/file-write denied before any edit |
| static | `bun run build` | not run | shell/file-write denied before any edit |

No check was run; no check was retried. Suggested in-loop order for the
primary: scoped `bun test` on `fighter-driver.test.ts` + `module-size.test.ts`,
then `bun run verify`, then `bun run build` as two separate commands.

## Blockers

1. `edit` on `conductor/tracks/20261111-presentation-mapping/spec.md`
   (one-line F6 amendment) → `{"error":{"type":"permission.rejected","message":"Permission denied: edit"}}`.
   Expected: the Out-of-Scope bullet amended as quoted above.
2. `git cat-file -s HEAD:apps/client/src/fighter-driver.ts` (byte-size read
   for F7 evidence) → permission denied. Expected: `12272`. Sizes above are
   sourced from review.md F7 + phase-R1.md instead; no workaround attempted.
   Allow-listed git reads (`status`, `branch`, `log`) worked; this one did not.

## Result

Blocked. No files changed, no commits, no verification run. All analysis is
done and the exact patches are quoted above — the primary (or a re-permitted
executor) can apply F6 then F7, run the scoped tests plus `bun run verify`
and `bun run build`, and record the two task commits.
