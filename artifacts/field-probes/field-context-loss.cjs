async (page) => {
  // Phase 3 probe C (F7, runtime half): a lost context shows the plate, a
  // restore takes it down, a restore that lands while hidden stays held until
  // the player looks, and a context that throws on the resumed frame reports
  // frame_error. Uses the WEBGL_lose_context extension — the real DOM event
  // path the app listens to.
  const out = { errors: [] }
  page.on("pageerror", (e) => out.errors.push("pageerror: " + String(e?.message ?? e)))
  page.on("console", (m) => {
    if (m.type() === "error") out.errors.push("console: " + m.text())
  })
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)
  const plate = () =>
    page.evaluate(() => {
      const p = document.querySelector(".failure-plate")
      return p
        ? {
            cause: p.querySelector(".failure-cause")?.textContent ?? null,
            button: !!p.querySelector("button"),
          }
        : null
    })
  const crop = async (name) => {
    const r = await page.evaluate(() => {
      const b = document.querySelector("#app canvas").getBoundingClientRect()
      return { x: b.x, y: b.y + b.height * 0.4, width: b.width, height: b.height * 0.3 }
    })
    return page.screenshot({ path: `.playwright-cli/${name}.png`, clip: r })
  }
  const frozen = async () => {
    const a = await crop("f7-ctx-a")
    await page.waitForTimeout(1200)
    const b = await crop("f7-ctx-b")
    return a.equals(b)
  }
  const emu = (hidden) =>
    page.evaluate((h) => {
      if (h)
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        })
      else delete document.hidden
      document.dispatchEvent(new Event("visibilitychange"))
      return document.hidden
    }, hidden)
  const stowLose = () =>
    page.evaluate(() => {
      const gl = document.querySelector("#app canvas").getContext("webgl2")
      window.__lose = gl ? gl.getExtension("WEBGL_lose_context") : null
      return !!window.__lose
    })
  const loseCtx = (lose) =>
    page.evaluate((l) => {
      // `getContext` returns null on a lost context, so the extension handle
      // is stowed at boot and reused for both directions.
      if (!window.__lose) return "no-extension"
      if (l) window.__lose.loseContext()
      else window.__lose.restoreContext()
      return "ok"
    }, lose)

  await page.goto("http://localhost:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2000)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  await crop("f7-ranch-before.png")

  // Stow the WEBGL_lose_context handle while the context is healthy.
  out.stowed = await stowLose()

  // ---- Lose the context.
  out.lose = await loseCtx(true)
  await page.waitForTimeout(1000)
  out.plateOnLost = await plate()
  out.canvasFrozeOnLost = await frozen()
  await page.screenshot({ path: ".playwright-cli/f7-ctx-lost.png" })

  // ---- Restore: the plate comes down and the ranch is live again.
  out.restore = await loseCtx(false)
  await page.waitForTimeout(2000)
  out.plateAfterRestore = await plate()
  out.canvasLiveAfterRestore = !(await frozen())
  await page.screenshot({ path: ".playwright-cli/f7-ctx-restored.png" })

  // ---- A restore that lands while the tab is hidden stays held until the
  //      player actually looks (pendingRestore in the reducer).
  out.hidden = await emu(true)
  out.lose2 = await loseCtx(true)
  await page.waitForTimeout(800)
  out.plateWhileHidden = await plate()
  out.restore2 = await loseCtx(false)
  await page.waitForTimeout(800)
  out.plateWhileStillHidden = await plate()
  out.unhidden = await emu(false)
  await page.waitForTimeout(1500)
  out.plateAfterLook = await plate()
  out.canvasLiveAfterLook = !(await frozen())

  // ---- A resumed context that throws on render reports frame_error.
  await page.evaluate(() => {
    const proto = WebGL2RenderingContext.prototype
    window.__glSaved = []
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === "constructor") continue
      const d = Object.getOwnPropertyDescriptor(proto, name)
      if (d && typeof d.value === "function") {
        window.__glSaved.push([name, d])
        Object.defineProperty(proto, name, {
          ...d,
          value() {
            throw new Error("context broken")
          },
        })
      }
    }
  })
  await page.waitForTimeout(1200)
  out.plateOnFrameError = await plate()
  await page.screenshot({ path: ".playwright-cli/f7-frame-error.png" })
  await page.evaluate(() => {
    for (const [name, d] of window.__glSaved)
      Object.defineProperty(WebGL2RenderingContext.prototype, name, d)
    delete window.__glSaved
  })
  await page.waitForTimeout(1500)
  out.plateAfterHeal = await plate()
  return out
}
