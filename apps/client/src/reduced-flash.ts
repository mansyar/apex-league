/**
 * Reduced-motion flash language (FR-9, AC-9): every pose, telegraph and
 * mark collapses to one static flash when the viewer prefers reduced
 * motion. Same events, same verdict, nothing lost — the flash reports the
 * blow; it never moves the body. Pure mapping plus a capped static layer:
 * no clock, no randomness, spawn order decides eviction (FIFO).
 */
import * as THREE from "three"
import type { StreamPose } from "./choreo-poses"

/** One flash per replaced visual: hit, break, dodge, recoil, tell, pin, ko. */
export type ReducedFlashKind =
  | "hit"
  | "break"
  | "dodge"
  | "recoil"
  | "tell"
  | "pin"
  | "ko"

/** Most reduced flashes kept alive at once (FIFO, spawn order decides). */
export const REDUCED_FLASH_MAX = 4

const FLASH_COLORS: Record<ReducedFlashKind, number> = {
  hit: 0xffffff,
  break: 0xffd166,
  dodge: 0x90be6d,
  recoil: 0xf9844a,
  tell: 0xffb347,
  pin: 0x9a9184,
  ko: 0xe8e4da,
}

const FLASH_SCALES: Record<ReducedFlashKind, number> = {
  hit: 1,
  break: 1.4,
  dodge: 1.2,
  recoil: 1.1,
  tell: 1.3,
  pin: 1.3,
  ko: 1.6,
}

/** Marker height: ground reads (tell/pin/ko) sit low, blows at chest. */
function flashHeight(kind: ReducedFlashKind): number {
  return kind === "tell" || kind === "pin" || kind === "ko" ? 0.15 : 0.6
}

/**
 * Which flash a pose collapses to under reduced motion. `null` means no
 * report (idle). A pinned recoil reads as the pin, never the recoil.
 */
export function flashForPose(
  pose: StreamPose,
  pinned: boolean,
): ReducedFlashKind | null {
  switch (pose) {
    case "none":
      return null
    case "crouch":
      return "tell"
    case "flinch":
      return "hit"
    case "crumple":
      return "break"
    case "roll":
      return "dodge"
    case "recoil":
      return pinned ? "pin" : "recoil"
    case "press":
      return "hit"
    case "ko":
      return "ko"
  }
}

/** Capped static flash layer: markers appear, never travel, fade never. */
export interface ReducedFlashLayer {
  /** Show one static flash at a body position (FIFO past the cap). */
  spawn(at: THREE.Vector3, kind: ReducedFlashKind): void
  /** How many flashes are alive. */
  live(): number
  /** Clear every flash (new fight). */
  reset(): void
  /** Clear every flash and free nothing else (no shared resources). */
  disposeAll(): void
}
/** The layer's own marker: authored here, so its material type is known. */
type FlashMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>

export function createReducedFlashLayer(host: {
  arenaGroup: THREE.Group
}): ReducedFlashLayer {
  const alive: Array<FlashMesh> = []
  const drop = (mesh: FlashMesh): void => {
    host.arenaGroup.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
  }
  return {
    spawn(at, kind) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 8),
        new THREE.MeshBasicMaterial({
          color: FLASH_COLORS[kind],
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      )
      mesh.position.set(at.x, flashHeight(kind), at.z)
      mesh.scale.setScalar(FLASH_SCALES[kind])
      host.arenaGroup.add(mesh)
      alive.push(mesh)
      while (alive.length > REDUCED_FLASH_MAX) {
        const oldest = alive.shift()
        if (oldest) drop(oldest)
      }
    },
    live() {
      return alive.length
    },
    reset() {
      while (alive.length > 0) {
        const mesh = alive.pop()
        if (mesh) drop(mesh)
      }
    },
    disposeAll() {
      while (alive.length > 0) {
        const mesh = alive.pop()
        if (mesh) drop(mesh)
      }
    },
  }
}

/**
 * The dense stage's reduced-motion reporter (FR-9): one static flash per
 * event, never per frame. Owns the entry edges (startup, dodge, clinch,
 * pin, KO) plus the KO snap state, so the stage stays a thin branch.
 * Bodies still track the stream; only the report changes.
 */
export interface ReducedReporter {
  /** Startup entry: one tell flash, never the wedge. */
  startup(
    side: 0 | 1,
    charging: boolean,
    fresh: boolean,
    at: THREE.Vector3,
  ): void
  /** Dodge/clinch entry: one flash on entry, never per frame. */
  pose(
    side: 0 | 1,
    pose: StreamPose,
    pinned: boolean,
    fresh: boolean,
    at: THREE.Vector3,
  ): void
  /** Fence-pin rising edge: one pin flash. */
  pin(at: THREE.Vector3): void
  /** A landed non-killing blow: one flash for the pose it caused. */
  hit(pose: StreamPose, pinned: boolean, at: THREE.Vector3): void
  /** A killing blow: down at once, one ko flash, no reel, no dust. */
  ko(
    side: 0 | 1,
    step: number,
    fresh: boolean,
    c: { down: boolean; fall: number },
    at: THREE.Vector3,
  ): void
  /** How many flashes are alive. */
  live(): number
  /** Clear flashes and re-arm every edge (new fight). */
  reset(): void
  /** Clear every flash. */
  disposeAll(): void
}

export function createReducedReporter(host: {
  arenaGroup: THREE.Group
}): ReducedReporter {
  const layer = createReducedFlashLayer(host)
  const wasStartup: [boolean, boolean] = [false, false]
  const lastPose: [StreamPose, StreamPose] = ["none", "none"]
  const downAt: [number, number] = [-1, -1]
  const thudded: [boolean, boolean] = [false, false]
  return {
    startup(side, charging, fresh, at) {
      if (fresh && charging && !wasStartup[side]) layer.spawn(at, "tell")
      wasStartup[side] = charging
    },
    pose(side, pose, pinned, fresh, at) {
      if (
        fresh &&
        (pose === "roll" || pose === "press") &&
        pose !== lastPose[side]
      ) {
        const kind = flashForPose(pose, pinned)
        if (kind) layer.spawn(at, kind)
      }
      lastPose[side] = pose
    },
    pin(at) {
      layer.spawn(at, "pin")
    },
    hit(pose, pinned, at) {
      const kind = flashForPose(pose, pinned)
      if (kind) layer.spawn(at, kind)
    },
    ko(side, step, fresh, c, at) {
      if (downAt[side] < 0) downAt[side] = step
      if (fresh && !thudded[side]) {
        thudded[side] = true
        c.down = true
        c.fall = 1
        layer.spawn(at, "ko")
      } else {
        c.down = true
        if (c.fall < 1) c.fall = 1
      }
    },
    live() {
      return layer.live()
    },
    reset() {
      layer.reset()
      wasStartup[0] = false
      wasStartup[1] = false
      lastPose[0] = "none"
      lastPose[1] = "none"
      downAt[0] = -1
      downAt[1] = -1
      thudded[0] = false
      thudded[1] = false
    },
    disposeAll() {
      layer.disposeAll()
    },
  }
}
