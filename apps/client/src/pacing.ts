/**
 * The pacing math both playback paths share (FR8, FR-13): the KO slow-motion
 * factor, the step delay it dilates, the stamp beat, and the dense stream's
 * wall-time ratio. Pure functions, kept apart from the driver so the driver
 * module stays under the client's size cap.
 */

import { PLAYBACK_SPEED_MS, type PlaybackSpeed } from "./playbackSpeed"

/**
 * The final blow plays in slow motion (FR8): the wait around a terminal
 * KO step (and the live pace the arena animates to) stretches by this
 * factor, then eases back to the broadcast rhythm.
 */
export const KO_DILATION = 2.5

/** The pacing math, pure: a KO step dilates the base wait, others do not. */
export const dilatedPace = (base: number, ko: boolean): number =>
  ko ? Math.round(base * KO_DILATION) : base

/** How many step-lengths the dust settles for before the stamp lands. */
export const STAMP_BEATS = 1.2

/**
 * The verdict stamp beat (FR8): the run's terminal wait before the stamp
 * fires. It stretches on a KO so the collapse and dust ring finish
 * breathing before the verdict slams in.
 */
export const stampDelay = (base: number, ko: boolean): number =>
  Math.round(base * (ko ? KO_DILATION : 1) * STAMP_BEATS)

/**
 * How much fight time the dense stream covers per wall millisecond. The
 * stream is authored at the sim's 50 Hz, so 1× is real time; the speed pill
 * keeps the ratio the paced path uses (900 ms per step → 140 ms), which
 * fast-forwards a 30 s fight to about five seconds.
 */
export const denseSpeedFactor = (speed: PlaybackSpeed): number =>
  PLAYBACK_SPEED_MS.normal / PLAYBACK_SPEED_MS[speed]
