/**
 * The ranch orbit camera and its arena alter-ego. One module owns every
 * camera state transition so the framing rules live in exactly one place:
 *
 * - Ranch mode: user-driven drag-to-orbit, wheel and two-finger pinch zoom
 *   around the creature, with a soft track that eases the aim toward a
 *   wandering creature and back home when it settles (frame-rate
 *   independent, learnings 7).
 * - Arena mode: a fixed "broadcast pit" framing with no orbit input. The
 *   cinematic style layers a director ease on top, and punches decay as a
 *   camera shake written back to a saved anchor (never additive).
 *
 * The implementation lives under `camera/` — framing constants, gesture
 * input, punch shake and the rig itself; this file is the stable facade.
 */

export { BASE_FOV } from "./camera/presets"
export { createOrbitCamera } from "./camera/rig"
export type { ArenaStyle, CameraMode, OrbitCameraRig } from "./camera/types"

export type {
  /** Director shot request, produced by the playback director. */
  CameraIntent,
} from "./director"
