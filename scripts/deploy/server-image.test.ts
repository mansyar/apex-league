/**
 * The server image pipeline's contract (FR-10, NFR-3, NFR-7, AC-10).
 *
 * `server-image.yml` publishes a container that Coolify deploys on its own, out
 * of sight of this repository. That makes the workflow's order and its secret
 * hygiene load-bearing in a way a human reviewer cannot re-check from the
 * running system: a gate moved below the push ships an unverified image, and a
 * token inlined into a `run:` body is printed the first time someone turns on
 * `set -x`.
 *
 * Like `workflow.test.ts` beside it, this reads the workflow as text — no YAML
 * parser exists in the dependency tree and adding one for a test would be a
 * stack decision — and every assertion is paired with the positive fact it
 * depends on, so a deleted workflow cannot make the suite pass vacuously.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const WORKFLOWS = join(import.meta.dir, "../../.github/workflows")

function read(name: string): string {
  return readFileSync(join(WORKFLOWS, name), "utf8")
}

const workflow = read("server-image.yml")
const dockerfile = readFileSync(
  join(import.meta.dir, "../../apps/server/Dockerfile"),
  "utf8",
)

/** Every `run:` body, in step order, without needing a YAML parser. */
function runBodies(source: string): string[] {
  const lines = source.split("\n")
  const bodies: string[] = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ""
    const match = /^(\s*)run:\s*(.*)$/.exec(line)
    if (!match) continue
    const indent = match[1]?.length ?? 0
    const inline = (match[2] ?? "").trim()
    if (inline !== "" && !inline.startsWith("|") && !inline.startsWith(">")) {
      bodies.push(inline)
      continue
    }
    const body: string[] = []
    for (let next = index + 1; next < lines.length; next++) {
      const candidate = lines[next] ?? ""
      const lead = candidate.length - candidate.trimStart().length
      if (candidate.trim() !== "" && lead <= indent) break
      body.push(candidate)
    }
    bodies.push(body.join("\n"))
    index += body.length
  }
  return bodies
}

describe("the published image is gated", () => {
  test("verification runs before the build and before either push", () => {
    // AC-10 with FR-10's "runs" clause: Coolify pulls a tag and trusts it. A
    // push above the gate publishes an image the pull-request gate would have
    // rejected, and nothing downstream can tell.
    const verify = workflow.indexOf("run: bun run verify")
    const build = workflow.indexOf("docker build")
    const push = workflow.indexOf("docker push")
    expect(verify).toBeGreaterThan(-1)
    expect(build).toBeGreaterThan(-1)
    expect(push).toBeGreaterThan(-1)
    expect(verify).toBeLessThan(build)
    expect(build).toBeLessThan(push)
  })

  test("the install is frozen, so the image is the tested tree", () => {
    expect(workflow).toContain("bun install --frozen-lockfile")
    // The Dockerfile installs from the root as well: the lockfile lives there
    // and the server's dependencies are hoisted into its own `node_modules`.
    expect(dockerfile).toContain("bun install --frozen-lockfile")
    expect(dockerfile).toContain("COPY package.json bun.lock ./")
  })

  test("the image is tagged with the commit SHA", () => {
    // A moving tag would make "which code is deployed?" unanswerable, and a
    // rollback impossible. `latest` rides along for humans, never for deploys.
    // Matched as a regex: the `${{ }}` braces are literal workflow text, not a
    // template placeholder.
    expect(workflow).toContain("apex-league-server")
    expect(workflow).toContain("ghcr.io/")
    expect(workflow).toMatch(/--tag "\$IMAGE:\$\{\{ github\.sha \}\}"/)
    expect(workflow).toMatch(/docker push "\$IMAGE:\$\{\{ github\.sha \}\}"/)
  })
})

describe("the token stays out of the log", () => {
  test("no `run:` body interpolates a secret", () => {
    // NFR-3: a value that reaches the shell through `env:` is not in the
    // generated script, so `set -x` or an `echo` of the command cannot print
    // it. The positive assertions keep this from passing if the login stops
    // being wired at all.
    for (const body of runBodies(workflow)) {
      expect(body).not.toMatch(/\$\{\{\s*secrets\./)
    }
    expect(workflow).toMatch(/\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/)
    expect(workflow).toContain("--password-stdin")
    expect(workflow).toContain("GHCR_TOKEN")
  })

  test("the workflow token may write packages", () => {
    // Without `packages: write` the push is rejected, and the failure looks
    // like a registry outage rather than a permissions mistake.
    expect(workflow).toMatch(/permissions:\s*\n\s*contents:\s*read/)
    expect(workflow).toMatch(/\n\s*packages:\s*write/)
  })
})

describe("the runtime is the one the gate was written for", () => {
  test("every workflow, this one included, pins the same Bun", () => {
    // `bun check` needs 1.4.3+ and the other three workflows pin 1.4.4. A new
    // workflow on a different version would gate an image with a runtime that
    // never type-checked anything.
    const names = ["ci.yml", "deploy.yml", "nightly.yml", "server-image.yml"]
    const pins = names.map(
      (name) => /bun-version:\s*([\d.]+)/.exec(read(name))?.[1] ?? null,
    )
    expect(pins).not.toContain(null)
    expect(new Set(pins).size).toBe(1)
  })

  test("the image is built on that same Bun, not on `latest`", () => {
    // The gate and the container must agree: a floating base image means the
    // published image was never the thing the tests ran on.
    const pinned = /bun-version:\s*([\d.]+)/.exec(workflow)?.[1] ?? null
    expect(pinned).not.toBeNull()
    const froms = dockerfile.match(/^FROM\s+\S+/gm) ?? []
    expect(froms.length).toBeGreaterThan(0)
    for (const from of froms) {
      expect(from).toBe(`FROM oven/bun:${pinned}`)
    }
    expect(dockerfile).not.toMatch(/^FROM\s+\S+:latest/m)
  })
})

describe("the container is safe to run as a service", () => {
  test("it drops to the unprivileged user", () => {
    // NFR-7. The base image's `bun` user is uid 1000; `root` would leave a
    // compromised request handler owning the volume.
    expect(dockerfile).toContain("USER bun")
    expect(dockerfile).not.toMatch(/^USER root/m)
  })

  test("it reads the database path from the environment", () => {
    // FR-10. A hardcoded path would put the database inside the image, where
    // the next deploy discards it.
    expect(dockerfile).toMatch(/ENV DATABASE_PATH=/)
    expect(dockerfile).toContain("ENV PORT=")
  })

  test("the data directory is owned by the runtime user", () => {
    // The trap this track exists to close: a named volume is seeded from the
    // image's directory, so the `chown` is what makes `openDatabase` able to
    // create the file. Without it the container dies at boot - correctly, and
    // only on the first real deploy.
    expect(dockerfile).toContain("chown bun:bun /data")
    expect(dockerfile.indexOf("chown bun:bun /data")).toBeLessThan(
      dockerfile.indexOf("USER bun"),
    )
  })
})
