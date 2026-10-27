import { describe, expect, test } from "bun:test"
import type { SaveAdapter } from "@apex/sim"
import { GHOST_PENDING_KEY } from "./ghosts"
import { queueDepth } from "./queue-depth"

function rig(store: Record<string, string> = {}) {
  const storage: SaveAdapter = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
  return storage
}

describe("queueDepth", () => {
  test("idle client reports zero", () => {
    expect(queueDepth({ pending: () => 0 }, rig())).toBe(0)
  })

  test("a waiting save counts one", () => {
    expect(queueDepth({ pending: () => 1 }, rig())).toBe(1)
  })

  test("a parked ghost bundle counts one", () => {
    const storage = rig({ [GHOST_PENDING_KEY]: "{}" })
    expect(queueDepth({ pending: () => 0 }, storage)).toBe(1)
  })

  test("save plus ghost count two", () => {
    const storage = rig({ [GHOST_PENDING_KEY]: "{}" })
    expect(queueDepth({ pending: () => 1 }, storage)).toBe(2)
  })

  test("a refused storage read counts the queue only", () => {
    const storage = rig()
    storage.getItem = () => {
      throw new Error("denied")
    }
    expect(queueDepth({ pending: () => 1 }, storage)).toBe(1)
  })
})
