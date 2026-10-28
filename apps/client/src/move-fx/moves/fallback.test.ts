import { describe, expect, test } from "bun:test"
import type { PlaybackStep } from "@apex/sim"
import { getMove } from "@apex/sim"
import * as THREE from "three"
import { DEFAULT_PROFILE } from "../../choreo"
import type { DriveFighter } from "../../fighter-driver"
import { decalRing } from "../../fx/fx-data"
import { HitStop } from "../../fx/loop"
import type { BattleEffects } from "../../staging-fx"
import type { Side, StepIO } from "../../steps/context"
import { fireSpecial } from "../../steps/fire"
import { applyPosture } from "../../steps/pure"
import { lookFor } from "../looks"
import type { BurstStyle } from "../moves"
import { DEFAULT_FX, fxFor, MOVE_FX } from "../moves"
import { ELEMENT_FALLBACK_FX, fallbackFor } from "./fallback"
import {
  barrierBody,
  beamBody,
  coneBody,
  dashBody,
  eruptionBody,
  volleyFanBody,
} from "./verbs"

/**
 * Pins for the Phase 1 identity foundation (FR-1, FR-5): the six authored
 * per-element fallback bodies, the element-aware `MOVE_FX` lookup, and the
 * shared verb-family builders the bespoke rows will compose.
 */

const ELEMENTS = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
] as const

