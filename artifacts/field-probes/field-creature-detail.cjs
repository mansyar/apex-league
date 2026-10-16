async (page) => {
  // Phase 2 probe (coach_knowledge_20261016): the creature-detail modal.
  // Desktop first: fresh save, pick the fire starter, dismiss callouts,
  // tap the plate head, verify the 4-way breakdown sums to the totals.
  const out = {}
  const boot = async () => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.evaluate(() => window.localStorage.clear())
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.waitForTimeout(2500)
    await page.locator(".starter-card:visible").first().click()
    await page.waitForTimeout(2500)
    for (let i = 0; i < 5; i++) {
      const got = page.locator('button:visible:has-text("Got it")').first()
      if ((await got.count()) === 0) break
      await got.click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
  await boot()
  out.headTitle = await page.evaluate(
    () => document.querySelector(".creature-head")?.title,
  )
  // Tap the head -> modal opens.
  await page.locator(".creature-head").click()
  await page.waitForTimeout(400)
  out.modalVisible = await page.evaluate(() => {
    const modal = document.querySelector('[aria-label="Partner details"] .creature-detail-box')
    if (!modal) return null
    const r = modal.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })
  // Sum invariant, read straight off the DOM: base + trained + evolved = total.
  out.rows = await page.evaluate(() =>
    [...document.querySelectorAll(".detail-stat")].map((row) => {
      const label = row.querySelector(".detail-stat-label")?.textContent
      const total = row.querySelector(".detail-stat-total")?.textContent
      const chips = [...row.querySelectorAll(".detail-stat-chip")].map(
        (c) => c.textContent,
      )
      return { label, total, chips }
    }),
  )
  out.context = await page.evaluate(() =>
    [...document.querySelectorAll(".detail-context-row")].map(
      (r) => r.textContent,
    ),
  )
  await page.screenshot({
    path: ".playwright-cli/detail-desktop.png",
  })
  // Escape closes and returns focus to the plate head.
  await page.keyboard.press("Escape")
  await page.waitForTimeout(300)
  out.closedByEscape = await page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector('[aria-label="Partner details"]'),
      ).display === "none",
  )
  out.focusBack = await page.evaluate(
    () => document.activeElement?.className ?? null,
  )
  // Chevron is now the collapse toggle.
  await page.locator(".collapse-toggle").click()
  await page.waitForTimeout(300)
  out.collapsedClass = await page.evaluate(() =>
    document.querySelector(".creature-plate")?.className,
  )
  await page.screenshot({
    path: ".playwright-cli/detail-collapsed.png",
  })
  await page.locator(".collapse-toggle").click()
  await page.waitForTimeout(300)
  // Phone viewport: same flow at 390x844.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await page.locator(".creature-head").click()
  await page.waitForTimeout(400)
  out.phoneModalVisible = await page.evaluate(() => {
    const modal = document.querySelector('[aria-label="Partner details"] .creature-detail-box')
    if (!modal) return null
    const r = modal.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })
  await page.screenshot({
    path: ".playwright-cli/detail-phone.png",
  })
  await page.keyboard.press("Escape")
  return out
}
