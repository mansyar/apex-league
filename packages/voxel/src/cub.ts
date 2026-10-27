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
  smoothUnion,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

export { sampleDna as sampleCubDna } from "./sample"

export const CUB_GRID = 56

/**
 * Embercub — the Fire line's cub body plan. A small bright-eyed quadruped
 * carried a touch higher than the diggers, with an ember mane ruff collaring
 * the neck and cheeks. The ruff reads against the mole's dorsal plates at a
 * glance: the cub wears its signature around the throat, not along the spine.
 */
export const cubTemplate: Template = {
  id: "cub",
  version: 1,
  proportions: {
    bodyLength: { min: 0.8, max: 1.2 },
    bodyGirth: { min: 0.8, max: 1.15 },
    legLength: { min: 0.7, max: 1.15 },
    neckLength: { min: 0.7, max: 1.1 },
    neckThickness: { min: 0.8, max: 1.2 },
    headSize: { min: 0.85, max: 1.25 },
    maneSize: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.7, max: 1.2 },
  },
  styles: {
    mane: [
      { id: "full", params: { ruff: { min: 0.6, max: 1.4 } } },
      { id: "ruffed", params: { ruff: { min: 0.6, max: 1.4 } } },
      { id: "sleek", params: {} },
    ],
    paws: [
      { id: "round", params: { pad: { min: 0.6, max: 1.4 } } },
      { id: "broad", params: { pad: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 18, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface CubBuild extends CreatureBuild {}

const O = CUB_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the cub from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildCub(dna: Dna, stage: Stage = "baby"): CubBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const ms = p.maneSize ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // Legs stay planted; the whole mass rides a hair higher each stage.
  // The torso rides on its radius so the belly clears the floor, and the
  // foot bottom clears the y=0.5 voxel-center floor like every archetype.
  const hipY = 2.2 * bg + 3 + 0.6 * j
  const bodyY = 7.5 * bg + 1.8
  const footY = 2.2 * bg + 0.7

  // --- colors first, in fixed RNG order, so geometry never perturbs them.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const hue = gilded ? 12 : 18
  const light = gilded ? 0.55 : lerp(0.35, 0.5, rng.next())
  const sat = gilded ? 0.85 : 0.7
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, light + lift)
  const ramp = creaturePalette({ hue, sat: sat + lift, light: light + lift })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // Ember reads as banked coals: same fire hue, deeper and hotter.
  const ember: [number, number, number] = hslToRgb(hue, 0.8, 0.32 + lift)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // --- surface bounds: the barrel drives the ramp bands; the mane borrows
  // them so its rim reads dorsal and its throat lateral.
  const chestA = at(0, bodyY, 5.0 * bl)
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 4.6 * bg,
    torsoTop: bodyY + 4.6 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  // --- body: a small barrel, the cub's compact mass.
  const rumpA = at(0, bodyY - 0.5, -5.0 * bl)
  const bodyField = sdCapsule(chestA, rumpA, 4.6 * bg)
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: short and upright, lifting the skull clear of the ruff.
  const neckA = at(0, bodyY + 1.5, 6.8 * bl)
  const neckB = at(0, bodyY + 2.6 + 1.2 * nl, 8.0 * bl + 1.2 * nl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.4 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- mane: the ember ruff collaring the neck and cheeks. It sits proud
  // of the neck surface so it claims its own voxels under the paint order —
  // a ruff buried inside the neck simply vanishes.
  const maneStyle = dna.styles.mane ?? "full"
  const ruff = dna.styleParams.ruff ?? 1
  const maneC = at(0, bodyY + 2.2 + 0.6 * nl, 7.4 * bl + 0.6 * nl)
  let maneField = sdBox(maneC, vec3(3.4 * ms * nt, 2.4 * ms, 3.0 * ms * bl))
  if (maneStyle === "full") {
    // Cheek tufts flanking the skull — the ruff frames the face.
    for (const sx of [-1, 1]) {
      maneField = smoothUnion(
        maneField,
        sdBox(
          at(sx * 3.0 * ms * nt, bodyY + 3.0 + 0.8 * nl, 8.2 * bl + 0.8 * nl),
          vec3(1.4 * ms * nt, 1.8 * ms, 1.8 * ms * bl),
        ),
        0.9,
      )
    }
  } else if (maneStyle === "ruffed") {
    // Three upright spikes along the collar's crown.
    for (const sz of [2.2, 0, -2.2]) {
      maneField = smoothUnion(
        maneField,
        sdCapsule(
          at(0, bodyY + 3.4 * ruff, (7.4 + sz) * bl),
          at(0, bodyY + (3.4 + 2.2 * ruff) * ms, (7.4 + sz) * bl - 0.8),
          1.0 * ruff,
        ),
        1.0,
      )
    }
  }
  fields.push({
    name: "mane",
    sdf: maneField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a round cub skull with a short muzzle.
  const headC = at(0, bodyY + 3.4 + 1.4 * nl, 9.2 * bl + 1.8 * nl)
  const skullHalf = vec3(2.7 * hs, 2.3 * hs, 2.8 * hs)
  const snoutHalf = vec3(1.5 * hs, 1.3 * hs, 2.0 * hs)
  const snoutC = vec3(
    headC.x,
    headC.y - 0.6 * hs,
    headC.z + skullHalf.z + 1.2 * hs,
  )
  const noseC = vec3(snoutC.x, snoutC.y - 0.3 * hs, snoutC.z + 1.7 * hs)
  const headField = union(
    union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
    sdBox(noseC, vec3(0.9 * hs, 0.8 * hs, 1.0 * hs)),
  )
  const face = faceParts(
    facePlan("cub", {
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

  // --- four slim columns planted squarely. legLength spreads the planted
  // stance rather than stretching the column.
  const pawStyle = dna.styles.paws ?? "round"
  const pad = dna.styleParams.pad ?? 1
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, sz, name] of [
    [-1, 1, "legFL"],
    [1, 1, "legFR"],
    [-1, -1, "legBL"],
    [1, -1, "legBR"],
  ] as const) {
    const hip = at(sx * 3.8 * bg, hipY, sz * 4.0 * bl)
    const foot = at(
      sx * (3.8 + 0.9 * ll) * bg,
      footY,
      sz * (4.0 + 0.9 * ll) * bl,
    )
    legPivots[name] = [hip.x, hip.y, hip.z]
    const front = sz > 0
    const paw =
      pawStyle === "broad" && front
        ? sdEllipsoid(
            vec3(foot.x, footY - 0.3, foot.z + 0.8),
            vec3(2.4 * pad * bg, 1.0, 1.9 * pad),
          )
        : sdSphere(vec3(foot.x, footY - 0.2, foot.z + 0.4), 1.5)
    fields.push({
      name,
      sdf: union(
        union(sdSphere(hip, 2.4 * bg), sdCapsule(hip, foot, 1.9 * bg)),
        paw,
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a short upward curl with an ember tuft at its tip.
  const tailBase = at(0, bodyY - 3.5, -6.4 * bl)
  const tailEnd = at(0, bodyY - 2.0, -6.4 * bl - 2.6 * tl)
  const tailField = sdCapsule(tailBase, tailEnd, 1.3)
  fields.push({ name: "tail", sdf: tailField })
  fields.push({
    name: "tailTip",
    sdf: sdSphere(vec3(tailEnd.x, tailEnd.y + 0.5, tailEnd.z - 0.8), 1.4),
  })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    mane: [maneC.x, maneC.y, maneC.z],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    mane: ember,
    neck: main,
    head: main,
    tail: main,
    tailTip: ember,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
  }
  const parents: Record<string, string> = {
    mane: "body",
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
    // Juvenile signature: a pair of ember cheek buds sprouting beside the
    // skull — the ruff starting to frame the face. headC is already
    // grid-space, so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "maneBudLeft" : "maneBudRight"
      const base = vec3(headC.x + sx * 2.6 * hs, budY - 1.2, headC.z + 0.6)
      const tip = vec3(headC.x + sx * 3.4 * hs, budY + 0.4, headC.z - 0.2)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.9) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = ember
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: twin flame horns swept back, the earned crown.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownFlameLeft" : "crownFlameRight"
      const base = vec3(headC.x + sx * 1.8 * hs, budY - 0.6, headC.z - 0.4)
      const tip = vec3(headC.x + sx * 2.8 * hs, budY + 3.2, headC.z - 2.6)
      fields.push({ name, sdf: sdCapsule(base, tip, 1.05) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = bone
      parents[name] = "head"
    }
  }

  return {
    fields: [...fields, ...face.fields],
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      mane: ramp,
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
