async (page) => {
  const out = {}
  await page.addInitScript(() => {
    window.__wrapped = "installed"
    window.__viewCount = 0
    window.__names = []
    const names = new WeakMap()
    const protos = [window.WebGL2RenderingContext, window.WebGLRenderingContext]
    for (const proto of protos) {
      if (!proto) continue
      const origGet = proto.prototype.getUniformLocation
      proto.prototype.getUniformLocation = function (program, name) {
        const loc = origGet.call(this, program, name)
        if (loc) {
          names.set(loc, name)
          if (window.__names.length < 40 && !window.__names.includes(name))
            window.__names.push(name)
        }
        return loc
      }
      const origSet = proto.prototype.uniformMatrix4fv
      proto.prototype.uniformMatrix4fv = function (loc, transpose, value) {
        if (names.get(loc) === "viewMatrix") window.__viewCount++
        return origSet.call(this, loc, transpose, value)
      }
    }
  })

  await page.goto("http://localhost:5174/", { waitUntil: "load" })
  await page.evaluate(() => window.localStorage.clear())
  await page.reload({ waitUntil: "load" })
  await page.waitForTimeout(3000)
  const onStarter = await page.evaluate(() => ({
    wrapped: window.__wrapped ?? null,
    viewCount: window.__viewCount ?? null,
    names: (window.__names || []).slice(0, 25),
    hasWebGL2: !!window.WebGL2RenderingContext,
  }))
  out.beforePick = onStarter

  await page.locator(".starter-card:visible").first().click()
  await page.waitForTimeout(2500)
  const before = await page.evaluate(() => window.__viewCount ?? null)
  await page.waitForTimeout(1000)
  const after = await page.evaluate(() => window.__viewCount ?? null)
  out.viewCountBefore = before
  out.viewCountAfter = after
  out.delta1s = before === null || after === null ? null : after - before
  return out
}
