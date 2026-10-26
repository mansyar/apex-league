import { describe, expect, test } from "bun:test"
import {
  decoyHash,
  hashPassphrase,
  isPassphrase,
  MAX_PASSPHRASE_LENGTH,
  MIN_PASSPHRASE_LENGTH,
  PASSPHRASE_SCHEME,
  verifyPassphrase,
} from "./passphrase"

const PASSPHRASE = "correct horse battery"

describe("passphrase hashing", () => {
  test("stores an argon2id hash, never the passphrase itself", async () => {
    const hash = await hashPassphrase(PASSPHRASE)

    expect(hash).not.toBe(PASSPHRASE)
    expect(hash).not.toContain(PASSPHRASE)
    expect(hash.startsWith(`$${PASSPHRASE_SCHEME}$`)).toBe(true)
    // Bun.password embeds its own salt, so two hashes of one passphrase differ.
    expect(await hashPassphrase(PASSPHRASE)).not.toBe(hash)
  })

  test("verifies the right passphrase and rejects every wrong one", async () => {
    const hash = await hashPassphrase(PASSPHRASE)

    expect(await verifyPassphrase(PASSPHRASE, hash)).toBe(true)
    expect(await verifyPassphrase("correct horse batter", hash)).toBe(false)
    expect(await verifyPassphrase("", hash)).toBe(false)
    expect(await verifyPassphrase(`${PASSPHRASE} `, hash)).toBe(false)
  })

  test("a corrupt or empty stored hash reads as wrong rather than throwing", async () => {
    // A truncated row must not become a 500, because a 500 is distinguishable
    // from the uniform 401 the claim endpoint promises.
    expect(await verifyPassphrase(PASSPHRASE, "")).toBe(false)
    expect(await verifyPassphrase(PASSPHRASE, "not-a-hash")).toBe(false)
    expect(
      await verifyPassphrase(PASSPHRASE, "$argon2id$v=19$m=1,t=1,p=1$"),
    ).toBe(false)
  })

  test("the decoy hash never verifies anything, and is built once", async () => {
    const first = await decoyHash()
    const second = await decoyHash()

    expect(second).toBe(first)
    expect(first.startsWith(`$${PASSPHRASE_SCHEME}$`)).toBe(true)
    expect(await verifyPassphrase(PASSPHRASE, first)).toBe(false)
  })
})

describe("passphrase rules", () => {
  test("requires a minimum length and refuses non-strings", () => {
    expect(isPassphrase("x".repeat(MIN_PASSPHRASE_LENGTH))).toBe(true)
    expect(isPassphrase("x".repeat(MIN_PASSPHRASE_LENGTH - 1))).toBe(false)
    expect(isPassphrase("")).toBe(false)
    expect(isPassphrase(null)).toBe(false)
    expect(isPassphrase(12_345_678)).toBe(false)
    expect(isPassphrase({ passphrase: "x".repeat(20) })).toBe(false)
  })

  test("caps the length so a huge body cannot become hashing work", () => {
    expect(isPassphrase("x".repeat(MAX_PASSPHRASE_LENGTH))).toBe(true)
    expect(isPassphrase("x".repeat(MAX_PASSPHRASE_LENGTH + 1))).toBe(false)
  })
})
