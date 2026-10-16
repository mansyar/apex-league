async (page) => {
  // Phase 2 probe B (F3): two-finger pinch, and the pinch -> drag handoff.
  const out = {}
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2000)

  const box = await page.locator("#app canvas").boundingBox()
  const cx = box.x + box.width * 0.6
  const cy = box.y + box.height * 0.7
  out.origin = [cx, cy]
  out.onCanvas = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)
    return el ? `${el.tagName.toLowerCase()}.${el.className}` : "none"
  }, [cx, cy])

  const cdp = await page.context().newCDPSession(page)
  const finger = (id, x, y) => [{ x, y, id, radiusX: 8, radiusY: 8, force: 1 }]
  const two = (half) => [
    { x: cx - half, y: cy, id: 1, radiusX: 8, radiusY: 8, force: 1 },
    { x: cx + half, y: cy, id: 2, radiusX: 8, radiusY: 8, force: 1 },
  ]

  // Two-finger, moving apart: expect closer to the creature, same angles.
  const pinch = async (fromHalf, toHalf, steps) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: two(fromHalf),
    })
    for (let i = 1; i <= steps; i++) {
      const half = fromHalf + ((toHalf - fromHalf) * i) / steps
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: two(half),
      })
      await page.waitForTimeout(16)
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await page.waitForTimeout(500)
  }

  await page.screenshot({ path: ".playwright-cli/pinch-before.png" })
  await pinch(40, 140, 10)
  await page.screenshot({ path: ".playwright-cli/pinch-spread.png" })
  await pinch(140, 40, 10)
  await page.screenshot({ path: ".playwright-cli/pinch-back.png" })

  // Synthetic pointer events for the handoff: the handler logic is what is
  // under test here, and CDP cannot lift one finger of two.
  out.degrade = await page.evaluate(
    ([x, y]) => {
      const canvas = document.querySelector("#app canvas")
      const ev = (type, id, px, py) =>
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          isPrimary: id === 1,
          clientX: px,
          clientY: py,
          bubbles: true,
        })
      const log = []
      canvas.dispatchEvent(ev("pointerdown", 1, x - 60, y))
      canvas.dispatchEvent(ev("pointerdown", 2, x + 60, y))
      // Spread out and back: radius net-unchanged, so the only variable left
      // in the next screenshot is the drag handoff itself.
      for (let i = 1; i <= 4; i++) {
        const half = 60 + i * 10
        window.dispatchEvent(ev("pointermove", 1, x - half, y))
        window.dispatchEvent(ev("pointermove", 2, x + half, y))
      }
      for (let i = 4; i >= 0; i--) {
        const half = 60 + i * 10
        window.dispatchEvent(ev("pointermove", 1, x - half, y))
        window.dispatchEvent(ev("pointermove", 2, x + half, y))
      }
      window.dispatchEvent(ev("pointerup", 2, x + 60, y))
      log.push("lifted pointer 2")
      // The first move after the lift is 2px: a stale origin would show up
      // as a rotation of the whole finger separation (~120px).
      window.dispatchEvent(ev("pointermove", 1, x - 60 - 2, y))
      log.push("tiny move on pointer 1")
      return log
    },
    [cx, cy],
  )
  await page.waitForTimeout(600)
  await page.screenshot({ path: ".playwright-cli/pinch-degrade-tiny.png" })

  // ...and a real drag now continues from the same pose.
  await page.evaluate(
    ([x, y]) => {
      const ev = (type, id, px, py) =>
        new PointerEvent(type, {
          pointerId: id,
          pointerType: "touch",
          isPrimary: id === 1,
          clientX: px,
          clientY: py,
          bubbles: true,
        })
      for (let i = 1; i <= 10; i++) {
        window.dispatchEvent(ev("pointermove", 1, x - 62 - i * 20, y))
      }
      window.dispatchEvent(ev("pointerup", 1, x - 262, y))
    },
    [cx, cy],
  )
  await page.waitForTimeout(600)
  await page.screenshot({ path: ".playwright-cli/pinch-degrade-drag.png" })

  out.scrollY = await page.evaluate(() => window.scrollY)
  out.consoleErrors = (await page.evaluate(() => window.__errs || null)) ?? "not tracked"
  return out
}