describe("element fallback bodies (FR-1)", () => {
  test("every element owns an authored fallback body", () => {
    for (const element of ELEMENTS) {
      expect(ELEMENT_FALLBACK_FX[element]).toBeDefined()
    }
  })

  test("fallback bodies are distinct per element", () => {
    const bodies = ELEMENTS.map((element) => ELEMENT_FALLBACK_FX[element])
    expect(new Set(bodies).size).toBe(ELEMENTS.length)
  })

  test("fallbackFor resolves each element; unknown reads undefined", () => {
    for (const element of ELEMENTS) {
      expect(fallbackFor(element)).toBe(ELEMENT_FALLBACK_FX[element])
    }
    expect(fallbackFor(undefined)).toBeUndefined()
    expect(fallbackFor("shadow")).toBeUndefined()
  })

  test("no unauthored specials remain — the last wind spots now resolve bespoke", () => {
    // Phase 7 closes the catalog: gust and zephyr_veil were the final
    // unauthored specials. The fallback bodies above still serve unknown
    // move ids (see the DEFAULT_FX pin below); no catalog move needs them.
    const closed: ReadonlyArray<[string, (typeof ELEMENTS)[number]]> = [
      ["gust", "wind"],
      ["zephyr_veil", "wind"],
    ]
    for (const [moveId, element] of closed) {
      expect(getMove(moveId)?.element).toBe(element)
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, element)).toBe(row)
      expect(fxFor(moveId, element)).not.toBe(DEFAULT_FX)
    }
  })

  test("authored rows keep their bodies; element-less lookup keeps DEFAULT_FX", () => {
    expect(fxFor("cinder_shot", "fire")).not.toBe(ELEMENT_FALLBACK_FX.fire)
    expect(fxFor("quake_stomp", "earth")).not.toBe(ELEMENT_FALLBACK_FX.earth)
    expect(fxFor("cyclone_dive", "wind")).not.toBe(ELEMENT_FALLBACK_FX.wind)
    expect(fxFor("gust", "wind")).not.toBe(ELEMENT_FALLBACK_FX.wind)
    expect(fxFor("zephyr_veil", "wind")).not.toBe(ELEMENT_FALLBACK_FX.wind)
    // No element to resolve: today's generic read, so instant mode and any
    // legacy caller see byte-identical behavior.
    expect(fxFor(undefined)).toBe(DEFAULT_FX)
    expect(fxFor(undefined, undefined)).toBe(DEFAULT_FX)
    expect(fxFor("plasma_lance")).toBe(DEFAULT_FX)
  })

  test("all 8 fire specials resolve to bespoke rows (AC-1 fire)", () => {
    const fireMoves = [
      "spark",
      "flame_charge",
      "cinder_shot",
      "blaze_bolt",
      "flare_dart",
      "pyre_lance",
      "cinder_dive",
      "pyre_wall",
    ]
    for (const moveId of fireMoves) {
      expect(getMove(moveId)?.element).toBe("fire")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "fire")).toBe(row)
      expect(fxFor(moveId, "fire")).not.toBe(ELEMENT_FALLBACK_FX.fire)
    }
  })

  test("fire verb reads (AC-3 fire)", () => {
    // Guards raise a barrier: no projectile, no shove. Dashes launch the
    // body with a deep shove; the lance keeps its charge phase.
    const wall = MOVE_FX.pyre_wall
    if (wall === undefined) throw new Error("missing bespoke row: pyre_wall")
    expect(wall.shots).toHaveLength(0)
    expect(wall.arrival.shove).toBe(0)
    expect(wall.arrival.burst.ring).toBe(true)
    const charge = MOVE_FX.flame_charge
    if (charge === undefined)
      throw new Error("missing bespoke row: flame_charge")
    expect(charge.kick).toBeLessThanOrEqual(-0.6)
    const dive = MOVE_FX.cinder_dive
    if (dive === undefined) throw new Error("missing bespoke row: cinder_dive")
    expect(dive.kick).toBeLessThanOrEqual(-0.6)
    const lance = MOVE_FX.pyre_lance
    if (lance === undefined) throw new Error("missing bespoke row: pyre_lance")
    expect(lance.charge).toBeDefined()
    const bolt = MOVE_FX.blaze_bolt
    if (bolt === undefined) throw new Error("missing bespoke row: blaze_bolt")
    expect(bolt.charge).toBeDefined()
  })

  test("all 8 water specials resolve to bespoke rows (AC-1 water)", () => {
    const waterMoves = [
      "bubble",
      "tide_shot",
      "foam_volley",
      "splash_bolt",
      "mist_spray",
      "maelstrom",
      "riptide_rush",
      "tide_aegis",
    ]
    for (const moveId of waterMoves) {
      expect(getMove(moveId)?.element).toBe("water")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "water")).toBe(row)
      expect(fxFor(moveId, "water")).not.toBe(ELEMENT_FALLBACK_FX.water)
    }
  })

  test("water verb reads (AC-3 water)", () => {
    // Guards raise a barrier: no projectile, no shove. The rush dashes the
    // body with a deep shove; the volley fans three shots; the spray lands
    // across three lanes; the heavies keep their charge phase.
    const aegis = MOVE_FX.tide_aegis
    if (aegis === undefined) throw new Error("missing bespoke row: tide_aegis")
    expect(aegis.shots).toHaveLength(0)
    expect(aegis.arrival.shove).toBe(0)
    expect(aegis.arrival.burst.ring).toBe(true)
    const rush = MOVE_FX.riptide_rush
    if (rush === undefined) throw new Error("missing bespoke row: riptide_rush")
    expect(rush.kick).toBeLessThanOrEqual(-0.6)
    const volley = MOVE_FX.foam_volley
    if (volley === undefined)
      throw new Error("missing bespoke row: foam_volley")
    expect(volley.shots).toHaveLength(3)
    const spray = MOVE_FX.mist_spray
    if (spray === undefined) throw new Error("missing bespoke row: mist_spray")
    expect(spray.arrival.lanes).toHaveLength(3)
    expect(spray.arrival.burst.ring).toBe(true)
    const storm = MOVE_FX.maelstrom
    if (storm === undefined) throw new Error("missing bespoke row: maelstrom")
    expect(storm.charge).toBeDefined()
    expect(storm.shots).toHaveLength(2)
    const bolt = MOVE_FX.splash_bolt
    if (bolt === undefined) throw new Error("missing bespoke row: splash_bolt")
    expect(bolt.charge).toBeDefined()
  })

  test("all 8 plant specials resolve to bespoke rows (AC-1 plant)", () => {
    const plantMoves = [
      "seed_shot",
      "thorn_volley",
      "spore_burst",
      "bramble_dart",
      "vine_lash",
      "root_quake",
      "thorn_charge",
      "bramble_guard",
    ]
    for (const moveId of plantMoves) {
      expect(getMove(moveId)?.element).toBe("plant")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "plant")).toBe(row)
      expect(fxFor(moveId, "plant")).not.toBe(ELEMENT_FALLBACK_FX.plant)
    }
  })

  test("plant verb reads (AC-3 plant)", () => {
    // Guards raise a barrier: no projectile, no shove. The charge dashes
    // the body with a deep shove; the volley fans three shots; the burst
    // lands across three lanes; the quake keeps its charge phase and a
    // deep ground coil.
    const guard = MOVE_FX.bramble_guard
    if (guard === undefined)
      throw new Error("missing bespoke row: bramble_guard")
    expect(guard.shots).toHaveLength(0)
    expect(guard.arrival.shove).toBe(0)
    expect(guard.arrival.burst.ring).toBe(true)
    const charge = MOVE_FX.thorn_charge
    if (charge === undefined)
      throw new Error("missing bespoke row: thorn_charge")
    expect(charge.kick).toBeLessThanOrEqual(-0.6)
    const volley = MOVE_FX.thorn_volley
    if (volley === undefined)
      throw new Error("missing bespoke row: thorn_volley")
    expect(volley.shots).toHaveLength(3)
    const burst = MOVE_FX.spore_burst
    if (burst === undefined) throw new Error("missing bespoke row: spore_burst")
    expect(burst.arrival.lanes).toHaveLength(3)
    expect(burst.arrival.burst.ring).toBe(true)
    const quake = MOVE_FX.root_quake
    if (quake === undefined) throw new Error("missing bespoke row: root_quake")
    expect(quake.charge).toBeDefined()
    expect(quake.pose.windup.coilX ?? 0).toBeGreaterThanOrEqual(0.28)
    expect(quake.arrival.burst.ring).toBe(true)
    expect(quake.arrival.shove ?? 0).toBeLessThanOrEqual(-0.55)
    const dart = MOVE_FX.bramble_dart
    if (dart === undefined) throw new Error("missing bespoke row: bramble_dart")
    expect(dart.shots).toHaveLength(1)
    expect(dart.kick).toBeLessThanOrEqual(-0.5)
  })

  test("all 8 electric specials resolve to bespoke rows (AC-1 electric)", () => {
    const electricMoves = [
      "static_jolt",
      "volt_dash",
      "arc_shot",
      "storm_bolt",
      "ion_dart",
      "gigavolt",
      "storm_surge",
      "ion_wall",
    ]
    for (const moveId of electricMoves) {
      expect(getMove(moveId)?.element).toBe("electric")
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "electric")).toBe(row)
      expect(fxFor(moveId, "electric")).not.toBe(ELEMENT_FALLBACK_FX.electric)
    }
  })

  test("electric verb reads (AC-3 electric)", () => {
    // Guards raise a barrier: no projectile, no shove. The dash launches
    // the body with a deep shove; the volley fans three shots on staggered
    // beats; the beam keeps its long charge phase.
    const wall = MOVE_FX.ion_wall
    if (wall === undefined) throw new Error("missing bespoke row: ion_wall")
    expect(wall.shots).toHaveLength(0)
    expect(wall.arrival.shove).toBe(0)
    expect(wall.arrival.burst.ring).toBe(true)
    const dash = MOVE_FX.volt_dash
    if (dash === undefined) throw new Error("missing bespoke row: volt_dash")
    expect(dash.kick).toBeLessThanOrEqual(-0.6)
    expect(dash.arrival.shove).toBeLessThanOrEqual(-0.6)
    const surge = MOVE_FX.storm_surge
    if (surge === undefined) throw new Error("missing bespoke row: storm_surge")
    expect(surge.shots).toHaveLength(3)
    const beam = MOVE_FX.gigavolt
    if (beam === undefined) throw new Error("missing bespoke row: gigavolt")
    expect(beam.charge).toBeDefined()
    const bolt = MOVE_FX.storm_bolt
    if (bolt === undefined) throw new Error("missing bespoke row: storm_bolt")
    expect(bolt.charge).toBeDefined()
    const jolt = MOVE_FX.static_jolt
    if (jolt === undefined) throw new Error("missing bespoke row: static_jolt")
    expect(jolt.shots).toHaveLength(1)
    expect(jolt.charge).toBeUndefined()
  })

  test("all 8 earth specials resolve to bespoke rows (AC-1 earth)", () => {
    const earthPins = [
      ["pebble_shot", MOVE_FX.pebble_shot],
      ["dust_devil", MOVE_FX.dust_devil],
      ["clay_burst", MOVE_FX.clay_burst],
      ["boulder_toss", MOVE_FX.boulder_toss],
      ["sand_blast", MOVE_FX.sand_blast],
      ["tectonic_slam", MOVE_FX.tectonic_slam],
      ["quake_stomp", MOVE_FX.quake_stomp],
      ["basalt_guard", MOVE_FX.basalt_guard],
    ] as const
    for (const [moveId, row] of earthPins) {
      expect(getMove(moveId)?.element).toBe("earth")
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "earth")).toBe(row)
      expect(fxFor(moveId, "earth")).not.toBe(ELEMENT_FALLBACK_FX.earth)
    }
  })

  test("earth verb reads (AC-3 earth)", () => {
    // Guards raise a barrier: no projectile, no shove. The blast fans one
    // wide shot across three lanes; the slam and the stomp erupt ground
    // with a charge phase and a deep coil; the devil swirls three
    // simultaneous dust streaks (vs the cone's single fan); the pebble
    // stays a chargeless chip and the clay a steady workhorse.
    const guard = MOVE_FX.basalt_guard
    if (guard === undefined)
      throw new Error("missing bespoke row: basalt_guard")
    expect(guard.shots).toHaveLength(0)
    expect(guard.arrival.shove).toBe(0)
    expect(guard.arrival.burst.ring).toBe(true)
    const blast = MOVE_FX.sand_blast
    if (blast === undefined) throw new Error("missing bespoke row: sand_blast")
    expect(blast.arrival.lanes).toHaveLength(3)
    expect(blast.arrival.burst.ring).toBe(true)
    const slam = MOVE_FX.tectonic_slam
    if (slam === undefined)
      throw new Error("missing bespoke row: tectonic_slam")
    expect(slam.charge).toBeDefined()
    expect(slam.pose.windup.coilX ?? 0).toBeGreaterThanOrEqual(0.28)
    expect(slam.arrival.burst.ring).toBe(true)
    expect(slam.arrival.shove ?? 0).toBeLessThanOrEqual(-0.55)
    const stomp = MOVE_FX.quake_stomp
    if (stomp === undefined) throw new Error("missing bespoke row: quake_stomp")
    expect(stomp.charge).toBeDefined()
    expect(stomp.pose.windup.coilX ?? 0).toBeGreaterThanOrEqual(0.28)
    expect(stomp.arrival.burst.ring).toBe(true)
    expect(stomp.arrival.shove ?? 0).toBeLessThanOrEqual(-0.55)
    const toss = MOVE_FX.boulder_toss
    if (toss === undefined) throw new Error("missing bespoke row: boulder_toss")
    expect(toss.charge).toBeDefined()
    expect(toss.shots).toHaveLength(1)
    const devil = MOVE_FX.dust_devil
    if (devil === undefined) throw new Error("missing bespoke row: dust_devil")
    expect(devil.shots).toHaveLength(3)
    expect(new Set(devil.shots.map((shot) => shot.at)).size).toBe(1)
    const pebble = MOVE_FX.pebble_shot
    if (pebble === undefined)
      throw new Error("missing bespoke row: pebble_shot")
    expect(pebble.shots).toHaveLength(1)
    expect(pebble.charge).toBeUndefined()
    const clay = MOVE_FX.clay_burst
    if (clay === undefined) throw new Error("missing bespoke row: clay_burst")
    expect(clay.shots).toHaveLength(1)
    expect(clay.kick).toBeLessThanOrEqual(-0.5)
  })

  test("all 8 wind specials resolve to bespoke rows (AC-1 wind)", () => {
    const windPins = [
      ["gust", MOVE_FX.gust],
      ["feather_dart", MOVE_FX.feather_dart],
      ["gale_cutter", MOVE_FX.gale_cutter],
      ["sky_bolt", MOVE_FX.sky_bolt],
      ["talon_slash", MOVE_FX.talon_slash],
      ["hurricane_spiral", MOVE_FX.hurricane_spiral],
      ["cyclone_dive", MOVE_FX.cyclone_dive],
      ["zephyr_veil", MOVE_FX.zephyr_veil],
    ] as const
    for (const [moveId, row] of windPins) {
      expect(getMove(moveId)?.element).toBe("wind")
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(fxFor(moveId, "wind")).toBe(row)
      expect(fxFor(moveId, "wind")).not.toBe(ELEMENT_FALLBACK_FX.wind)
    }
  })

  test("wind verb reads (AC-3 wind)", () => {
    // Guards raise a barrier: no projectile, no shove. The talon rakes
    // three simultaneous streaks on one shared beat (never a staggered
    // volley); the spiral keeps its charge phase and a deep coil; the
    // dive plunges chargeless with a rising windup and three lanes; the
    // gust stays a chargeless chip.
    const veil = MOVE_FX.zephyr_veil
    if (veil === undefined) throw new Error("missing bespoke row: zephyr_veil")
    expect(veil.shots).toHaveLength(0)
    expect(veil.arrival.shove).toBe(0)
    expect(veil.arrival.burst.ring).toBe(true)
    const talon = MOVE_FX.talon_slash
    if (talon === undefined) throw new Error("missing bespoke row: talon_slash")
    expect(talon.shots).toHaveLength(3)
    expect(new Set(talon.shots.map((shot) => shot.at)).size).toBe(1)
    const spiral = MOVE_FX.hurricane_spiral
    if (spiral === undefined)
      throw new Error("missing bespoke row: hurricane_spiral")
    expect(spiral.charge).toBeDefined()
    expect(spiral.pose.windup.coilX ?? 0).toBeGreaterThanOrEqual(0.28)
    expect(spiral.arrival.burst.ring).toBe(true)
    expect(spiral.shots).toHaveLength(3)
    const dive = MOVE_FX.cyclone_dive
    if (dive === undefined) throw new Error("missing bespoke row: cyclone_dive")
    expect(dive.charge).toBeUndefined()
    expect(dive.pose.windup.rise ?? 0).toBeGreaterThan(0)
    expect(dive.shots).toHaveLength(1)
    expect(dive.arrival.lanes).toHaveLength(3)
    // The finisher tops the dive on every axis: wider gust ring, heavier
    // shove, deeper coil, later release.
    expect(spiral.arrival.burst.size ?? 0).toBeGreaterThan(
      dive.arrival.burst.size ?? 0,
    )
    expect(spiral.arrival.shove ?? 0).toBeLessThan(dive.arrival.shove ?? 0)
    expect(spiral.wind).toBeGreaterThan(dive.wind)
    const gust = MOVE_FX.gust
    if (gust === undefined) throw new Error("missing bespoke row: gust")
    expect(gust.shots).toHaveLength(1)
    expect(gust.charge).toBeUndefined()
  })

  test("wind owns wind-only shot parts (FR-4)", () => {
    // Wind shares no geometry/trail parts with water or plant: its look
    // is the faceted streak core with a streak-sliver trail, in fallback
    // and in every bespoke row. Rows carry no part keys — the look table
    // is the single place parts are named, so the pin sits here.
    const wind = lookFor("wind")
    expect(wind.geometry).toBe("streak")
    expect(wind.trail).toBe("streaks")
    expect(wind.geometry).not.toBe(lookFor("water").geometry)
    expect(wind.trail).not.toBe(lookFor("plant").trail)
    // Every bespoke arrival lands as a low drifting gust ring, never a
    // heavy or still burst.
    const windMoves = [
      "gust",
      "feather_dart",
      "gale_cutter",
      "sky_bolt",
      "talon_slash",
      "hurricane_spiral",
      "cyclone_dive",
      "zephyr_veil",
    ] as const
    for (const moveId of windMoves) {
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(row.arrival.burst.ring).toBe(true)
      expect(row.arrival.burst.gravity ?? 7).toBeLessThan(4)
    }
  })
})

