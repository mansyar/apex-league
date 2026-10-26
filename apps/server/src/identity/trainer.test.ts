import { Database } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import { migrate } from "../migrate"
import { MAX_NAME_LENGTH, normalizeName } from "./name"
import {
  claimTrainer,
  createTrainer,
  findTrainer,
  renameTrainer,
  replacePassphrase,
} from "./trainer"

/**
 * The store is where the identity rules live, so these tests drive it directly
 * rather than through HTTP: a route can only be as safe as the functions it
 * calls, and a missing-row bug here would be invisible behind a 404 handler.
 */
function freshDatabase(): Database {
  const db = new Database(":memory:")
  migrate(db)
  return db
}

const PASSPHRASE = "correct horse battery"

describe("trainer store", () => {
  test("creates a trainer with no name and no passphrase", () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)

      expect(trainer.id).toMatch(/^trn_[0-9a-hjkmnp-tv-z]{20}$/)
      expect(trainer.name).toBe("")
      expect(trainer.hasPassphrase).toBe(false)
      expect(findTrainer(db, trainer.id)).toEqual(trainer)
    } finally {
      db.close()
    }
  })

  test("returns undefined for an id it never issued", () => {
    const db = freshDatabase()
    try {
      expect(findTrainer(db, "trn_00000000000000000000")).toBeUndefined()
    } finally {
      db.close()
    }
  })

  test("renames only an existing trainer", () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)

      expect(renameTrainer(db, trainer.id, "Ada")).toBe(true)
      expect(findTrainer(db, trainer.id)?.name).toBe("Ada")
      expect(renameTrainer(db, "trn_00000000000000000000", "Ada")).toBe(false)
    } finally {
      db.close()
    }
  })

  test("a set passphrase is stored as a hash and verifies", async () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)

      expect(await replacePassphrase(db, trainer.id, PASSPHRASE)).toBe(true)
      expect(await claimTrainer(db, trainer.id, PASSPHRASE)).toBe(true)
      expect(await claimTrainer(db, trainer.id, "correct horse batter")).toBe(
        false,
      )

      const row = db
        .query(
          "SELECT passphrase_hash, passphrase_salt FROM trainers WHERE id = ?",
        )
        .get(trainer.id) as { passphrase_hash: string; passphrase_salt: string }
      expect(row.passphrase_hash).not.toContain(PASSPHRASE)
      expect(row.passphrase_hash.startsWith("$argon2id$")).toBe(true)
      expect(row.passphrase_salt).not.toBe("")
      expect(findTrainer(db, trainer.id)?.hasPassphrase).toBe(true)
    } finally {
      db.close()
    }
  })

  test("claim fails for a trainer that never set a passphrase", async () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)

      // No hash exists, so nothing may ever verify - including the empty string.
      expect(await claimTrainer(db, trainer.id, "")).toBe(false)
      expect(await claimTrainer(db, trainer.id, PASSPHRASE)).toBe(false)
    } finally {
      db.close()
    }
  })

  test("claim fails for an unknown trainer without throwing", async () => {
    const db = freshDatabase()
    try {
      // The decoy hash runs here, so the answer is a plain false rather than an
      // exception: a throw would be the timing signal the endpoint must not give.
      expect(
        await claimTrainer(db, "trn_00000000000000000000", PASSPHRASE),
      ).toBe(false)
    } finally {
      db.close()
    }
  })

  test("both failure modes pay for a real hash comparison", async () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)
      await replacePassphrase(db, trainer.id, PASSPHRASE)
      // Warm the lazily built decoy hash so the measurement is one comparison,
      // not "one comparison plus the one-time decoy".
      await claimTrainer(db, "trn_00000000000000000000", PASSPHRASE)

      const unknownStart = performance.now()
      await claimTrainer(db, "trn_00000000000000000000", PASSPHRASE)
      const unknownElapsed = performance.now() - unknownStart

      const wrongStart = performance.now()
      await claimTrainer(db, trainer.id, "not the passphrase")
      const wrongElapsed = performance.now() - wrongStart

      // An early `return false` for a missing row would cost microseconds. Both
      // paths must instead cost an Argon2id verification, which is tens of
      // milliseconds; 10 ms is a floor no shortcut can reach and no loaded
      // machine can fail.
      expect(unknownElapsed).toBeGreaterThan(10)
      expect(wrongElapsed).toBeGreaterThan(10)
    } finally {
      db.close()
    }
  })

  test("replacing a passphrase invalidates the old one", async () => {
    const db = freshDatabase()
    try {
      const trainer = createTrainer(db)
      await replacePassphrase(db, trainer.id, PASSPHRASE)

      expect(
        await replacePassphrase(db, trainer.id, "another passphrase"),
      ).toBe(true)
      expect(await claimTrainer(db, trainer.id, PASSPHRASE)).toBe(false)
      expect(await claimTrainer(db, trainer.id, "another passphrase")).toBe(
        true,
      )
    } finally {
      db.close()
    }
  })
})

describe("display names", () => {
  test("trims surrounding whitespace but keeps the inside", () => {
    expect(normalizeName("  Ada Lovelace  ")).toBe("Ada Lovelace")
    expect(normalizeName("Ada")).toBe("Ada")
  })

  test("refuses blank, non-string and over-long names", () => {
    expect(normalizeName("")).toBeNull()
    expect(normalizeName("   ")).toBeNull()
    expect(normalizeName(null)).toBeNull()
    expect(normalizeName(42)).toBeNull()
    expect(normalizeName({ name: "Ada" })).toBeNull()
    expect(normalizeName("x".repeat(MAX_NAME_LENGTH))).toBe("x".repeat(64))
    expect(normalizeName("x".repeat(MAX_NAME_LENGTH + 1))).toBeNull()
  })

  test("does not strip characters out of a display label", () => {
    // The client renders the name as text, so markup is data here, not danger.
    // Sanitising it into emptiness would silently rename the player's trainer.
    expect(normalizeName("<b>Ada</b>")).toBe("<b>Ada</b>")
    expect(normalizeName("Ada 🐾")).toBe("Ada 🐾")
  })
})
