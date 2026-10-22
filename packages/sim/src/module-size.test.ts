import { describe, expect, test } from "bun:test"
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * The 12 KB cap from ranch_decomposition_20261018 FR8: a module that grows
 * past it is a module that has stopped owning one concern. This guard walks
 * the whole `packages/sim/src` tree, so a module anywhere under it fails on
 * the same run that adds it — the package root and the `save/`, `battle/` and
 * `cup/` folders are all covered.
 *
 * The rule is byte size, not line count. Only co-located test suites
 * (`*.test.ts`, `*.test.tsx`) are exempt. There is no allowlist by name and
 * no per-folder exception: this package holds no type shim, so it needs no
 * name exemption.
 */
const CAP_BYTES = 12 * 1024

const SRC_DIR = import.meta.dir

const SOURCE_EXTENSIONS = /\.(ts|tsx|mts)$/

type ModuleFile = { path: string; bytes: number }

function isModule(name: string): boolean {
  return SOURCE_EXTENSIONS.test(name) && !name.includes(".test.")
}

/**
 * Every non-test module under `SRC_DIR`, recursively, with its byte size.
 * Paths are relative to `src/` and always use `/`, so the report reads the
 * same on every platform.
 */
function moduleFiles(dir: string = SRC_DIR, prefix = ""): ModuleFile[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = join(dir, entry.name)
    // Follow the target, not the dirent, so a linked folder is still walked.
    if (statSync(full).isDirectory()) return moduleFiles(full, rel)
    return isModule(entry.name)
      ? [{ path: rel, bytes: statSync(full).size }]
      : []
  })
}

/**
 * One line per offender: path, size, and how far over the cap it sits, largest
 * first so the worst module is the first thing a reviewer reads.
 */
function offenders(files: readonly ModuleFile[]): string[] {
  return files
    .filter((file) => file.bytes > CAP_BYTES)
    .sort((a, b) => b.bytes - a.bytes)
    .map(
      (file) =>
        `${file.path} — ${file.bytes} B (${file.bytes - CAP_BYTES} B over the ${CAP_BYTES} B cap)`,
    )
}

/**
 * The full failure report, or `null` when the tree is clean. Both the real
 * assertion and the negative control call this, so the control proves the
 * rule the guard actually enforces.
 */
function capReport(files: readonly ModuleFile[]): string | null {
  const lines = offenders(files)
  if (lines.length === 0) return null
  return [
    `${lines.length} sim module(s) exceed the ${CAP_BYTES} B cap. Split each one along the seams it already has:`,
    ...lines.map((line) => `  ${line}`),
    `The cap counts bytes, not lines. Only *.test.ts and *.test.tsx are exempt.`,
  ].join("\n")
}

describe("sim module size cap", () => {
  test("walks every non-test module under packages/sim/src", () => {
    const files = moduleFiles()
    // An empty or non-recursive scan would pass this suite silently.
    expect(files.length).toBeGreaterThan(40)
    expect(files.some((file) => file.path.startsWith("save/"))).toBe(true)
    expect(files.some((file) => file.path.startsWith("battle/"))).toBe(true)
    expect(files.some((file) => file.path.startsWith("cup/"))).toBe(true)
    expect(files.some((file) => file.path.endsWith(".test.ts"))).toBe(false)
    // The 67 KB save suite stays exempt: the cap is about modules, not tests.
    expect(files.map((file) => file.path)).not.toContain("save/save.test.ts")
  })

  test("every non-test module is at most 12 KB", () => {
    const report = capReport(moduleFiles())
    expect(report).toBeNull()
  })

  test("accepts a module exactly at the cap and flags one byte over", () => {
    expect(
      capReport([{ path: "fixture/edge.ts", bytes: CAP_BYTES }]),
    ).toBeNull()
    expect(capReport([{ path: "fixture/over.ts", bytes: CAP_BYTES + 1 }])).toBe(
      [
        `1 sim module(s) exceed the ${CAP_BYTES} B cap. Split each one along the seams it already has:`,
        `  fixture/over.ts — ${CAP_BYTES + 1} B (1 B over the ${CAP_BYTES} B cap)`,
        `The cap counts bytes, not lines. Only *.test.ts and *.test.tsx are exempt.`,
      ].join("\n"),
    )
  })

  test("reports every offender largest first", () => {
    const report = capReport([
      { path: "a/small.ts", bytes: CAP_BYTES + 10 },
      { path: "b/largest.ts", bytes: CAP_BYTES + 900 },
      { path: "c/fine.ts", bytes: 100 },
    ])
    expect(report?.split("\n").slice(1, 3)).toEqual([
      `  b/largest.ts — ${CAP_BYTES + 900} B (900 B over the ${CAP_BYTES} B cap)`,
      `  a/small.ts — ${CAP_BYTES + 10} B (10 B over the ${CAP_BYTES} B cap)`,
    ])
  })

  test("negative control: an oversized module is rejected, then removed", () => {
    // A temp folder keeps the fixture out of the repo: a killed run cannot leave
    // an offender behind, and a read-only checkout still runs the control.
    const dir = mkdtempSync(join(tmpdir(), "apex-sim-guard-"))
    // `.tsx` on purpose - the walk must see every source extension, not just `.ts`.
    const name = "oversized.tsx"
    const path = join(dir, name)
    try {
      writeFileSync(
        path,
        `// Negative-control fixture for module-size.test.ts. Never shipped.\nexport const PAD = "${"x".repeat(CAP_BYTES)}"\n`,
      )
      const bytes = statSync(path).size
      expect(bytes).toBeGreaterThan(CAP_BYTES)
      const files = moduleFiles(dir)
      expect(files.map((file) => file.path)).toContain(name)
      const report = capReport(files)
      expect(report).not.toBeNull()
      expect(report).toContain(name)
      expect(report).toContain(`${bytes} B`)
      expect(report).toContain(`${bytes - CAP_BYTES} B over`)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
    expect(existsSync(dir)).toBe(false)
  })
})
