import { describe, expect, test } from "bun:test"
import { errorCopy, type LiveStatus, statusCopy, verdictCopy } from "./state"

const STATUSES: LiveStatus[] = [
  "idle",
  "connecting",
  "waiting",
  "ready",
  "fighting",
  "verdict",
  "error",
  "closed",
]

describe("statusCopy", () => {
  test("names every state with a distinct, quiet sentence", () => {
    const lines = STATUSES.map(statusCopy)
    expect(new Set(lines).size).toBe(STATUSES.length)
    for (const line of lines) expect(line.endsWith("!")).toBe(false)
  })
})

describe("errorCopy", () => {
  test("maps typed codes to coach language", () => {
    expect(errorCopy("bad_passphrase")).toContain("passphrase")
    expect(errorCopy("room_full")).toContain("full")
  })

  test("an unknown code never echoes server text", () => {
    expect(errorCopy("weird_code_42")).toBe(
      "The channel could not complete that request.",
    )
  })
})

describe("verdictCopy", () => {
  test("a knockout reads from the local seat", () => {
    expect(
      verdictCopy({ code: "ABCD", reason: "ko", winnerSeat: 0 }, 0, ["A", "B"])
        .title,
    ).toBe("Victory")
    expect(
      verdictCopy({ code: "ABCD", reason: "ko", winnerSeat: 1 }, 0, ["A", "B"])
        .title,
    ).toBe("Defeat")
  })

  test("a forfeit keeps the winner explicit", () => {
    const win = verdictCopy(
      { code: "ABCD", reason: "forfeit", winnerSeat: 0 },
      0,
      ["A", "B"],
    )
    expect(win.title).toBe("Opponent forfeited")
    expect(win.sub).toContain("B")
    expect(
      verdictCopy({ code: "ABCD", reason: "forfeit", winnerSeat: 1 }, 0, [
        "A",
        "B",
      ]).title,
    ).toBe("You forfeited")
  })

  test("a draw and a double leave name both trainers fairly", () => {
    expect(
      verdictCopy({ code: "ABCD", reason: "double_ko", winnerSeat: null }, 0, [
        "A",
        "B",
      ]).title,
    ).toBe("Draw")
    expect(
      verdictCopy({ code: "ABCD", reason: "forfeit", winnerSeat: null }, 0, [
        "A",
        "B",
      ]).title,
    ).toBe("Bout cancelled")
  })
})
