/**
 * The page probe the smoke check polls with.
 *
 * `playwright-cli` is a `.cmd` shim on Windows, and Bun refuses to pass an
 * argument containing cmd.exe metacharacters through one. A probe written
 * inline is a page-sized string full of brackets, so it lives in this file and
 * is loaded with `run-code --filename` instead.
 *
 * Invoked with the page; returns the probe object, which the CLI prints as
 * JSON under `result`.
 *
 * biome-ignore format: this file is evaluated as one bare expression, so the
 * formatter's defensive leading semicolon would break it.
 */
async (page) => {
  return await page.evaluate(() => {
    const canvas = document.querySelector("#app canvas")
    const box = canvas ? canvas.getBoundingClientRect() : null
    const hud = document.querySelector(".hud-stack")
    let hudNodes = 0
    if (hud) {
      for (const el of hud.querySelectorAll("*")) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) hudNodes += 1
      }
    }
    // The graduation flow reuses `starter-overlay` for its own card row, so
    // the draft picker is the one without that extra class.
    const picker = [...document.querySelectorAll(".starter-overlay")].some(
      (el) => !el.classList.contains("graduation-overlay"),
    )
    return {
      bootPlate: Boolean(document.getElementById("boot-plate")),
      starterOverlay: picker,
      canvas: box
        ? { width: Math.round(box.width), height: Math.round(box.height) }
        : null,
      hudStack: Boolean(hud),
      hudNodes,
      title: document.title,
    }
  })
}
