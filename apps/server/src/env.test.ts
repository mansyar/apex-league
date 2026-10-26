import { describe, expect, test } from "bun:test"
import { DEFAULT_DATABASE_PATH, databasePath } from "./env"

describe("boot environment", () => {
  test("reads DATABASE_PATH when it is set", () => {
    expect(databasePath({ DATABASE_PATH: "/var/lib/apex/apex.sqlite" })).toBe(
      "/var/lib/apex/apex.sqlite",
    )
  })

  test("trims a padded value rather than opening a path with spaces in it", () => {
    expect(databasePath({ DATABASE_PATH: "  /data/apex.sqlite\n" })).toBe(
      "/data/apex.sqlite",
    )
  })

  test("falls back to a local development file when the variable is unset", () => {
    expect(databasePath({})).toBe(DEFAULT_DATABASE_PATH)
    // An empty value is a misconfiguration, not a request for the default:
    // treat it as unset rather than trying to open the working directory.
    expect(databasePath({ DATABASE_PATH: "   " })).toBe(DEFAULT_DATABASE_PATH)
  })
})
