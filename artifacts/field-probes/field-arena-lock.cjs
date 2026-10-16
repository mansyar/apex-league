async (page) => {
  // Phase 2 probe E (F4, AC4) — tests the contract the handlers actually
  // implement, which is DOM-observable rather than pixel-inferred:
  //
  //   accepted gesture (ranch)  -> preventDefault(), camera orbits
  //   refused gesture  (arena)  -> early return, NOT swallowed, camera parked
  //
  // `defaultPrevented` is set synchronously by dispatchEvent, so it reports
  // exactly which branch the real handler in the page took. Motion is
  // evidenced separately: a claimed drag has to defer the native scroll
  // (window.scrollY stays 0 while the page is taller than the viewport).
  const out = {}
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)

  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(3000)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }

  const size = page.viewportSize()
  out.viewport = [size.width, size.height]
  out.pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
  out.overlap = await page.evaluate(() => {
    const spar = document.querySelector(".spar-button")
    const bug = document.querySelector(".score-bug")
    if (!spar || !bug) return "missing"
    const s = spar.getBoundingClientRect()
    const b = bug.getBoundingClientRect()
    const top = document.elementFromPoint(s.left + s.width / 2, s.top + s.height / 2)
    return {
      spar: [Math.round(s.x), Math.round(s.y), Math.round(s.width), Math.round(s.height)],
      bug: [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)],
      boxesOverlap: s.left < b.right && s.right > b.left && s.top < b.bottom && s.bottom > b.top,
      topAtSparCenter: top ? `${top.tagName.toLowerCase()}.${top.className}` : "none",
      sparReachable: top === spar || spar.contains(top),
    }
  })

  // One full drag + wheel through the real DOM, reporting which branch ran.
  const gesture = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("#app canvas")
      const r = canvas.getBoundingClientRect()
      const cx = r.left + r.width * 0.6
      const cy = r.top + r.height * 0.7
      const send = (type, target, x, y) => {
        const e = new PointerEvent(type, {
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
        })
        target.dispatchEvent(e)
        return e
      }
      send("pointerdown", canvas, cx, cy)
      const move = send("pointermove", window, cx + 150, cy)
      const wheel = new WheelEvent("wheel", {
        deltaY: 120,
        clientX: cx,
        clientY: cy,
        bubbles: true,
        cancelable: true,
      })
      canvas.dispatchEvent(wheel)
      send("pointerup", window, cx + 150, cy)
      return {
        movePrevented: move.defaultPrevented,
        wheelPrevented: wheel.defaultPrevented,
      }
    })

  // Also: a lone pointerdown, so the next move can be asked whether it armed.
  const armOnly = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("#app canvas")
      const r = canvas.getBoundingClientRect()
      const cx = r.left + r.width * 0.6
      const cy = r.top + r.height * 0.7
      canvas.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 1,
          pointerType: "touch",
          isPrimary: true,
          clientX: cx,
          clientY: cy,
          bubbles: true,
          cancelable: true,
        }),
      )
      return true
    })
  const moveOnly = () =>
    page.evaluate(() => {
      const r = document.querySelector("#app canvas").getBoundingClientRect()
      const e = new PointerEvent("pointermove", {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: r.left + r.width * 0.6 + 150,
        clientY: r.top + r.height * 0.7,
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(e)
      return e.defaultPrevented
    })

  // ---- 1. Ranch: the gesture is claimed.
  out.ranchGesture = await gesture()
  out.ranchScrollY = await page.evaluate(() => window.scrollY)
  await page.screenshot({ path: ".playwright-cli/f4-ranch-after-drag.png" })

  // ---- 2. Arena, broadcast, post-fight: the gesture must be refused.
  await page.locator(".camera-chip").click().catch(() => dom(".camera-chip"))
  await page.waitForTimeout(400)
  out.cameraChip = await page.evaluate(
    () => (document.querySelector(".camera-chip")?.textContent || "").trim(),
  )
  await dom(".spar-button")
  await page.waitForTimeout(1200)
  await dom(".spar-tactic")
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => document.querySelector("#app").classList.contains("app-in-arena"))) break
    await page.waitForTimeout(200)
  }
  await dom(".spar-fast")
  for (let i = 0; i < 120; i++) {
    const done = await page.evaluate(() => {
      const el = document.querySelector(".spar-close")
      return !!el && el.offsetParent !== null
    })
    if (done) break
    await page.waitForTimeout(500)
  }
  out.inArena = await page.evaluate(() =>
    document.querySelector("#app").classList.contains("app-in-arena"),
  )
  await page.waitForTimeout(2500)
  await page.screenshot({ path: ".playwright-cli/f4-arena-postfight.png" })

  out.arenaGesture = await gesture()
  out.arenaScrollY = await page.evaluate(() => window.scrollY)

  // ---- 3. An armed drag must not survive an arena -> ranch mode switch.
  await armOnly()
  await dom(".spar-close")
  await page.waitForTimeout(6000)
  out.leftArena = !(await page.evaluate(() =>
    document.querySelector("#app").classList.contains("app-in-arena"),
  ))
  out.moveAfterSwitchPrevented = await moveOnly()

  // ---- 4. Control: the ranch claims gestures again after the switch.
  out.ranchAfterReturn = await gesture()
  await page.screenshot({ path: ".playwright-cli/f4-ranch-after-return.png" })

  // ---- 5. Sensitivity control: cinematic camera drives itself.
  await dom(".camera-chip")
  await page.waitForTimeout(400)
  out.cinematicChip = await page.evaluate(
    () => (document.querySelector(".camera-chip")?.textContent || "").trim(),
  )
  await dom(".spar-button")
  await page.waitForTimeout(1200)
  await dom(".spar-tactic")
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => document.querySelector("#app").classList.contains("app-in-arena"))) break
    await page.waitForTimeout(200)
  }
  await page.waitForTimeout(2000)
  out.cinematicGesture = await gesture()
  await page.screenshot({ path: ".playwright-cli/f4-arena-cinematic.png" })
  await dom(".spar-close")
  await page.waitForTimeout(1000)
  return out
}
