/**
 * The build-time origin (FR-11, AC-11, NFR-6): an unset origin is a build
 * that never learned the address, so it must resolve to `null` — not to an
 * empty base URL that every request would then fail against.
 */
import { describe, expect, test } from "bun:test"
import { SAVE_VERSION } from "@apex/sim"
import {
  CLOUD_TIMEOUT_MS,
  cloudOrigin,
  PUSH_CAP_MS,
  PUSH_DEBOUNCE_MS,
} from "./config"

describe("cloud origin", () => {
  test("unset means no cloud at all", () => {
    expect(cloudOrigin(undefined)).toBeNull()
    expect(cloudOrigin("")).toBeNull()
    expect(cloudOrigin("   ")).toBeNull()
  })

  test("keeps a configured origin and trims the trailing slash", () => {
    expect(cloudOrigin("https://api.example.test")).toBe(
      "https://api.example.test",
    )
    expect(cloudOrigin(" https://api.example.test/// ")).toBe(
      "https://api.example.test",
    )
  })

  test("a request that has not answered in five seconds has failed", () => {
    expect(CLOUD_TIMEOUT_MS).toBe(5000)
  })

  test("the quiet period is shorter than the cap", () => {
    expect(PUSH_DEBOUNCE_MS).toBeGreaterThan(0)
    expect(PUSH_CAP_MS).toBeGreaterThan(PUSH_DEBOUNCE_MS)
  })

  test("the cloud never changes the save schema (NFR-1)", () => {
    expect(SAVE_VERSION).toBe(25)
  })
})
