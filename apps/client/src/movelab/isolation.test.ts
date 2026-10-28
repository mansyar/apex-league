import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * NFR-6 guard: the Move Lab must stay dev-only. Production sources may
 * only touch it through `movelab/entry.ts` (a DEV-gated dynamic import,
 * so bundlers split the lab chunk out of production builds); `main.ts`
 * only calls the entry helpers. Lab runtime paths use fixed seeds —
 * never `Math.random`.
 */

const SRC = dirname(fileURLToPath(import.meta.url))
const CLIENT_SRC = dirname(SRC)

function sources(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === "dist" || name === "node_modules") continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...sources(full))
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

describe("movelab prod isolation", () => {
  it("is reachable only through the DEV-gated entry from main.ts", () => {
    const offenders: string[] = []
    for (const file of sources(CLIENT_SRC)) {
      if (file.startsWith(SRC)) continue
      const text = readFileSync(file, "utf8")
      if (!text.includes("movelab")) continue
      const allowed =
        file.endsWith("main.ts") &&
        text.includes('from "./movelab/entry"') &&
        text.includes("mountMoveLabIfRequested") &&
        !text.includes('from "./movelab/lab"') &&
        !text.includes('from "./movelab/panel"') &&
        !text.includes('from "./movelab/catalog"') &&
        !text.includes('from "./movelab/steps"')
      if (!allowed) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })

  it("keeps the lab chunk on a DEV-gated dynamic import", () => {
    const text = readFileSync(join(SRC, "entry.ts"), "utf8")
    expect(text.includes("import.meta.env.DEV")).toBe(true)
    expect(text.includes('import("./lab")')).toBe(true)
    expect(text.includes("Math.random")).toBe(false)
  })

  it("uses no Math.random in lab runtime paths", () => {
    for (const name of ["catalog.ts", "steps.ts", "panel.ts", "lab.ts"]) {
      const text = readFileSync(join(SRC, name), "utf8")
      expect(text.includes("Math.random")).toBe(false)
    }
  })
})
