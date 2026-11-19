/**
 * Shared body plan for the Roster Wave 2 archetypes (sprite, golem, wing).
 *
 * The three silhouettes differ in mass, stance and appendages, but they share
 * the same authoring contract: a two-capsule torso, four legs, a two-segment
 * neck, a boxed head with the generic face layout, one tail, one style-driven
 * appendage pair, and stage signature parts. Keeping the contract in one
 * module keeps their pivots, palettes and stage invariants consistent while
 * each archetype module owns its template, grid and shape parameters.
 */

import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
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

export interface WaveBodySpec {
  readonly id: "sprite" | "golem" | "wing"
  readonly grid: number
  readonly hue: number
  readonly saturation: number
  /** Torso center height above the ground. */
  readonly bodyY: number
  readonly bodyFront: number
  readonly bodyBack: number
  readonly bodyRadius: number
  readonly hipY: number
  readonly legSpread: number
  readonly legFront: number
  readonly legBack: number
  readonly legRadius: number
  readonly headScale: number
  readonly neckRise: number
  readonly tailReach: number
  readonly tailRise: number
  readonly wingSpan: number
  readonly appendage: "leaf" | "plate" | "feather"
  readonly appendageNames: readonly [string, string]
  readonly juvenileNames: readonly [string, string]
  readonly championNames: readonly [string, string]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Assemble one wave archetype's SDF parts, pivots, colors and rig edges. */
export function buildWaveBody(
  spec: WaveBodySpec,
  dna: Dna,
  stage: Stage = "baby",
): CreatureBuild {
  const O = spec.grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs =
    (p.headSize ?? 1) *
    (stage === "baby" ? 1.12 : stage === "juvenile" ? 1.04 : 1)
  const spread = dna.styleParams.crestSpread ?? 1
  const flare = dna.styleParams.tailFlare ?? 1

  // -- Skeleton -------------------------------------------------------------
  const bodyY = spec.bodyY
  const front = spec.bodyFront * bl
  const back = spec.bodyBack * bl
  const chest = at(0, bodyY, front)
  const waist = at(0, bodyY + 0.4, (front + back) / 2)
  const rump = at(0, bodyY + 0.2, back)
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = spec.hipY + 0.6 * j
  const footY = 2
  const frontZ = spec.legFront * ll
  const backZ = spec.legBack * ll
  const foot = footY + (spec.appendage === "plate" ? 0.2 : 0)

  const bounds: SurfaceBounds = {
    torsoBottom: bodyY - spec.bodyRadius * bg,
    torsoTop: bodyY + spec.bodyRadius * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, bounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, bounds)

  const neckA = at(0, bodyY + 0.6 * bg, front - 0.6)
  const neckB = at(0, bodyY + 2.4 + spec.neckRise * nl, front + 1.4 * nl)
  const headC = vec3(neckB.x, neckB.y + 0.8, neckB.z + 1.6 * hs)
  const skullHalf = vec3(2.6 * hs, 2.2 * hs, 2.6 * hs)
  const snoutC = vec3(headC.x, headC.y - 0.3 * hs, headC.z + 3.2 * hs)
  const snoutHalf = vec3(1.5 * hs, 1.3 * hs, 2.2 * hs)

  // -- Fields (paint order: later parts claim overlapping voxels) -----------
  const fields: PartField[] = []
  fields.push({
    name: "body",
    sdf: smoothUnion(
      smoothUnion(
        sdCapsule(chest, waist, spec.bodyRadius * bg),
        sdCapsule(waist, rump, spec.bodyRadius * 0.9 * bg),
        1.8,
      ),
      sdSphere(rump, spec.bodyRadius * 0.85 * bg),
      1.6,
    ),
    classify: classifyTorso,
  })

  // Tail: a leaf blade, a stone plate or a three-feather fan.
  const tailBase = at(0, bodyY + 1.2, back - 1.5)
  const tailMid = at(
    0,
    bodyY + spec.tailRise,
    back - spec.tailReach * 0.5 * flare,
  )
  const tailEnd = at(
    0,
    bodyY + spec.tailRise + 1.2,
    back - spec.tailReach * flare,
  )
  let tail: Sdf = sdCapsule(tailBase, tailMid, 1.6 * bg)
  if (spec.appendage === "leaf") {
    tail = union(tail, sdBox(tailMid, vec3(0.9, 3.1 * flare, 2.4)))
  } else if (spec.appendage === "plate") {
    tail = union(tail, sdBox(tailMid, vec3(2.3, 2.4, 2.6 * flare)))
  } else {
    for (const sx of [-1, 0, 1] as const) {
      tail = union(
        tail,
        sdCapsule(
          tailMid,
          vec3(tailEnd.x + sx * 2.2 * flare, tailEnd.y + 0.6, tailEnd.z),
          0.9,
        ),
      )
    }
  }
  fields.push({ name: "tail", sdf: tail })
  fields.push({
    name: "tailTip",
    sdf:
      spec.appendage === "plate"
        ? sdBox(tailEnd, vec3(1.5, 1.7, 1.4))
        : sdSphere(tailEnd, 1.3),
  })

  const legPivots: Record<string, [number, number, number]> = {}
  const legDefs: Array<{ name: string; sx: number; z: number }> = [
    { name: "legFL", sx: -1, z: frontZ },
    { name: "legFR", sx: 1, z: frontZ },
    { name: "legBL", sx: -1, z: backZ },
    { name: "legBR", sx: 1, z: backZ },
  ]
  for (const leg of legDefs) {
    const hip = at(leg.sx * spec.legSpread * bg, hipY, leg.z)
    const knee = at(
      leg.sx * spec.legSpread * bg * 1.05,
      (hipY + foot) / 2,
      leg.z + 0.5,
    )
    const toe = at(leg.sx * spec.legSpread * bg * 1.1, foot, leg.z + 1)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    fields.push({
      name: leg.name,
      sdf: union(
        union(
          sdSphere(hip, spec.legRadius * bg),
          sdCapsule(hip, knee, spec.legRadius),
        ),
        sdCapsule(knee, toe, spec.legRadius * 0.75),
      ),
      classify: classifyLeg,
    })
  }

  const neckField: Sdf = union(
    sdCapsule(neckA, neckB, 2.2 * nt),
    sdCapsule(neckB, headC, 1.9 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // -- Colors (one seeded jitter; gilded swaps to gold) ---------------------
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = { min: 0.45, max: 0.62 }
  const hue = gilded ? 45 : spec.hue
  const sat = gilded ? 0.85 : spec.saturation
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
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
  const accent: [number, number, number] = hslToRgb(hue, 0.9, 0.78)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  const face = faceParts(
    facePlan(spec.id, {
      center: headC,
      half: skullHalf,
      snout: { center: snoutC, half: snoutHalf },
    }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(
      union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
      face.carve,
      0.5,
    ),
    classify: face.skinClass,
  })
  fields.push(...face.fields)

  // Style-driven appendage pair: leaf blades, shoulder plates or flame wings.
  const style = dna.styles.crest ?? "crest"
  const shoulderY = bodyY + 2.4 * bg
  const appendagePivots: Record<string, [number, number, number]> = {}
  for (const [index, sx] of [-1, 1].entries()) {
    const name = spec.appendageNames[index] ?? `appendage${index}`
    const root = at(sx * (spec.bodyRadius * 0.7 * bg), shoulderY, front * 0.4)
    const tip = at(
      sx * spec.wingSpan * spread,
      shoulderY + (spec.appendage === "feather" ? 5.5 : 2.5),
      back * 0.5,
    )
    let sdf: Sdf
    if (spec.appendage === "plate") {
      sdf = sdBox(
        vec3((root.x + tip.x) / 2, (root.y + tip.y) / 2, (root.z + tip.z) / 2),
        vec3(2.1 * spread, 2.6, 3),
      )
    } else if (spec.appendage === "leaf") {
      sdf = union(sdCapsule(root, tip, 1.2 * spread), sdSphere(tip, 1.5))
    } else {
      sdf = union(
        union(
          sdCapsule(root, tip, 1.1),
          sdCapsule(
            root,
            vec3(O + (tip.x - O) * 0.7, tip.y - 1, tip.z + 1.5),
            0.9,
          ),
        ),
        sdCapsule(root, vec3(O + (tip.x - O) * 1.2, tip.y - 2, tip.z - 1), 0.8),
      )
    }
    // The "fan" crest style widens the silhouette; the "tucked" style folds it.
    if (style === "tucked") {
      sdf = union(sdf, sdSphere(vec3(root.x, root.y + 1.5, root.z - 1.5), 1.4))
    }
    fields.push({ name, sdf })
    appendagePivots[name] = [root.x, root.y, root.z]
  }

  // Stage signature parts: growing buds at juvenile, a two-horn crown at
  // champion. The identity layer (body plan, appendages) is never touched.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailMid.x, tailMid.y, tailMid.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    ...appendagePivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: dark,
    tailTip: accent,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
  }
  for (const name of spec.appendageNames) colors[name] = accent
  const parents: Record<string, string> = {
    tail: "body",
    tailTip: "tail",
    neck: "body",
    head: "neck",
    legFL: "body",
    legFR: "body",
    legBL: "body",
    legBR: "body",
  }
  for (const name of spec.appendageNames) parents[name] = "body"

  if (stage === "juvenile" || stage === "champion") {
    for (const [index, sx] of [-1, 1].entries()) {
      const name = spec.juvenileNames[index] ?? `bud${index}`
      const base = vec3(
        headC.x + sx * 1.6 * hs,
        headC.y + skullHalf.y - 0.4,
        headC.z - 1,
      )
      const tip = vec3(base.x + sx * 1.4, base.y + 2.2, base.z - 0.8)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.85) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = accent
      parents[name] = "head"
    }
  }
  if (stage === "champion") {
    for (const [index, sx] of [-1, 1].entries()) {
      const name = spec.championNames[index] ?? `horn${index}`
      const base = vec3(
        headC.x + sx * 1.1 * hs,
        headC.y + 2 * hs,
        headC.z - 1.4 * hs,
      )
      const mid = vec3(base.x + sx * 2, base.y + 2, base.z - 1)
      const tip = vec3(mid.x - sx * 0.6, mid.y + 2, mid.z + 0.8)
      fields.push({
        name,
        sdf: union(sdCapsule(base, mid, 0.8), sdCapsule(mid, tip, 0.8)),
      })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = bone
      parents[name] = "head"
    }
  }

  return {
    fields,
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
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
