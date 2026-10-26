# Phase 3 — Live smoke check

- **Track:** `20261026-release-funnel` (Release Funnel)
- **Phase:** 3 — Live smoke check
- **Date:** 2026-10-26
- **Branch:** `chore/20261026-release-funnel`
- **Base commit:** `37bd7881` (conductor(plan): Mark phase 'Live smoke check' as in progress)
- **Code head commit:** `88aa3dcd` (chore(ci): run the smoke check after deploy)
- **Evidence commit:** the commit that adds this file, on the phase branch (its
  sha is reported in the phase report)
- **Result:** `partial`

> **Result in one line:** every deliverable of this phase is written, wired and
> green against a locally served **production build**; the *live* `pages.dev`
> half of AC-3 and AC-5 could not be run because **no Cloudflare Pages
> deployment exists** — the two repository secrets are the repository owner's
> to create — so it is recorded as pending, not as a pass.

---

## 1. What this phase produced

| File | Purpose |
| --- | --- |
| `scripts/smoke/smoke.ts` | The smoke check. Loads a URL in a fresh browser context, waits for the ranch to boot, drafts the first starter, asserts the ranch rendered, then reads the whole-run console and request logs and exits non-zero on any violation. |
| `scripts/smoke/probe.js` | The page-side probe, loaded with `playwright-cli run-code --filename`. It cannot be an inline argument (see §6). |
| `scripts/smoke/serve.ts` | A static file server for `apps/client/dist`, used to serve a production build over HTTP for a local run. Not used by the deploy workflow. |
| `scripts/smoke/smoke.test.ts` | 22 unit tests for the parsing, the violation rules and the URL resolution. Discovered by the normal `bun test` run. |
| `.github/workflows/deploy.yml` | Two steps added **after** the deploy step: install the browser, then run the smoke check against the deployed URL. |

Nothing under `packages/`, `apps/` or the client runtime was touched
(`git diff --stat 37bd7881 -- packages/ apps/` → empty).

---

## 2. The smoke script, in full

### 2.1 `scripts/smoke/smoke.ts`

```ts
/**
 * Live smoke check for the deployed build.
 *
 * Loads a URL in a fresh browser context, waits for the ranch to boot, drafts
 * the first starter, and asserts the ranch actually rendered. Then it reports
 * every console message and every network request from the whole run, and
 * fails on a console error, a console warning, or a request that did not
 * succeed.
 *
 * A 200 on `index.html` is not evidence the game works: the bundle, the CSS,
 * the audio and the fonts all have to resolve too, and the only place that
 * shows up is the browser's own request log.
 *
 *   bun scripts/smoke/smoke.ts --url https://apex-league.pages.dev
 *   SMOKE_URL=http://127.0.0.1:4173 bun scripts/smoke/smoke.ts
 *   bun scripts/smoke/smoke.ts        # https://<wrangler project>.pages.dev
 *
 * Exit 0: clean. Exit 1: a violation or the check could not run.
 */

import { mkdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

/** Boot fetches and parses the bundle; be generous on a cold CI runner. */
const BOOT_TIMEOUT_MS = 60_000
const DRAFT_TIMEOUT_MS = 30_000
const POLL_INTERVAL_MS = 250
const CLI_TIMEOUT_MS = 120_000

/** Asset kinds AC-3 names. A 404 on any of them fails the run. */
export const ASSET_EXTENSIONS = [
  ".js",
  ".mjs",
  ".css",
  ".glb",
  ".ogg",
  ".mp3",
  ".woff",
  ".woff2",
  ".ttf",
  ".wasm",
]

/** The smallest canvas the ranch scene can plausibly draw into. */
const MIN_CANVAS = { width: 300, height: 200 }

export interface Probe {
  bootPlate: boolean
  starterOverlay: boolean
  canvas: { width: number; height: number } | null
  hudStack: boolean
  hudNodes: number
  title: string
}

export interface ConsoleReport {
  total: number
  errors: number
  warnings: number
  lines: string[]
}

export interface RequestLine {
  url: string
  status: string
}

export interface RunResult {
  probe: Probe
  console: ConsoleReport
  requests: RequestLine[]
}

export class SmokeError extends Error {}

function fail(message: string): never {
  throw new SmokeError(message)
}

function log(message: string): void {
  console.log(`smoke: ${message}`)
}

/**
 * The probe lives in `probe.js`, next to this file, and is passed to the CLI
 * with `run-code --filename`. It cannot be an inline argument: on Windows the
 * CLI is a `.cmd` shim and Bun refuses to pass page-sized code containing
 * cmd.exe metacharacters through one.
 */
const PROBE_FILE = resolve(import.meta.dir, "probe.js")

/** The CLI prints JSON for most commands, sometimes wrapped in other lines. */
function parseJson(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

/** `{"result": "..."}` → the string; anything else → the text as printed. */
export function resultText(text: string): string {
  const parsed = parseJson(text)
  if (parsed && typeof parsed === "object" && "result" in parsed) {
    const result = (parsed as { result: unknown }).result
    return typeof result === "string" ? result : JSON.stringify(result)
  }
  return text
}

/** `Total messages: 3 (Errors: 1, Warnings: 1)` plus the `[ERROR]` lines. */
export function parseConsoleReport(text: string): ConsoleReport {
  const body = resultText(text)
  const header =
    /Total messages: (\d+) \(Errors: (\d+), Warnings: (\d+)\)/.exec(body)
  if (!header) fail(`could not read the console report:\n${body}`)
  return {
    total: Number(header[1]),
    errors: Number(header[2]),
    warnings: Number(header[3]),
    lines: body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("[")),
  }
}

/** `1. [GET] https://host/x.js => [200] ` → `{ url, status }`. */
export function parseRequests(text: string): RequestLine[] {
  const body = resultText(text)
  const lines: RequestLine[] = []
  for (const raw of body.split("\n")) {
    const match = /^\d+\.\s+\[(\w+)\]\s+(\S+)\s+=>\s+\[([^\]]*)\]/.exec(
      raw.trim(),
    )
    if (match) lines.push({ url: match[2] ?? "", status: match[3] ?? "" })
  }
  return lines
}

