import { chromium } from "playwright"

/**
 * Screenshots the voxel preview, for visual checks that the test suite cannot
 * make (proportions, colour read, faces).
 *
 * The dev server must already be running (`bun run dev` in apps/client).
 *
 * Usage:
 *   bun scripts/preview-shot.ts <out.png> <url> [waitMs] [width] [height]
 *
 * Example:
 *   bun scripts/preview-shot.ts face.png \
 *     "http://localhost:5199/preview.html?seed=42&archetype=draconic&stage=champion&color=1&angle=face"
 */
const [out, url, wait = "2500", width = "1100", height = "750"] =
  process.argv.slice(2)
if (!out || !url) {
  throw new Error("usage: preview-shot.ts <out.png> <url> [waitMs]")
}

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: 1,
})
page.on("pageerror", (error) => console.log("pageerror:", error.message))
await page.goto(url, { waitUntil: "networkidle" })
await page.waitForTimeout(Number(wait))
await page.screenshot({ path: out })
await browser.close()
console.log("wrote", out)
