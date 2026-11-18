import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleJerboaDna } from "./sample"

// Dune Jerboa archetype: the Earth line's second body plan. A compact
// hopping rodent — tiny forearms, hugely long hind legs, a blunt head on a
// short neck, and a whip-thin tail ending in a flag-sized tuft. The silhouette
// is built around the jump: everything sits high and spring-loaded. It shares
// no assembly with the low digging mole or the armored tortoise. Authored in
// voxel units on a 56^3 grid (y up, +z forward).
export const JERBOA_GRID = 56

export const jerboaTemplate: Template = {
  id: "jerboa",
  version: 1,
  proportions: {
    bodyLength: { min: 0.75, max: 1.05 },
    bodyGirth: { min: 0.65, max: 0.95 },
    legLength: { min: 1.1, max: 1.6 },
    neckLength: { min: 0.5, max: 0.8 },
    neckThickness: { min: 0.6, max: 0.9 },
    headSize: { min: 0.8, max: 1.1 },
    earLength: { min: 1.0, max: 1.8 },
    tailLength: { min: 1.1, max: 1.6 },
  },
  styles: {
    ears: [
      { id: "spear", params: { flare: { min: 0.2, max: 1 } } },
      { id: "fan", params: { flare: { min: 0.2, max: 1 } } },
      { id: "folded", params: {} },
    ],
    tail: [
      { id: "flag", params: { bush: { min: 0.6, max: 1.4 } } },
      { id: "plume", params: { bush: { min: 0.6, max: 1.4 } } },
      { id: "bob", params: {} },
    ],
  },
  palette: { hue: 28, valueJitter: { min: 0.42, max: 0.6 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface JerboaBuild extends CreatureBuild {}

const O = JERBOA_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildJerboa(dna: Dna, stage: Stage = "baby"): JerboaBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const el = p.earLength ?? 1
  const tl = p.tailLength ?? 1

  // A compact three-capsule torso held high over the hind-leg springs.
  const chestA = at(0, 16.5, 3.6 * bl)
  const chestB = at(0, 16.5, 0.6 * bl)
  const waistA = at(0, 16.8, 0.6 * bl)
  const waistB = at(0, 17, -3.2 * bl)
  const rumpA = at(0, 17, -3.2 * bl)
  const rumpB = at(0, 16.5, -4.8 * bl)

  // Maturity lifts the stance; the identity layer never moves.
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 13.5 + 0.9 * j
  const footY = 2.4 + 0.4 * bg
  const hindZ = -3.6 * bl
  const foreZ = 3 * bl

  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4 * bg,
    torsoTop: rumpA.y + 3.8 * bg,
    sockTop: footY + 1.2,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // The whip tail leaves the rump level, then climbs behind the body.
  const tailBase = at(0, 17, -4.8 * bl)
  const tailMid = at(0, 18.5, -4.8 * bl - 4.6 * tl)
  const tailKnee = at(0, 20, -4.8 * bl - 7.4 * tl)
  const tailEnd = at(0, 21, -4.8 * bl - 9.2 * tl)

  // A short upright neck: the head reads close to the shoulders, never on a
  // giraffe reach.
  const neckA = at(0, 17, 3.4 * bl)
  const neckB = at(0, 18.6 + 1.4 * nl, 3.4 * bl + 1.1 * nl)
  const neckC = at(0, 19.6 + 2.4 * nl, 3.4 * bl + 2.2 * nl)

  const hk = hs * (stage === "baby" ? 1.12 : stage === "juvenile" ? 1.05 : 1)
  const headC = vec3(neckC.x, neckC.y + 0.4, neckC.z + 1.4 * hk)
  const skullHalf = vec3(2.5 * hk, 2.2 * hk, 2.6 * hk)
  const snoutC = vec3(headC.x, headC.y - 0.7 * hk, headC.z + 3 * hk)
  const snoutHalf = vec3(1.5 * hk, 1.2 * hk, 2.1 * hk)

  const earStyle = dna.styles.ears ?? "spear"
  const flare = dna.styleParams.flare ?? 0.6
  const tailStyle = dna.styles.tail ?? "flag"
  const bush = dna.styleParams.bush ?? 1

  const fields: PartField[] = []
  const legPivots: Record<string, [number, number, number]> = {}

  // Body: three smoothed capsules, compact and deep-chested.
  const chestField: Sdf = sdCapsule(chestA, chestB, 4 * bg)
  const waistField: Sdf = sdCapsule(waistA, waistB, 3.3 * bg)
  const rumpField: Sdf = sdCapsule(rumpA, rumpB, 3.8 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnionLocal(
      smoothUnionLocal(chestField, waistField, 2),
      rumpField,
      2,
    ),
    classify: classifyTorso,
  })

  // Two enormous hind legs, from a high hip down to a long planted foot.
  for (const sx of [-1, 1] as const) {
    const name = sx < 0 ? "legBL" : "legBR"
    const hip = at(sx * 2.6 * bg, hipY, hindZ)
    const knee = at(sx * 3 * bg, (hipY + footY) / 2 + 2, hindZ - 1.4 * ll)
    const foot = at(sx * 3.1 * bg, footY, hindZ + 0.8 + 1.2 * ll)
    legPivots[name] = [hip.x, hip.y, hip.z]
    const thigh = at(sx * 2.2 * bg, 14.5, hindZ + 0.8)
    fields.push({
      name,
      sdf: union(
        union(sdSphere(hip, 2.6 * bg), sdCapsule(hip, knee, 2 * bg)),
        union(sdCapsule(knee, foot, 1.5 * bg), sdCapsule(hip, thigh, 2.1 * bg)),
      ),
      classify: classifyLeg,
    })
  }

  // Tiny forearms, tucked under the chest — the jump, not the walk, defines
  // this body plan. Still named leg* so the shared stage contract can rig them.
  for (const sx of [-1, 1] as const) {
    const name = sx < 0 ? "legFL" : "legFR"
    const shoulder = at(sx * 2.6 * bg, 14.8 + 0.9 * j, foreZ)
    const paw = at(sx * 2.8 * bg, footY + 2.5, foreZ + 0.8)
    legPivots[name] = [shoulder.x, shoulder.y, shoulder.z]
    fields.push({
      name,
      sdf: union(sdCapsule(shoulder, paw, 1.2 * bg), sdSphere(paw, 1.4 * bg)),
      classify: classifyLeg,
    })
  }

  // Tail: a thin shaft carrying a big flat flag at the tip.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 1.5 * bg),
    sdCapsule(tailMid, tailKnee, 1.2),
  )
  fields.push({ name: "tail", sdf: tailField })
  const tailTipPieces: Sdf[] = [sdCapsule(tailKnee, tailEnd, 0.9)]
  if (tailStyle === "flag") {
    tailTipPieces.push(
      sdBox(at(0, tailEnd.y, tailEnd.z), vec3(1.5 * bush, 3.1, 1.8)),
    )
  } else if (tailStyle === "plume") {
    tailTipPieces.push(
      sdSphere(vec3(tailEnd.x, tailEnd.y + 0.6, tailEnd.z), 2.3 * bush),
    )
  } else {
    tailTipPieces.push(
      sdSphere(vec3(tailEnd.x, tailEnd.y - 0.5, tailEnd.z + 1.8), 1.6),
    )
  }
  fields.push({
    name: "tailTip",
    sdf: tailTipPieces.reduce((acc, s) => union(acc, s)),
  })

  // Short thick neck.
  const neckField: Sdf = union(
    sdCapsule(neckA, neckB, 2 * nt),
    sdCapsule(neckB, neckC, 1.6 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // Colours are resolved before the face so the skull can share the coat.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = jerboaTemplate.palette.valueJitter
  const hue = gilded ? 45 : jerboaTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.74
  const lift = stage === "baby" ? 0 : stage === "juvenile" ? 0.05 : 0.1
  const main = hslToRgb(hue, Math.min(1, sat + lift), Math.min(1, light + lift))
  const ramp = creaturePalette({
    hue,
    sat: Math.min(1, sat + lift),
    light: Math.min(1, light + lift),
  })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  const dust: [number, number, number] = hslToRgb(hue, 0.9, 0.78)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    sdBox(snoutC, snoutHalf),
  )
  const face = faceParts(
    facePlan("fox", {
      center: headC,
      half: skullHalf,
      snout: { center: snoutC, half: snoutHalf },
    }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtractLocal(headField, face.carve, 0.5),
    classify: face.skinClass,
  })
  fields.push(...face.fields)

  // Ears: tall spear-like hopping ears on the skull's top corners.
  const earBaseY = headC.y + skullHalf.y - 0.3
  const earBaseL = vec3(headC.x - 1.5 * hk, earBaseY, headC.z - 0.5 * hk)
  const earBaseR = vec3(headC.x + 1.5 * hk, earBaseY, headC.z - 0.5 * hk)
  for (const [base, sign] of [
    [earBaseL, -1],
    [earBaseR, 1],
  ] as const) {
    const name = sign < 0 ? "earLeft" : "earRight"
    if (earStyle === "folded") {
      fields.push({
        name,
        sdf: sdCapsule(
          base,
          vec3(base.x + sign * (1.6 + flare), base.y + 0.8 * el, base.z - 1.2),
          1.3,
        ),
      })
    } else {
      const tipY = earStyle === "spear" ? 4.6 * el : 3.4 * el
      fields.push({
        name,
        sdf: sdCapsule(
          base,
          vec3(
            base.x + sign * (1.2 + 1.5 * flare),
            base.y + tipY,
            base.z - 0.8,
          ),
          earStyle === "spear" ? 0.9 : 1.5,
        ),
      })
    }
  }

  // Juvenile signature: sand cuffs blooming off the cheeks — new growth the
  // baby has not earned yet. The ear identity layer is untouched.
  if (stage === "juvenile" || stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const root = vec3(
        headC.x + sx * 2.2 * hk,
        headC.y - 0.3 * hk,
        headC.z + 0.4 * hk,
      )
      fields.push({
        name: sx < 0 ? "dustTuftLeft" : "dustTuftRight",
        sdf: sdCapsule(
          root,
          vec3(root.x + sx * 2, root.y + 0.8, root.z - 1.4),
          0.9,
        ),
      })
    }
  }

  // Champion signature: a pair of dune-crest plumes rising behind the ears.
  if (stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const base = vec3(
        headC.x + sx * 1.3 * hk,
        headC.y + 2.2 * hk,
        headC.z - 1.8 * hk,
      )
      const mid = vec3(base.x + sx * 2.2, base.y + 2.2, base.z - 1.4)
      const tip = vec3(base.x + sx * 1.4, base.y + 4.4, base.z - 0.6)
      fields.push({
        name: sx < 0 ? "duneCrestLeft" : "duneCrestRight",
        sdf: union(sdCapsule(base, mid, 0.9), sdCapsule(mid, tip, 0.8)),
      })
    }
  }

  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailKnee.x, tailKnee.y, tailKnee.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckC.x, neckC.y, neckC.z],
    earLeft: [earBaseL.x, earBaseL.y, earBaseL.z],
    earRight: [earBaseR.x, earBaseR.y, earBaseR.z],
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    tailTip: dark,
    ...Object.fromEntries(Object.keys(legPivots).map((n) => [n, dark])),
    neck: main,
    head: main,
    earLeft: dark,
    earRight: dark,
  }
  if (stage === "juvenile" || stage === "champion") {
    for (const n of ["dustTuftLeft", "dustTuftRight"]) {
      pivots[n] = [
        headC.x + (n === "dustTuftLeft" ? -2.2 : 2.2) * hk,
        headC.y - 0.3 * hk,
        headC.z + 0.4 * hk,
      ]
      colors[n] = dust
    }
  }
  if (stage === "champion") {
    for (const [n, sx] of [
      ["duneCrestLeft", -1],
      ["duneCrestRight", 1],
    ] as const) {
      pivots[n] = [
        headC.x + sx * 1.3 * hk,
        headC.y + 2.2 * hk,
        headC.z - 1.8 * hk,
      ]
      colors[n] = bone
    }
  }

  const legRamp = ramp
  return {
    fields,
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      legFL: legRamp,
      legFR: legRamp,
      legBL: legRamp,
      legBR: legRamp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: {
      neck: "body",
      head: "neck",
      earLeft: "head",
      earRight: "head",
      tail: "body",
      tailTip: "tail",
      ...(stage === "juvenile" || stage === "champion"
        ? { dustTuftLeft: "head", dustTuftRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { duneCrestLeft: "head", duneCrestRight: "head" }
        : {}),
      ...face.parents,
    },
  }
}

// Local aliases keep the import list short; both are the shared combinators
// from sdf.ts, rewrapped so the assembly reads like a sentence.
function smoothUnionLocal(a: Sdf, b: Sdf, k: number): Sdf {
  return (p) => {
    const da = a(p)
    const db = b(p)
    const h = Math.max(k - Math.abs(da - db), 0) / k
    return Math.min(da, db) - h * h * k * 0.25
  }
}
function smoothSubtractLocal(base: Sdf, cutter: Sdf, k: number): Sdf {
  return (p) => {
    const d1 = cutter(p)
    const d2 = base(p)
    if (k <= 0) return Math.max(d2, -d1)
    const h = Math.max(0, Math.min(1, 0.5 - (0.5 * (d2 + d1)) / k))
    return d2 * (1 - h) - d1 * h + k * h * (1 - h)
  }
}
