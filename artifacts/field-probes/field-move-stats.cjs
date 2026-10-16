async (page) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("http://[::1]:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("http://[::1]:5174/", { waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2000)
  for (let i = 0; i < 5; i++) {
    const got = page.locator('button:visible:has-text("Got it")').first()
    if ((await got.count()) === 0) break
    await got.click().catch(() => {})
    await page.waitForTimeout(300)
  }
  // Open the spar from the command dock.
  await page.locator('button:visible:has-text("Spar")').first().click()
  await page.waitForTimeout(1500)
  const out = {}
  out.kitRows = await page.evaluate(() =>
    [...document.querySelectorAll(".spar-kit-move")].map((row) => ({
      text: row.textContent,
      disabled: row.disabled,
    })),
  )
  await page.screenshot({ path: ".playwright-cli/moves-spar-desktop.png" })
  // Phone viewport for the same prep screen.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: ".playwright-cli/moves-spar-phone.png" })
  return out
}
