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

export { sampleDna as sampleMoleDna } from "./sample"

export const MOLE_GRID = 56

/**
 * Shalemole — the Earth line's digging body plan. A stocky low barrel on
 * short thick legs with oversized spade forepaws, a pointed digging snout
 * and slate scale plates along the spine. The shell dome and plastron rim
 * keep the tortoise unmistakable next to it: the mole wears plates, not a
 * shell, and digs with its hands instead of hiding under armor.
 */
export const moleTemplate: Template = {
  id: "mole",
  version: 1,
  proportions: {
    bodyLength: { min: 0.8, max: 1.2 },
    bodyGirth: { min: 0.85, max: 1.25 },
    legLength: { min: 0.7, max: 1.15 },
    neckLength: { min: 0.7, max: 1.1 },
    neckThickness: { min: 0.8, max: 1.25 },
    headSize: { min: 0.8, max: 1.2 },
    plateSize: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.6, max: 1.1 },
  },
  styles: {
    back: [
      { id: "plated", params: { lift: { min: 0.6, max: 1.4 } } },
      { id: "ridged", params: { lift: { min: 0.6, max: 1.4 } } },
      { id: "smooth", params: {} },
    ],
    paws: [
      { id: "spade", params: { dig: { min: 0.6, max: 1.4 } } },
      { id: "broad", params: { dig: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 28, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface MoleBuild extends CreatureBuild {}

const O = MOLE_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the mole from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildMole(dna: Dna, stage: Stage = "baby"): MoleBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const ps = p.plateSize ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // Legs stay planted; the whole mass rides a hair higher each stage.
  // The torso rides on its radius so the belly clears the floor, and the
  // foot bottom clears the y=0.5 voxel-center floor like every archetype.
  const hipY = 2.2 * bg + 3 + 0.6 * j
  const bodyY = 7.5 * bg + 1.5
  const footY = 2.2 * bg + 0.7

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
  // Slate reads as worn digging stone: same hue, lifted and desaturated.
  const slate: [number, number, number] = hslToRgb(hue, 0.42, 0.55 + lift)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // --- surface bounds: the barrel drives the ramp bands; the plates borrow
  // them so their crowns read dorsal and their flanks lateral.
  const chestA = at(0, bodyY, 5.2 * bl)
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 5 * bg,
    torsoTop: bodyY + 5 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  // --- body: a stocky low barrel, the digger's mass.
  const rumpA = at(0, bodyY - 0.5, -5.2 * bl)
  const bodyField = sdCapsule(chestA, rumpA, 5 * bg)
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- back plates: slate scales seated on the barrel's crown, classified
  // with the same surface ramp so their tops read dorsal. They sit proud of
  // the barrel surface so they claim their own voxels under the paint order —
  // a plate buried inside the barrel simply vanishes.
  const backStyle = dna.styles.back ?? "plated"
  const plateLift = dna.styleParams.lift ?? 1
  const plateY = bodyY + 4.6 * bg
  let platesField = sdBox(
    at(0, plateY - 0.5, 0.5 * bl),
    vec3(3.2 * ps * bg, 1.3 * ps, 2.6 * ps * bl),
  )
  if (backStyle === "plated") {
    // A row of three overlapping scutes down the spine.
    for (const sz of [3.4, 0, -3.4]) {
      platesField = smoothUnion(
        platesField,
        sdBox(
          at(0, plateY + 0.3 * plateLift, sz * bl),
          vec3(2.9 * ps * bg, 1.3 * ps, 2.2 * ps * bl),
        ),
        0.9,
      )
    }
  } else if (backStyle === "ridged") {
    // A single keel ridge running the crown, front to back.
    platesField = smoothUnion(
      platesField,
      sdCapsule(
        at(0, plateY + 1.1 * plateLift, 4.2 * bl),
        at(0, plateY + 0.6 * plateLift, -4.4 * bl),
        1.0 * plateLift,
      ),
      1.0,
    )
  }
  fields.push({
    name: "plates",
    sdf: platesField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: short and thick, emerging low from the barrel's front and
  // lifting to the head. Only the segment past the body's front lobe
  // survives the paint order — a digger reads exactly so.
  const neckA = at(0, bodyY + 1.5, 7 * bl)
  const neckB = at(0, bodyY + 2.6 + 1.2 * nl, 8.4 * bl + 1.2 * nl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.4 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a blunt wedge skull with a pointed digging snout.
  const headC = at(0, bodyY + 3.2 + 1.4 * nl, 9.6 * bl + 1.8 * nl)
  const skullHalf = vec3(2.6 * hs, 2.2 * hs, 2.7 * hs)
  const snoutHalf = vec3(1.5 * hs, 1.3 * hs, 2.2 * hs)
  const snoutC = vec3(
    headC.x,
    headC.y - 0.6 * hs,
    headC.z + skullHalf.z + 1.3 * hs,
  )
  // A digging point on the snout's face: a second smaller box stepped
  // forward, so the nose tapers instead of ending flat.
  const noseC = vec3(snoutC.x, snoutC.y - 0.3 * hs, snoutC.z + 1.8 * hs)
  const headField = union(
    union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
    sdBox(noseC, vec3(0.9 * hs, 0.8 * hs, 1.0 * hs)),
  )
  const face = faceParts(
    facePlan("mole", {
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

  // --- four short columns planted wide. The forelegs end in flattened spade
  // paws — the digger's shovels. legLength spreads the planted stance rather
  // than stretching the column.
  const pawStyle = dna.styles.paws ?? "spade"
  const dig = dna.styleParams.dig ?? 1
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, sz, name] of [
    [-1, 1, "legFL"],
    [1, 1, "legFR"],
    [-1, -1, "legBL"],
    [1, -1, "legBR"],
  ] as const) {
    const hip = at(sx * 4 * bg, hipY, sz * 4.2 * bl)
    const foot = at(
      sx * (4 + 0.9 * ll) * bg,
      footY,
      sz * (4.2 + 0.9 * ll) * bl,
    )
    legPivots[name] = [hip.x, hip.y, hip.z]
    const front = sz > 0
    const paw =
      pawStyle === "spade" && front
        ? sdEllipsoid(
            vec3(foot.x, footY - 0.3, foot.z + 0.8),
            vec3(2.6 * dig * bg, 1.1, 2.0 * dig),
          )
        : sdSphere(vec3(foot.x, footY - 0.2, foot.z + 0.4), 1.6)
    fields.push({
      name,
      sdf: union(
        union(sdSphere(hip, 2.6 * bg), sdCapsule(hip, foot, 2.2 * bg)),
        paw,
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a short nub trailing from the barrel's rear. The visible nub
  // is whatever clears the body — the paint order keeps the buried part
  // honest.
  const tailBase = at(0, bodyY - 4, -6.8 * bl)
  const tailEnd = at(0, bodyY - 4.4, -6.8 * bl - 2.6 * tl)
  const tailField = sdCapsule(tailBase, tailEnd, 1.4)
  fields.push({ name: "tail", sdf: tailField })
  fields.push({
    name: "tailTip",
    sdf: sdSphere(vec3(tailEnd.x, tailEnd.y - 0.3, tailEnd.z - 0.9), 1.3),
  })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    plates: [O, plateY, O + 0.5 * bl],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    plates: slate,
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
    plates: "body",
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
    // Juvenile signature: a pair of slate scute buds sprouting from the
    // skull top — the back-plate armor starting early. headC is already
    // grid-space, so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "scaleBudLeft" : "scaleBudRight"
      const base = vec3(headC.x + sx * 1.7 * hs, budY - 0.4, headC.z + 0.4)
      const tip = vec3(headC.x + sx * 2.3 * hs, budY + 1.2, headC.z - 0.6)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.9) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = slate
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: two tall slate blades, the earned crown.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownSlateLeft" : "crownSlateRight"
      const base = vec3(headC.x + sx * 2.0 * hs, budY - 0.6, headC.z - 0.3)
      const tip = vec3(headC.x + sx * 3.0 * hs, budY + 3.2, headC.z - 2.4)
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
      plates: ramp,
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
