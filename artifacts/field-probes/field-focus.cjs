async (page) => {
  // Phase 4 probe C (F9): real Tab walks over the spar panel and the cup
  // bracket; every stop must show the kit focus ring (solid + accent colour),
  // not the UA default.
  const out = {}
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)
  const ACCENT = "rgb(255, 209, 102)"
  const walk = async (n) => {
    const stops = []
    for (let i = 0; i < n; i++) {
      await page.keyboard.press("Tab")
      await page.waitForTimeout(50)
      const s = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el === document.body) return null
        const cs = getComputedStyle(el)
        return {
          cls: String(el.className).slice(0, 34),
          style: cs.outlineStyle,
          color: cs.outlineColor,
        }
      })
      if (s) stops.push(s)
    }
    return stops
  }
  const judge = (stops) => {
    const bad = stops.filter((s) => !(s.style === "solid" && s.color === ACCENT))
    return { total: stops.length, bad, classes: [...new Set(stops.map((s) => s.cls))] }
  }

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

  // Spar prep panel.
  await dom(".spar-button")
  await page.waitForTimeout(1200)
  out.sparPanel = judge(await walk(18))

  // Cup bracket on a cup day.
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
  await dom(".cup-button")
  await page.waitForTimeout(1500)
  out.cup = judge(await walk(18))
  await page.screenshot({ path: ".playwright-cli/f9-cup-focus.png" })
  return out
}