describe("fire fast pair (FR-2, FR-4)", () => {
  test("spark opts into the fork look with an erratic flight", () => {
    const fork = lookFor("fire", "spark")
    expect(fork.geometry).toBe("fork")
    expect(fork.wobble ?? 0).toBeGreaterThan(0.2)
  })

  test("spark is a near-instant snap with no travel ball", () => {
    const row = MOVE_FX.spark
    if (row === undefined) throw new Error("missing bespoke row: spark")
    expect(row.wind).toBeLessThanOrEqual(0.15)
    expect(row.shots).toHaveLength(1)
    const shot = row.shots[0]
    if (shot === undefined) throw new Error("spark built no shot")
    expect(shot.life).toBeLessThanOrEqual(250)
    expect(shot.at).toBe(row.wind)
    // No mouth bloom: the arrival snap is the only flash.
    expect(row.muzzle).toBeUndefined()
    // Snap flash: tiny core, tall fast-fading swell, erratic scatter.
    expect(row.arrival.burst.size ?? 1).toBeLessThanOrEqual(0.7)
    expect(row.arrival.burst.flashGrow ?? 0).toBeGreaterThanOrEqual(3.5)
    expect(row.arrival.burst.life ?? 9999).toBeLessThanOrEqual(300)
  })

  test("flare_dart opts into the needle look with flat locked flight", () => {
    const needle = lookFor("fire", "flare_dart")
    expect(needle.geometry).toBe("needle")
    expect(needle.arc).toBe(0)
    expect(needle.wobble ?? 0).toBe(0)
    expect(needle.spin ?? 0).toBe(0)
    expect(needle.pulse ?? 0).toBe(0)
  })

  test("flare_dart lands a tight pierce with no bloom", () => {
    const row = MOVE_FX.flare_dart
    if (row === undefined) throw new Error("missing bespoke row: flare_dart")
    expect(row.shots).toHaveLength(1)
    expect(row.arrival.burst.gravity).toBe(0)
    expect(row.arrival.burst.sway).toBe(0)
    expect(row.arrival.burst.size ?? 1).toBeLessThanOrEqual(0.8)
    expect(row.arrival.burst.flashGrow ?? 99).toBeLessThanOrEqual(1.5)
    expect(row.arrival.burst.life ?? 9999).toBeLessThanOrEqual(300)
  })
})