export function isAssetRequest(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase()
  return ASSET_EXTENSIONS.some((ext) => path.endsWith(ext))
}

export function statusOk(status: string): boolean {
  return /^[23]\d\d$/.test(status)
}

/** Every rule this run has to satisfy. Empty means the build is sound. */
export function violations(result: RunResult): string[] {
  const found: string[] = []
  const { probe, console: report, requests } = result

  if (probe.bootPlate) found.push("the boot plate never went away")
  if (probe.starterOverlay) {
    found.push("the starter picker was still open after drafting")
  }
  const canvas = probe.canvas
  if (
    !canvas ||
    canvas.width < MIN_CANVAS.width ||
    canvas.height < MIN_CANVAS.height
  ) {
    found.push(`the ranch canvas did not render (${JSON.stringify(canvas)})`)
  }
  if (!probe.hudStack || probe.hudNodes === 0) {
    found.push("no HUD element rendered inside .hud-stack")
  }
  if (report.errors > 0) found.push(`${report.errors} console error(s)`)
  if (report.warnings > 0) found.push(`${report.warnings} console warning(s)`)
  for (const line of requests) {
    if (statusOk(line.status)) continue
    const kind = isAssetRequest(line.url) ? "asset request" : "request"
    found.push(`${kind} failed: ${line.status} ${line.url}`)
  }
  return found
}

/** The Pages project name is the one place the deploy target is written. */
export function projectName(config: string): string {
  const name = /"name"\s*:\s*"([^"]+)"/.exec(config)?.[1]
  if (!name) fail("could not read the Pages project name from wrangler.jsonc")
  return name
}

