import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdSphere,
  smoothSubtract,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

export { sampleDna as sampleOtterDna } from "./sample"

export const OTTER_GRID = 56

/**
 * Mistkit — the Water line's otter-kit body plan. A sleek low-slung swimmer
 * on short flipper legs with a swept dorsal fin and a long rudder tail.
 * The fin reads against the falcon's wings and the crab's shell at a
 * glance: the otter-kit carries one low blade on its back and steers with
 * its tail, never flying nor hiding.
 */
export const otterTemplate: Template = {
  id: "otter",
  version: 1,
  proportions: {
    bodyLength: { min: 0.95, max: 1.35 },
    bodyGirth: { min: 0.75, max: 1.05 },
    legLength: { min: 0.6, max: 1.0 },
    neckLength: { min: 0.7, max: 1.1 },
    neckThickness: { min: 0.7, max: 1.1 },
    headSize: { min: 0.75, max: 1.1 },
    finSize: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.9, max: 1.4 },
  },
  styles: {
    back: [
      { id: "finned", params: { fin: { min: 0.6, max: 1.4 } } },
      { id: "smooth", params: {} },
    ],
    flippers: [
      { id: "broad", params: { flip: { min: 0.6, max: 1.4 } } },
      { id: "sleek", params: { flip: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 205, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface OtterBuild extends CreatureBuild {}

const O = OTTER_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the otter-kit from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildOtter(dna: Dna, stage: Stage = "baby"): OtterBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const fs = p.finSize ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // Legs stay planted; the whole mass rides a hair higher each stage.
  // The torso rides on its radius so the belly clears the floor, and the
  // foot bottom clears the y=0.5 voxel-center floor like every archetype.
  const hipY = 2.0 * bg + 2.8 + 0.6 * j
  const bodyY = 7.0 * bg + 1.5
  const footY = 2.0 * bg + 0.5

  // --- colors first, in fixed RNG order, so geometry never perturbs them.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const hue = gilded ? 198 : 205
  const light = gilded ? 0.55 : lerp(0.35, 0.5, rng.next())
  const sat = gilded ? 0.85 : 0.62
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, light + lift)
  const ramp = creaturePalette({ hue, sat: sat + lift, light: light + lift })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // Mist reads as spray over deep water: same water hue, paler and cooler.
  const mist: [number, number, number] = hslToRgb(hue, 0.4, 0.62 + lift)
  const steel: [number, number, number] = hslToRgb(hue, 0.5, 0.32 + lift)

  // --- surface bounds: the sleek barrel drives the ramp bands; the fin
  // borrows them so its blade reads dorsal.
  const chestA = at(0, bodyY, 5.6 * bl)
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 4.2 * bg,
    torsoTop: bodyY + 4.2 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  // --- body: a long sleek barrel, the swimmer's hull.
  const rumpA = at(0, bodyY - 0.5, -5.6 * bl)
  const bodyField = sdCapsule(chestA, rumpA, 4.2 * bg)
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- dorsal fin: one swept blade on the back's rear half, classified
  // with the same surface ramp so it reads dorsal. The tip reaches past the
  // barrel crown at every girth extreme, so the blade always claims its own
  // voxels under the paint order — a fin buried inside the barrel simply
  // vanishes (every style must clear bodyY + 4.2*bg, the crown height).
  const backStyle = dna.styles.back ?? "finned"
  const finAmt = dna.styleParams.fin ?? 1
  const finBase = at(0, bodyY + 3.2 * bg, -1.0 * bl)
  const finTip =
    backStyle === "finned"
      ? at(0, bodyY + 4.2 * bg + (1.5 + 2.0 * finAmt) * fs, -5.0 * bl)
      : at(0, bodyY + 4.2 * bg + 2.0, -2.2 * bl)
  fields.push({
    name: "fin",
    sdf: sdCapsule(
      finBase,
      finTip,
      backStyle === "finned" ? 1.3 + 0.7 * finAmt : 1.2,
    ),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: short and level, carrying the skull forward over the water.
  const neckA = at(0, bodyY + 1.2, 7.2 * bl)
  const neckB = at(0, bodyY + 2.2 + 1.2 * nl, 8.4 * bl + 1.2 * nl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.0 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a small rounded skull with a short blunt muzzle.
  const headC = at(0, bodyY + 2.8 + 1.4 * nl, 9.4 * bl + 1.8 * nl)
  const skullHalf = vec3(2.3 * hs, 2.0 * hs, 2.4 * hs)
  const snoutHalf = vec3(1.4 * hs, 1.2 * hs, 1.8 * hs)
  const snoutC = vec3(
    headC.x,
    headC.y - 0.5 * hs,
    headC.z + skullHalf.z + 1.1 * hs,
  )
  const headField = union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf))
  const face = faceParts(
    facePlan("otter", {
      center: headC,
      half: skullHalf,
      snout: { center: snoutC, half: snoutHalf },
    }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })

  // --- four short flipper legs planted under the hull. legLength spreads
  // the planted stance rather than stretching the limb.
  const flipperStyle = dna.styles.flippers ?? "broad"
  const flip = dna.styleParams.flip ?? 1
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, sz, name] of [
    [-1, 1, "legFL"],
    [1, 1, "legFR"],
    [-1, -1, "legBL"],
    [1, -1, "legBR"],
  ] as const) {
    const hip = at(sx * 3.6 * bg, hipY, sz * 4.4 * bl)
    const foot = at(
      sx * (3.6 + 0.9 * ll) * bg,
      footY,
      sz * (4.4 + 0.9 * ll) * bl,
    )
    legPivots[name] = [hip.x, hip.y, hip.z]
    const flat =
      flipperStyle === "broad"
        ? sdEllipsoid(
            vec3(foot.x, footY - 0.3, foot.z + 0.8),
            vec3(2.6 * flip * bg, 0.9, 2.2 * flip),
          )
        : sdEllipsoid(
            vec3(foot.x, footY - 0.3, foot.z + 0.8),
            vec3(1.8 * flip * bg, 0.9, 2.6 * flip),
          )
    fields.push({
      name,
      sdf: union(
        union(sdSphere(hip, 2.2 * bg), sdCapsule(hip, foot, 1.8 * bg)),
        flat,
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a long tapering rudder ending in a flattened fluke.
  const tailBase = at(0, bodyY - 1.5, -7.0 * bl)
  const tailMid = at(0, bodyY - 2.0, -7.0 * bl - 2.6 * tl)
  const tailEnd = at(0, bodyY - 1.6, -7.0 * bl - 4.6 * tl)
  fields.push({ name: "tail", sdf: sdCapsule(tailBase, tailMid, 1.6) })
  fields.push({
    name: "tailTip",
    sdf: union(
      sdCapsule(tailMid, tailEnd, 1.0),
      sdEllipsoid(
        vec3(tailEnd.x, tailEnd.y, tailEnd.z - 0.8),
        vec3(2.2, 0.8, 1.6),
      ),
    ),
  })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    fin: [finBase.x, finBase.y, finBase.z],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailMid.x, tailMid.y, tailMid.z],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    fin: steel,
    neck: main,
    head: main,
    tail: main,
    tailTip: steel,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
  }
  const parents: Record<string, string> = {
    fin: "body",
    neck: "body",
    head: "neck",
    tail: "body",
    tailTip: "tail",
    legFL: "body",
    legFR: "body",
    legBL: "body",
    legBR: "body",
  }

  const budY = headC.y + skullHalf.y
  if (j >= 1) {
    // Juvenile signature: a pair of small cheek fins sweeping back from the
    // skull — the swimmer's spray rails starting early. headC is already
    // grid-space, so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "finBudLeft" : "finBudRight"
      const base = vec3(headC.x + sx * 2.2 * hs, budY - 1.0, headC.z + 0.4)
      const tip = vec3(headC.x + sx * 3.4 * hs, budY - 0.2, headC.z - 1.4)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.85) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = steel
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: twin crest fins swept high, the earned crown.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownFinLeft" : "crownFinRight"
      const base = vec3(headC.x + sx * 1.6 * hs, budY - 0.6, headC.z - 0.4)
      const tip = vec3(headC.x + sx * 2.4 * hs, budY + 3.0, headC.z - 2.8)
      fields.push({ name, sdf: sdCapsule(base, tip, 1.0) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = mist
      parents[name] = "head"
    }
  }

  return {
    fields: [...fields, ...face.fields],
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      fin: ramp,
      neck: ramp,
      legFL: ramp,
      legFR: ramp,
      legBL: ramp,
      legBR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: { ...parents, ...face.parents },
  }
}
