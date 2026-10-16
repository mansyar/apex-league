async (page) => {
  // Phase 3 probe B (F7, boot half): a world without WebGL gets the failure
  // plate, not a blank page; a healthy boot clears the placeholder.
  const out = {}

  // ---- Healthy boot.
  await page.goto("http://localhost:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2200)
  out.bootPlateGoneAfterBoot = await page.evaluate(
    () => !document.getElementById("boot-plate"),
  )
  out.noscriptPresent = await page.evaluate(() => {
    const el = document.querySelector("noscript")
    return el ? el.textContent.includes("JavaScript") : false
  })
  out.canvasPresent = await page.evaluate(() => !!document.querySelector("#app canvas"))
  await page.screenshot({ path: ".playwright-cli/f7-normal-boot.png" })

  // ---- A browser with no usable WebGL: getContext returns null, so the
  //      renderer construction throws and boot must route to the plate.
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null
  })
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(2200)
  out.plateShown = await page.evaluate(() => !!document.querySelector(".failure-plate"))
  out.plateCause = await page.evaluate(
    () => document.querySelector(".failure-cause")?.textContent ?? null,
  )
  out.reloadButton = await page.evaluate(() => {
    const b = document.querySelector(".failure-plate button")
    return b
      ? { text: b.textContent, focused: document.activeElement === b }
      : null
  })
  out.noCanvas = await page.evaluate(() => !document.querySelector("#app canvas"))
  out.bootPlateGone = await page.evaluate(() => !document.getElementById("boot-plate"))
  await page.screenshot({ path: ".playwright-cli/f7-plate.png" })

  // ---- Reload is wired: clicking it really reloads the document (the
  //      marker dies with the JS world; the stub persists, so the plate
  //      returns and the game stays down).
  await page.evaluate(() => {
    window.__marker = 1
  })
  await page.evaluate(() => document.querySelector(".failure-plate button").click())
  await page.waitForTimeout(1800)
  out.reloadActuallyReloaded = await page.evaluate(() => window.__marker === undefined)
  out.plateAfterReload = await page.evaluate(() => !!document.querySelector(".failure-plate"))
  await page.screenshot({ path: ".playwright-cli/f7-plate-after-reload.png" })
  return out
}