describe("fire heavy pair (FR-3, FR-5)", () => {
  test("cinder_shot opts into the chunk look with a heavy tumble", () => {
    const chunk = lookFor("fire", "cinder_shot")
    expect(chunk.geometry).toBe("chunk")
    expect(chunk.wobble ?? 0).toBe(0.35)
  })

  test("cinder_shot is a slow heavy lob with no muzzle bloom", () => {
    const row = MOVE_FX.cinder_shot
    if (row === undefined) throw new Error("missing bespoke row: cinder_shot")
    expect(row.shots).toHaveLength(1)
    const shot = row.shots[0]
    if (shot === undefined) throw new Error("cinder_shot built no shot")
    expect(shot.life).toBeGreaterThanOrEqual(800)
    // No mouth bloom: the chunk plus its drip trail carry the flight.
    expect(row.muzzle).toBeUndefined()
    // Slow heavy arrival: a large lingering thud that falls, not rises.
    expect(row.arrival.burst.size ?? 0).toBeGreaterThanOrEqual(1.5)
    expect(row.arrival.burst.life ?? 0).toBeGreaterThanOrEqual(550)
    expect(row.arrival.burst.gravity ?? 0).toBeGreaterThan(0)
    expect(row.arrival.burst.sway ?? 99).toBeLessThanOrEqual(0.3)
  })

  test("blaze_bolt opts into the jet look with a locked straight flight", () => {
    const jet = lookFor("fire", "blaze_bolt")
    expect(jet.geometry).toBe("jet")
    expect(jet.wobble ?? 99).toBe(0)
    expect(jet.spin ?? 99).toBe(0)
  })

  test("blaze_bolt is the fastest fire shot with a head-first bloom", () => {
    const row = MOVE_FX.blaze_bolt
    if (row === undefined) throw new Error("missing bespoke row: blaze_bolt")
    expect(row.shots).toHaveLength(1)
    const shot = row.shots[0]
    if (shot === undefined) throw new Error("blaze_bolt built no shot")
    // Fastest of the fire mediums: shorter than flare_dart and cinder_shot.
    expect(shot.life).toBeLessThanOrEqual(350)
    const flareShot = MOVE_FX.flare_dart?.shots[0]
    const cinderShot = MOVE_FX.cinder_shot?.shots[0]
    if (flareShot === undefined || cinderShot === undefined)
      throw new Error("missing medium rows for the fastest pin")
    expect(shot.life).toBeLessThan(flareShot.life)
    expect(shot.life).toBeLessThan(cinderShot.life)
    // Head-first bloom: the biggest lingering core with a focused swell.
    expect(row.arrival.burst.size ?? 0).toBeGreaterThanOrEqual(1.8)
    expect(row.arrival.burst.life ?? 0).toBeGreaterThanOrEqual(600)
    expect(row.arrival.burst.puffs ?? 0).toBeGreaterThanOrEqual(12)
    expect(row.arrival.burst.flashGrow ?? 0).toBeGreaterThanOrEqual(3.5)
  })
})

