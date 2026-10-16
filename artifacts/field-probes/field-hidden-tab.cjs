async (page) => {
  // Phase 3 probe A (F5, AC5): a hidden tab must park the runtime.
  //
  // `document.hidden` is emulated in-page (own property over the prototype
  // getter + a real visibilitychange dispatch). The tab itself stays visible,
  // which is what makes this decisive: the browser keeps firing timers and
  // rAF, so anything the app keeps running shows up. Evidence per subscriber:
  //   render loop — the canvas is byte-identical across seconds while a
  //                 page-level rAF counter keeps climbing;
  //   playback    — HP is identical across the whole span despite live
  //                 setTimeout, then moves again the moment we unhide.
  const out = {}
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)
  const hp = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".battle-hp-num")].map((el) => el.textContent).join("|"),
    )
  const setEmulatedHidden = (hidden) =>
    page.evaluate((h) => {
      if (h) {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        })
      } else {
        delete document.hidden
      }
      document.dispatchEvent(new Event("visibilitychange"))
      return document.hidden
    }, hidden)

  await page.addInitScript(() => {
    window.__raf = 0
    const tick = () => {
      window.__raf++
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  await page.goto("http://localhost:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2500)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }

  const rafDelta = async (ms) => {
    const a = await page.evaluate(() => window.__raf)
    await page.waitForTimeout(ms)
    return (await page.evaluate(() => window.__raf)) - a
  }
  out.rafVisible = await rafDelta(800)

  // ---- Enter a spar fight and let a few steps land.
  await dom(".spar-button")
  await page.waitForTimeout(1200)
  await dom(".spar-tactic")
  for (let i = 0; i < 60; i++) {
    if (
      await page.evaluate(() =>
        document.querySelector("#app").classList.contains("app-in-arena"),
      )
    )
      break
    await page.waitForTimeout(200)
  }
  out.inArena = await page.evaluate(() =>
    document.querySelector("#app").classList.contains("app-in-arena"),
  )
  await page.waitForTimeout(2500)
  out.hpBeforeHide = await hp()

  const crop = async (name) => {
    const r = await page.evaluate(() => {
      const b = document.querySelector("#app canvas").getBoundingClientRect()
      return { x: b.x, y: b.y + b.height * 0.4, width: b.width, height: b.height * 0.3 }
    })
    return page.screenshot({ path: `.playwright-cli/${name}.png`, clip: r })
  }
  // ---- Emulate hidden for ~4s.
  out.emulatedHidden = await setEmulatedHidden(true)
  out.rafWhileEmulatedHidden = await rafDelta(1500) // tab is live; rAF climbs
  const a = await crop("f5-hidden-a")
  await page.waitForTimeout(1500)
  const b = await crop("f5-hidden-b")
  out.canvasFrozeWhileHidden = a.equals(b)
  out.rafTotalWhileHidden = await rafDelta(1000)
  out.hpWhileHidden = await hp()
  out.hpHeldWhileHidden = out.hpWhileHidden === out.hpBeforeHide
  await page.screenshot({ path: ".playwright-cli/f5-hidden-full.png" })

  // ---- Unhide: the runtime resumes and the fight continues.
  out.hiddenAfterRestore = await setEmulatedHidden(false)
  out.lineBeforeResume = await page.evaluate(
    () => document.querySelector(".battle-hud-line")?.textContent ?? null,
  )
  await page.waitForTimeout(2500)
  out.hpAfterResume = await hp()
  out.hpResumed = out.hpAfterResume !== out.hpBeforeHide
  out.lineAfterResume = await page.evaluate(
    () => document.querySelector(".battle-hud-line")?.textContent ?? null,
  )
  out.playbackResumed =
    out.hpResumed || out.lineBeforeResume !== out.lineAfterResume
  await crop("f5-resumed")
  // Instrument control: the same crop MUST differ while the loop is live,
  // or "froze" above proves nothing.
  const c = await crop("f5-live-a")
  await page.waitForTimeout(1500)
  const d = await crop("f5-live-b")
  out.canvasMovedAfterResume = !c.equals(d)

  // ---- And the fight still runs to its end, paced.
  await dom(".spar-fast")
  let finished = false
  for (let i = 0; i < 120; i++) {
    const done = await page.evaluate(() => {
      const el = document.querySelector(".spar-close")
      return !!el && el.offsetParent !== null
    })
    if (done) {
      finished = true
      break
    }
    await page.waitForTimeout(500)
  }
  out.fightFinishedAfterReturn = finished
  await page.screenshot({ path: ".playwright-cli/f5-finish.png" })
  await dom(".spar-close")
  await page.waitForTimeout(2000)
  out.leftArena = await page.evaluate(() =>
    !document.querySelector("#app").classList.contains("app-in-arena"),
  )
  return out
}
