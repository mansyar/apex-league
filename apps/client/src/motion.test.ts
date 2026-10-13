import { afterEach, describe, expect, test } from "bun:test"
import { prefersReducedMotion, resolveMotionPref } from "./motion"

describe("prefersReducedMotion", () => {
  test("true when the injected matcher reports a reduce preference", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true)
  })

  test("false when the injected matcher reports no reduce preference", () => {
    expect(prefersReducedMotion({ matches: false })).toBe(false)
  })
})

/**
 * resolveMotionPref contract (behavior-preserving consolidation): the
 * in-app pref forces reduced when true; otherwise — explicit false or
 * unset — the hardened OS read decides ("saved-reduced OR OS-reduced",
 * the exact behavior every former call site re-implemented).
 */
describe("resolveMotionPref", () => {
  /** Install/remove a stub window exposing the two matchMedia queries. */
  const stubWindow = (reduce: boolean, noPreference: boolean): void => {
    ;(globalThis as Record<string, unknown>).window = {
      matchMedia: (query: string): { matches: boolean } => {
        if (query === "(prefers-reduced-motion: reduce)")
          return { matches: reduce }
        if (query === "(prefers-reduced-motion: no-preference)")
          return { matches: noPreference }
        return { matches: false }
      },
    }
  }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window
  })

  test("true pref forces reduced even when the OS is motion-ok", () => {
    stubWindow(false, true)
    expect(resolveMotionPref(true)).toBe(true)
  })

  test("true pref forces reduced even with no window at all", () => {
    expect(resolveMotionPref(true)).toBe(true)
  })

  test("false defers to the OS read (headless: no window, false)", () => {
    expect(resolveMotionPref(false)).toBe(false)
  })

  test("null defers to the OS read (headless: no window, false)", () => {
    expect(resolveMotionPref(null)).toBe(false)
  })

  test("false stays false under the embedded double-report pathology", () => {
    // BOTH queries match (seen in an embedded Chromium) — the hardened OS
    // read must NOT collapse into reduced, so an explicit false stays false.
    stubWindow(true, true)
    expect(resolveMotionPref(false)).toBe(false)
  })

  test("null defers to a clean OS reduce report", () => {
    stubWindow(true, false)
    expect(resolveMotionPref(null)).toBe(true)
  })

  test("false stays false when the OS is motion-ok", () => {
    stubWindow(false, true)
    expect(resolveMotionPref(false)).toBe(false)
  })

  test("undefined is treated like unset (defers to the OS read)", () => {
    stubWindow(true, false)
    expect(resolveMotionPref(undefined)).toBe(true)
  })

  test("undefined stays motion-ok when the OS is motion-ok", () => {
    stubWindow(false, true)
    expect(resolveMotionPref(undefined)).toBe(false)
  })
})
