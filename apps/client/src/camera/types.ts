import type { CameraIntent } from "../director"

/** Which regime the camera is in. The player owns the camera on the ranch;
 * the arena director owns it during a fight. */
export type CameraMode = "ranch" | "arena"

/** Arena camera presentation, chosen by the cup/spar shell (FR6). */
export type ArenaStyle = "broadcast" | "cinematic"

export interface OrbitCameraRig {
  /** Current mode — the tick branches on ranch vs arena behavior. */
  mode(): CameraMode
  /** Hand the camera over to the broadcast pit (and back). */
  setMode(mode: CameraMode): void
  /** Choose the arena camera style (FR6). */
  setArenaStyle(style: ArenaStyle): void
  /** Feed the director's latest shot; stale intents settle to broadcast. */
  applyDirectorIntent(intent: CameraIntent): void
  /** Broadcast punch: kick a decaying camera shake of the given strength. */
  shake(strength: number): void
  /** Kill any live shake without re-anchoring (motion-pref flips). */
  resetShake(): void
  /** Recompute the viewport-driven framing (F6); call on resize. */
  resize(width: number, height: number): void
  /**
   * Soft ranch track: while the creature is in the ceremony or on a wander
   * trip the aim eases toward its position; otherwise it drifts back to the
   * home anchor. Frame-rate independent smoothing — drag and wheel still
   * own the final say over azimuth/elevation/radius.
   */
  track(away: boolean, x: number, z: number, dt: number): void
  /**
   * Per-frame arena updates: shake decay + cinematic director ease.
   * `t` is seconds since clock start, `dt` the clamped frame delta.
   */
  updateArena(t: number, dt: number, reducedMotion: boolean): void
  /** Detach the pointer/wheel listeners. */
  dispose(): void
}
