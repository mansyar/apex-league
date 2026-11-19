/**
 * The live cast must follow the dense stream's positional mapping (FR-6):
 * side 0 is always the host (`owned`) and side 1 the guest (`rival`), on both
 * clients. Only the visual seed may vary by seat. This pins the regression
 * where a joiner rendered the host's frame on its own fighter.
 */
import { describe, expect, test } from "bun:test"
import { castingFor } from "./invite"

const KEYS: readonly [string, string] = ["host-trainer", "guest-trainer"]

describe("castingFor", () => {
  for (const seat of [0, 1] as const) {
    test(`seat ${seat} maps owned to stream side 0 and rival to side 1`, () => {
      const cast = castingFor(seat, "APEX19", KEYS)
      expect(cast.owned.key).toBe(KEYS[0])
      expect(cast.owned.name).toBe(KEYS[0])
      expect(cast.rival.key).toBe(KEYS[1])
      expect(cast.rival.name).toBe(KEYS[1])
    })
  }
})