describe("fire wall encirclement (FR-6)", () => {
  test("pyre_wall ring is ~2.5x the barrier baseline with denser jets", () => {
    const wall = MOVE_FX.pyre_wall
    if (wall === undefined) throw new Error("missing bespoke row: pyre_wall")
    const base = barrierBody("fire")
    const baseSize = base.arrival.burst.size ?? 1
    expect(wall.arrival.burst.ring).toBe(true)
    // Encirclement, not a body-sized ring: 2.5x the barrier body's radius.
    expect(wall.arrival.burst.size ?? 0).toBeGreaterThanOrEqual(baseSize * 2.5)
    // Denser rising jets than the 12-jet body-sized ring.
    expect(wall.arrival.burst.puffs ?? 0).toBeGreaterThanOrEqual(16)
    expect(wall.arrival.burst.puffs ?? 0).toBeGreaterThan(
      base.arrival.burst.puffs ?? 0,
    )
  })

  test("pyre_wall keeps the foe-targeted guard contract with timing held", () => {
    const wall = MOVE_FX.pyre_wall
    if (wall === undefined) throw new Error("missing bespoke row: pyre_wall")
    const base = barrierBody("fire")
    // Eruption on the foe: no projectile travel, no shove.
    expect(wall.shots).toHaveLength(0)
    expect(wall.arrival.shove).toBe(0)
    // Timing held: same windup beat and arrival duration as the barrier body.
    expect(wall.wind).toBe(base.wind)
    expect(wall.arrival.burst.life).toBe(560)
    // Rising jets, not falling debris.
    expect(wall.arrival.burst.gravity ?? 0).toBeLessThan(0)
  })

  test("pyre_wall lands on a scorch disc", () => {
    // Fire burns a solid scorch disc under the ring, never a ring outline;
    // the impact path stamps it via contactReaction -> spawnDecal.
    expect(decalRing("fire")).toBe(false)
  })
})

describe("verb-family builders (FR-5)", () => {
  test("every builder starts from its element's fallback body", () => {
    for (const element of ELEMENTS) {
      const base = fallbackFor(element)
      if (base === undefined)
        throw new Error(`missing fallback body for ${element}`)
      expect(barrierBody(element).arrival.burst).toBeDefined()
      expect(dashBody(element).shots).not.toBe(base.shots)
      expect(eruptionBody(element).pose.windup.coilX).toBeGreaterThanOrEqual(
        0.28,
      )
      expect(coneBody(element).arrival.lanes).toHaveLength(3)
      expect(volleyFanBody(element).shots).toHaveLength(3)
      expect(beamBody(element).charge).toBeDefined()
    }
  })

  test("barriers hold no projectile and land with no shove", () => {
    for (const element of ELEMENTS) {
      const barrier = barrierBody(element)
      expect(barrier.shots).toHaveLength(0)
      expect(barrier.arrival.shove).toBe(0)
      expect(barrier.arrival.burst.ring).toBe(true)
    }
  })

  test("builders throw for unknown elements", () => {
    expect(() => barrierBody("shadow")).toThrow()
    expect(() => dashBody("shadow")).toThrow()
    expect(() => eruptionBody("shadow")).toThrow()
    expect(() => coneBody("shadow")).toThrow()
    expect(() => volleyFanBody("shadow")).toThrow()
    expect(() => beamBody("shadow")).toThrow()
  })
})

/**
 * Pins for the Phase 5 body-first dash trio (FR-7, AC-6): the three fire
 * dash verbs stop flying projectiles — the attacker's crossing body is the
 * hit — while the launch beat keeps its attack read (kick plus muzzle where
 * the row authors one) and each landing stays distinct.
 */

const FIRE_TRIO = ["flame_charge", "cinder_dive", "pyre_lance"] as const

