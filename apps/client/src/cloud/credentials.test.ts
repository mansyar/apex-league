/**
 * Trainer credentials (FR-7, AC-7): the id and passphrase are the player's
 * cloud keys. They live in their own key — never in the save, which players
 * export and share — and a malformed entry reads as "signed out" rather than
 * as a crash on boot.
 */
import { describe, expect, test } from "bun:test"
import { createMemoryAdapter, SAVE_KEY } from "@apex/sim"
import {
  clearCredentials,
  readCredentials,
  TRAINER_KEY,
  writeCredentials,
} from "./credentials"

const credentials = { id: "trn_abc", name: "Ana", passphrase: "kestrel-42" }

describe("trainer credentials", () => {
  test("live beside the save, never inside it", () => {
    expect(TRAINER_KEY).not.toBe(SAVE_KEY)
  })

  test("round trip through storage", () => {
    const storage = createMemoryAdapter()
    expect(writeCredentials(storage, credentials)).toBe(true)
    expect(readCredentials(storage)).toEqual(credentials)
    expect(storage.getItem(TRAINER_KEY)).not.toBeNull()
  })

  test("an absent entry is signed out", () => {
    expect(readCredentials(createMemoryAdapter())).toBeNull()
  })

  test("a malformed entry is signed out, not a crash", () => {
    const storage = createMemoryAdapter()
    for (const raw of [
      "not json",
      "null",
      "[]",
      '{"id":""}',
      '{"id":"trn_abc"}',
      '{"id":"trn_abc","passphrase":7}',
    ]) {
      storage.setItem(TRAINER_KEY, raw)
      expect(readCredentials(storage)).toBeNull()
    }
  })

  test("a missing name reads as an empty one", () => {
    const storage = createMemoryAdapter()
    storage.setItem(
      TRAINER_KEY,
      JSON.stringify({ id: "trn_abc", passphrase: "kestrel-42" }),
    )
    expect(readCredentials(storage)?.name).toBe("")
  })

  test("a failed write reports false and keeps the old entry", () => {
    const storage = createMemoryAdapter()
    writeCredentials(storage, credentials)
    const full = {
      ...storage,
      setItem: () => {
        throw new Error("quota")
      },
    }
    expect(
      writeCredentials(full, { ...credentials, passphrase: "another-one" }),
    ).toBe(false)
    expect(readCredentials(storage)?.passphrase).toBe("kestrel-42")
  })

  test("clearing forgets the trainer", () => {
    const storage = createMemoryAdapter()
    writeCredentials(storage, credentials)
    clearCredentials(storage)
    expect(readCredentials(storage)).toBeNull()
  })
})
