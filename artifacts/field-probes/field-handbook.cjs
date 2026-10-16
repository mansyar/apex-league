/**
 * Field probe: Coach's Handbook modal (coach_knowledge_20261016 Phase 4).
 * Boots a fresh save, opens the handbook from the HUD chip, walks all
 * three tabs (type chart / ladder rules / raising), closes with Escape,
 * and re-opens at the phone breakpoint. Screenshots land in
 * .playwright-cli/handbook-*.png
 */
async (page) => {
  const out = {}
  const boot = async (width, height) => {
    await page.setViewportSize({ width, height })
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.evaluate(() => window.localStorage.clear())
    await page.goto("http://[::1]:5174/", { waitUntil: "load" })
    await page.waitForTimeout(2500)
    await page.locator(".starter-card:visible").first().click()
    for (let i = 0; i < 5; i += 1) {
      const gotIt = page.locator('button:has-text("Got it"):visible')
      if (await gotIt.count()) {
        await gotIt.first().click()
        await page.waitForTimeout(150)
      }
    }
  }
  await boot(1280, 800)

  const modal = () =>
    page.evaluate(() => {
      const root = document.querySelector('[aria-label="Coach\'s Handbook"]')
      return root ? getComputedStyle(root).display : "missing"
    })

  out.modalBefore = await modal()
  await page.locator(".handbook-chip").click()
  await page.waitForTimeout(300)
  out.modalOpen = await modal()
  out.tabs = await page.evaluate(() =>
    [...document.querySelectorAll(".handbook-tab")].map((b) => ({
      label: b.textContent,
      selected: b.getAttribute("aria-selected"),
    })),
  )
  await page.screenshot({ path: ".playwright-cli/handbook-chart.png" })

  // Ladder rules tab.
  await page.locator(".handbook-tab", { hasText: "Ladder rules" }).click()
  await page.waitForTimeout(150)
  out.ladderSelected = await page.evaluate(
    () =>
      document.querySelector('[aria-selected="true"]')?.textContent ?? "none",
  )
  out.ladderRules = await page.evaluate(() =>
    [...document.querySelectorAll(".handbook-rule-copy")].map((n) => n.textContent),
  )
  await page.screenshot({ path: ".playwright-cli/handbook-ladder.png" })

  // Raising tab + arrow-key navigation back to tab 1.
  await page.locator(".handbook-tab", { hasText: "Raising" }).click()
  await page.waitForTimeout(150)
  out.tips = await page.evaluate(
    () => document.querySelectorAll(".handbook-tip").length,
  )
  await page.keyboard.press("ArrowLeft")
  await page.waitForTimeout(150)
  out.afterArrow = await page.evaluate(
    () =>
      document.querySelector('[aria-selected="true"]')?.textContent ?? "none",
  )
  await page.screenshot({ path: ".playwright-cli/handbook-raising.png" })

  // Escape closes; focus returns to the chip.
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  out.closedByEscape = (await modal()) === "none"
  out.focusBack = await page.evaluate(
    () => document.activeElement?.className ?? "none",
  )

  // Phone breakpoint.
  await boot(390, 844)
  await page.locator(".handbook-chip").click()
  await page.waitForTimeout(300)
  out.phoneModal = await modal()
  out.phoneOverflow = await page.evaluate(() => {
    const box = document.querySelector(".handbook-box")
    if (!box) return "missing"
    const r = box.getBoundingClientRect()
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      fits: r.right <= window.innerWidth && r.bottom <= window.innerHeight,
    }
  })
  await page.screenshot({ path: ".playwright-cli/handbook-phone.png" })
  await page.keyboard.press("Escape")
  return out
}
