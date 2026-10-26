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
