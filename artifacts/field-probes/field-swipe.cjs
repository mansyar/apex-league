async (page) => {
  // Phase 2 field probe, phone tier. NOTE: .starter-overlay / .starter-card are
  // reused by the (hidden) graduation overlay, so every locator here is
  // :visible-qualified — otherwise it matches a display:none card.
  const out = { steps: [] }

  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.waitForTimeout(2500)
  out.visibleDraftCards = await page.locator(".starter-card:visible").count()

  // Pick a starter so the ranch has a creature and the draft overlay clears.
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2000)
  out.draftCleared = (await page.locator(".starter-card:visible").count()) === 0

  const box = await page.locator("#app canvas").boundingBox()
  const what = ([x, y]) =>
    page.evaluate(([px, py]) => {
      const el = document.elementFromPoint(px, py)
      return el ? `${el.tagName.toLowerCase()}.${el.className || ""}` : "none"
    }, [x, y])

  // Swipe across the lower third of the canvas: the HUD sits at the top.
  const sy = box.y + box.height * 0.78
  const sx = box.x + box.width * 0.8
  out.swipeAt = [sx, sy]
  out.swipeTarget = await what([sx, sy])

  await page.screenshot({ path: ".playwright-cli/ranch-before.png" })

  const cdp = await page.context().newCDPSession(page)
  const point = (x, y) => [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 }]
  const scrollDuring = []

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: point(sx, sy),
  })
  for (let i = 1; i <= 12; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(sx - i * 22, sy),
    })
    scrollDuring.push(await page.evaluate(() => window.scrollY))
    await page.waitForTimeout(16)
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await page.waitForTimeout(600)
  await page.screenshot({ path: ".playwright-cli/ranch-after-swipe.png" })
  out.scrollDuringSwipe = [...new Set(scrollDuring)]

  // Control: the same drag started on a HUD plate must leave the camera alone.
  const plate = page.locator("#app > *:not(canvas)").first()
  const pbox = await plate.boundingBox()
  const hx = pbox.x + pbox.width / 2
  const hy = pbox.y + Math.min(pbox.height / 2, 40)
  out.hudDragTarget = await what([hx, hy])
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: point(hx, hy),
  })
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: point(hx - i * 20, hy),
    })
    await page.waitForTimeout(16)
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await page.waitForTimeout(600)
  await page.screenshot({ path: ".playwright-cli/ranch-after-hud-drag.png" })

  out.touchAction = await page.evaluate(
    () => getComputedStyle(document.querySelector("#app canvas")).touchAction,
  )
  out.scrollAtEnd = await page.evaluate(() => window.scrollY)
  return out
}
