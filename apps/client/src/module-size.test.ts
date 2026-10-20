import { describe, expect, test } from "bun:test"
import {
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { join } from "node:path"

/**
 * The 12 KB cap from ranch_decomposition_20261018 FR8: a module that grows
 * past it is a module that has stopped owning one concern. This guard walks
 * the whole client tree, so a module anywhere under `src/` fails on the same
 * run that adds it — the previous version scanned only `scene-logic/` and
 * `ranch/`, which let `main.ts`, `hud.ts` and friends drift unnoticed.
 *
 * The rule is byte size, not line count. Exactly two kinds of file are exempt:
 * co-located `*.test.ts` suites and the Vite type shim `vite-env.d.ts`. There
 * is no allowlist by name and no per-folder exception.
 */
const CAP_BYTES = 12 * 1024

const SRC_DIR = import.meta.dir

const EXCLUDED_NAMES = new Set(["vite-env.d.ts"])

type ModuleFile = { path: string; bytes: number }

function isModule(name: string): boolean {
  return (
    name.endsWith(".ts") &&
    !name.endsWith(".test.ts") &&
    !EXCLUDED_NAMES.has(name)
  )
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
    if (entry.isDirectory()) return moduleFiles(full, rel)
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
    `${lines.length} client module(s) exceed the ${CAP_BYTES} B cap. Split each one along the seams it already has:`,
    ...lines.map((line) => `  ${line}`),
    `The cap counts bytes, not lines. Only *.test.ts and vite-env.d.ts are exempt.`,
  ].join("\n")
}

describe("client module size cap", () => {
  test("walks every non-test module under apps/client/src", () => {
    const files = moduleFiles()
    // An empty or non-recursive scan would pass this suite silently.
    expect(files.length).toBeGreaterThan(100)
    expect(files.some((file) => file.path.includes("/"))).toBe(true)
    expect(files.map((file) => file.path)).not.toContain("vite-env.d.ts")
    expect(files.some((file) => file.path.endsWith(".test.ts"))).toBe(false)
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
        `1 client module(s) exceed the ${CAP_BYTES} B cap. Split each one along the seams it already has:`,
        `  fixture/over.ts — ${CAP_BYTES + 1} B (1 B over the ${CAP_BYTES} B cap)`,
        `The cap counts bytes, not lines. Only *.test.ts and vite-env.d.ts are exempt.`,
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
    // `__guard-*` can never be mistaken for real code, and the `.ts` suffix
    // means the walk sees it (a `*.test.ts` name would be exempt).
    const name = `__guard-negative-control-${process.pid}.ts`
    const path = join(SRC_DIR, name)
    writeFileSync(
      path,
      `// Negative-control fixture for module-size.test.ts. Never shipped.\nexport const PAD = "${"x".repeat(CAP_BYTES)}"\n`,
    )
    try {
      const bytes = statSync(path).size
      expect(bytes).toBeGreaterThan(CAP_BYTES)
      const files = moduleFiles()
      expect(files.map((file) => file.path)).toContain(name)
      const report = capReport(files)
      expect(report).not.toBeNull()
      expect(report).toContain(name)
      expect(report).toContain(`${bytes} B`)
      expect(report).toContain(`${bytes - CAP_BYTES} B over`)
    } finally {
      rmSync(path, { force: true })
    }
    expect(existsSync(path)).toBe(false)
  })
})
