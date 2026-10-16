/**
 * Field probe: settings modal (coach_knowledge_20261016 Phase 5).
 * Boots a fresh save, opens Settings from the chip, asserts the 1:1
 * relocation: motion row visible on both surfaces, camera row only in
 * the arena, new game row only in the ranch; toggles motion live; walks
 * the new-game two-step (confirm modal opens, settings closes, cancel
 * backs out); Escape close + focus restore; phone breakpoint.
 * Screenshots land in .playwright-cli/settings-*.png
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
    for (let i = 0; i < 6; i += 1) {
      const gotIt = page.locator('button:has-text("Got it"):visible')
      if (await gotIt.count()) {
        await gotIt.first().click()
        await page.waitForTimeout(150)
      }
    }
    // A spar panel can linger (or pop late) over the HUD; close it if so.
    await page.waitForTimeout(1200)
    for (let i = 0; i < 4; i += 1) {
      if (!(await page.locator(".spar-overlay").isVisible())) break
      await page.locator(".spar-panel-close").click()
      await page.waitForTimeout(300)
    }
  }
  const modalState = () =>
    page.evaluate(() => {
      const read = (label) => {
        const root = document.querySelector(`[aria-label="${label}"]`)
        return root ? getComputedStyle(root).display : "missing"
      }
      const rows = [...document.querySelectorAll(".settings-rows .kit-chip")]
      return {
        settings: read("Settings"),
        reset: read("Start a fresh ranch?"),
        rows: rows.map((b) => ({
          label: b.querySelector(".kit-chip-label")?.textContent,
          visible: getComputedStyle(b).display !== "none",
        })),
      }
    })

  await boot(1280, 800)
  const openSettings = async () => {
    for (let i = 0; i < 4; i += 1) {
      if (await page.locator(".spar-overlay").isVisible()) {
        await page.locator(".spar-panel-close").click()
        await page.waitForTimeout(300)
      }
      await page.locator(".settings-chip").click()
      await page.waitForTimeout(250)
      if ((await modalState()).settings !== "none") return
    }
    throw new Error("settings modal never opened")
  }
  await openSettings()
  await page.waitForTimeout(300)
  out.ranch = await modalState()
  await page.screenshot({ path: ".playwright-cli/settings-ranch.png" })

  // Motion toggle stays live inside the modal.
  await page.locator(".settings-rows .kit-chip", { hasText: "Motion" }).click()
  await page.waitForTimeout(150)
  out.motionAfterToggle = (await modalState()).rows.find((r) =>
    r.label?.startsWith("Motion"),
  )

  // Escape closes; focus returns to the settings chip.
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  out.closedByEscape = (await modalState()).settings === "none"
  out.focusBack = await page.evaluate(
    () => document.activeElement?.className ?? "none",
  )

  // New game two-step: settings closes, confirm opens; cancel backs out.
  await openSettings()
  await page.waitForTimeout(200)
  await page
    .locator(".settings-rows .kit-chip", { hasText: "New game" })
    .click()
  await page.waitForTimeout(300)
  out.newGameStep = {
    ...(await modalState()),
    startOver: await page.evaluate(
      () => getComputedStyle(document.querySelector(".kit-button-danger") ?? document.body).display,
    ),
  }
  await page.screenshot({ path: ".playwright-cli/settings-confirm.png" })
  await page.locator('button:has-text("Keep playing")').click()
  await page.waitForTimeout(200)
  out.afterCancel = await modalState()

  // Arena: the settings chip stays reachable above the spar overlay, so
  // the modal opens mid-battle and the camera row (arena-only) is live.
  await page.locator(".spar-button").click()
  await page.waitForTimeout(800)
  await page.locator(".spar-tactic").first().click()
  await page.waitForTimeout(2500)
  await page.locator(".settings-chip").click()
  await page.waitForTimeout(300)
  out.arena = {
    ...(await modalState()),
    inAppInArena: await page.evaluate(
      () => document.querySelector(".app-in-arena") !== null,
    ),
  }
  await page.screenshot({ path: ".playwright-cli/settings-arena.png" })
  await page
    .locator(".settings-rows .kit-chip", { hasText: "Camera" })
    .click()
  await page.waitForTimeout(150)
  out.cameraAfterToggle = (await modalState()).rows.find((r) =>
    r.label?.startsWith("Camera"),
  )
  out.newGameHiddenInArena = (
    (await modalState()).rows.find((r) => r.label === "New game") ?? {}
  ).visible === false
  await page.keyboard.press("Escape")

  // Phone breakpoint (fresh page load resets the scene).
  await boot(390, 844)
  await openSettings()
  await page.waitForTimeout(300)
  out.phone = await modalState()
  out.phoneFits = await page.evaluate(() => {
    const box = document.querySelector(".settings-box")
    if (!box) return false
    const r = box.getBoundingClientRect()
    return r.right <= window.innerWidth && r.bottom <= window.innerHeight
  })
  await page.screenshot({ path: ".playwright-cli/settings-phone.png" })
  return out
}
