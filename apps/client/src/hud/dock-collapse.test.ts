import { describe, expect, test } from "bun:test"
import {
  createDockCollapseSession,
  dockCollapsedByDefault,
  viewportWidthClass,
} from "./dock-collapse"

describe("the viewport width class", () => {
  test("reads the kit's two breakpoints", () => {
    expect(viewportWidthClass(393)).toBe("phone")
    expect(viewportWidthClass(767.98)).toBe("phone")
    expect(viewportWidthClass(768)).toBe("tablet")
    expect(viewportWidthClass(1023.98)).toBe("tablet")
    expect(viewportWidthClass(1024)).toBe("desktop")
    expect(viewportWidthClass(1440)).toBe("desktop")
  })
})

describe("the dock's collapsed-by-default decision", () => {
  test("collapses on phone widths, stays open on tablet and desktop", () => {
    expect(dockCollapsedByDefault("phone")).toBe(true)
    expect(dockCollapsedByDefault("tablet")).toBe(false)
    expect(dockCollapsedByDefault("desktop")).toBe(false)
  })
})

describe("the dock's session collapse state", () => {
  test("starts collapsed on phone widths and open on tablet and desktop", () => {
    expect(createDockCollapseSession(393).dockOpen()).toBe(false)
    expect(createDockCollapseSession(800).dockOpen()).toBe(true)
    expect(createDockCollapseSession(1440).dockOpen()).toBe(true)
  })

  test("an explicit toggle holds for the session, across width changes", () => {
    const session = createDockCollapseSession(393)
    expect(session.toggle()).toBe(true)
    session.onViewportChange(1440)
    expect(session.dockOpen()).toBe(true)
    session.onViewportChange(393)
    expect(session.dockOpen()).toBe(true)
  })

  test("before a toggle, width changes re-derive the width-class default", () => {
    const session = createDockCollapseSession(1440)
    session.onViewportChange(393)
    expect(session.dockOpen()).toBe(false)
    session.onViewportChange(1440)
    expect(session.dockOpen()).toBe(true)
  })

  test("a toggled-off choice keeps the dock closed at every width", () => {
    const session = createDockCollapseSession(1440)
    expect(session.toggle()).toBe(false)
    session.onViewportChange(393)
    expect(session.dockOpen()).toBe(false)
  })

  test("a fresh session forgets the last session's toggle", () => {
    const held = createDockCollapseSession(393)
    held.toggle()
    expect(createDockCollapseSession(393).dockOpen()).toBe(false)
  })
})
