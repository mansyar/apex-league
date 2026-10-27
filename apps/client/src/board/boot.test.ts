/**
 * The boards boot line: a local-only build (no cloud) gets no board at all —
 * the score boards stand or fall together with the ghosts.
 */
import { describe, expect, test } from "bun:test"
import type { SaveAdapter } from "@apex/sim"
import { bootBoardsPanel } from "./boot"

describe("bootBoardsPanel", () => {
  test("a local-only build gets no board", () => {
    expect(
      bootBoardsPanel({
        cloud: null,
        storage: {} as unknown as SaveAdapter,
        now: () => 0,
        onFight: () => true,
      }),
    ).toBeNull()
  })
})
