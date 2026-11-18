import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdSphere,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette } from "./surface"
import type { PartField } from "./voxelizer"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleRayDna } from "./sample"

// Spark Ray archetype: the Electric line's second body plan. A wide flat
// glider — a discoidal trunk, wing fins that carry the whole silhouette, a
// long trailing tail with a charged barb, and no walking legs. The ray does
// not reuse the fox or hound assembly: its mass comes from an ellipsoid hub
// and flat fin slabs, and its head is set directly on the trunk (there is no
// neck part by design). Authored on a 56^3 grid (y up, +z forward).
//
// NON-QUADRUPED PART CONTRACT: the shared stage suite needs at least one
// `leg*` pivot to rig a rising stance. The ray satisfies it with two tiny
// pelvic fin-lobes (legFL/legFR) tucked under the trunk; they are fins, not
// feet, and are documented as such. `neckLength/bodyLength` is measured as
// zero because there is no neck part at all.
export const RAY_GRID = 56

export const rayTemplate: Template = {
  id: "ray",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.15 },
    bodyGirth: { min: 0.8, max: 1.15 },
    finSpan: { min: 0.9, max: 1.3 },
    tailLength: { min: 1.0, max: 1.5 },
    headSize: { min: 0.8, max: 1.1 },
  },
  styles: {
    fins: [
      { id: "broad", params: { sweep: { min: 0.2, max: 1 } } },
      { id: "tapered", params: { sweep: { min: 0.2, max: 1 } } },
      { id: "scalloped", params: {} },
    ],
    tail: [
      { id: "whip", params: { barb: { min: 0.6, max: 1.4 } } },
      { id: "lance", params: { barb: { min: 0.6, max: 1.4 } } },
      { id: "streamer", params: {} },
    ],
  },
  palette: { hue: 50, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface RayBuild extends CreatureBuild {}

const O = RAY_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildRay(dna: Dna, stage: Stage = "baby"): RayBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const fs = p.finSpan ?? 1
  const tl = p.tailLength ?? 1
  const hs = p.headSize ?? 1

  // The gliding hub: a flattened ellipsoid, unlike any capsule quadruped.
  const hubC = at(0, 13.5, -0.5 * bl)
  const hubR = vec3(5.4 * bg, 3.2 * bg, 10 * bl)
  const rimC = at(0, 13.5, -2 * bl)
  const rimR = vec3(6.2 * bg, 2.2 * bg, 8 * bl)

  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const lobeY = 8 + 0.9 * j

  const fields: PartField[] = []
  const legPivots: Record<string, [number, number, number]> = {}

  // Trunk: two blended ellipsoids make a low lens with a thicker centre.
  fields.push({
    name: "body",
    sdf: smoothUnionLocal(
      sdEllipsoid(hubC, hubR),
      sdEllipsoid(rimC, rimR),
      2.5,
    ),
  })

  // Wing fins: flat slabs swept back from the hub. The style decides the
  // silhouette; the pivot stays at the hub edge so the rig never drifts.
  const finStyle = dna.styles.fins ?? "broad"
  const sweep = dna.styleParams.sweep ?? 0.6
  const finEdges: Record<string, Vec3> = {}
  for (const sx of [-1, 1] as const) {
    const name = sx < 0 ? "finLeft" : "finRight"
    const span = 7.5 * fs * bg
    const edge = at(
      sx * (4 * bg + span),
      13.5 + (finStyle === "tapered" ? 1.2 : 0),
      -3 * bl - sweep * 2,
    )
    finEdges[name] = edge
    const fin: Sdf =
      finStyle === "scalloped"
        ? union(
            sdBox(
              at(sx * (4 * bg + span * 0.5), 13.5, -0.5 * bl),
              vec3(span * 0.55, 1.1, 4.6 * bl),
            ),
            sdSphere(at(sx * (4 * bg + span * 0.92), 13.5, -2.5 * bl), 2.2),
          )
        : sdBox(
            at(sx * (4 * bg + span * 0.5), 13.5, -0.6 * bl),
            vec3(span * 0.55, finStyle === "tapered" ? 0.9 : 1.2, 4.8 * bl),
          )
    fields.push({ name, sdf: fin })
  }

  // Pelvic fin-lobes — the non-quadruped stand-in for `leg*`. They rise with
  // maturity exactly like a walking leg's pivot, so the shared stage contract
  // holds without pretending the ray has feet.
  for (const sx of [-1, 1] as const) {
    const name = sx < 0 ? "legFL" : "legFR"
    const root = at(sx * 2.6 * bg, lobeY + 2, -4 * bl)
    const tip = at(sx * 3 * bg, lobeY, -5 * bl)
    legPivots[name] = [root.x, root.y, root.z]
    fields.push({
      name,
      sdf: union(sdSphere(root, 1.6), sdCapsule(root, tip, 1.1)),
    })
  }

  // Long trailing tail with a charged barb.
  const tailBase = at(0, 13.5, -8 * bl)
  const tailMid = at(0, 14, -8 * bl - 4 * tl)
  const tailEnd = at(0, 15, -8 * bl - 8.5 * tl)
  fields.push({
    name: "tail",
    sdf: union(
      sdCapsule(tailBase, tailMid, 1.6),
      sdCapsule(tailMid, tailEnd, 1.1),
    ),
  })
  const tailStyle = dna.styles.tail ?? "whip"
  const barb = dna.styleParams.barb ?? 1
  const barbPieces: Sdf[] = [
    sdSphere(vec3(tailEnd.x, tailEnd.y, tailEnd.z), 1.6),
  ]
  if (tailStyle === "whip") {
    barbPieces.push(
      sdBox(vec3(tailEnd.x, tailEnd.y, tailEnd.z), vec3(1.4, 2 * barb, 1.7)),
    )
  } else if (tailStyle === "lance") {
    barbPieces.push(
      sdCapsule(
        vec3(tailEnd.x, tailEnd.y, tailEnd.z),
        vec3(tailEnd.x, tailEnd.y + 1.4 * barb, tailEnd.z - 1.8),
        0.9,
      ),
    )
  } else {
    barbPieces.push(
      sdSphere(vec3(tailEnd.x, tailEnd.y + 0.6, tailEnd.z - 1.5), 1.7 * barb),
    )
  }
  fields.push({
    name: "tailTip",
    sdf: barbPieces.reduce((acc, s) => union(acc, s)),
  })

  // Colours before the face: the skull shares the coat.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = rayTemplate.palette.valueJitter
  const hue = gilded ? 45 : rayTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.78
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
  const spark: [number, number, number] = hslToRgb(hue, 0.9, 0.78)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // A small flattened head set directly on the front of the trunk — no neck.
  const hk = hs * (stage === "baby" ? 1.12 : stage === "juvenile" ? 1.05 : 1)
  const headC = at(0, 15, 9 * bl)
  const skullHalf = vec3(2.6 * hk, 1.9 * hk, 2.8 * hk)
  const face = faceParts(
    facePlan("crab", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({
    name: "head",
    sdf: sdEllipsoid(headC, skullHalf),
  })
  fields.push(...face.fields)

  // Juvenile signature: charge bars on the skull — the glow a young ray is
  // still learning to hold. The fin identity layer stays untouched.
  if (stage === "juvenile" || stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const root = vec3(
        headC.x + sx * 1.5 * hk,
        headC.y + skullHalf.y,
        headC.z - 0.6 * hk,
      )
      fields.push({
        name: sx < 0 ? "sparkBarLeft" : "sparkBarRight",
        sdf: sdCapsule(
          root,
          vec3(root.x + sx * 1.4, root.y + 2.4, root.z - 1),
          0.8,
        ),
      })
    }
  }

  // Champion signature: a crown arc of raised charge above the skull.
  if (stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const base = vec3(
        headC.x + sx * 1.2 * hk,
        headC.y + skullHalf.y + 0.5,
        headC.z - 1.2 * hk,
      )
      const mid = vec3(base.x + sx * 2.4, base.y + 2.2, base.z - 1.4)
      const tip = vec3(base.x + sx * 1.6, base.y + 4.2, base.z - 0.5)
      fields.push({
        name: sx < 0 ? "crownArcLeft" : "crownArcRight",
        sdf: union(sdCapsule(base, mid, 0.8), sdCapsule(mid, tip, 0.8)),
      })
    }
  }

  const pivots: Record<string, [number, number, number]> = {
    body: [O, lobeY + 2, O - bl],
    finLeft: [at(4 * bg, 13.5, 1.5 * bl).x, 13.5, at(4 * bg, 13.5, 1.5 * bl).z],
    finRight: [
      at(-4 * bg, 13.5, 1.5 * bl).x,
      13.5,
      at(-4 * bg, 13.5, 1.5 * bl).z,
    ],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
    head: [headC.x, headC.y - skullHalf.y, headC.z],
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    finLeft: dark,
    finRight: dark,
    tail: main,
    tailTip: dark,
    legFL: dark,
    legFR: dark,
    head: main,
  }
  if (stage === "juvenile" || stage === "champion") {
    for (const [n, sx] of [
      ["sparkBarLeft", -1],
      ["sparkBarRight", 1],
    ] as const) {
      pivots[n] = [
        headC.x + sx * 1.5 * hk,
        headC.y + skullHalf.y,
        headC.z - 0.6 * hk,
      ]
      colors[n] = spark
    }
  }
  if (stage === "champion") {
    for (const [n, sx] of [
      ["crownArcLeft", -1],
      ["crownArcRight", 1],
    ] as const) {
      pivots[n] = [
        headC.x + sx * 1.2 * hk,
        headC.y + skullHalf.y + 0.5,
        headC.z - 1.2 * hk,
      ]
      colors[n] = bone
    }
  }

  return {
    fields,
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      finLeft: ramp,
      finRight: ramp,
      legFL: ramp,
      legFR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: {
      finLeft: "body",
      finRight: "body",
      tail: "body",
      tailTip: "tail",
      head: "body",
      ...(stage === "juvenile" || stage === "champion"
        ? { sparkBarLeft: "head", sparkBarRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { crownArcLeft: "head", crownArcRight: "head" }
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