function trioFighter(name: string, away: 1 | -1): DriveFighter {
  return {
    name,
    group: new THREE.Group(),
    stage: new THREE.Vector3(),
    smooth: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    squash: { s: 0, v: 0 },
    walkPhase: 0,
    phase: 0,
    baseScale: 1,
    profile: DEFAULT_PROFILE,
    down: false,
    away,
    fall: 0,
    lean: { pitch: 0, roll: 0 },
    baseColors: new Map(),
  }
}

interface TrioBurst {
  at: THREE.Vector3
  element: string | undefined
  style?: BurstStyle
}

interface TrioDrive {
  actor: DriveFighter
  bursts: TrioBurst[]
  projectiles: number
}

/** Drive one move through the real fireSpecial and capture what stages. */
function driveTrioMove(moveId: string, compressed: boolean): TrioDrive {
  const actor = trioFighter("actor", 1)
  const target = trioFighter("target", -1)
  const bursts: TrioBurst[] = []
  let projectiles = 0
  const effects: BattleEffects = {
    hitStop: new HitStop(),
    setPaused: () => {},
    startFlash: () => {},
    spawnProjectile: () => {
      projectiles += 1
    },
    spawnBurst: (at, element, style) => {
      bursts.push({ at: at.clone(), element, style })
    },
    spawnDecal: () => {},
    setCharge: () => {},
    clearCharge: () => {},
    firstProjectilePosition: () => null,
    disposeAllDecals: () => {},
    disposeAll: () => {},
  }
  let run: ((t: number, ao: DriveFighter, at: DriveFighter) => void) | undefined
  const io: StepIO = {
    effects,
    bigHit: () => {},
    startAction: (fn) => {
      run = fn
    },
    cancelAction: () => {},
    animMs: () => 1000,
    paceRatio: () => 1,
    reduced: () => false,
    prevKind: () => null,
  }
  const step: PlaybackStep = {
    tick: 7,
    kind: compressed ? "impact" : "projectile",
    actor: "r",
    target: "b",
    moveId,
    element: "fire",
    hit: true,
    hpAfter: {},
    line: moveId,
    beats: 6,
    phases: { windup: 0.2, contact: 0.3, recovery: 0.5 },
  }
  fireSpecial(io, step, { actor, target } satisfies Side, compressed)
  if (run === undefined) throw new Error(`no action staged for ${moveId}`)
  run(1, actor, target)
  return { actor, bursts, projectiles }
}

describe("fire body-first dash trio (FR-7)", () => {
  test("all three read attacker-motion-first: zero shots, a real kick, distinct landings", () => {
    const landings = new Set<string>()
    for (const moveId of FIRE_TRIO) {
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
      expect(getMove(moveId)?.element).toBe("fire")
      // Body-first: nothing flies; the kick carries the launch read.
      expect(row.shots).toHaveLength(0)
      expect(row.kick).toBeLessThanOrEqual(-0.6)
      landings.add(
        JSON.stringify([
          row.arrival.lanes ?? null,
          row.arrival.burst.ring ?? false,
          Math.sign(row.arrival.burst.gravity ?? 0),
          row.arrival.shove,
        ]),
      )
    }
    expect(landings.size).toBe(FIRE_TRIO.length)
  })

  test("flame_charge is a pure crossing body hit with a launch flare and a driving bloom", () => {
    const row = MOVE_FX.flame_charge
    if (row === undefined) throw new Error("missing bespoke row: flame_charge")
    expect(row.shots).toHaveLength(0)
    expect(row.kick).toBeLessThanOrEqual(-0.7)
    // Wreath: a charge swells around the crossing body, cleared at release.
    expect(row.charge).toBeDefined()
    // Nose-gap flare at launch.
    expect(row.muzzle).toBeDefined()
    // Crossing body hit: a forward-driving shove under a rising bloom.
    expect(row.arrival.shove).toBe(-0.6)
    expect(row.arrival.burst.gravity ?? 0).toBeLessThan(0)
  })

  test("cinder_dive is a zero-shot vertical crater with no pilot light", () => {
    const row = MOVE_FX.cinder_dive
    if (row === undefined) throw new Error("missing bespoke row: cinder_dive")
    expect(row.shots).toHaveLength(0)
    expect(row.kick).toBeLessThanOrEqual(-0.6)
    // No muzzle, no pilot light: the body itself is the projectile.
    expect(row.muzzle).toBeUndefined()
    // Crater: a down-slamming ring, wider than the ember lob's thud.
    expect(row.arrival.burst.ring).toBe(true)
    expect(row.arrival.burst.gravity ?? 0).toBeGreaterThan(0)
    expect(row.arrival.burst.size ?? 0).toBeGreaterThanOrEqual(1.8)
  })

  test("pyre_lance is a pass-through streak with a beam-line triplet landing", () => {
    const row = MOVE_FX.pyre_lance
    if (row === undefined) throw new Error("missing bespoke row: pyre_lance")
    expect(row.shots).toHaveLength(0)
    expect(row.kick).toBeLessThanOrEqual(-0.6)
    // The beam charge stays: the streak still swells before release.
    expect(row.charge).toBeDefined()
    // Pass-line flash: tight, driftless, tall glow.
    expect(row.muzzle?.sway).toBe(0)
    expect(row.muzzle?.gravity).toBe(0)
    // Landing triplet down the beam line, tighter than a cone fan.
    expect(row.arrival.lanes).toHaveLength(3)
    const spread = Math.max(
      ...(row.arrival.lanes ?? [0]).map((dz) => Math.abs(dz)),
    )
    expect(spread).toBeLessThan(0.4)
    expect(row.arrival.burst.flashGrow ?? 0).toBeGreaterThanOrEqual(3.4)
  })

  test("zero-shot launches still stage the kick, muzzle, and lance beam; guards stay silent", () => {
    // Launch path: the crossing and diving bodies still read as an attack
    // — the kick lands on the attacker's spring and no shot flies for the
    // bodies themselves. The lance's piercing streak is the one
    // projectile a zero-shot row fires: through the defender to the exit
    // point (P5.F3), so it counts as the beam, not a shot.
    for (const moveId of ["flame_charge", "cinder_dive"]) {
      const launched = driveTrioMove(moveId, false)
      expect(launched.projectiles).toBe(0)
      expect(launched.actor.squash.v).toBeLessThan(0)
    }
    const lance = driveTrioMove("pyre_lance", false)
    expect(lance.projectiles).toBe(1)
    expect(lance.actor.squash.v).toBeLessThan(0)
    // The authored muzzle pops belong to the crossing charge and the
    // pass-through streak — never to the pilotless dive.
    expect(
      driveTrioMove("flame_charge", false).bursts.length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      driveTrioMove("pyre_lance", false).bursts.length,
    ).toBeGreaterThanOrEqual(1)
    expect(driveTrioMove("cinder_dive", false).bursts).toHaveLength(0)
    // Guards stay silent on their impact path: no flight, no mouth pop —
    // just the ring at the foe.
    const wall = driveTrioMove("pyre_wall", true)
    expect(wall.projectiles).toBe(0)
    expect(wall.bursts.length).toBeGreaterThanOrEqual(1)
    expect(wall.bursts.every((burst) => burst.style?.ring === true)).toBe(true)
  })
})

