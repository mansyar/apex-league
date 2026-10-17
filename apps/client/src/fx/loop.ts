/**
 * The effect timing core: the consolidated effect loop and the hit-stop
 * clock shared by every visual subsystem of the fight. Both are
 * deterministic and test-covered with a fake clock (`staging-fx.test.ts`
 * pins this surface — the golden parity for Phase 4 of the UI-layer
 * refactor).
 */

/** Big-hit threshold: at/above this the punch lands as hit-stop + shake. */
export const BIG_HIT_DAMAGE = 4

/** How long the frame freezes on a big hit, in ms (micro hit-stop). */
export const HIT_STOP_MS = 90

/**
 * The micro hit-stop clock: on a big hit the whole frame (every effect
 * AND the fight's action time) holds still for a beat. The window itself
 * drains on wall time, so `active` is a pure time comparison.
 */
export class HitStop {
  private until = 0

  constructor(private readonly now: () => number = () => performance.now()) {}

  /**
   * Open the freeze window when `damage` reaches the threshold. Returns
   * whether it fired; `onBigHit` (the broadcast camera punch) is called
   * with a strength scaled by the damage and capped at 0.09.
   */
  trigger(
    damage: number | undefined,
    onBigHit?: (strength: number) => void,
  ): boolean {
    const d = damage ?? 0
    if (d < BIG_HIT_DAMAGE) return false
    this.until = this.now() + HIT_STOP_MS
    onBigHit?.(Math.min(0.09, 0.02 + d / 80))
    return true
  }

  /** True while the freeze window is open (the frame holds). */
  active(): boolean {
    return this.now() < this.until
  }

  /** Close any open window (clear, panel close). */
  reset(): void {
    this.until = 0
  }
}

/**
 * One loop for every effect subsystem: a single RAF drives each
 * registered step with the frame delta (frozen to 0 during a hit-stop),
 * and the loop stops itself the moment all steps report idle.
 *
 * A step returns `true` while it has live work and `false` when it is
 * done (the loop unregisters it). Adding the first step starts the loop;
 * late joiners share the running loop's clock, so a shot fired mid-volley
 * gets a normal frame delta instead of a stale re-anchor.
 */
export class EffectLoop {
  private steps = new Set<(dtMs: number) => boolean>()
  private raf: number | null = null
  private last = 0
  /** Suspended for a hidden tab: steps stay registered, no frame is pending. */
  private paused = false
  /**
   * Snapshot buffer for the frame walk. Reused every frame - the quality
   * gate forbids per-frame allocations - because a step that spawns
   * another effect must not be visited in the same frame.
   */
  private readonly snapshot: Array<(dtMs: number) => boolean> = []

  constructor(
    /** True while a hit-stop is holding the frame (dt becomes 0). */
    private readonly isFrozen: () => boolean = () => false,
    private readonly now: () => number = () => performance.now(),
    // Wrapped, never passed by reference: `requestAnimationFrame` throws
    // "Illegal invocation" when invoked with a foreign receiver.
    private readonly schedule: (cb: (t: number) => void) => number = (cb) =>
      requestAnimationFrame(cb),
    private readonly cancel: (id: number) => void = (id) =>
      cancelAnimationFrame(id),
  ) {}

  /** Register a step; starts the loop if it is not running. */
  add(step: (dtMs: number) => boolean): void {
    this.steps.add(step)
    if (this.raf === null && !this.paused) {
      this.last = this.now()
      this.raf = this.schedule(this.tick)
    }
  }

  /**
   * Cancel the pending frame and drop every registered step (panel close
   * / scene swap). Clearing matters: a step left behind would run again
   * the next time something restarts the loop.
   */
  stop(): void {
    if (this.raf !== null) this.cancel(this.raf)
    this.raf = null
    this.last = 0
    this.paused = false
    this.steps.clear()
  }

  /**
   * Suspend for a hidden tab (F5). The pending frame is cancelled but the
   * steps stay registered, so an in-flight effect is held mid-play rather
   * than finished off-screen or lost.
   */
  pause(): void {
    if (this.paused) return
    this.paused = true
    if (this.raf !== null) this.cancel(this.raf)
    this.raf = null
  }

  /**
   * Resume after `pause`. The clock is re-anchored here, so the first frame
   * back is one normal delta instead of the whole hidden span — the jump
   * that would otherwise snap an effect to its end state.
   */
  resume(): void {
    if (!this.paused) return
    this.paused = false
    if (this.steps.size === 0) return
    this.last = this.now()
    this.raf = this.schedule(this.tick)
  }

  private readonly tick = (): void => {
    const now = this.now()
    // Hit-stop holds every effect: dt collapses to 0, but `last` still
    // advances so the unfreeze frame is one normal delta, not the whole
    // frozen span.
    const dt = this.isFrozen() ? 0 : Math.min(100, now - this.last || 16.7)
    this.last = now
    const snapshot = this.snapshot
    snapshot.length = 0
    for (const step of this.steps) snapshot.push(step)
    for (const step of snapshot) {
      if (!step(dt)) this.steps.delete(step)
    }
    this.raf = this.steps.size > 0 ? this.schedule(this.tick) : null
  }
}
