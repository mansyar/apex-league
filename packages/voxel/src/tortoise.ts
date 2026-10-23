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

export { sampleDna as sampleTortoiseDna } from "./sample"

export const TORTOISE_GRID = 56

/**
 * Basalt Tortoise — the Earth specialist. A slow, heavily shelled
 * quadruped: a stone dome over a low body, a stubby neck and tail, and
 * thick short legs planted wide. The shell dome and its light plastron
 * make the silhouette unmistakable next to the bovine.
 */
export const tortoiseTemplate: Template = {
  id: "tortoise",
  version: 1,
  proportions: {
    bodyLength: { min: 0.75, max: 1.35 },
    bodyGirth: { min: 0.8, max: 1.3 },
    shellHeight: { min: 0.75, max: 1.3 },
    legLength: { min: 0.75, max: 1.25 },
    neckLength: { min: 0.75, max: 1.3 },
    neckThickness: { min: 0.8, max: 1.3 },
    headSize: { min: 0.75, max: 1.3 },
    tailLength: { min: 0.7, max: 1.35 },
  },
  styles: {
    shell: [
      { id: "domed", params: {} },
      { id: "ridged", params: { ridgeHeight: { min: 0.6, max: 1.4 } } },
      { id: "knobbled", params: { knobSize: { min: 0.6, max: 1.4 } } },
    ],
    tail: [
      { id: "stump", params: {} },
      { id: "spike", params: { spikeLength: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 28, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface TortoiseBuild extends CreatureBuild {}

const O = TORTOISE_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the tortoise from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildTortoise(dna: Dna, stage: Stage = "baby"): TortoiseBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const sh = p.shellHeight ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // Legs stay planted; the whole mass rides a hair higher each stage.
  // The torso rides on its radius so the belly clears the floor, and the
  // foot bottom clears the y=0.5 voxel-center floor like every archetype.
  const hipY = 2.4 * bg + 3.2 + 0.6 * j
  const bodyY = 7.8 * bg + 2
  const footY = 2.4 * bg + 0.7
  // --- colors first, in fixed RNG order, so geometry never perturbs them.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const hue = gilded ? 20 : 28
  const light = gilded ? 0.55 : lerp(0.35, 0.5, rng.next())
  const sat = gilded ? 0.85 : 0.68
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, light + lift)
  const ramp = creaturePalette({ hue, sat: sat + lift, light: light + lift })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // The plastron reads as worn underside stone: same hue, much lighter.
  const plastronTone = hslToRgb(hue, 0.35, 0.72 + lift)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // --- surface bounds: the flesh torso drives the ramp bands; the shell
  // borrows them so its crown reads dorsal and its flanks lateral.
  const chestA = at(0, bodyY, 5.8 * bl)
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 5.4 * bg,
    torsoTop: bodyY + 5.4 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  // --- flesh torso: a low barrel under the shell dome.
  const rumpA = at(0, bodyY, -5.8 * bl)
  const bodyField = sdCapsule(chestA, rumpA, 5.4 * bg)
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- the shell: a squashed dome seated on the torso, classified with
  // the same surface ramp so its top reads dorsal and its flanks lateral.
  const shellC = at(0, bodyY + 3.4, 0.2)
  let shellField = sdEllipsoid(shellC, vec3(8.6 * bg, 6.6 * sh, 10.8 * bl))
  const shellStyle = dna.styles.shell ?? "domed"
  const ridgeHeight = dna.styleParams.ridgeHeight ?? 1
  const knobSize = dna.styleParams.knobSize ?? 1
  if (shellStyle === "ridged") {
    // A spine ridge running the dome's crown, front to back.
    shellField = smoothUnion(
      shellField,
      sdCapsule(
        at(0, shellC.y + 5.4 * sh, 4.5 * bl),
        at(0, shellC.y + 4.2 * sh, -4.8 * bl),
        1.1 * ridgeHeight,
      ),
      1.2,
    )
  } else if (shellStyle === "knobbled") {
    // Paired shoulder and rump studs, the classic scute bosses.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        shellField = smoothUnion(
          shellField,
          sdSphere(
            at(sx * 5.6 * bg, shellC.y + 3.6 * sh, sz * 5.4 * bl),
            1.3 * knobSize,
          ),
          0.9,
        )
      }
    }
  }
  fields.push({
    name: "shell",
    sdf: shellField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- plastron: the pale rim that flares past both the flesh and the
  // shell where they meet — a flattened ellipsoid whose equator sits a
  // hand's width outside the body so the shell reads as two materials
  // meeting at a rim. Buried inside the shell it would claim nothing.
  fields.push({
    name: "plastron",
    sdf: sdEllipsoid(
      at(0, bodyY - 2.2 * bg, 0.2),
      vec3(8.2 * bg, 2.6 * bg, 9.6 * bl),
    ),
  })

  // --- neck: short and thick, emerging low from under the shell's front
  // rim and lifting to the head. Only the segment past the body's front
  // lobe survives the paint order — a turtle reads exactly so.
  const neckA = at(0, bodyY + 2.2, 7.9 * bl)
  const neckB = at(0, bodyY + 3.2 + 1.2 * nl, 9.4 * bl + 1.2 * nl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.5 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a blunt wedge skull with a hooked beak jaw.
  const headC = at(0, bodyY + 3.8 + 1.4 * nl, 10.8 * bl + 1.8 * nl)
  const skullHalf = vec3(2.7 * hs, 2.3 * hs, 2.9 * hs)
  const snoutHalf = vec3(1.9 * hs, 1.5 * hs, 2.1 * hs)
  const snoutC = vec3(
    headC.x,
    headC.y - 0.5 * hs,
    headC.z + skullHalf.z + 1.4 * hs,
  )
  const headField = union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf))
  const face = faceParts(
    facePlan("tortoise", {
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

  // --- four stubby columns planted wide.
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, sz, name] of [
    [-1, 1, "legFL"],
    [1, 1, "legFR"],
    [-1, -1, "legBL"],
    [1, -1, "legBR"],
  ] as const) {
    const hip = at(sx * 4.3 * bg, hipY, sz * 4.6 * bl)
    // legLength spreads the planted stance rather than stretching the
    // column — a tortoise's leg length reads in its splay, not its height.
    const foot = at(
      sx * (4.3 + 0.9 * ll) * bg,
      footY,
      sz * (4.6 + 0.9 * ll) * bl,
    )
    legPivots[name] = [hip.x, hip.y, hip.z]
    fields.push({
      name,
      sdf: union(sdSphere(hip, 2.8 * bg), sdCapsule(hip, foot, 2.4 * bg)),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a short stub, optionally spiked, trailing from under the
  // shell's rear rim. The visible stub is whatever clears the body —
  // the paint order keeps the buried part honest.
  const tailBase = at(0, bodyY - 4.6, -7.8 * bl)
  const tailStyle = dna.styles.tail ?? "stump"
  const spikeLength = dna.styleParams.spikeLength ?? 1
  const tailEnd =
    tailStyle === "spike"
      ? at(0, bodyY - 5.2, -7.8 * bl - 3.6 * tl * spikeLength)
      : at(0, bodyY - 5.0, -7.8 * bl - 2.8 * tl)
  const tailField = sdCapsule(
    tailBase,
    tailEnd,
    tailStyle === "spike" ? 1.1 : 1.5,
  )
  fields.push({ name: "tail", sdf: tailField })
  fields.push({
    name: "tailTip",
    sdf: sdSphere(
      vec3(tailEnd.x, tailEnd.y - 0.4, tailEnd.z - 1.0),
      tailStyle === "spike" ? 1.0 : 1.4,
    ),
  })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    shell: [shellC.x, shellC.y, shellC.z],
    plastron: [O, bodyY - 2.2 * bg, O + 0.2],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    shell: main,
    plastron: plastronTone,
    neck: main,
    head: main,
    tail: main,
    tailTip: dark,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
  }
  const parents: Record<string, string> = {
    shell: "body",
    plastron: "body",
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
    // Juvenile signature: a pair of pale scute buds sprouting from the
    // skull top — the shell's armor language starting early. headC is
    // already grid-space, so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "skullBudLeft" : "skullBudRight"
      const base = vec3(headC.x + sx * 1.8 * hs, budY - 0.4, headC.z + 0.5)
      const tip = vec3(headC.x + sx * 2.4 * hs, budY + 1.2, headC.z - 0.7)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.9) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = plastronTone
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: two tall stone spikes, the earned crown.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownStoneLeft" : "crownStoneRight"
      const base = vec3(headC.x + sx * 2.2 * hs, budY - 0.6, headC.z - 0.4)
      const tip = vec3(headC.x + sx * 3.2 * hs, budY + 3.2, headC.z - 2.6)
      fields.push({ name, sdf: sdCapsule(base, tip, 1.1) })
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
      shell: ramp,
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