/** `--url` wins, then `SMOKE_URL`, then the Pages project from wrangler. */
export function targetUrl(
  argv: string[],
  env: Record<string, string | undefined>,
  config: string,
): string {
  const at = argv.indexOf("--url")
  const fromFlag = at === -1 ? undefined : argv[at + 1]
  const url =
    fromFlag ?? env.SMOKE_URL ?? `https://${projectName(config)}.pages.dev`
  if (!/^https?:\/\//.test(url)) fail(`not an http(s) URL: ${url}`)
  return url.replace(/\/$/, "")
}

function cli(binary: string, args: string[]): string {
  const proc = Bun.spawnSync([binary, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    timeout: CLI_TIMEOUT_MS,
  })
  const stdout = proc.stdout.toString()
  const stderr = proc.stderr.toString()
  if (proc.exitCode !== 0) {
    // A failed command still prints a JSON envelope, and the reason is in
    // `result.error`. Falling back to the first line of raw output reports a
    // bare `{`, which is how a 404 turns into an unreadable failure.
    const envelope = parseJson(stdout) as {
      result?: { error?: unknown }
    } | null
    const reported = envelope?.result?.error
    const detail =
      typeof reported === "string"
        ? reported.split("\n")[0]
        : (stderr.trim() || stdout.trim() || "(no output)").split("\n")[0]
    fail(`playwright-cli ${args[1] ?? args[0]} failed: ${detail}`)
  }
  return stdout
}

function resolveCli(): string {
  for (const name of ["playwright-cli", "playwright-cli.cmd"]) {
    const probe = Bun.spawnSync([name, "--version"], {
      stdout: "ignore",
      stderr: "ignore",
      timeout: 30_000,
    })
    if (probe.exitCode === 0) return name
  }
  return fail("playwright-cli is not on PATH")
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

async function waitFor(
  label: string,
  timeoutMs: number,
  attempt: () => Promise<boolean>,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (await attempt()) return
    if (Date.now() > deadline) {
      fail(`${label} did not happen within ${timeoutMs / 1000}s`)
    }
    await sleep(POLL_INTERVAL_MS)
  }
}

export async function runSmoke(
  binary: string,
  url: string,
  session: string,
): Promise<RunResult> {
  const call = (...args: string[]) => cli(binary, [`-s=${session}`, ...args])
  const probe = (): Probe => {
    const out = call("run-code", `--filename=${PROBE_FILE}`, "--json")
    // The page returns a JSON string; the CLI wraps it in its own envelope.
    const text = resultText(out)
    try {
      return JSON.parse(text) as Probe
    } catch {
      fail(`could not read the page probe:\n${out}`)
    }
  }
  const gather = (): RunResult => ({
    probe: probe(),
    console: parseConsoleReport(call("console", "--json")),
    requests: parseRequests(call("requests", "--static", "--json")),
  })

  log(`opening ${url}`)
  call("open", url, "--json")
  // Fresh session, fresh profile: the picker only appears when no save exists,
  // so inheriting a prior localStorage would silently skip the draft step.
  const stored = resultText(call("localstorage-list", "--json"))
  if (!/No localStorage items found/.test(stored)) {
    fail(`the browser context was not empty:\n${stored}`)
  }

  try {
    await waitFor("the ranch to boot", BOOT_TIMEOUT_MS, async () => {
      const state = probe()
      return !state.bootPlate && state.canvas !== null
    })

    // The picker is appended after the scene and the HUD, so it can trail the
    // boot plate by a frame or two on a cold machine.
    await waitFor("the starter picker to open", BOOT_TIMEOUT_MS, async () => {
      return probe().starterOverlay
    })
    // The picker focuses its first card on open, so Enter drafts it without
    // depending on which species happens to be listed first.
    call("press", "Enter")

    await waitFor(
      "the drafted starter to reach the ranch",
      DRAFT_TIMEOUT_MS,
      async () => {
        const state = probe()
        return !state.starterOverlay && state.hudStack && state.canvas !== null
      },
    )
  } catch (error) {
    // A run that stops early still owes the reason. A build that 404s its
    // bundle looks exactly like a slow boot until the request log is read, and
    // that log is the whole point of the check.
    const found = violations(gather())
    const message = error instanceof Error ? error.message : String(error)
    fail(found.length > 0 ? `${message} — ${found.join("; ")}` : message)
  }

  return gather()
}

function screenshot(binary: string, session: string, path: string): void {
  mkdirSync(dirname(path), { recursive: true })
  cli(binary, [`-s=${session}`, "screenshot", `--filename=${path}`])
  log(`screenshot ${path}`)
}

export async function main(argv: string[]): Promise<number> {
  const config = readFileSync(
    resolve(import.meta.dir, "../../wrangler.jsonc"),
    "utf8",
  )
  const url = targetUrl(argv, process.env, config)
  const binary = resolveCli()
  const session = `smoke-${Date.now().toString(36)}`
  const shotAt = argv.indexOf("--screenshot")
  const shotPath = shotAt === -1 ? undefined : argv[shotAt + 1]

  let result: RunResult | null = null
  let error: string | null = null
  try {
    result = await runSmoke(binary, url, session)
    if (shotPath) screenshot(binary, session, shotPath)
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  } finally {
    Bun.spawnSync([binary, `-s=${session}`, "close"], {
      stdout: "ignore",
      stderr: "ignore",
      timeout: 30_000,
    })
  }

  if (!result) {
    log(`target ${url}`)
    log("RESULT fail (the check could not complete)")
    log(error ?? "unknown error")
    console.log(JSON.stringify({ smoke: "fail", target: url, reason: error }))
    return 1
  }

  const found = violations(result)
  const assets = result.requests.filter((line) => isAssetRequest(line.url))
  const failed = result.requests.filter((line) => !statusOk(line.status))
  const kinds = new Map<string, number>()
  for (const line of assets) {
    const ext = new URL(line.url).pathname.split(".").pop() ?? "?"
    kinds.set(ext, (kinds.get(ext) ?? 0) + 1)
  }

  log(`target ${url}`)
  log(
    `boot ok · title "${result.probe.title}" · canvas ` +
      `${result.probe.canvas?.width}x${result.probe.canvas?.height} · ` +
      `hud ${result.probe.hudNodes} nodes`,
  )
  log(
    `console messages ${result.console.total} · errors ` +
      `${result.console.errors} · warnings ${result.console.warnings}`,
  )
  log(
    `requests ${result.requests.length} · failed ${failed.length} · assets ` +
      `${[...kinds].map(([ext, n]) => `${ext}=${n}`).join(" ")}`,
  )
  for (const line of result.console.lines) log(`console ${line}`)
  for (const line of found) log(`violation ${line}`)
  log(`RESULT ${found.length === 0 ? "pass" : "fail"}`)
  console.log(
    JSON.stringify({
      smoke: found.length === 0 ? "pass" : "fail",
      target: url,
      canvas: result.probe.canvas,
      hudNodes: result.probe.hudNodes,
      console: {
        total: result.console.total,
        errors: result.console.errors,
        warnings: result.console.warnings,
      },
      requests: result.requests.length,
      failedRequests: failed.length,
      assets: Object.fromEntries(kinds),
      violations: found,
    }),
  )
  return found.length === 0 ? 0 : 1
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)))
```

### 2.2 `scripts/smoke/probe.js`

```js
/**
 * The page probe the smoke check polls with.
 *
 * `playwright-cli` is a `.cmd` shim on Windows, and Bun refuses to pass an
 * argument containing cmd.exe metacharacters through one. A probe written
 * inline is a page-sized string full of brackets, so it lives in this file and
 * is loaded with `run-code --filename` instead.
 *
 * Invoked with the page; returns the probe object, which the CLI prints as
 * JSON under `result`.
 *
 * biome-ignore format: this file is evaluated as one bare expression, so the
 * formatter's defensive leading semicolon would break it.
 */
