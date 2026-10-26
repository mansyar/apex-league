/**
 * The deploy workflow's contract (release funnel FR-1, FR-2, NFR-3, AC-2).
 *
 * `.github/workflows/deploy.yml` ships every push to `main`, and its gate is
 * the product of this track: a red build must never reach the site. These
 * assertions read the workflow source and pin the properties that keep that
 * true — step order, secret hygiene, the one place the upload target is
 * written, and the runtime the pinned `wrangler` needs. Unlike the phase-2
 * harnesses under the gitignored `.conductor/evidence/`, this file is
 * committed, so a later edit that inlines a secret or moves `Deploy` above
 * `Verify` fails a required check instead of shipping behind a green badge.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const workflow = readFileSync(
  join(import.meta.dir, "../../.github/workflows/deploy.yml"),
  "utf8",
)
const config = readFileSync(
  join(import.meta.dir, "../../wrangler.jsonc"),
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

describe("the upload is gated", () => {
  test("verification comes before the deploy step", () => {
    // AC-2: the gate protects production only while the verification step sits
    // above the upload. Reordering the two would publish a build the
    // pull-request gate would have rejected.
    const verify = workflow.indexOf("- name: Verify")
    const deploy = workflow.indexOf("- name: Deploy to Cloudflare Pages")
    expect(verify).toBeGreaterThan(-1)
    expect(deploy).toBeGreaterThan(-1)
    expect(verify).toBeLessThan(deploy)
  })

  test("the deploy step carries `if: success()`", () => {
    // The explicit condition is the gate written out in the source: the upload
    // runs only when every earlier step succeeded. `always()`, `failure()`, or
    // a `continue-on-error` on the gate would publish red builds.
    const start = workflow.indexOf("- name: Deploy to Cloudflare Pages")
    const nextStep = workflow.indexOf("\n      - ", start)
    const step = workflow.slice(start, nextStep === -1 ? undefined : nextStep)
    expect(step).toContain("if: success()")
    // The comment above names `continue-on-error` as the other route a red
    // build takes to production, so it is asserted rather than only described:
    // a `continue-on-error: true` on the gate step would let a failed
    // verification reach the upload with every assertion here still green.
    expect(workflow).not.toContain("continue-on-error")
  })

  test("the smoke check runs below the upload", () => {
    // AC-3/AC-5: the smoke check is the only step that proves the *deployed*
    // build works, and it can only do that after the upload. Deleting it, or
    // moving it above `Deploy`, would leave the funnel with no post-deploy
    // evidence while every other assertion here stayed green.
    const upload = workflow.indexOf("- name: Deploy to Cloudflare Pages")
    const smoke = workflow.indexOf("- name: Smoke check the deployed build")
    expect(smoke).toBeGreaterThan(-1)
    expect(upload).toBeLessThan(smoke)
  })

  test("no secret is interpolated inside a `run:` body", () => {
    // NFR-3: the values reach the shell through `env:` only, so nothing can
    // echo them into the Actions log — not even under `set -x`. The two
    // presence checks below keep this test from passing vacuously if the
    // secrets stop being wired at all.
    for (const body of runBodies(workflow)) {
      expect(body).not.toMatch(/\$\{\{\s*secrets\./)
    }
    expect(workflow).toMatch(/\$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN/)
    expect(workflow).toMatch(/\$\{\{\s*secrets\.CLOUDFLARE_ACCOUNT_ID/)
  })

  test("installs with --frozen-lockfile", () => {
    // A lockfile that drifts during a release run installs versions nobody
    // tested; the pinned install is what makes the deploy reproducible.
    expect(workflow).toContain("bun install --frozen-lockfile")
  })

  test("only the canonical repository deploys", () => {
    // A fork's push carries no secrets and must not attempt an upload against
    // the canonical Pages project.
    expect(workflow).toContain(
      "if: github.repository == 'mansyar/apex-league' && github.event.repository.fork == false",
    )
  })
})

describe("the job can run the pinned wrangler", () => {
  test("Node 22 is provisioned before the first wrangler call", () => {
    // wrangler's bin is `#!/usr/bin/env node` and hard-refuses anything below
    // Node 22 (`MIN_NODE_VERSION` in `node_modules/wrangler/bin/wrangler.js`),
    // while the runner image's default node is 20. Without this step every
    // wrangler call — the project check first, then the upload — dies before it
    // reaches the API, and only on the first live push.
    const setup = workflow.indexOf("actions/setup-node@v4")
    const version = workflow.indexOf("node-version: 22")
    // Only a real invocation counts — the step comments name wrangler too, and
    // a comment is not a call. `bun run deploy` is a wrangler call as well
    // (`package.json` maps it to `bunx wrangler pages deploy`) and appears
    // inline as `run: bun run deploy`, so the pattern has to allow the `run:`
    // prefix; a bare line-start anchor would miss the upload entirely. The
    // first match is the version echo, which is itself a wrangler call and so
    // is covered by the same ordering check as the project and upload calls
    // below it.
    const invoke =
      /^[ \t]*(?:run:[ \t]*)?(?:bunx wrangler|bun run deploy)/m.exec(workflow)
    const firstWrangler = invoke?.index ?? -1
    expect(setup).toBeGreaterThan(-1)
    expect(version).toBeGreaterThan(-1)
    expect(firstWrangler).toBeGreaterThan(-1)
    expect(setup).toBeLessThan(firstWrangler)
    expect(version).toBeLessThan(firstWrangler)
  })

  test("echoes the wrangler version once the dependencies are installed", () => {
    // Converts a bad runtime into a failure in seconds rather than one at the
    // upload step, after the whole gate has already run.
    expect(workflow).toContain("bunx wrangler --version")
    expect(workflow.indexOf("bun install --frozen-lockfile")).toBeLessThan(
      workflow.indexOf("bunx wrangler --version"),
    )
  })
})

describe("the runtime can actually typecheck", () => {
  // `bun check` is the type checker the three workspace `check` scripts call
  // (`"check": "bun check"` in each package.json), and it is what
  // `bun run verify` reports as the `types` layer. It landed in Bun 1.4.3.
  // On 1.4.2 the command does not exist: the script fails to spawn, prints
  // `E2BIG: /usr/bin/bash: Argument list too long`, and *then exits 0*, so
  // `bun run verify` passed without checking a single type. That is how every
  // CI run between 1.4.2's release and this fix reported "Verify (types, ...)"
  // green while no typecheck ever ran.
  const MIN_BUN = [1, 4, 3] as const

  const workflows = ["ci.yml", "deploy.yml", "nightly.yml"].map((name) => ({
    name,
    source: readFileSync(
      join(import.meta.dir, "../../.github/workflows", name),
      "utf8",
    ),
  }))

  test("every workflow pins a Bun that has `bun check`", () => {
    for (const { name, source } of workflows) {
      const match = /bun-version:\s*(\d+)\.(\d+)\.(\d+)/.exec(source)
      expect(match, `${name} pins no bun-version`).not.toBeNull()
      const parts = [Number(match?.[1]), Number(match?.[2]), Number(match?.[3])]
      // Compared part by part rather than lexically, so 1.10.0 sorts above
      // 1.4.3 once Bun reaches double digits.
      for (let index = 0; index < MIN_BUN.length; index++) {
        const pinned = parts[index] ?? 0
        const floor = MIN_BUN[index] ?? 0
        if (pinned !== floor) {
          expect(
            pinned,
            `${name} pins bun ${parts.join(".")}, which cannot run \`bun check\``,
          ).toBeGreaterThan(floor)
          break
        }
      }
    }
  })

  test("all three workflows pin the same Bun", () => {
    // `ci.yml` gates pull requests and `deploy.yml` gates production; a
    // divergence means one of them type-checks and the other does not.
    const pins = workflows.map(
      ({ source }) => /bun-version:\s*([\d.]+)/.exec(source)?.[1] ?? null,
    )
    expect(new Set(pins).size).toBe(1)
  })
})

describe("the smoke check's browser install uses the real package", () => {
  test("installs the scoped @playwright/cli, never the unscoped name", () => {
    // The `playwright-cli` command is only the *bin*. The npm package that
    // provides it is `@playwright/cli`; the unscoped `playwright-cli` is an
    // unrelated 2020 prototype (0.0.0 - 0.262.0). Installing that name at the
    // pinned version fails with `No version matching "0.1.22" found`, so the
    // browser never installs and the smoke step — the only check that proves
    // the deployed build works — is skipped behind a red step.
    expect(workflow).toContain("bun install --global @playwright/cli@")
    expect(workflow).not.toMatch(/bun install --global playwright-cli@/)
  })
})

describe("the deploy target is written in one place", () => {
  test("the upload directory is apps/client/dist", () => {
    // NFR-5: Pages publishes exactly this directory. A rename here would upload
    // a stale or empty tree while every other check stayed green.
    expect(config).toContain('"pages_build_output_dir": "apps/client/dist"')
  })

  test("the workflow reads the Pages project name from wrangler.jsonc", () => {
    // FR-1: the upload and the smoke check must agree on the target, so the
    // name is read out of the config rather than repeated in the workflow.
    // `wrangler.jsonc` alone does not pin that: this workflow's own comments
    // carry the filename, so a hardcoded project name would still satisfy a
    // plain `toContain`. These two name the real extraction and the hardcoding
    // that would replace it — the second cannot be satisfied by a comment.
    expect(workflow).toMatch(/sed -n .*wrangler\.jsonc/)
    expect(workflow).not.toContain('project="apex-league"')
  })
})
