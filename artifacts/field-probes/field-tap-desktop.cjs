async (page) => {
  // F8 control: at a desktop viewport the phone-tier floor must be absent —
  // the same controls keep their designed sizes.
  const out = {}
  await page.setViewportSize({ width: 1280, height: 800 })
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
  out.desktop = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      renameButton: pick(".rename-button"),
      kitChip: pick(".kit-chip"),
      dockHead: pick(".dock-head"),
      creatureHead: pick(".creature-head"),
    }
  })
  await page.screenshot({ path: ".playwright-cli/f8-desktop.png" })
  return out
}
