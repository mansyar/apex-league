/**
 * The cloud surface's copy, pinned (FR-8, FR-11, AC-8).
 *
 * The spec asks for two plain statements before a passphrase is set — no
 * reset, and the trainer id is the credential — and for sync trouble to be
 * reported quietly. These tests hold the copy to that, including the coach
 * voice's two-sentence limit.
 */
import { describe, expect, test } from "bun:test"
import { cloudStatusLine, PASSPHRASE_NOTICE, signInFailureLine } from "./copy"
import type { CloudStatus } from "./sync"

/** Sentences, counted the way a reader counts them. */
function sentences(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length
}

const STATUSES: CloudStatus[] = [
  { kind: "signed-out" },
  { kind: "syncing" },
  { kind: "synced", at: 1 },
  { kind: "pending" },
  { kind: "ahead" },
  { kind: "offline" },
  { kind: "locked" },
  { kind: "unreadable" },
]

describe("cloud copy", () => {
  test("the passphrase notice says there is no reset, before any is set", () => {
    expect(PASSPHRASE_NOTICE.toLowerCase()).toContain("no reset")
    expect(PASSPHRASE_NOTICE.toLowerCase()).toContain(
      "trainer id is the credential",
    )
  })

  test("the passphrase notice names the recovery path", () => {
    const text = PASSPHRASE_NOTICE.toLowerCase()
    expect(text).toContain("local save")
    expect(text).toContain("export")
  })

  test("the passphrase notice stays within two sentences", () => {
    expect(sentences(PASSPHRASE_NOTICE)).toBeLessThanOrEqual(2)
  })

  test("an unreachable cloud reports the cloud copy behind, quietly", () => {
    const line = cloudStatusLine({ kind: "offline" })
    expect(line.toLowerCase()).toContain("cloud copy is behind")
    // Information, not an alarm: no exclamation, no shouting.
    expect(line).not.toContain("!")
    expect(line).toBe(line.replace(/ERROR|FAILED/g, ""))
  })

  test("every status has a line, and none of them is an alarm", () => {
    for (const status of STATUSES) {
      const line = cloudStatusLine(status)
      expect(line.length).toBeGreaterThan(0)
      expect(sentences(line)).toBeLessThanOrEqual(2)
      expect(line).not.toContain("!")
    }
  })

  test("a signed-out build promises nothing about the cloud", () => {
    expect(cloudStatusLine({ kind: "signed-out" })).toContain("this device")
  })

  test("sign-in failures are explainable and short", () => {
    for (const reason of [
      "wrong-passphrase",
      "unknown-trainer",
      "no-passphrase",
      "offline",
      "invalid",
      "rejected",
    ]) {
      const line = signInFailureLine(reason)
      expect(line.length).toBeGreaterThan(0)
      expect(sentences(line)).toBeLessThanOrEqual(2)
    }
  })
})
