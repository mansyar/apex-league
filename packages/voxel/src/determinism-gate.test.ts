/**
 * The determinism gate's authoring mode (NFR-3). `--write-missing` exists so a
 * new archetype can commit its artifact pair, but the pair it writes must be
 * verified by the same run that writes it: an authoring run that skips the
 * deep compare can commit an unverified pair.
 *
 * The gate is a script, not a module — running it here would regenerate every
 * artifact — so this pins the shape of the control flow instead: the loop body
 * must not `continue` past the compare, and the authoring branch must read its
 * own output back before falling through.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(
  join(import.meta.dir, "..", "scripts", "determinism-gate.ts"),
  "utf8",
)

describe("determinism gate authoring mode", () => {
  test("never skips the compare on the run that writes a pair", () => {
    // The bug this pins: the write branch used to `continue`, so the pair it
    // had just written was never deep-compared. No `continue` in the script
    // means the written pair always falls through to the same checks the
    // committed artifacts get.
    expect(source).not.toContain("continue")
  })

  test("reads the pair it wrote back before comparing", () => {
    const writeGlb = source.indexOf("writeFileSync(glbPath, glb)")
    const writeManifest = source.indexOf("writeFileSync(manifestPath")
    const rereadManifest = source.indexOf(
      'readFileSync(manifestPath, "utf8")',
      writeManifest,
    )
    const rereadGlb = source.indexOf("readFileSync(glbPath)", writeGlb)
    expect(writeGlb).toBeGreaterThan(-1)
    expect(writeManifest).toBeGreaterThan(writeGlb)
    // Both reads come after the writes: the compare below sees disk, not the
    // in-memory values the write happened to have.
    expect(rereadManifest).toBeGreaterThan(writeManifest)
    expect(rereadGlb).toBeGreaterThan(writeGlb)
  })

  test("still refuses to touch a pair that already exists", () => {
    expect(source).toContain(
      "!existsSync(glbPath) && !existsSync(manifestPath)",
    )
  })
})
