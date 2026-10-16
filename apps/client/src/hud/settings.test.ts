import { describe, expect, test } from "bun:test"
import type { GameState } from "@apex/sim"
import { prefChipView } from "./settings"

const settings = (
  reducedMotion: boolean,
  arenaCamera: GameState["settings"]["arenaCamera"],
) => ({ reducedMotion, arenaCamera })

describe("prefChipView", () => {
  test("golden: full motion + cinematic camera (a fresh ranch)", () => {
    expect(prefChipView(settings(false, "cinematic"))).toEqual({
      motionLabel: "Motion: full",
      motionPressed: false,
      cameraLabel: "Camera: cinematic",
      cameraPressed: true,
    })
  })

  test("golden: reduced motion + broadcast camera", () => {
    expect(prefChipView(settings(true, "broadcast"))).toEqual({
      motionLabel: "Motion: reduced",
      motionPressed: true,
      cameraLabel: "Camera: broadcast",
      cameraPressed: false,
    })
  })

  test("golden: the toggles are independent", () => {
    expect(prefChipView(settings(true, "cinematic"))).toEqual({
      motionLabel: "Motion: reduced",
      motionPressed: true,
      cameraLabel: "Camera: cinematic",
      cameraPressed: true,
    })
  })
})
