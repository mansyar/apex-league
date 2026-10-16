async (page) => {
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: ".playwright-cli/diag-state.png" })

  const card = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".starter-card")]
    const first = els[0]
    if (!first) return { count: 0 }
    const cs = getComputedStyle(first)
    const r = first.getBoundingClientRect()
    return {
      count: els.length,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      animation: `${cs.animationName} ${cs.animationDuration} ${cs.animationFillMode} ${cs.animationPlayState}`,
      transform: cs.transform,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      disabled: first.disabled,
      connected: first.isConnected,
      overlayDisplay: getComputedStyle(first.parentElement.parentElement).display,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }
  })

  const out = {
    card,
    cardsVisible: await page.locator(".starter-card").first().isVisible().catch(() => "err"),
    overlays: await page.locator(".starter-overlay").count(),
    topAtCenter: await page.evaluate(() => {
      const el = document.elementFromPoint(180, 500)
      return el ? `${el.tagName.toLowerCase()}.${el.className}` : "none"
    }),
    bodyLen: await page.evaluate(() => (document.body.innerText || "").length),
  }
  return out
}
