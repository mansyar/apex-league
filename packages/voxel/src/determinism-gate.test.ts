/**
 * The determinism gate's authoring mode (NFR-3). `--write-missing` exists so a
 * new archetype can commit its artifact pair, but the pair it writes must be
 * verified by the same run that writes it: an authoring run that skips the
 * deep compare can commit an unverified pair.
 *
 * The gate is a script, not a module — running it here would regenerate every
 * artifact — so this pins the shape of the control flow instead: the authoring
 * path must not `continue` past the compare, and the authoring branch must read
 * its own output back before falling through.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(
  join(import.meta.dir, "..", "scripts", "determinism-gate.ts"),
  "utf8",
)

const WRITE_BRANCH =
  "if (writeMissing && !existsSync(glbPath) && !existsSync(manifestPath))"
const FIRST_COMPARE =
  "if (JSON.stringify(manifest) !== JSON.stringify(committedManifest))"

/**
 * The stretch F5 was about: from the `--write-missing` write branch to the
 * first deep compare. Scoping the pin here keeps it on the authoring path — a
 * legitimate `continue` elsewhere in the gate (skipping a prop, an opt-out
 * archetype, a retry) must not fail a guard about verification.
 */
function writeBranchThroughCompare(text: string): string {
  const start = text.indexOf(WRITE_BRANCH)
  const end = text.indexOf(FIRST_COMPARE, start)
  // Both anchors must exist and be ordered, or the slice is empty and the
  // absence assertion below would pass without looking at anything.
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return text.slice(start, end)
}

describe("determinism gate authoring mode", () => {
  test("never skips the compare on the run that writes a pair", () => {
    // The bug this pins: the write branch used to `continue`, so the pair it
    // had just written left the loop before the deep compare. No `continue`
    // between the write and the compare means the written pair always reaches
    // the same checks the committed artifacts get.
    expect(writeBranchThroughCompare(source)).not.toContain("continue")
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
