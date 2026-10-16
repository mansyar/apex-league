/**
 * Field probe: Phase 6 cross-surface sweep (coach_knowledge_20261016).
 * Boots a fresh save, walks every modal surface — creature detail,
 * Coach's Handbook, Settings, and the reset-confirm two-step — on
 * desktop and phone viewports, collecting page errors and console
 * errors throughout. Screenshots land in .playwright-cli/sweep-*.png
 */
async (page) => {
  const out = { errors: [], surfaces: {} }
  page.on("pageerror", (e) => out.errors.push("pageerror: " + String(e)))
  page.on("console", (m) => {
    if (m.type() === "error") out.errors.push("console: " + m.text())
  })
  const boot = async (width, height) => {
    await page.setViewportSize({ width, height })
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.evaluate(() => window.localStorage.clear())
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.waitForTimeout(2500)
    await page.locator(".starter-card:visible").first().click()
    for (let i = 0; i < 6; i += 1) {
      const gotIt = page.locator('button:has-text("Got it"):visible')
      if (await gotIt.count()) {
        await gotIt.first().click()
        await page.waitForTimeout(150)
      }
    }
    await page.waitForTimeout(1200)
    for (let i = 0; i < 4; i += 1) {
      if (!(await page.locator(".spar-overlay").isVisible())) break
      await page.locator(".spar-panel-close").click()
      await page.waitForTimeout(300)
    }
  }
  const visible = (label) =>
    page.evaluate((lbl) => {
      const root = document.querySelector(`[aria-label="${lbl}"]`)
      return root ? getComputedStyle(root).display !== "none" : false
    }, label)

  for (const [name, width, height] of [
    ["desktop", 1280, 800],
    ["phone", 390, 844],
  ]) {
    await boot(width, height)
    const s = {}

    // Creature detail via the plate head.
    await page.locator(".creature-head").click()
    await page.waitForTimeout(250)
    s.creatureDetail = await visible("Partner details")
    await page.screenshot({ path: `.playwright-cli/sweep-${name}-detail.png` })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)

    // Handbook via its chip.
    await page.locator(".handbook-chip").click()
    await page.waitForTimeout(250)
    s.handbook = await visible("Coach's Handbook")
    await page.screenshot({ path: `.playwright-cli/sweep-${name}-handbook.png` })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)

    // Settings via its chip.
    await page.locator(".settings-chip").click()
    await page.waitForTimeout(250)
    s.settings = await visible("Settings")
    await page.screenshot({ path: `.playwright-cli/sweep-${name}-settings.png` })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(150)

    // Reset confirm via the settings two-step; cancel backs out.
    await page.locator(".settings-chip").click()
    await page.waitForTimeout(200)
    await page.locator('.settings-rows .kit-chip:has-text("New game")').click()
    await page.waitForTimeout(250)
    s.resetConfirm = await page
      .locator(".kit-button-danger")
      .isVisible()
    await page.screenshot({ path: `.playwright-cli/sweep-${name}-confirm.png` })
    await page.locator('button:has-text("Keep playing")').click()
    await page.waitForTimeout(150)

    out.surfaces[name] = s
  }
  return out
}