async (page) => {
  return await page.evaluate(() => {
    const canvas = document.querySelector("#app canvas")
    const box = canvas ? canvas.getBoundingClientRect() : null
    const hud = document.querySelector(".hud-stack")
    let hudNodes = 0
    if (hud) {
      for (const el of hud.querySelectorAll("*")) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) hudNodes += 1
      }
    }
    // The graduation flow reuses `starter-overlay` for its own card row, so
    // the draft picker is the one without that extra class.
    const picker = [...document.querySelectorAll(".starter-overlay")].some(
      (el) => !el.classList.contains("graduation-overlay"),
    )
    return {
      bootPlate: Boolean(document.getElementById("boot-plate")),
      starterOverlay: picker,
      canvas: box
        ? { width: Math.round(box.width), height: Math.round(box.height) }
        : null,
      hudStack: Boolean(hud),
      hudNodes,
      title: document.title,
    }
  })
}
```

`scripts/smoke/serve.ts` (the local static server) and
`scripts/smoke/smoke.test.ts` (the 22 unit tests) are committed in full at
those paths; they are quoted here only in summary to keep this report
readable.

---

## 3. Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (phase verification command) | `bun test --check --parallel=4 --timeout 120000` | **0** | 2829 pass, 1 skip, 0 fail — 2830 tests across 241 files, 267382 `expect()` calls, 63.60 s. Includes the 22 new `scripts/smoke/smoke.test.ts` tests. |
| static | `bun run verify` | **0** | `bun run check`: voxel 118 / sim 151 / client 389 files, no type errors. `bun test`: 2829 pass / 1 skip / 0 fail. `biome check`: 646 files, 1 pre-existing warning (`apps/client/src/ranch.css:1429`, `noDescendingSpecificity`, present before this phase). `gate:determinism`: 27 creature GLBs + 5 props byte-identical. |
| static | `bunx biome check scripts/smoke` | **0** | 4 files checked, no findings — the linter and formatter do cover `scripts/`. |
| static | `bun run build` | **0** | vite 8.3.4, 314 modules, `dist/index.html` 2.13 kB, `dist/assets/index-DdmaZZpS.css` 66.67 kB, `dist/assets/index-CI37K-Je.js` 916.63 kB — byte-identical asset names and sizes to Phase 1 and Phase 2. The >500 kB advisory is pre-existing. |
| visual (local production build) | `bun test ./.conductor/evidence/20261026-release-funnel/phase-3-local.test.ts` | **0** | 2 pass, 0 fail, 90.56 s: (a) the real smoke check against the real `apps/client/dist` served over HTTP → **pass**; (b) the same build with `assets/` removed → **exit 1**, with the 404 named. |
| visual (dev server, informational) | `playwright-cli` against `bun run dev` on `http://localhost:5176` | 0 | Starter picker and ranch both render, console clean (0 errors / 0 warnings) — used to confirm the DOM contract before writing the probe. |

The visual layer was run against a **built** artifact, not the dev server. The
dev server was started only to read the DOM contract and was stopped again
(§10).

---

## 4. The smoke run's actual output, verbatim

### 4.1 Against the production build served over HTTP — **pass**

```
smoke: opening http://localhost:60183
smoke: screenshot D:\Projects\battle-pets\.conductor\evidence\20261026-release-funnel\phase-3-smoke-local.png
smoke: target http://localhost:60183
smoke: boot ok · title "Apex League" · canvas 1280x720 · hud 130 nodes
smoke: console messages 0 · errors 0 · warnings 0
smoke: requests 4 · failed 0 · assets js=1 css=1 ogg=1
smoke: RESULT pass
{"smoke":"pass","target":"http://localhost:60183","canvas":{"width":1280,"height":720},"hudNodes":130,"console":{"total":0,"errors":0,"warnings":0},"requests":4,"failedRequests":0,"assets":{"js":1,"css":1,"ogg":1},"violations":[]}
```

