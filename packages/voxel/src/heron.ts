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

export { sampleDna as sampleHeronDna } from "./sample"

export const HERON_GRID = 56

/**
 * Galeheron — the Wind line's wading body plan. A tall stilt-legged
 * storm-wader: a compact teardrop torso held high over long thin legs, an
 * S-curved neck, a spear beak and broad folded wings with a trailing plume
 * tail. Two legs and the wing blades keep it unmistakable next to the
 * four-legged storm hound, and the stilts, S-neck and dagger beak keep it
 * unmistakable next to the perched falcon.
 */
export const heronTemplate: Template = {
  id: "heron",
  version: 1,
  proportions: {
    bodyLength: { min: 0.75, max: 1.2 },
    bodyGirth: { min: 0.7, max: 1.1 },
    legLength: { min: 1.0, max: 1.5 },
    neckLength: { min: 1.0, max: 1.5 },
    neckThickness: { min: 0.7, max: 1.1 },
    headSize: { min: 0.75, max: 1.2 },
    wingLength: { min: 0.8, max: 1.3 },
    tailLength: { min: 0.7, max: 1.2 },
  },
  styles: {
    wings: [
      { id: "folded", params: { sweep: { min: 0.6, max: 1.4 } } },
      { id: "drooped", params: { sweep: { min: 0.6, max: 1.4 } } },
      { id: "lifted", params: { sweep: { min: 0.6, max: 1.4 } } },
    ],
    tail: [
      { id: "plume", params: { drift: { min: 0.6, max: 1.4 } } },
      { id: "fan", params: {} },
      { id: "streamer", params: { drift: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 165, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface HeronBuild extends CreatureBuild {}

const O = HERON_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the heron from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildHeron(dna: Dna, stage: Stage = "baby"): HeronBuild {
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

  // A wader stands tall; the hip line lifts each stage.
  const hipY = 9.6 + 0.7 * j

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

  // --- body: a compact teardrop torso, keel deep at the chest.
  const chestA = at(0, 13.5, 2.6 * bl)

  // --- surface bounds: belly band on the high body, sock on the stilts.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4.3 * bg,
    torsoTop: chestA.y + 4.3 * bg,
    sockTop: 3.4,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  const rumpA = at(0, 12.5, -3.2 * bl)
  let bodyField = sdCapsule(chestA, rumpA, 4.3 * bg)
  bodyField = smoothUnion(
    bodyField,
    sdEllipsoid(at(0, 12.5, 3.2 * bl), vec3(3.2 * bg, 2.6 * bg, 3.2 * bl)),
    1.5,
  )
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: a long S-curve — up from the shoulders, kinking back, then
  // striking forward to the skull. The wader's question-mark silhouette.
  const neckA = at(0, 15.8, 2.0 * bl)
  const neckMid = at(0, 18.5 + 2 * nl, 3.0 * bl + 1.2 * nl)
  const neckKink = at(0, 20.5 + 3 * nl, 2.2 * bl)
  const neckC = at(0, 21.5 + 4 * nl, 3.6 * bl + 1.4 * nl)
  fields.push({
    name: "neck",
    sdf: union(
      union(
        sdCapsule(neckA, neckMid, 2.2 * nt),
        sdCapsule(neckMid, neckKink, 1.9 * nt),
      ),
      sdCapsule(neckKink, neckC, 1.7 * nt),
    ),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a small skull with the spear beak as its own bone part.
  const headC = at(0, 22 + 4 * nl, 3.6 * bl + 1.4 * nl + 1.8 * hs)
  const skullHalf = vec3(2.4 * hs, 2.1 * hs, 2.5 * hs)
  const headField = sdBox(headC, skullHalf)
  const beakC = vec3(
    headC.x,
    headC.y - 0.4 * hs,
    headC.z + skullHalf.z + 1.8 * hs,
  )
  const beakField = sdBox(beakC, vec3(0.8 * hs, 0.8 * hs, 2.4 * hs))
  const face = faceParts(
    facePlan("heron", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })
  fields.push({ name: "beak", sdf: beakField })

  // --- wings: broad blades folded along the flanks, style-driven.
  const wingStyle = dna.styles.wings ?? "folded"
  const sweep = dna.styleParams.sweep ?? 1
  for (const sx of [-1, 1]) {
    const name = sx === -1 ? "wingLeft" : "wingRight"
    const root = at(sx * 2.4 * bg, 14.5, 1.4 * bl)
    const tip =
      wingStyle === "drooped"
        ? at(sx * (3.0 + 1.2 * sweep), 8.6, -2.2 - 5.8 * wl)
        : wingStyle === "lifted"
          ? at(sx * (3.6 + 1.0 * sweep), 17.5, -1.2 - 5.2 * wl)
          : at(sx * (2.6 + 0.8 * sweep), 10.6, -3.0 - 5.8 * wl)
    fields.push({
      name,
      sdf: union(
        sdRoundCone(root, tip, 2.3 * bg, 0.85),
        sdSphere(root, 1.9 * bg),
      ),
    })
  }

  // --- two long stilt legs with wader foot pads; FL/FR names so the gait
  // drives them.
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, name] of [
    [-1, "legFL"],
    [1, "legFR"],
  ] as const) {
    const hip = at(sx * 2.2 * bg, hipY, 1.0 * bl)
    const footY = 2.1 + 0.2 * ll
    const knee = at(sx * 2.5 * bg, (hipY + footY) / 2, 1.4 * bl)
    const foot = at(sx * 2.5 * bg, footY, 1.2 * bl)
    legPivots[name] = [hip.x, hip.y, hip.z]
    fields.push({
      name,
      sdf: union(
        union(sdCapsule(hip, knee, 1.6 * bg), sdCapsule(knee, foot, 1.3 * bg)),
        sdSphere(at(sx * 2.5 * bg, footY - 0.2, 1.6 * bl), 1.4),
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a short wedge trailing the rump. Anchored past the body's rear
  // surface so it always claims its own voxels under the paint order; a
  // plume buried inside the torso silhouette simply vanishes.
  const tailBase = at(0, 12.2, -3.2 * bl - 3.8 * bg + 1 * tl)
  const tailStyle = dna.styles.tail ?? "plume"
  const drift = dna.styleParams.drift ?? 1
  const tailField = sdBox(
    at(0, 12.2, -3.2 * bl - 3.8 * bg - 1 * tl),
    vec3(2.7 * bg, 1.0, 2.6 * tl),
  )
  fields.push({ name: "tail", sdf: tailField })
  // The tailTip trails the wedge's back edge by a real margin so it always
  // claims its own voxels under the paint order.
  const tailTipZ = -3.2 * bl - 3.8 * bg - 3.6 * tl
  const tailTipField =
    tailStyle === "fan"
      ? sdBox(at(0, 12.1, tailTipZ - 0.8 * tl), vec3(3.0 * bg, 0.8, 1.4 * tl))
      : tailStyle === "streamer"
        ? union(
            sdCapsule(
              at(0, 12.1, tailTipZ + 0.8 * tl),
              at(-0.8, 11.8, tailTipZ - 3 * tl * drift),
              0.8,
            ),
            sdCapsule(
              at(0, 12.1, tailTipZ + 0.8 * tl),
              at(0.8, 11.8, tailTipZ - 3 * tl * drift),
              0.8,
            ),
          )
        : union(
            sdCapsule(
              at(0, 12.1, tailTipZ + 0.8 * tl),
              at(-1.6 * drift, 12.6, tailTipZ - 1.4 * tl),
              0.9,
            ),
            sdCapsule(
              at(0, 12.1, tailTipZ + 0.8 * tl),
              at(1.6 * drift, 12.6, tailTipZ - 1.4 * tl),
              0.9,
            ),
          )
  fields.push({ name: "tailTip", sdf: tailTipField })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    beak: [beakC.x, beakC.y, beakC.z],
    wingLeft: [O - 2.4 * bg, 14.5, O + 1.4 * bl],
    wingRight: [O + 2.4 * bg, 14.5, O + 1.4 * bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [O, 12.1, O - 3.2 * bl - 3.8 * bg - 3.6 * tl],
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
    // Juvenile signature: short downy crest buds sprouting behind the skull —
    // the storm line's head-plumes starting early. headC is already
    // grid-space, so the offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crestBudLeft" : "crestBudRight"
      const base = vec3(headC.x + sx * 1.8 * hs, budY - 0.5, headC.z - 0.6)
      const tip = vec3(headC.x + sx * 2.8 * hs, budY + 1.4, headC.z - 1.8)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.7) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = spark
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: two long swept crest plumes, the crown of the
    // shallows.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "galeCrestLeft" : "galeCrestRight"
      const base = vec3(headC.x + sx * 1.0 * hs, budY - 0.4, headC.z - 0.4)
      const tip = vec3(headC.x + sx * 2.4 * hs, budY + 4.2, headC.z - 3.4)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.65) })
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