/**
 * Pins for the Phase 5 fix round — true body motion plus pass-through
 * (FR-7, AC-6): row-driven attacker transit (a lunge-and-return covering
 * a fraction of the live gap, a vertical arc variant, reduced-motion
 * dampened, deterministic per tick) and the lance exit wound (the beam
 * overshoots the defender and the arrival burst lands behind it). Red
 * until P5.F1–P5.F3 land the mechanism and the rows.
 */

/** One driven move with the fighters standing apart, sampled per beat. */
interface FixDrive {
  actor: DriveFighter
  target: DriveFighter
  bursts: TrioBurst[]
  /** Where each spawned projectile was aimed (the `to` anchor). */
  projFrom: THREE.Vector3[]
  projTargets: THREE.Vector3[]
  run: (t: number) => void
}

/**
 * Drive one move at range: the actor holds the west post and the target
 * the east, so a gap fraction reads as a world-space displacement. The
 * recording effects layer captures flight anchors and burst positions.
 */
function driveFixMove(
  moveId: string,
  opts?: { compressed?: boolean; reduced?: boolean; tick?: number; gap?: number },
): FixDrive {
  const gap = opts?.gap ?? 5
  const actor = trioFighter("actor", 1)
  const target = trioFighter("target", -1)
  actor.group.position.set(-gap / 2, 0, 0)
  actor.stage.set(-gap / 2, 0, 0)
  actor.smooth.set(-gap / 2, 0, 0)
  target.group.position.set(gap / 2, 0, 0)
  target.stage.set(gap / 2, 0, 0)
  target.smooth.set(gap / 2, 0, 0)
  const bursts: TrioBurst[] = []
  const projFrom: THREE.Vector3[] = []
  const projTargets: THREE.Vector3[] = []
  const effects: BattleEffects = {
    hitStop: new HitStop(),
    setPaused: () => {},
    startFlash: () => {},
    spawnProjectile: (from, to) => {
      projFrom.push(from.group.position.clone())
      projTargets.push(to.group.position.clone())
    },
    spawnBurst: (at, element, style) => {
      bursts.push({ at: at.clone(), element, style })
    },
    spawnDecal: () => {},
    setCharge: () => {},
    clearCharge: () => {},
    firstProjectilePosition: () => null,
    disposeAllDecals: () => {},
    disposeAll: () => {},
  }
  let run: ((t: number, ao: DriveFighter, at: DriveFighter) => void) | undefined
  const io: StepIO = {
    effects,
    bigHit: () => {},
    startAction: (fn) => {
      run = fn
    },
    cancelAction: () => {},
    animMs: () => 1000,
    paceRatio: () => 1,
    reduced: () => opts?.reduced ?? false,
    prevKind: () => null,
  }
  const compressed = opts?.compressed ?? false
  const step: PlaybackStep = {
    tick: opts?.tick ?? 7,
    kind: compressed ? "impact" : "projectile",
    actor: "r",
    target: "b",
    moveId,
    element:
      moveId === "volt_dash" || moveId === "gigavolt" ? "electric" : "fire",
    hit: true,
    hpAfter: {},
    line: moveId,
    beats: 6,
    phases: { windup: 0.2, contact: 0.3, recovery: 0.5 },
  }
  fireSpecial(io, step, { actor, target } satisfies Side, compressed)
  if (run === undefined) throw new Error(`no action staged for ${moveId}`)
  const staged = run
  return {
    actor,
    target,
    bursts,
    projFrom,
    projTargets,
    run: (t: number) => staged(t, actor, target),
  }
}

/** The pure recoil offset at progress w, with no transit component. */
function recoilOnly(
  moveId: string,
  w: number,
): { x: number; y: number } {
  const row = MOVE_FX[moveId]
  if (row === undefined) throw new Error(`missing bespoke row: ${moveId}`)
  const probe = trioFighter("probe", 1)
  applyPosture(row.pose.recoil, w, probe, 1)
  return { x: probe.offset.x, y: probe.offset.y }
}