The four requests were the document, `assets/index-CI37K-Je.js`,
`assets/index-DdmaZZpS.css` and `audio/music/ranch.ogg`, all `200`/`206`.

The same run was repeated at the phase head (`9519b38a`) and produced the same
result on a different ephemeral port (`http://localhost:56819`): `canvas
1280x720 · hud 130 nodes`, `console messages 0 · errors 0 · warnings 0`,
`requests 4 · failed 0 · assets js=1 css=1 ogg=1`, `RESULT pass`; the
deliberately broken copy failed again with the two 404s named. The port in the
quoted output above is the first run's.

Screenshot: `.conductor/evidence/20261026-release-funnel/phase-3-smoke-local.png`
— the ranch after the draft: voxel terrain, trees and rocks, the baby **Ember
Drake** in the middle, the day-phase score bug, the lineage plate, the
onboarding callout, the creature stat plate and the actions dock. The HUD is
present and populated (130 visible nodes inside `.hud-stack`).

### 4.2 Against the same build with its bundle removed — **fail**, exit 1

This is the run that shows the check is not a rubber stamp. The copy of
`apps/client/dist` had `assets/` deleted, so the bundle and the stylesheet
404 — exactly the "deployed build that 404s its assets" failure AC-3 exists to
catch.

```
smoke: opening http://localhost:62843
smoke: target http://localhost:62843
smoke: RESULT fail (the check could not complete)
smoke: the ranch to boot did not happen within 60s — the boot plate never went away; the ranch canvas did not render (null); no HUD element rendered inside .hud-stack; 2 console error(s); asset request failed: 404 http://localhost:62843/assets/index-CI37K-Je.js; asset request failed: 404 http://localhost:62843/assets/index-DdmaZZpS.css
{"smoke":"fail","target":"http://localhost:62843","reason":"the ranch to boot did not happen within 60s — the boot plate never went away; the ranch canvas did not render (null); no HUD element rendered inside .hud-stack; 2 console error(s); asset request failed: 404 http://localhost:62843/assets/index-CI37K-Je.js; asset request failed: 404 http://localhost:62843/assets/index-DdmaZZpS.css"}
```

Exit code 1. The failure names the 404s rather than leaving them in a log
line, and it is raised as a non-zero exit, so the deploy workflow step fails.

---

## 5. Was there a live URL? — No, and here is the proof

P3.T2.2 asked for a run against a **real** URL, preferring the live `pages.dev`
address. Before assuming, I checked whether a deployment exists at all:

1. **DNS:** `https://apex-league.pages.dev/` does not resolve
   (`getaddrinfo ENOTFOUND apex-league.pages.dev`). `https://pages.dev/`,
   `https://cloudflare.com/` and `https://example.com/` all returned 200 from
   the same client, so the failure is specific to the project subdomain.
2. **The workflow has never been on `main`.** `git rev-parse main` →
   `02ff20c9`, which is the commit *before* this track's first change.
   `.github/workflows/deploy.yml` was created by `bb9a3c89` on this branch, so
   it has never run and has never uploaded anything.
3. **The secrets are the owner's to create.** `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` are repository secrets that do not exist in this
   environment. Phase 2's evidence recorded the same gap for AC-1.

So the live half of AC-3 and AC-5 is **pending the repository owner's
credentials**, exactly as Phase 2 left AC-1 and AC-8 pending. What *is* proven
here is the script and the artifact: the same script, the same assertions and
the same exit codes, run against the real production build over real HTTP.

The live run needs no further work from the script — the first push of this
branch to `main` will deploy and then run the smoke step against
`https://apex-league.pages.dev` with no arguments, because the script derives
the URL from the Pages project name in `wrangler.jsonc`.

---

## 6. The deploy workflow diff

```diff
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -117,3 +117,21 @@ jobs:
         # HEAD, wrangler would read the branch as "HEAD" and publish a preview
         # deployment instead of production.
         run: bun run deploy -- --branch "${{ github.ref_name }}"
+
+      # `playwright-cli` is the project's visual layer (conductor/workflow.md),
+      # not a library the app imports, so it is installed into the runner at a
+      # pinned version instead of becoming a dependency. `bun run verify` never
+      # needs it; only this step and the one below do.
+      - name: Install the smoke check's browser
+        run: |
+          bun install --global playwright-cli@0.1.22
+          playwright-cli install-browser chromium --with-deps
+
+      # The only check that proves the *deployed* build works. It runs after
+      # the upload (default `success()` condition, so it cannot run when the
+      # deploy failed) and loads the production URL itself, so a missing GLB or
+      # a base-path mistake shows up here rather than on a visitor's screen.
+      # The URL is not repeated: `scripts/smoke/smoke.ts` reads the Pages
+      # project name from `wrangler.jsonc`, the same file the upload used.
+      - name: Smoke check the deployed build
+        run: bun scripts/smoke/smoke.ts
```

