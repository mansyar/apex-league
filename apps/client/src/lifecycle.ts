/**
 * Runtime lifecycle state machine (F5, F6).
 *
 * The client stops drawing for exactly two reasons — the tab went away, or the
 * graphics context stopped working — and they overlap. This module owns both
 * as one pure reducer so the pause/resume and failure/recovery rules are
 * testable without a DOM; the wiring (a visibilitychange listener, the
 * webglcontextlost/restored pair, the plate element) lives in the client.
 */

/** What the graphics context last reported. Anything but `"ok"` means the
 * failure plate is up and the loop stays parked — the health value doubles as
 * the plate's plain-language cause. */
export type GraphicsHealth = "ok" | "unavailable" | "lost" | "frame_error"

/** Which surface the player is looking at. */
export type Surface = "game" | "plate"

/** Whether the animation loop should be spinning. */
export type RenderLoop = "running" | "paused"

export interface RuntimeState {
  /** Hidden per the last visibility event. */
  hidden: boolean
  /** Context health; `"ok"` only while a usable context exists. */
  graphics: GraphicsHealth
  /**
   * A restore that arrived while the tab was hidden. The plate is held until
   * the player is actually looking, so a resume attempt (which may throw
   * again) never happens off-screen.
   */
  pendingRestore: boolean
  /** Derived from the three fields above. */
  renderLoop: RenderLoop
  /** Derived from the three fields above. */
  surface: Surface
}

export type RuntimeEvent =
  | { kind: "visibility"; status: "hidden" | "visible" }
  | {
      kind: "graphics"
      status: "unavailable" | "lost" | "restored" | "frame_error"
    }

/**
 * Boot state: visible, expecting a working context, drawing. A boot-time
 * failure reports `graphics/unavailable` immediately after this.
 */
export function initialRuntimeState(): RuntimeState {
  return view(false, "ok", false)
}

/**
 * Fold one lifecycle event into the runtime state. Idempotent — repeating an
 * event never changes the outcome — and total: every event resolves to a
 * state, so a caller can drive this straight from DOM listeners.
 */
export function runtimeState(
  prev: RuntimeState,
  event: RuntimeEvent,
): RuntimeState {
  let hidden = prev.hidden
  let graphics = prev.graphics
  let pendingRestore = prev.pendingRestore

  if (event.kind === "visibility") {
    hidden = event.status === "hidden"
    if (!hidden && pendingRestore) {
      graphics = "ok"
      pendingRestore = false
    }
  } else if (event.status === "restored") {
    if (hidden) pendingRestore = true
    else graphics = "ok"
  } else {
    // unavailable | lost | frame_error — a fresh failure supersedes any
    // restore that was waiting for the tab to come back.
    graphics = event.status
    pendingRestore = false
  }

  return view(hidden, graphics, pendingRestore)
}

/** Derive the two consumer-facing fields from the tracked inputs. */
function view(
  hidden: boolean,
  graphics: GraphicsHealth,
  pendingRestore: boolean,
): RuntimeState {
  const healthy = graphics === "ok" && !pendingRestore
  return {
    hidden,
    graphics,
    pendingRestore,
    renderLoop: healthy && !hidden ? "running" : "paused",
    surface: healthy ? "game" : "plate",
  }
}