describe("phase-5 fix: true body motion plus pass-through (FR-7)", () => {
  test("rows carry the row-driven transit and exit contract", () => {
    const charge = MOVE_FX.flame_charge
    const dive = MOVE_FX.cinder_dive
    const lance = MOVE_FX.pyre_lance
    if (!charge || !dive || !lance) throw new Error("missing trio rows")
    // Zero-shot at schema level: the bodies carry the read, not shots.
    for (const row of [charge, dive, lance]) {
      expect(row.shots).toHaveLength(0)
    }
    expect(charge.transit?.reach).toBe(0.55)
    expect(charge.transit?.lift).toBeUndefined()
    expect(dive.transit?.reach).toBe(0.85)
    expect(dive.transit?.lift).toBe(1.3)
    expect(lance.transit).toBeUndefined()
    expect(lance.arrival.beyond).toBe(1)
  })

  test("flame_charge lunges toward the target, then returns home", () => {
    const driven = driveFixMove("flame_charge")
    // Peak transit sits halfway between release (0.34) and the return.
    driven.run(0.67)
    const recoil = recoilOnly("flame_charge", 0.5)
    expect(driven.actor.offset.x).toBeCloseTo(recoil.x + 5 * 0.55, 4)
    expect(driven.actor.offset.y).toBeCloseTo(recoil.y, 4)
    // Lunge-and-return: at the final beat only the recoil stance remains.
    driven.run(1)
    const home = recoilOnly("flame_charge", 1)
    expect(driven.actor.offset.x).toBeCloseTo(home.x, 6)
    expect(driven.actor.offset.y).toBeCloseTo(home.y, 6)
  })

  test("cinder_dive arcs airborne, then plunges back home", () => {
    const driven = driveFixMove("cinder_dive")
    // Peak arc sits halfway between release (0.58) and the return.
    driven.run(0.79)
    const recoil = recoilOnly("cinder_dive", 0.5)
    expect(driven.actor.offset.x).toBeCloseTo(recoil.x + 5 * 0.85, 4)
    // Visibly above ground mid-flight: the arc peak clears one unit.
    expect(driven.actor.offset.y).toBeCloseTo(recoil.y + 1.3, 4)
    expect(driven.actor.offset.y).toBeGreaterThan(1)
    driven.run(1)
    const home = recoilOnly("cinder_dive", 1)
    expect(driven.actor.offset.x).toBeCloseTo(home.x, 6)
    expect(driven.actor.offset.y).toBeCloseTo(home.y, 6)
  })

  test("transit replays the same path for the same tick", () => {
    const sample = (tick: number): Array<{ x: number; y: number }> => {
      const driven = driveFixMove("cinder_dive", { tick })
      const path: Array<{ x: number; y: number }> = []
      for (const t of [0.4, 0.6, 0.79, 0.9, 1]) {
        driven.run(t)
        path.push({ x: driven.actor.offset.x, y: driven.actor.offset.y })
      }
      return path
    }
    expect(sample(23)).toEqual(sample(23))
  })

  test("transit covers the same gap fraction at any range", () => {
    const recoil = recoilOnly("flame_charge", 0.5)
    const near = driveFixMove("flame_charge", { gap: 5 })
    near.run(0.67)
    expect(near.actor.offset.x - recoil.x).toBeCloseTo(5 * 0.55, 4)
    const far = driveFixMove("flame_charge", { gap: 9 })
    far.run(0.67)
    // Far-range approach interplay: the stride scales with the live gap.
    expect(far.actor.offset.x - recoil.x).toBeCloseTo(9 * 0.55, 4)
  })

  test("reduced motion dampens the transit like the impulse", () => {
    const full = driveFixMove("flame_charge")
    full.run(0.67)
    const calm = driveFixMove("flame_charge", { reduced: true })
    calm.run(0.67)
    const recoil = recoilOnly("flame_charge", 0.5)
    expect(
      (calm.actor.offset.x - recoil.x) / (full.actor.offset.x - recoil.x),
    ).toBeCloseTo(0.4, 6)
    const fullDive = driveFixMove("cinder_dive")
    fullDive.run(0.79)
    const calmDive = driveFixMove("cinder_dive", { reduced: true })
    calmDive.run(0.79)
    const recoilDive = recoilOnly("cinder_dive", 0.5)
    expect(
      (calmDive.actor.offset.y - recoilDive.y) /
        (fullDive.actor.offset.y - recoilDive.y),
    ).toBeCloseTo(0.4, 6)
  })

  test("other elements' dash and beam rows stay put", () => {
    for (const moveId of ["volt_dash", "gigavolt"]) {
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing row: ${moveId}`)
      expect(row.transit).toBeUndefined()
      expect(row.arrival.beyond).toBeUndefined()
      const shot = row.shots[0]
      if (shot === undefined) throw new Error(`${moveId} built no shot`)
      const release = shot.at
      const driven = driveFixMove(moveId)
      driven.run(release + (1 - release) * 0.5)
      const recoil = recoilOnly(moveId, 0.5)
      expect(driven.actor.offset.x).toBeCloseTo(recoil.x, 6)
      expect(driven.actor.offset.y).toBeCloseTo(recoil.y, 6)
    }
    // The untouched beam still lands its arrival on the defender.
    const beam = driveFixMove("gigavolt", { compressed: true })
    beam.run(1)
    expect(beam.bursts.length).toBeGreaterThanOrEqual(1)
    for (const burst of beam.bursts) {
      expect(burst.at.x).toBeCloseTo(2.5, 9)
    }
  })

  test("pyre_lance pierces: beam overshoots, exit burst lands behind", () => {
    // Ranged: one piercing streak from the mouth through to the exit.
    const ranged = driveFixMove("pyre_lance")
    ranged.run(0.9)
    expect(ranged.projTargets).toHaveLength(1)
    expect(ranged.projFrom[0]?.x).toBeCloseTo(-2.5, 6)
    expect(ranged.projTargets[0]?.x).toBeCloseTo(2.5 + 1, 6)
    expect(ranged.projTargets[0]?.z).toBeCloseTo(0, 6)
    // The contact flash stays small at the pass line, ahead of the foe.
    expect(ranged.bursts).toHaveLength(1)
    expect(ranged.bursts[0]?.at.x).toBeCloseTo(-2.5, 6)
    // Point-blank: the beam-line triplet lands behind the defender.
    const close = driveFixMove("pyre_lance", { compressed: true })
    close.run(1)
    expect(close.bursts).toHaveLength(3)
    for (const burst of close.bursts) {
      expect(burst.at.x).toBeCloseTo(3.5, 6)
    }
    expect(
      close.bursts.map((burst) => burst.at.z).sort((a, b) => a - b),
    ).toEqual([-0.18, 0, 0.18])
  })
})
