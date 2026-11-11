/**
 * The fight inspector (Battle Spacing and Cadence AC-1, AC-2, AC-4, AC-7):
 * one seeded fight replayed step by step, deterministically, with the five
 * invariants a fight must hold enforced as named assertions.
 *
 * The harness is a debugging tool, so the tests are about the two properties
 * that make it trustworthy rather than about pretty output: the same flags
 * must print the same bytes, and a corrupted fight must fail the check that
 * names the corruption. The trace itself is cross-checked against
 * `resolveContinuous` inside `traceFight`, so a drift between the replay and
 * the resolver throws before any of these tests can see a wrong number.
 */

import { describe, expect, test } from "bun:test"
import {
  checkExit,
  checkInvariants,
  type FightTrace,
  type Invariant,
  integerGap,
  parseArgs,
  report,
  run,
  type StepFrame,
  toJson,
  traceFight,
} from "../../../scripts/battle-trace"
import type { BattleSide } from "../resolver"
import { resolveContinuous } from "./resolve"

/**
 * A KO row from the telemetry sample. Phase 10 rework 1: the narrower spread
 * moved the old KO fixture (plant_ox v embercub, seed 1) to the cap, so the
 * fixture moved to a pairing that still knocks out inside the band.
 */
const KO = { seed: 20261111, owned: "wind_falcon", rival: "water_axolotl" }

/** The telemetry sample's cap row: fire_drake v earth_tortoise, 40.00 s. */
const CAP = { seed: 20261108, owned: "fire_drake", rival: "earth_tortoise" }

/** Options with the defaults the command line fills in. */
function options(seed: number, owned: string, rival: string) {
  return {
    seed,
    owned,
    rival,
    kit: null,
    rivalKit: null,
    doctrine: null,
    rivalDoctrine: null,
    every: 0,
    json: false,
    check: true,
  } as const
}

/** A trace with one frame rewritten, to prove the check catches it. */
function corrupt(
  trace: FightTrace,
  mutate: (frame: StepFrame, index: number) => StepFrame,
): FightTrace {
  return { ...trace, steps: trace.steps.map(mutate) }
}

/** The assertion a check run failed on, by name. */
function failed(trace: FightTrace): Invariant[] {
  return checkInvariants(trace).filter((invariant) => !invariant.ok)
}

