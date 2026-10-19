/**
 * Face idle: a blink scheduler and an eye-only glance, both pure
 * functions of (seed, seconds) so a blink is reproducible in a capture
 * and the frame loop allocates nothing to ask for one.
 *
 * The schedule is slot-based rather than list-based. Blink k starts
 * somewhere inside slot k (`k * BLINK_CYCLE`), jittered by at most
 * BLINK_JITTER. Consecutive starts are therefore never closer than
 * BLINK_CYCLE - BLINK_JITTER nor further apart than BLINK_CYCLE +
 * BLINK_JITTER - exactly the 2.4-5.6 s band - and `blinkAt` stays O(1)
 * however long the tab has been open, with no cumulative sum to walk.
 *
 * The lid is a scale, not a rotation: the eye part is pivoted at its
 * top-centre, so collapsing scale.y flattens the bead up into its socket
 * and reads as a lid coming down. `LID_CLOSED` stops just short of zero
 * so a closed eye stays a visible line instead of vanishing and popping
 * back.
 */

/** Seconds between blink slots (the jitter shifts the start inside one). */
export const BLINK_CYCLE = 4
/** Half-width of the start jitter: (+/-) makes the gap band 2.4-5.6 s. */
export const BLINK_JITTER = 1.6
/** Lid scale when fully shut — a line, never nothing. */
export const LID_CLOSED = 0.08
/** Fast close, a beat shut, slow open: the asymmetry is what reads alive. */
const BLINK_CLOSE = 0.05
const BLINK_HOLD = 0.015
const BLINK_OPEN = 0.09
const BLINK_TOTAL = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN

/** Seconds between glance slots (jitter makes the gap band 4.1-8.9 s). */
export const GLANCE_CYCLE = 6.5
export const GLANCE_JITTER = 2.4
/** Two degrees of yaw: a flick of attention, not a look around. */
export const GLANCE_MAX = Math.PI / 90
const GLANCE_TURN = 0.09
const GLANCE_HOLD = 0.45
const GLANCE_RETURN = 0.12
const GLANCE_TOTAL = GLANCE_TURN + GLANCE_HOLD + GLANCE_RETURN

/** Smoothstep on the unit interval, clamped. */
const ease = (k: number): number => {
  const c = k < 0 ? 0 : k > 1 ? 1 : k
  return c * c * (3 - 2 * c)
}

/**
 * A seeded 32-bit mix in [0, 1). Integer-only so every platform lands on
 * the same blink for the same seed (Math.random would not).
 */
const hash01 = (seed: number, k: number): number => {
  let h = (seed | 0) ^ Math.imul(k + 1, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Where blink k begins. */
const blinkStart = (seed: number, k: number): number =>
  k * BLINK_CYCLE + hash01(seed, k) * BLINK_JITTER

/** The lid curve for `u` seconds into a blink. */
const lidCurve = (u: number): number => {
  if (u < 0 || u >= BLINK_TOTAL) return 1
  if (u < BLINK_CLOSE) return 1 - (1 - LID_CLOSED) * ease(u / BLINK_CLOSE)
  if (u < BLINK_CLOSE + BLINK_HOLD) return LID_CLOSED
  const k = (u - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN
  return LID_CLOSED + (1 - LID_CLOSED) * ease(k)
}

/**
 * Eyelid scale.y at `t` seconds for a creature seed: 1 open, LID_CLOSED
 * shut. Both eyes share this value — a creature that winks has a bug.
 */
export function blinkAt(seed: number, t: number): number {
  if (!(t >= 0)) return 1
  const slot = Math.floor(t / BLINK_CYCLE)
  // A blink's window is far shorter than a slot, so the containing slot
  // or its neighbour is the only candidate (max gap 5.6 s < 2 slots).
  for (let k = slot; k >= slot - 1; k--) {
    if (k < 0) break
    const u = t - blinkStart(seed, k)
    if (u >= 0 && u < BLINK_TOTAL) return lidCurve(u)
  }
  return 1
}

/** Where glance k begins. */
const glanceStart = (seed: number, k: number): number =>
  // Offset the seed so a glance's schedule is not the blink's.
  k * GLANCE_CYCLE + hash01(seed ^ 0x5f356495, k) * GLANCE_JITTER

/** The signed yaw for `u` seconds into a glance. */
const glanceCurve = (seed: number, k: number, u: number): number => {
  if (u < 0 || u >= GLANCE_TOTAL) return 0
  const dir = hash01(seed ^ 0x2545f491, k) < 0.5 ? -1 : 1
  const amp = GLANCE_MAX * (0.55 + 0.45 * hash01(seed ^ 0x27d4eb2f, k))
  if (u < GLANCE_TURN) return dir * amp * ease(u / GLANCE_TURN)
  if (u < GLANCE_TURN + GLANCE_HOLD) return dir * amp
  const back = (u - GLANCE_TURN - GLANCE_HOLD) / GLANCE_RETURN
  return dir * amp * (1 - ease(back))
}

/**
 * Eye-only yaw at `t` seconds, in radians (|yaw| <= GLANCE_MAX).
 * `suppressed` parks the eye at rest — hit-stop, or reduced motion.
 */
export function glanceAt(seed: number, t: number, suppressed = false): number {
  if (suppressed || !(t >= 0)) return 0
  const slot = Math.floor(t / GLANCE_CYCLE)
  for (let k = slot; k >= slot - 1; k--) {
    if (k < 0) break
    const u = t - glanceStart(seed, k)
    if (u >= 0 && u < GLANCE_TOTAL) return glanceCurve(seed, k, u)
  }
  return 0
}

/** The two eye parts of a rig, or whichever one exists. */
export interface FaceEyes {
  left?: EyeNode
  right?: EyeNode
}

/** The slice of an eye the driver writes — THREE.Object3D matches it. */
export interface EyeNode {
  scale: { y: number }
  rotation: { y: number }
}

/** Cache the eye parts once per rig build (never look them up per frame). */
export function findEyes(root: {
  getObjectByName(name: string): unknown
}): FaceEyes {
  const left = root.getObjectByName("eyeLeft") as EyeNode | null
  const right = root.getObjectByName("eyeRight") as EyeNode | null
  return {
    left: left ?? undefined,
    right: right ?? undefined,
  }
}

/**
 * Write one frame of face idle into a rig. Both eyes get the same lid
 * and the same yaw; `suppressed` keeps the blink and parks the glance.
 */
export function driveFace(
  eyes: FaceEyes,
  seed: number,
  t: number,
  options: { suppressed?: boolean } = {},
): void {
  const lid = blinkAt(seed, t)
  const yaw = glanceAt(seed, t, options.suppressed ?? false)
  const left = eyes.left
  const right = eyes.right
  if (left) {
    left.scale.y = lid
    left.rotation.y = yaw
  }
  if (right) {
    right.scale.y = lid
    right.rotation.y = yaw
  }
}