Notes on the wiring:

- **It is after the deploy step.** The smoke step is the last step in the job.
- **It cannot pass when the deploy failed.** Steps default to `if: success()`,
  so a failed `bun run verify`, a failed `bun run build`, a missing secret, a
  failed project creation or a failed `wrangler pages deploy` all stop the job
  before the smoke step runs. The deploy step's own `if: success()` was left
  as it was, and no step was reordered, removed or made non-blocking.
- **No new dependency.** `playwright-cli` is not in any `package.json`; it is
  the project's existing visual-layer CLI (per `conductor/workflow.md`,
  `visual: "playwright-cli"`), installed into the runner at the pinned
  version `0.1.22` — the same version on the maintainer's machine. The client
  bundle is untouched by it.
- **The URL is not duplicated.** `scripts/smoke/smoke.ts` reads the Pages
  project name from `wrangler.jsonc`, the same file the upload used, so the
  two cannot drift apart.
- `--with-deps` was added to `install-browser` because a GitHub runner does
  not have Chromium's shared libraries preinstalled.

---

## 7. Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| **AC-3** | "Live URL loads with zero failed network requests for JS/CSS/GLB/font assets, verified in Playwright request log" (FR-3) | The check reads the browser's own request log (`playwright-cli requests --static`) over the whole run and fails on any non-2xx/3xx, with asset failures named separately (§4.2 shows a 404 on `.js` and `.css` failing the run). Against the production build served over HTTP: 4 requests, **0 failed**, `assets js=1 css=1 ogg=1` (§4.1). The step is wired to the deployed URL in `deploy.yml` (§6). | **Partial — in-repo pass, live URL pending.** The run was against a **locally served production build** (`http://localhost:60183`), *not* the live `pages.dev` URL: no deployment exists (§5). The live half cannot be proven until the owner adds the two secrets and the branch is pushed to `main`. |
| **AC-5** | "Playwright smoke run drafts starter and asserts rendered ranch plus clean console, output recorded as phase evidence" (FR-5) | The run waits for the picker, presses Enter on the focused first card, waits for the picker to close, and asserts a non-zero canvas (1280×720) plus a populated `.hud-stack` (130 visible nodes). Console: **0 messages, 0 errors, 0 warnings**. Output is quoted verbatim in §4.1 and the screenshot is at `.conductor/evidence/20261026-release-funnel/phase-3-smoke-local.png`. | **Partial — in-repo pass, live URL pending.** Same run as AC-3: the production build over local HTTP, not the live URL (§5). |

Supporting criteria:

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-5 (wiring) | "Playwright smoke check loads live URL, drafts starter, asserts ranch renders with no console errors/warnings" | `scripts/smoke/smoke.ts` + the two new `deploy.yml` steps (§6) | Pass in-repo; the live run happens on the first push to `main`. |
| NFR-1 | "No game behaviour change, nothing under `packages/` or client runtime changes, `SAVE_VERSION` stays 25" | `git diff --stat 37bd7881 -- packages/ apps/` → empty. `packages/sim/src/save/schema.ts:5` still reads `export const SAVE_VERSION = 25`. The client runtime is byte-identical: the same three build outputs with the same names and sizes as Phase 1 and Phase 2 (§3). | Pass |
| NFR-5 | "Production artifact is static files only — no server process, no runtime env vars read by client" | `apps/client/dist` is 25 files: `index.html`, one CSS, one JS and 21 `.ogg` files plus `audio/CREDITS.md`. There is no `_worker.js`, no `functions/` directory and no server entry point; `wrangler.jsonc` sets `pages_build_output_dir` to `apps/client/dist`, so `wrangler pages deploy` uploads exactly those static files. The client reads no runtime env var: the only env-driven config in the client is `DEV_ALLOWED_HOSTS`, which is the dev server's host allowlist (Phase 1) and is not read by the production bundle. | Pass |

---

## 8. Static-only and no-behaviour-change audit (P3.T3)

- **Static files only.** `apps/client/dist` holds 25 files, all static. Nothing
  in the repo builds a server artefact for the client, and `wrangler pages
  deploy` uploads `apps/client/dist` as-is. The smoke check confirms this
  from the outside: the served build booted, rendered and served its audio
  over plain HTTP with no server process anywhere.
- **`SAVE_VERSION` unchanged.** `packages/sim/src/save/schema.ts:5` —
  `export const SAVE_VERSION = 25`.
- **Nothing under `packages/` or the client runtime changed this phase.**
  `git diff --stat 37bd7881 -- packages/ apps/` prints nothing. The phase only
  added `scripts/smoke/**` and two steps in `.github/workflows/deploy.yml`.
