async (page) => {
  // Phase 4 probe B (F10): the spar chip must be reachable at the phone tier,
  // and NO pair of visible top-area plates may overlap. Desktop control after.
  const out = {}
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)
  const measure = () =>
    page.evaluate(() => {
      const rect = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0
          ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]
          : null
      }
      const names = [
        ".score-bug",
        ".spar-button",
        ".cup-button",
        ".hud-motion",
        ".new-game-chip",
        ".camera-chip",
        ".hud-lineage",
        ".hud-callout",
        ".command-dock",
        ".dock-head",
      ]
      const rects = {}
      for (const n of names) rects[n] = rect(n)
      const overlap = (a, b) =>
        a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]
      const keys = Object.keys(rects).filter((k) => rects[k])
      const pairs = []
      for (let i = 0; i < keys.length; i++)
        for (let j = i + 1; j < keys.length; j++)
          if (overlap(rects[keys[i]], rects[keys[j]])) pairs.push([keys[i], keys[j]])
      const s = rects[".spar-button"]
      let hit = 0
      let total = 0
      if (s) {
        const btn = document.querySelector(".spar-button")
        for (let ix = 0; ix < 9; ix++)
          for (let iy = 0; iy < 9; iy++) {
            const x = s[0] + ((ix + 0.5) * s[2]) / 9
            const y = s[1] + ((iy + 0.5) * s[3]) / 9
            const top = document.elementFromPoint(x, y)
            total++
            if (top && (top === btn || btn.contains(top))) hit++
          }
      }
      const centre = s
        ? document.elementFromPoint(s[0] + s[2] / 2, s[1] + s[3] / 2)
        : null
      return {
        rects,
        overlappingPairs: pairs,
        sparHit: `${hit}/${total}`,
        sparCentre: centre ? String(centre.className).slice(0, 40) : null,
      }
    })

  await page.setViewportSize({ width: 360, height: 732 })
  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2500)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  out.phone = await measure()
  await page.screenshot({ path: ".playwright-cli/f10-phone.png" })

  // Cup day: both entry chips are visible at once — measure the whole corner.
  for (let i = 0; i < 10; i++) {
    const live = await page.evaluate(
      () =>
        !!document.querySelector(".cup-button") &&
        !document.querySelector(".cup-button").disabled,
    )
    if (live) break
    await page.evaluate(() => {
      const cta = [...document.querySelectorAll("button")].find((b) =>
        (b.textContent || "").includes("Advance Day"),
      )
      if (cta) cta.click()
    })
    await page.waitForTimeout(3500)
    for (let k = 0; k < 3; k++) {
      const got = page.locator('button:visible:has-text("Got it")').first()
      if ((await got.count()) === 0) break
      await got.click().catch(() => {})
      await page.waitForTimeout(400)
    }
  }
  out.cupDay = await measure()
  await page.screenshot({ path: ".playwright-cli/f10-cup-day.png" })

  // Desktop control: the spar chip keeps its 18px pin and clears the
  // top-centre score bug.
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.waitForTimeout(800)
  out.desktop = await measure()
  await page.screenshot({ path: ".playwright-cli/f10-desktop.png" })
  return out
}
