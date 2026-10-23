import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdRoundCone,
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

export { sampleDna as sampleFalconDna } from "./sample"

export const FALCON_GRID = 56

/**
 * Zephyr Falcon — the Wind specialist. A compact perched raptor: a
 * teardrop body on two slender legs, big folded wings swept along the
 * flanks, a hooked beak and a fan tail. Two legs and the wing blades keep
 * it unmistakable next to the four-legged storm hound.
 */
export const falconTemplate: Template = {
  id: "falcon",
  version: 1,
  proportions: {
    bodyLength: { min: 0.75, max: 1.35 },
    bodyGirth: { min: 0.75, max: 1.3 },
    legLength: { min: 0.75, max: 1.3 },
    neckLength: { min: 0.7, max: 1.3 },
    neckThickness: { min: 0.75, max: 1.3 },
    headSize: { min: 0.75, max: 1.3 },
    wingLength: { min: 0.75, max: 1.35 },
    tailLength: { min: 0.7, max: 1.35 },
  },
  styles: {
    wings: [
      { id: "folded", params: { sweep: { min: 0.6, max: 1.4 } } },
      { id: "drooped", params: { sweep: { min: 0.6, max: 1.4 } } },
      { id: "flared", params: { sweep: { min: 0.6, max: 1.4 } } },
    ],
    tail: [
      { id: "fan", params: {} },
      { id: "forked", params: { forkSpread: { min: 0.6, max: 1.4 } } },
      { id: "streamer", params: { streamerLength: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 165, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface FalconBuild extends CreatureBuild {}

const O = FALCON_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the falcon from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildFalcon(dna: Dna, stage: Stage = "baby"): FalconBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const wl = p.wingLength ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // A perched bird stands tall; the hip line lifts each stage.
  const hipY = 6.8 + 0.7 * j

  // --- colors first, in fixed RNG order, so geometry never perturbs them.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const hue = gilded ? 158 : 165
  const light = gilded ? 0.55 : lerp(0.45, 0.62, rng.next())
  const sat = gilded ? 0.85 : 0.72
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, light + lift)
  const ramp = creaturePalette({ hue, sat: sat + lift, light: light + lift })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  const spark = hslToRgb(hue, 0.9, 0.78)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // --- body: a teardrop torso, keel deep at the chest.
  const chestA = at(0, 12, 2.8 * bl)

  // --- surface bounds: belly band on the low body, sock on the toes.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4.4 * bg,
    torsoTop: chestA.y + 4.4 * bg,
    sockTop: 2.4,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  const rumpA = at(0, 11, -3.4 * bl)
  let bodyField = sdCapsule(chestA, rumpA, 4.4 * bg)
  bodyField = smoothUnion(
    bodyField,
    sdEllipsoid(at(0, 10, 3.4 * bl), vec3(3.2 * bg, 2.6 * bg, 3.4 * bl)),
    1.5,
  )
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: short and forward-tilted, raptor posture.
  const neckA = at(0, 14.2, 2.2 * bl)
  const neckB = at(0, 16.2 + 1.4 * nl, 3.2 * bl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.1 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a rounded skull with the hooked beak as its own bone part.
  const headC = at(0, 17.4 + 1.6 * nl, 4.2 * bl)
  const skullHalf = vec3(2.5 * hs, 2.3 * hs, 2.6 * hs)
  const headField = sdBox(headC, skullHalf)
  const beakC = vec3(
    headC.x,
    headC.y - 0.6 * hs,
    headC.z + skullHalf.z + 1.2 * hs,
  )
  const beakField = sdBox(beakC, vec3(0.9 * hs, 0.8 * hs, 1.4 * hs))
  const face = faceParts(
    facePlan("falcon", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })
  fields.push({ name: "beak", sdf: beakField })

  // --- wings: big tapered blades folded along the flanks, style-driven.
  const wingStyle = dna.styles.wings ?? "folded"
  const sweep = dna.styleParams.sweep ?? 1
  for (const sx of [-1, 1]) {
    const name = sx === -1 ? "wingLeft" : "wingRight"
    const root = at(sx * 2.6 * bg, 14.2, 1.6 * bl)
    const tip =
      wingStyle === "drooped"
        ? at(sx * (3.2 + 1.2 * sweep), 7.6, -2.4 - 6.4 * wl)
        : wingStyle === "flared"
          ? at(sx * (4.4 + 1.0 * sweep), 12.6, -1.4 - 5.8 * wl)
          : at(sx * (2.8 + 0.8 * sweep), 9.6, -3.4 - 6.4 * wl)
    fields.push({
      name,
      sdf: union(
        sdRoundCone(root, tip, 2.2 * bg, 0.8),
        sdSphere(root, 1.8 * bg),
      ),
    })
  }

  // --- two slender legs with talon pads; FL/FR names so the gait drives them.
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, name] of [
    [-1, "legFL"],
    [1, "legFR"],
  ] as const) {
    const hip = at(sx * 2.3 * bg, hipY, 1.2 * bl)
    const footY = 2.1 + 0.2 * ll
    const knee = at(sx * 2.7 * bg, (hipY + footY) / 2, 1.7 * bl)
    const foot = at(sx * 2.7 * bg, footY, 1.5 * bl)
    legPivots[name] = [hip.x, hip.y, hip.z]
    fields.push({
      name,
      sdf: union(
        union(sdCapsule(hip, knee, 1.5 * bg), sdCapsule(knee, foot, 1.25 * bg)),
        sdSphere(at(sx * 2.7 * bg, footY - 0.2, 1.9 * bl), 1.3),
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a flat fan trailing the rump. Anchored past the body's rear
  // surface so it always claims its own voxels under the first-wins paint
  // order; a fan buried inside the torso silhouette simply vanishes.
  const tailBase = at(0, 10.6, -3.4 * bl - 4.4 * bg + 1.2 * tl)
  const tailStyle = dna.styles.tail ?? "fan"
  const forkSpread = dna.styleParams.forkSpread ?? 1
  const streamerLength = dna.styleParams.streamerLength ?? 1
  const tailField = sdBox(
    at(0, 10.6, -3.4 * bl - 4.4 * bg - 1.2 * tl),
    vec3(2.9 * bg, 0.55, 3.0 * tl),
  )
  fields.push({ name: "tail", sdf: tailField })
  // The tailTip trails the fan's back edge by a real margin so it always
  // claims its own voxels under the first-wins paint order.
  const tailTipZ = -3.4 * bl - 4.4 * bg - 4.2 * tl
  const tailTipField =
    tailStyle === "forked"
      ? union(
          sdCapsule(
            at(0, 10.5, tailTipZ + 0.8 * tl),
            at(-1.8 * forkSpread, 10.3, tailTipZ - 1.2 * tl),
            0.8,
          ),
          sdCapsule(
            at(0, 10.5, tailTipZ + 0.8 * tl),
            at(1.8 * forkSpread, 10.3, tailTipZ - 1.2 * tl),
            0.8,
          ),
        )
      : tailStyle === "streamer"
        ? union(
            sdCapsule(
              at(0, 10.5, tailTipZ + 0.8 * tl),
              at(-0.9, 10.2, tailTipZ - 3.2 * tl * streamerLength),
              0.7,
            ),
            sdCapsule(
              at(0, 10.5, tailTipZ + 0.8 * tl),
              at(0.9, 10.2, tailTipZ - 3.2 * tl * streamerLength),
              0.7,
            ),
          )
        : sdBox(at(0, 10.5, tailTipZ - 0.8 * tl), vec3(3.2 * bg, 0.5, 1.3 * tl))
  fields.push({ name: "tailTip", sdf: tailTipField })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    beak: [beakC.x, beakC.y, beakC.z],
    wingLeft: [O - 2.6 * bg, 14.2, O + 1.6 * bl],
    wingRight: [O + 2.6 * bg, 14.2, O + 1.6 * bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [O, 10.5, O - 3.4 * bl - 4.4 * bg - 4.2 * tl],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    neck: main,
    head: main,
    beak: bone,
    wingLeft: dark,
    wingRight: dark,
    tail: main,
    tailTip: dark,
    legFL: dark,
    legFR: dark,
  }
  const parents: Record<string, string> = {
    neck: "body",
    head: "neck",
    beak: "head",
    wingLeft: "body",
    wingRight: "body",
    tail: "body",
    tailTip: "tail",
    legFL: "body",
    legFR: "body",
  }

  const budY = headC.y + skullHalf.y
  if (j >= 1) {
    // Juvenile signature: bright pinion buds sprouting behind the skull —
    // the first feathers of the flight line. headC is already grid-space,
    // so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "pinionBudLeft" : "pinionBudRight"
      const base = vec3(headC.x + sx * 2.0 * hs, budY - 0.6, headC.z - 0.8)
      const tip = vec3(headC.x + sx * 3.4 * hs, budY + 0.2, headC.z - 2.2)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.8) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = spark
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: two swept bone plumes, the crest of the aerie.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownPlumeLeft" : "crownPlumeRight"
      const base = vec3(headC.x + sx * 1.2 * hs, budY - 0.4, headC.z - 0.4)
      const tip = vec3(headC.x + sx * 2.8 * hs, budY + 3.6, headC.z - 3.2)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.7) })
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
      neck: ramp,
      legFL: ramp,
      legFR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: { ...parents, ...face.parents },
  }
}