describe("battle trace — one fight, step by step", () => {
  test("prints the default fight, for the record and for a bug report", () => {
    // The `bun run trace` command is the tool's front door; printing one run
    // here keeps a known-good trace in the CI log the way the telemetry test
    // keeps its table, so a change in the fight is visible in review.
    const lines: string[] = []
    const code = run({ ...options(KO.seed, KO.owned, KO.rival) }, (line) =>
      lines.push(line),
    )
    console.log(lines.join("\n"))
    expect(code).toBe(0)
    expect(lines.some((line) => line.includes("final hash  0x"))).toBe(true)
  })

  test("a dodge turns a shot into a miss, and the log shows it", () => {
    // wind_falcon v water_axolotl is the telemetry row where the falcon never
    // lands: the axolotl's shots are the thing to inspect, and the falcon's
    // dodges are why. This is the kind of question a screenshot cannot answer.
    const trace = traceFight(options(20261111, "wind_falcon", "water_axolotl"))
    const dodged = trace.events.filter(
      (event) => event.kind === "shot-dodged" || event.kind === "dodge",
    )
    expect(dodged.length).toBeGreaterThan(0)
    // Print every changed step: a 1-in-50 sample can miss the single tick a
    // dodge lands on now that the cycle is shorter (phase 8, weight 2).
    const lines = report(trace, { ...trace.options, every: 0 })
    console.log(lines.join("\n"))
    expect(lines.some((line) => line.includes("slips"))).toBe(true)
  })

  test("the same seed twice prints byte-identical output", () => {
    const first = traceFight(options(7, "plant_ox", "embercub"))
    const second = traceFight(options(7, "plant_ox", "embercub"))
    expect(report(second, second.options).join("\n")).toBe(
      report(first, first.options).join("\n"),
    )
    expect(JSON.stringify(toJson(second, null))).toBe(
      JSON.stringify(toJson(first, null)),
    )
    // A different seed is a different fight: the check would be worthless if
    // every seed produced the same trace.
    const other = traceFight(options(8, "plant_ox", "embercub"))
    expect(other.hash).not.toBe(first.hash)
  })

  test("--check passes on a clean fight, naming all five invariants", () => {
    const trace = traceFight(options(7, "plant_ox", "embercub"))
    const invariants = checkInvariants(trace)
    expect(invariants.map((invariant) => invariant.name)).toEqual([
      "y-zero",
      "hp-range",
      "arena-bounds",
      "integers",
      "deterministic",
    ])
    expect(invariants.filter((invariant) => !invariant.ok)).toEqual([])
    expect(checkExit(invariants)).toBe(0)
  })

  test("--check fails on a corrupted fight and names the corruption", () => {
    const trace = traceFight(options(7, "plant_ox", "embercub"))

    const floating = corrupt(trace, (frame, index) =>
      index === 10 ? { ...frame, owned: { ...frame.owned, y: 5 } } : frame,
    )
    expect(failed(floating).map((row) => row.name)).toEqual(["y-zero"])
    expect(failed(floating)[0]?.detail).toBe("step 10 owned y = 5")

    const dead = corrupt(trace, (frame, index) =>
      index === 4 ? { ...frame, rival: { ...frame.rival, hp: -1 } } : frame,
    )
    expect(failed(dead).map((row) => row.name)).toEqual(["hp-range"])
    expect(failed(dead)[0]?.detail).toContain("hp = -1")

    const escaping = corrupt(trace, (frame, index) =>
      index === 2
        ? { ...frame, owned: { ...frame.owned, x: trace.bounds.maxX + 1 } }
        : frame,
    )
    expect(failed(escaping).map((row) => row.name)).toEqual(["arena-bounds"])

    const fractional = corrupt(trace, (frame, index) =>
      index === 1 ? { ...frame, rival: { ...frame.rival, vx: 1.5 } } : frame,
    )
    expect(failed(fractional).map((row) => row.name)).toEqual(["integers"])

    const forged = { ...trace, hash: trace.hash ^ 1 }
    expect(failed(forged).map((row) => row.name)).toEqual(["deterministic"])

    // The exit code follows the assertions, not the number of them.
    expect(checkExit(checkInvariants(floating))).toBe(1)
    expect(checkExit(checkInvariants(trace))).toBe(0)
  })

  test("the JSON shape is stable and carries every step", () => {
    const trace = traceFight(options(7, "plant_ox", "embercub"))
    const json = toJson(trace, checkInvariants(trace))
    expect(Object.keys(json)).toEqual([
      "seed",
      "owned",
      "rival",
      "bounds",
      "steps",
      "events",
      "summary",
      "check",
    ])
    expect(json.seed).toBe(7)
    expect(Array.isArray(json.steps)).toBe(true)
    const steps = json.steps as StepFrame[]
    expect(steps.length).toBe(trace.summary.steps + 1)
    expect(steps[0]?.step).toBe(0)
    expect(steps[steps.length - 1]?.ms).toBe(trace.summary.ms)
    const check = json.check as { passed: boolean; assertions: Invariant[] }
    expect(check.passed).toBe(true)
    expect(check.assertions.length).toBe(5)
    expect(Object.keys(check.assertions[0] ?? {})).toEqual([
      "name",
      "description",
      "ok",
      "detail",
    ])
    // No `--check`: the key is present and null, so a consumer can branch on it.
    expect(toJson(trace, null).check).toBeNull()
  })

  test("a KO and a cap fight are both representable", () => {
    const ko = traceFight(options(KO.seed, KO.owned, KO.rival))
    expect(ko.reason).toBe("ko")
    expect(ko.winner).not.toBeNull()
    expect(ko.summary.ms).toBeLessThan(40_000)
    expect(ko.summary.blows[0] + ko.summary.blows[1]).toBeGreaterThan(0)

    const cap = traceFight(options(CAP.seed, CAP.owned, CAP.rival))
    expect(cap.reason).toBe("time")
    expect(cap.summary.ms).toBe(40_000)
    expect(cap.summary.steps).toBe(2000)
    // A cap fight is decided on points, so a winner still exists and both
    // pools are above zero: the summary must not pretend the fight was a draw.
    expect(cap.winner).not.toBeNull()
    expect(Object.values(cap.finalHp).every((hp) => hp > 0)).toBe(true)
  })

  test("the trace is the resolver's fight, not a second engine", () => {
    // `traceFight` throws when its replay diverges, so a successful trace plus
    // an independently resolved ending is the cross-check the harness relies on.
    const trace = traceFight(options(7, "plant_ox", "embercub"))
    const owned = {
      name: trace.owned.name,
      id: trace.owned.speciesId,
      element: trace.owned.element,
      stats: trace.owned.stats,
      kit: trace.owned.kit,
      tactic: trace.owned.tactic,
      temperament: trace.owned.temperament,
      branch: trace.owned.branch ?? undefined,
    } satisfies BattleSide
    const rival = {
      name: trace.rival.name,
      id: trace.rival.speciesId,
      element: trace.rival.element,
      stats: trace.rival.stats,
      kit: trace.rival.kit,
      tactic: trace.rival.tactic,
      temperament: trace.rival.temperament,
      branch: trace.rival.branch ?? undefined,
    } satisfies BattleSide
    const resolved = resolveContinuous(owned, rival, trace.options.seed)
    expect(trace.reason).toBe(resolved.reason)
    expect(trace.winner).toBe(resolved.winner)
    expect(trace.finalHp).toEqual(resolved.finalHp)
  })

  test("the step log shows the detail the stream does not store", () => {
    const trace = traceFight(options(7, "plant_ox", "embercub"))
    const lines = report(trace, trace.options)
    const text = lines.join("\n")
    // The header names the pool the resolver fights on, the kit, and the
    // profile in force — the three things a screenshot cannot show.
    expect(text).toContain(`pool ${trace.owned.hpMax} hp`)
    expect(text).toContain(trace.owned.kit.join(", "))
    expect(text).toContain("preferred")
    // The summary ends with the final state hash, and the step rows carry
    // stamina and poise per side.
    expect(lines.some((line) => line.includes("final hash  0x"))).toBe(true)
    expect(
      trace.steps.some((frame) => frame.owned.stamina < trace.owned.staminaMax),
    ).toBe(true)
    expect(
      trace.steps.some((frame) => frame.rival.poise < trace.rival.poiseMax),
    ).toBe(true)
    // Something was actually fought: the log has strike/shot events with damage.
    expect(trace.events.some((event) => event.kind === "strike")).toBe(true)
    expect(
      trace.events.some((event) => event.damage > 0 && event.poiseDamage > 0),
    ).toBe(true)
  })

  test("a 40 s fight traces well under a second", () => {
    const started = performance.now()
    const trace = traceFight(options(CAP.seed, CAP.owned, CAP.rival))
    const elapsed = performance.now() - started
    expect(trace.summary.steps).toBe(2000)
    expect(elapsed).toBeLessThan(1000)
  })

  test("the gap is an integer floor distance, symmetric and exact on axes", () => {
    expect(integerGap(0, 0, 0, 0)).toBe(0)
    expect(integerGap(-1000, 0, 1000, 0)).toBe(2000)
    expect(integerGap(0, -3000, 0, 3000)).toBe(6000)
    expect(integerGap(3, 4, 0, 0)).toBe(5)
    // Floored, never rounded up: 3-4-5 is exact, 1-1-√2 is 1.
    expect(integerGap(1, 1, 0, 0)).toBe(1)
    expect(integerGap(0, 0, 1, 1)).toBe(integerGap(1, 1, 0, 0))
    // A sampled gap is an integer and non-negative at every step.
    const trace = traceFight(options(7, "plant_ox", "embercub"))
    for (const frame of trace.steps) {
      expect(Number.isInteger(frame.gap)).toBe(true)
      expect(frame.gap).toBeGreaterThanOrEqual(0)
    }
    expect(trace.summary.gap.min).toBeLessThanOrEqual(trace.summary.gap.median)
    expect(trace.summary.gap.median).toBeLessThanOrEqual(trace.summary.gap.max)
  })

  test("flags parse in both forms and refuse what they cannot honour", () => {
    expect(parseArgs([])).toEqual({
      seed: 1,
      owned: "plant_ox",
      rival: "embercub",
      kit: null,
      rivalKit: null,
      doctrine: null,
      rivalDoctrine: null,
      every: 0,
      json: false,
      check: false,
    })
    expect(
      parseArgs(["--seed=3", "--owned=voltfox", "--rival", "earth_tortoise"]),
    ).toMatchObject({ seed: 3, owned: "voltfox", rival: "earth_tortoise" })
    expect(parseArgs(["--every=50", "--json", "--check"])).toMatchObject({
      every: 50,
      json: true,
      check: true,
    })
    expect(parseArgs(["--kit=basic"])).toMatchObject({ kit: ["basic"] })
    expect(
      parseArgs(["--doctrine", "kite", "--rival-doctrine=press"]),
    ).toMatchObject({ doctrine: "kite", rivalDoctrine: "press" })
    expect(() => parseArgs(["--doctrine", "snipe"])).toThrow("one of")
    expect(() => parseArgs(["--seed"])).toThrow()
    expect(() => parseArgs(["--seed", "1.5"])).toThrow()
    expect(() => parseArgs(["--every", "0"])).toThrow()
    expect(() => parseArgs(["--wat"])).toThrow("unknown flag")
    expect(() => parseArgs(["positional"])).toThrow("unexpected argument")
    expect(() => parseArgs(["--kit", "basic,nope"])).toThrow("unknown move")
    expect(() => parseArgs(["--kit", "basic,basic"])).toThrow("twice")
  })
})
