/**
 * The dev-server Host allowlist (release funnel FR-4 / AC-4). Vite rejects any
 * request whose Host header is not in `server.allowedHosts`, which is exactly
 * what a remote-dev proxy such as Tailscale Serve forwards. The committed
 * config used to hardcode the maintainer's machine; these checks keep the
 * repository free of a machine name and prove the variable still restores the
 * behaviour, so the comment cannot rot into a claim nothing verifies.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import config, { allowedHostsFrom } from "./vite.config"

const source = readFileSync(join(import.meta.dir, "vite.config.ts"), "utf8")

describe("vite config source", () => {
  test("names no literal hostname", () => {
    expect(source).not.toMatch(/msi-1/i)
    expect(source).not.toMatch(/ts\.net/i)
    // A quoted `...tail...` literal is a hostname even after a machine rename.
    expect(source).not.toMatch(/["'`][^"'`\n]*tail[^"'`\n]*["'`]/i)
  })

  test("feeds the allowlist from the environment, not a literal", () => {
    expect(source).toMatch(
      /allowedHosts:\s*allowedHostsFrom\(\s*process\.env\.DEV_ALLOWED_HOSTS\s*,?\s*\)/,
    )
  })
})

describe("allowedHostsFrom", () => {
  test("is empty when the variable is unset", () => {
    expect(allowedHostsFrom(undefined)).toEqual([])
  })

  test("is empty when the variable is empty", () => {
    expect(allowedHostsFrom("")).toEqual([])
  })

  test("keeps a single host", () => {
    expect(allowedHostsFrom("pets.example.dev")).toEqual(["pets.example.dev"])
  })

  test("splits a comma-separated list and trims the spaces", () => {
    expect(
      allowedHostsFrom("a.example.dev, b.example.dev ,c.example.dev"),
    ).toEqual(["a.example.dev", "b.example.dev", "c.example.dev"])
  })

  test("drops empty entries", () => {
    expect(allowedHostsFrom("a.example.dev,,")).toEqual(["a.example.dev"])
  })
})

describe("the exported config", () => {
  test("wires server.allowedHosts to the variable, not to a literal", () => {
    // Holds whether or not the variable is set in this environment, so the
    // check proves the wiring rather than the ambient value.
    expect(config.server?.allowedHosts).toEqual(
      allowedHostsFrom(process.env.DEV_ALLOWED_HOSTS),
    )
  })
})
