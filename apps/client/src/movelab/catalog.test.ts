import { describe, expect, it } from "bun:test"
import { ALL_SPECIES, getMove } from "@apex/sim"
import { MOVE_FX } from "../move-fx/moves"
import { LAB_ELEMENT_ORDER, labMoveGroups, labMoveIds } from "./catalog"

describe("movelab catalog", () => {
  it("covers the full 48-move catalog from species kits", () => {
    const ids = labMoveIds()
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(48)
    for (const id of ids) {
      expect(getMove(id)).toBeDefined()
    }
  })

  it("lists every shipped MOVE_FX row exactly once", () => {
    const ids = new Set(labMoveIds())
    for (const id of Object.keys(MOVE_FX)) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it("groups every move under its own element, in element order", () => {
    const groups = labMoveGroups()
    const expected = LAB_ELEMENT_ORDER.filter((el) =>
      labMoveIds().some((id) => getMove(id)?.element === el),
    )
    expect(groups.map((g) => g.element)).toEqual(expected)
    for (const group of groups) {
      expect(group.moves.length).toBeGreaterThan(0)
      for (const entry of group.moves) {
        expect(entry.element).toBe(group.element)
        expect(entry.displayName.length).toBeGreaterThan(0)
        expect(entry.bespoke).toBe(MOVE_FX[entry.id] !== undefined)
      }
    }
  })

  it("covers every species kit", () => {
    const ids = new Set(labMoveIds())
    for (const species of ALL_SPECIES) {
      for (const id of species.kit) {
        expect(ids.has(id)).toBe(true)
      }
    }
  })
})
