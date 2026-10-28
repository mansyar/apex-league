import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { setLabPhoneWidth } from "./lab"

/**
 * P8.T4 regression pin: the phone-width toggle must drive the same
 * responsive path as a real narrow viewport. The scene's resize wiring
 * only runs on `window` resize events, so the toggle has to dispatch one
 * after flipping the constraining class — otherwise the arena camera
 * keeps its desktop framing inside the 390px shell.
 */

describe("movelab phone-width toggle", () => {
  const toggled: Array<{ token: string; force?: boolean }> = []
  const dispatched: string[] = []
  const realDocument = globalThis.document
  const realWindow = globalThis.window

  beforeEach(() => {
    toggled.length = 0
    dispatched.length = 0
    globalThis.document = {
      body: {
        classList: {
          toggle: (token: string, force?: boolean): void => {
            toggled.push({ token, force })
          },
        },
      },
    } as unknown as Document
    globalThis.window = {
      dispatchEvent: (event: Event): boolean => {
        dispatched.push(event.type)
        return true
      },
    } as unknown as Window & typeof globalThis
  })

  afterEach(() => {
    globalThis.document = realDocument
    globalThis.window = realWindow
  })

  it("toggles the constraining class and dispatches a resize", () => {
    setLabPhoneWidth(true)
    expect(toggled).toEqual([{ token: "app-in-movelab-phone", force: true }])
    expect(dispatched).toEqual(["resize"])
  })

  it("releases the class and re-fires the responsive path on untoggle", () => {
    setLabPhoneWidth(false)
    expect(toggled).toEqual([{ token: "app-in-movelab-phone", force: false }])
    expect(dispatched).toEqual(["resize"])
  })
})
