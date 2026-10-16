async (page) => {
  // Phase 2 probe C (F4) — step 1: find the road into a live fight.
  // The browser profile is in-memory, so clearing the save is free and makes
  // every run start from the same place.
  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.goto("http://[::1]:5173/", { waitUntil: "load" })
  await page.waitForTimeout(2500)
  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return (
        r.width > 0 &&
        r.height > 0 &&
        cs.visibility !== "hidden" &&
        cs.display !== "none"
      )
    }
    const buttons = [...document.querySelectorAll("button, [role=button]")]
      .filter(vis)
      .map((b) => ({
        cls: b.className,
        text: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40),
      }))
    const sections = [...document.querySelectorAll("#app > *")]
      .filter(vis)
      .map((el) => el.className || el.tagName)
    return { appClass: document.querySelector("#app").className, sections, buttons }
  })
  return info
}
