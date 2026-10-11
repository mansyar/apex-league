/**
 * Playback pacing for the arena fight (FR11): two speeds, no skipping.
 * The stepped playback waits `PLAYBACK_SPEED_MS[speed]` between events;
 * fast-forward shortens the wait but every event still plays in order.
 */
export type PlaybackSpeed = "normal" | "fast"

export const PLAYBACK_SPEED_MS: Readonly<Record<PlaybackSpeed, number>> = {
  normal: 900,
  fast: 140,
}

/** Flip between the two playback speeds. */
export const toggleSpeed = (speed: PlaybackSpeed): PlaybackSpeed =>
  speed === "normal" ? "fast" : "normal"