- **Does `bun run check` cover `scripts/`? No.** `bun run check` is
  `bun run --filter '*' check`, which runs the three workspace typechecks
  (voxel 118, sim 151, client 389 files) and their `tsconfig` `include` lists
  do not mention `scripts/`. The file counts are identical to Phase 2, which
  ran before `scripts/` existed — proof that `scripts/` is not typechecked.
  `scripts/` was **not** added to any `tsconfig` (out of `Touches`, and it
  would pull the script into the app's type surface).
- **Does `biome check` cover `scripts/`? Yes.** `biome.json` includes `**`
  and excludes only `artifacts` and `conductor/**/*.html`, so `scripts/` is
  checked and formatted. The evidence: the file count in `biome check` went
  from 642 files (Phase 2, no `scripts/`) to 643 (one file), 644, 645 and
  finally **646 files** (the four committed files), and `bunx biome check
  scripts/smoke` reports `Checked 4 files … No fixes applied`. The formatter
  did find real issues while the script was being written (import order, line
  wrapping) and they were fixed with `biome check --write`.
- **Unit tests do cover `scripts/`.** `bun test` discovers
  `scripts/smoke/smoke.test.ts` without any path filter: the phase run went
  from 2808 tests / 240 files (Phase 2) to **2830 tests / 241 files**, i.e.
  the 22 new tests are part of the required verification command and will
  fail the build if a rule is broken. (Phase 2's harnesses were gitignored
  and therefore unprotected; these are not.)
- **`ci.yml` was not touched.** It is not in the diff.

---

## 9. Deviations

None. Both changed paths are inside the phase's `Touches`
(`scripts/smoke/**`, `.github/workflows/deploy.yml`). No `package.json`,
`bun.lock`, `tsconfig`, `wrangler.jsonc` or `ci.yml` change was needed, and
no dependency was added to the repository: `playwright-cli` is installed into
the CI runner by the workflow and is already the project's visual-layer tool.

---

## 10. Notes

- **The `starter-overlay` trap.** The first version of the probe reported
  "the picker is still open" forever. The graduation flow reuses the
  `starter-overlay`, `starter-grid` and `starter-card` classes for its own
  (permanently hidden) card row, so a plain `.starter-overlay` selector
  matches two elements. The probe now distinguishes the draft picker by the
  absence of `graduation-overlay`. This is worth knowing before anyone else
  writes a selector against that class.
- **`run-code --filename`, not an inline argument.** `playwright-cli` is a
  `.cmd` shim on Windows and Bun refuses to pass an argument containing
  cmd.exe metacharacters (`>`, `&`, `|`) through one, so any page-sized inline
  probe is rejected with
  `The argument 'args[3]' contains a cmd.exe special character`. The probe
  therefore lives in `scripts/smoke/probe.js` and is loaded by path. The same
  constraint is why the probe file carries a `biome-ignore format` comment:
  the formatter's defensive leading semicolon makes the file invalid as a
  bare expression.
- **A failing CLI command still prints JSON on stdout.** The first version of
  the error handler took the first line of raw output, which for a failed
  command is a bare `{`. The handler now reads `result.error` out of the
  envelope, which is why the failure in §4.2 is readable.
- **A broken build looks like a slow boot** until the request log is read, so
  the error path gathers the console and request logs before it gives up and
  appends them to the reason.
- **206 counts as success.** Audio is fetched with range requests, so the
  status check accepts the whole 2xx and 3xx range.
- **Local server.** The dev server used for the DOM-contract check was
  started on `http://localhost:5176` (5173–5175 were already in use) and was
  **stopped** (PID 26104, `taskkill /F /T /PID 26104`; the port no longer
  answers and `playwright-cli list` reports no browsers). The static server
  used for the production-build run is spawned per test and killed in the
  harness's `finally`; no server is left running. `playwright-cli` sessions
  are closed by the script itself.
- **Screenshots and harnesses** live under `.conductor/evidence/`, which is
  gitignored, as the workflow prescribes. The committed unit tests under
  `scripts/smoke/smoke.test.ts` are the part that is protected against
  regression.
- **Owner steps to close the remaining gap** (unchanged from Phase 2, plus
  this phase's step): create the Cloudflare account and a Pages:Edit API
  token, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
  repository secrets, and push the branch to `main`. The deploy job then
  uploads `apps/client/dist` and runs this smoke check against
  `https://apex-league.pages.dev`; its output lands in the job log, which is
  the recorded evidence for the live half of AC-3 and AC-5.

## Primary verification

Date: 2026-10-26
By: Conductor primary, independent of the subagent report.

**Squash guard.** `git log 37bd7881..HEAD` = exactly the 6 reported commits
(`8acd79f9` test(smoke) script; `88aa3dcd` chore(ci) workflow wiring;
`b12d5adf`, `5383ec00`, `9519b38a`, `e3a0a226` evidence-only).
`git rev-list --parents -n 1` on each shows exactly one parent: all linear, no
merges, no unreported and no user commits. Squash is safe.

**Files changed.** `git diff --name-only 37bd7881..HEAD` = 6 paths — four under
`scripts/smoke/` (`smoke.ts`, `probe.js`, `serve.ts`, `smoke.test.ts`), the
`deploy.yml` wiring, and the evidence file. All inside `Touches`.
`git diff --stat 37bd7881..HEAD -- .github/workflows/ci.yml` is empty,
`-- packages/ apps/` is empty, and `SAVE_VERSION` is still 25 at
`packages/sim/src/save/schema.ts:5` — NFR-1 and NFR-5 hold, this phase touched
no game code.

**Independent gates.**

| Gate | Result |
| --- | --- |
| `bun run test:phase` | exit 0 — 2829 pass, 1 skip, 0 fail, 267,382 expect() calls, **2830 tests across 241 files**, 79.66s |
| `bun run verify` | exit 0 — typecheck clean, Biome clean, determinism gate OK (27 GLBs + 5 props byte-identical) |
| `bun run build` | exit 0 — pre-existing >500 kB chunk advisory only |
| `bun test scripts/smoke/smoke.test.ts` | exit 0 — 22 pass, 0 fail, 35 expect() calls |
| `bunx biome check scripts` | exit 0 — checked 4 files, no fixes applied |

Test arithmetic: 2808/240 → 2830/241. The 22 new tests are **inside the required
gate**, so unlike Phase 2's gitignored harnesses this phase leaves real
regression protection behind. `smoke.test.ts` covers the pass/fail decision
logic, the CLI report parsers, and target-URL resolution — i.e. the parts that
can silently rot.

**Independent run of the smoke check itself** (the point of the phase, so I ran
it rather than reading about it). I built the client, served the real
`apps/client/dist` over HTTP with the phase's own `serve.ts`, and ran the script:

```
smoke: boot ok · title "Apex League" · canvas 1280x720 · hud 130 nodes
smoke: console messages 0 · errors 0 · warnings 0
smoke: requests 4 · failed 0 · assets js=1 css=1 ogg=1
smoke: RESULT pass
```

exit 0.

**Independent negative test.** A smoke check that cannot fail is worthless, so I
broke the artifact deliberately: moved `assets/index-CI37K-Je.js` aside and
re-ran against the same server.

```
smoke: RESULT fail (the check could not complete)
smoke: ... 1 console error(s); asset request failed: 404 http://127.0.0.1:5188/assets/index-CI37K-Je.js
```

exit 1, naming the exact asset. The script catches the failure mode that would
otherwise ship silently. I restored the file, confirmed `apps/client/dist` is
back to 25 files, and stopped the server — `git status --porcelain` is empty.

**Script hygiene.** Both `smoke.ts` and `serve.ts` guard their side effects
behind `if (import.meta.main)`, so importing them in tests starts no server and
binds no port. No new dependency was added: `playwright-cli` 0.1.22 is the
project's existing visual-layer tool and appears in no `package.json`.

**AC status as accepted.**

| AC | Primary reading |
| --- | --- |
| AC-3 | **In-repo pass, live credential-pending.** The request-log check exists and is proven — it reported `requests 4 · failed 0` against the production build and caught a 404 asset in the negative test. But AC-3's wording is "**the live URL** loads with zero failed network requests", and no live URL exists: `https://apex-league.pages.dev/` does not resolve, and `git rev-parse main` is `02ff20c9`, i.e. before this track, so `deploy.yml` has never been on `main` and has never run. Recorded as pending, not as a pass. |
| AC-5 | **Pass.** Its wording is "the Playwright smoke run drafts a starter and asserts a rendered ranch plus a clean console, with output recorded as phase evidence" — it does not require the live URL, and that is exactly what ran: boot, starter drafted, canvas 1280×720, 130 HUD nodes, 0 console messages, output recorded here. |
| FR-3, FR-5, NFR-1, NFR-5 | Pass — NFR-1 and NFR-5 by measurement (no `packages/` or `apps/` change, save v25, 25 static files, no `_worker.js` or `functions/`). |

**Correction to my own earlier reading.** When I described the spec to you I said
only AC-1 and AC-8 need live credentials. That was imprecise: AC-3's "live URL"
also cannot be satisfied without a real deploy. The spec's written assumption
("The track is complete and verifiable in the repository without it; only the
live deploy needs the secrets") stays accurate, but the set of ACs whose live
half is deferred is **AC-1, AC-3 (live half), and AC-8 (live half)**. Recorded
here so the review and the eventual live verification do not overstate what was
proven.

**Result:** phase accepted. The smoke check exists, is wired after the deploy so
it cannot run against a failed one, is covered by 22 committed tests, passes
against the real production artifact, and demonstrably fails against a broken
one. The live-URL halves of AC-3 and AC-8 remain blocked on repository secrets
that only the owner can create.
