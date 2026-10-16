async (page) => {
  // Phase 4 probe A (F8): audit every interactive element's smallest axis at
  // the phone tier (360x732). Sections walk the app's real states.
  const out = { sections: {} }
  const dom = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s)
      if (!el) return false
      el.click()
      return true
    }, sel)
  const audit = () =>
    page.evaluate(() => {
      const sel =
        'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
      const rows = []
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect()
        if (r.width <= 0 || r.height <= 0) continue
        const style = getComputedStyle(el)
        if (style.visibility === "hidden" || style.display === "none") continue
        if (el.closest("[hidden]")) continue
        rows.push({
          cls: (el.className || el.tagName).toString().slice(0, 40),
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 18),
          w: Math.round(r.width),
          h: Math.round(r.height),
          min: Math.round(Math.min(r.width, r.height)),
        })
      }
      // Deduplicate by cls+text and flag the ones under the 44px floor.
      const seen = new Set()
      const out = []
      for (const row of rows) {
        const key = row.cls + "|" + row.text
        if (seen.has(key)) continue
        seen.add(key)
        if (row.min < 44) out.push(row)
      }
      return out
    })

  await page.setViewportSize({ width: 360, height: 732 })
  await page.goto("http://localhost:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2500)
  out.sections.starter = await audit()
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2500)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  out.sections.ranch = await audit()

  // Open the Actions dock to reveal its buttons.
  await dom(".dock-head")
  await page.waitForTimeout(800)
  out.sections.ranchDockOpen = await audit()
  await dom(".dock-head")
  await page.waitForTimeout(500)

  // Spar prep panel.
  await dom(".spar-button")
  await page.waitForTimeout(1200)
  out.sections.sparPrep = await audit()

  // Start the fight: battle HUD chrome.
  await dom(".spar-tactic")
  await page.waitForTimeout(2500)
  out.sections.battleHud = await audit()

  // Fast-forward to the end for the post-fight chrome.
  await dom(".spar-fast")
  for (let i = 0; i < 120; i++) {
    const done = await page.evaluate(() => {
      const el = document.querySelector(".spar-close")
      return !!el && el.offsetParent !== null
    })
    if (done) break
    await page.waitForTimeout(500)
  }
  out.sections.postFight = await audit()
  await page.screenshot({ path: ".playwright-cli/f8-postfight.png" })
  await dom(".spar-close")
  await page.waitForTimeout(2000)

  // Cup bracket: cup days are periodic, so advance until the chip goes live.
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
  out.cupClicked = await dom(".cup-button")
  await page.waitForTimeout(1500)
  out.sections.cup = await audit()
  await page.screenshot({ path: ".playwright-cli/f8-cup.png" })
  return out
}
