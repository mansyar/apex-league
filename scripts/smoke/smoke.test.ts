import { describe, expect, test } from "bun:test"
import {
  isAssetRequest,
  main,
  parseConsoleReport,
  parseRequests,
  projectName,
  type RunResult,
  statusOk,
  targetUrl,
  violations,
} from "./smoke"

const HEALTHY: RunResult = {
  probe: {
    bootPlate: false,
    starterOverlay: false,
    canvas: { width: 1280, height: 720 },
    hudStack: true,
    hudNodes: 42,
    title: "Apex League",
  },
  console: { total: 0, errors: 0, warnings: 0, lines: [] },
  requests: [
    { url: "https://apex-league.pages.dev/", status: "200" },
    {
      url: "https://apex-league.pages.dev/assets/index-CI37K-Je.js",
      status: "200",
    },
    {
      url: "https://apex-league.pages.dev/assets/index-DdmaZZpS.css",
      status: "200",
    },
    {
      url: "https://apex-league.pages.dev/audio/music/ranch.ogg",
      status: "200",
    },
  ],
}

const withResult = (patch: Partial<RunResult>): RunResult => ({
  ...HEALTHY,
  ...patch,
})

describe("the run is clean only when everything resolved", () => {
  test("a rendered ranch with no failures passes", () => {
    expect(violations(HEALTHY)).toEqual([])
  })

  test("a 404 on a GLB fails, and is named as an asset", () => {
    const found = violations(
      withResult({
        requests: [
          ...HEALTHY.requests,
          {
            url: "https://apex-league.pages.dev/pets/draconic.glb",
            status: "404",
          },
        ],
      }),
    )
    expect(found).toEqual([
      "asset request failed: 404 https://apex-league.pages.dev/pets/draconic.glb",
    ])
  })

  test("a 404 on the bundle fails", () => {
    const found = violations(
      withResult({
        requests: [
          { url: "https://apex-league.pages.dev/assets/app.js", status: "404" },
        ],
      }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("404")
  })

  test("a 500 on a non-asset request still fails", () => {
    const found = violations(
      withResult({
        requests: [
          { url: "https://apex-league.pages.dev/api/x", status: "500" },
        ],
      }),
    )
    expect(found).toEqual([
      "request failed: 500 https://apex-league.pages.dev/api/x",
    ])
  })

  test("an empty request log is a violation, not a silent pass", () => {
    // `parseRequests` returns `[]` when the CLI's listing does not match the
    // expected shape, so without this rule a CLI output change would let the
    // deploy-time smoke step print `requests 0 · failed 0` and exit 0 — a green
    // run that verified nothing about the assets AC-3 names. The console parser
    // next door already fails loud in the same situation.
    const found = violations(withResult({ requests: [] }))
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("no network requests were observed")
  })

  test("one console error fails the run", () => {
    const found = violations(
      withResult({
        console: { total: 1, errors: 1, warnings: 0, lines: ["[ERROR] boom"] },
      }),
    )
    expect(found).toEqual(["1 console error(s)"])
  })

  test("one console warning fails the run too", () => {
    const found = violations(
      withResult({
        console: { total: 1, errors: 0, warnings: 1, lines: ["[WARNING] hm"] },
      }),
    )
    expect(found).toEqual(["1 console warning(s)"])
  })

  test("a boot plate that never cleared fails", () => {
    const found = violations(
      withResult({ probe: { ...HEALTHY.probe, bootPlate: true } }),
    )
    expect(found).toEqual(["the boot plate never went away"])
  })

  test("a starter picker that never closed fails", () => {
    const found = violations(
      withResult({ probe: { ...HEALTHY.probe, starterOverlay: true } }),
    )
    expect(found).toEqual(["the starter picker was still open after drafting"])
  })

  test("a missing canvas fails even with a 200 page", () => {
    const found = violations(
      withResult({ probe: { ...HEALTHY.probe, canvas: null } }),
    )
    expect(found).toHaveLength(1)
    expect(found[0]).toContain("canvas did not render")
  })

  test("a zero-size canvas fails", () => {
    const found = violations(
      withResult({
        probe: { ...HEALTHY.probe, canvas: { width: 0, height: 0 } },
      }),
    )
    expect(found).toHaveLength(1)
  })

  test("a HUD with no visible nodes fails", () => {
    const found = violations(
      withResult({ probe: { ...HEALTHY.probe, hudNodes: 0 } }),
    )
    expect(found).toEqual(["no HUD element rendered inside .hud-stack"])
  })
})

describe("the CLI reports are read as printed", () => {
  test("the console header and its lines", () => {
    const report = parseConsoleReport(
      '{"result":"Total messages: 2 (Errors: 1, Warnings: 1)\\n\\n[ERROR] bad @ x.js:0\\n[WARNING] hm @ y.js:1"}',
    )
    expect(report).toEqual({
      total: 2,
      errors: 1,
      warnings: 1,
      lines: ["[ERROR] bad @ x.js:0", "[WARNING] hm @ y.js:1"],
    })
  })

  test("an empty console", () => {
    const report = parseConsoleReport(
      '{"result":"Total messages: 0 (Errors: 0, Warnings: 0)\\n"}',
    )
    expect(report.total).toBe(0)
    expect(report.lines).toEqual([])
  })

  test("a report with no header is an error, not a silent pass", () => {
    expect(() => parseConsoleReport("something else entirely")).toThrow()
  })

  test("the request log", () => {
    const lines = parseRequests(
      '{"result":"1. [GET] https://h/ => [200] \\n2. [GET] https://h/a.js => [404] "}',
    )
    expect(lines).toEqual([
      { url: "https://h/", status: "200" },
      { url: "https://h/a.js", status: "404" },
    ])
  })

  test("only asset extensions count as assets", () => {
    expect(isAssetRequest("https://h/assets/app.js")).toBe(true)
    expect(isAssetRequest("https://h/audio/sfx/fire-0.ogg")).toBe(true)
    expect(isAssetRequest("https://h/pets/draconic.glb")).toBe(true)
    expect(isAssetRequest("https://h/fonts/kit.woff2")).toBe(true)
    expect(isAssetRequest("https://h/")).toBe(false)
    expect(isAssetRequest("https://h/api/state")).toBe(false)
  })

  test("2xx and 3xx are fine, everything else is not", () => {
    expect(statusOk("200")).toBe(true)
    expect(statusOk("304")).toBe(true)
    expect(statusOk("404")).toBe(false)
    expect(statusOk("500")).toBe(false)
    expect(statusOk("(failed)")).toBe(false)
    expect(statusOk("")).toBe(false)
  })
})

describe("the target URL comes from the one place it is written", () => {
  const config =
    '{\n  "name": "apex-league",\n  "pages_build_output_dir": "x"\n}'

  test("the flag wins", () => {
    expect(
      targetUrl(
        ["--url", "http://127.0.0.1:4173/"],
        { SMOKE_URL: "https://a" },
        config,
      ),
    ).toBe("http://127.0.0.1:4173")
  })

  test("then the environment", () => {
    expect(
      targetUrl([], { SMOKE_URL: "https://staging.pages.dev" }, config),
    ).toBe("https://staging.pages.dev")
  })

  test("then the Pages project name", () => {
    expect(targetUrl([], {}, config)).toBe("https://apex-league.pages.dev")
  })

  test("a non-http target is rejected", () => {
    expect(() => targetUrl(["--url", "file:///tmp/x"], {}, config)).toThrow()
  })

  test("a url flag with no value is rejected", () => {
    // `indexOf` matches a bare trailing `--url`, where `argv[at + 1]` is
    // `undefined` — the lookup then fell through to `SMOKE_URL`, or, with
    // neither set, to the production Pages URL. A mistyped flag must not smoke
    // production while the operator believes they pointed at a local build.
    expect(() => targetUrl(["--url"], {}, config)).toThrow(
      "--url needs a value",
    )
  })

  test("a config with no name is an error", () => {
    expect(() => projectName("{ }")).toThrow()
  })
})

describe("a run that cannot start still reports a failure", () => {
  test("an unresolvable target exits 1 instead of throwing", async () => {
    // `main` resolved the config, the target and the browser CLI *before* its
    // try/catch, so a bad target or a missing `playwright-cli` escaped as an
    // uncaught stack trace instead of the documented `RESULT fail` + JSON
    // envelope. The smoke step's output is the release evidence, so it has to
    // carry the reason rather than a crash.
    expect(await main(["--url", "file:///tmp/x"])).toBe(1)
  })
})
