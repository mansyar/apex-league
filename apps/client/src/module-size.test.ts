import { describe, expect, test } from "bun:test"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * The 12 KB cap from ranch_decomposition_20261018 FR8: a module that grows
 * past it is a module that has stopped owning one concern. The guard runs
 * over every TypeScript file in the two decomposed folders, tests included,
 * so a new over-stuffed module fails on the same run that adds it.
 */
const CAP_BYTES = 12 * 1024

const MODULE_DIRS = ["scene-logic", "ranch"] as const

type ModuleFile = { path: string; bytes: number }

/** Pure predicate so the over-cap branch is exercised without a real fixture. */
function oversized(files: readonly ModuleFile[]): string[] {
  return files
    .filter((file) => file.bytes > CAP_BYTES)
    .map((file) => `${file.path} is ${file.bytes} B (cap ${CAP_BYTES} B)`)
}

function moduleFiles(): ModuleFile[] {
  return MODULE_DIRS.flatMap((dir) =>
    readdirSync(join(import.meta.dir, dir))
      .filter((name) => name.endsWith(".ts"))
      .map((name) => ({
        path: `${dir}/${name}`,
        bytes: statSync(join(import.meta.dir, dir, name)).size,
      })),
  )
}

describe("ranch module size cap", () => {
  test("flags a module one byte over the cap", () => {
    expect(
      oversized([{ path: "fixture/over.ts", bytes: CAP_BYTES + 1 }]),
    ).toEqual([`fixture/over.ts is ${CAP_BYTES + 1} B (cap ${CAP_BYTES} B)`])
  })

  test("accepts a module exactly at the cap", () => {
    expect(oversized([{ path: "fixture/edge.ts", bytes: CAP_BYTES }])).toEqual(
      [],
    )
  })

  test("every scene-logic and ranch module stays under 12 KB", () => {
    const files = moduleFiles()
    // Both folders exist and are populated; an empty scan would pass quietly.
    expect(files.length).toBeGreaterThan(20)
    expect(oversized(files)).toEqual([])
  })
})
