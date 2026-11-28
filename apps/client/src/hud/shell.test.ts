/**
 * Dock hierarchy contract (FR-5): grouping and emphasis may clarify the
 * primary/secondary split, but the action order is frozen. The dock and shell
 * are DOM builders with no unit-scale fake in this repo, so these tests pin
 * the contract at the source seam: append order, divider CSS, and the live
 * status role on the summary that sits beside the CTA.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const style = readFileSync(join(import.meta.dir, "..", "ranch.css"), "utf8")
const dock = readFileSync(join(import.meta.dir, "dock.ts"), "utf8")
const shell = readFileSync(join(import.meta.dir, "shell.ts"), "utf8")

describe("dock hierarchy — grouping with frozen order (FR-5)", () => {
  test("care and training are divided without moving any action", () => {
    expect(dock).toContain(
      "root.append(dockHead, dockRow, dockTrain, dockGraduate, picker, advance)",
    )
    expect(style).toMatch(/\.command-dock \.dock-train\s*\{[^}]*border-top/)
    expect(style).toMatch(/\.advance-summary\s*\{[^}]*border-top/)
  })

  test("the Advance CTA stays the only solid-accent primary", () => {
    expect(style).toMatch(
      /\.command-dock \.kit-cta\s*\{[^}]*background:\s*var\(--accent\)/,
    )
    expect(style).toMatch(
      /\.command-dock \.dock-row \.kit-button[\s\S]*?background:\s*rgb\(255 236 200 \/ 0\.04\)/,
    )
  })

  test("the summary sits beside the CTA with a live status role", () => {
    expect(shell).toContain("cluster.append(advanceSummary)")
    expect(shell).toContain('className = "advance-summary"')
    expect(shell).toContain('setAttribute("role", "status")')
  })
})
