import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  type Sdf,
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
export { sampleDna as sampleMothDna } from "./sample"

// Gale Moth archetype: the Wind line's second body plan. A slender nocturne
// with a tapered abdomen, four broad powdery wings, six hair-fine legs and a
// pair of feathered antennae that read at a glance. Its assembly is its own:
// a segmented capsule thorax with flat wing ellipsoids fanned off the sides,
// not the ray's single lens and not any quadruped's barrel. Authored on a
// 56^3 grid (y up, +z forward).
export const MOTH_GRID = 56

export const mothTemplate: Template = {
  id: "moth",
  version: 1,
  proportions: {
    bodyLength: { min: 0.9, max: 1.2 },
    bodyGirth: { min: 0.65, max: 0.95 },
    legLength: { min: 0.9, max: 1.3 },
    wingSpan: { min: 0.95, max: 1.3 },
    antennaLength: { min: 0.8, max: 1.4 },
    headSize: { min: 0.8, max: 1.1 },
  },
  styles: {
    wings: [
      { id: "broad", params: { fan: { min: 0.2, max: 1 } } },
      { id: "sepia", params: { fan: { min: 0.2, max: 1 } } },
      { id: "split", params: {} },
    ],
    antennae: [
      { id: "feathered", params: { plume: { min: 0.2, max: 1 } } },
      { id: "forked", params: { plume: { min: 0.2, max: 1 } } },
      { id: "straight", params: {} },
    ],
  },
  palette: { hue: 165, valueJitter: { min: 0.42, max: 0.6 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface MothBuild extends CreatureBuild {}

const O = MOTH_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildMoth(dna: Dna, stage: Stage = "baby"): MothBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const ws = p.wingSpan ?? 1
  const al = p.antennaLength ?? 1
  const hs = p.headSize ?? 1

  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 13.5 + 0.8 * j
  const footY = 1.6

  // Slender thorax, then a tapering abdomen — three narrowing capsules.
  const thoraxA = at(0, 17, 3.2 * bl)
  const thoraxB = at(0, 17, 0.4 * bl)
  const abdomenA = at(0, 16.6, 0.4 * bl)
  const abdomenB = at(0, 16.2, -4.6 * bl)
  const abdomenTip = at(0, 16, -6.4 * bl)

  const fields: PartField[] = []
  const legPivots: Record<string, [number, number, number]> = {}

  fields.push({
    name: "body",
    sdf: union(
      sdCapsule(thoraxA, thoraxB, 3.4 * bg),
      union(
        sdCapsule(abdomenA, abdomenB, 2.6 * bg),
        sdCapsule(abdomenB, abdomenTip, 1.5 * bg),
      ),
    ),
  })

  // Six hair-fine legs, three a side, splayed like a real moth's brace.
  const legDefs = [
    { name: "legFL", sx: -1, z: 3.4 * bl },
    { name: "legFR", sx: 1, z: 3.4 * bl },
    { name: "legML", sx: -1, z: 0 * bl },
    { name: "legMR", sx: 1, z: 0 * bl },
    { name: "legBL", sx: -1, z: -3.4 * bl },
    { name: "legBR", sx: 1, z: -3.4 * bl },
  ] as const
  for (const leg of legDefs) {
    const hip = at(leg.sx * 2 * bg, hipY, leg.z)
    const knee = at(leg.sx * 4.2 * bg, (hipY + footY) / 2, leg.z + 1 * ll)
    const foot = at(leg.sx * 5.2 * bg, footY, leg.z + 2 * ll)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    fields.push({
      name: leg.name,
      sdf: union(
        sdCapsule(hip, knee, 0.95 * bg),
        sdCapsule(knee, foot, 0.7 * bg),
      ),
    })
  }

  // Four broad powdery wings. The style decides the fan; every wing keeps
  // the same root pivot so the rig is stable across seeds.
  const wingStyle = dna.styles.wings ?? "broad"
  const fan = dna.styleParams.fan ?? 0.6
  const wings = [
    { name: "wingFL", sx: -1, z: 2.2 * bl, span: 11 * ws, depth: 6.5 },
    { name: "wingFR", sx: 1, z: 2.2 * bl, span: 11 * ws, depth: 6.5 },
    { name: "wingHL", sx: -1, z: -2.6 * bl, span: 9 * ws, depth: 5.4 },
    { name: "wingHR", sx: 1, z: -2.6 * bl, span: 9 * ws, depth: 5.4 },
  ] as const
  for (const wing of wings) {
    const cx = wing.sx * (3 + wing.span * 0.55)
    const cy = 18 + (wingStyle === "broad" ? 1.5 : 0.5)
    const wingField: Sdf =
      wingStyle === "split"
        ? union(
            sdEllipsoid(
              at(cx, cy, wing.z + fan),
              vec3(wing.span * 0.5, 1.2, wing.depth * 0.55),
            ),
            sdSphere(
              at(wing.sx * (3 + wing.span * 0.95), cy - 0.5, wing.z - 1.5),
              2.1,
            ),
          )
        : sdEllipsoid(
            at(cx, cy, wing.z),
            vec3(
              wing.span * 0.55,
              wingStyle === "sepia" ? 1.4 : 1.1,
              wing.depth * (wingStyle === "broad" ? 1 : 0.8),
            ),
          )
    fields.push({ name: wing.name, sdf: wingField })
  }

  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = mothTemplate.palette.valueJitter
  const hue = gilded ? 45 : mothTemplate.palette.hue
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

  // Small round head on a short neck at the thorax's front.
  const neckA = at(0, 17, 3.4 * bl)
  const neckB = at(0, 18.4, 4.4 * bl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 1.3),
  })
  const hk = hs * (stage === "baby" ? 1.12 : stage === "juvenile" ? 1.05 : 1)
  const headC = vec3(neckB.x, neckB.y + 0.5, neckB.z + 1.2 * hk)
  const skullHalf = vec3(2.2 * hk, 2 * hk, 2.2 * hk)
  const face = faceParts(
    facePlan("falcon", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({ name: "head", sdf: sdEllipsoid(headC, skullHalf) })
  fields.push(...face.fields)

  // Feathered antennae — the moth's signature silhouette, style-driven.
  const antennaStyle = dna.styles.antennae ?? "feathered"
  const plume = dna.styleParams.plume ?? 0.6
  const antennaAnchor = (sx: -1 | 1): Vec3 =>
    vec3(
      headC.x + sx * 1.1 * hk,
      headC.y + skullHalf.y - 0.3,
      headC.z + 0.4 * hk,
    )
  const antennaBase = {
    antennaLeft: antennaAnchor(-1),
    antennaRight: antennaAnchor(1),
  }
  for (const sx of [-1, 1] as const) {
    const name = sx < 0 ? "antennaLeft" : "antennaRight"
    const base = antennaBase[name]
    const tip = vec3(
      base.x + sx * (2 + 2 * plume),
      base.y + 4.2 * al,
      base.z + 2.2 * al,
    )
    const shaft = sdCapsule(base, tip, 0.65)
    const barbs: Sdf[] = [shaft]
    if (antennaStyle === "feathered") {
      for (let i = 1; i <= 3; i++) {
        const t = i / 4
        const q = vec3(
          base.x + (tip.x - base.x) * t,
          base.y + (tip.y - base.y) * t,
          base.z + (tip.z - base.z) * t,
        )
        barbs.push(
          sdCapsule(
            q,
            vec3(q.x + sx * 1.5 * plume, q.y - 0.3, q.z + 0.6),
            0.35,
          ),
          sdCapsule(q, vec3(q.x - sx * 0.5, q.y - 0.3, q.z + 0.6), 0.35),
        )
      }
    } else if (antennaStyle === "forked") {
      barbs.push(
        sdCapsule(
          vec3(
            base.x + (tip.x - base.x) * 0.6,
            base.y + 2.6 * al,
            base.z + 1.4 * al,
          ),
          vec3(tip.x + sx * 1.6, tip.y - 0.6, tip.z + 0.8),
          0.45,
        ),
      )
    }
    fields.push({ name, sdf: barbs.reduce((acc, s) => union(acc, s)) })
  }

  // Juvenile signature: powder scales dusting the wing roots — new growth
  // the baby has not earned yet; the antenna identity layer is untouched.
  if (stage === "juvenile" || stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const root = at(sx * 3.4 * bg, 18.6, 1.5 * bl)
      fields.push({
        name: sx < 0 ? "dustScaleLeft" : "dustScaleRight",
        sdf: sdSphere(vec3(root.x, root.y + 1, root.z), 1.5),
      })
    }
  }

  // Champion signature: a lunar crest above the antenna line.
  if (stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const base = vec3(
        headC.x + sx * 1.3 * hk,
        headC.y + skullHalf.y + 0.4,
        headC.z - 1 * hk,
      )
      const mid = vec3(base.x + sx * 2.2, base.y + 2, base.z - 1.2)
      const tip = vec3(base.x + sx * 1.4, base.y + 4, base.z - 0.4)
      fields.push({
        name: sx < 0 ? "lunarCrestLeft" : "lunarCrestRight",
        sdf: union(sdCapsule(base, mid, 0.7), sdCapsule(mid, tip, 0.7)),
      })
    }
  }

  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    ...legPivots,
    wingFL: [at(-3 * bg, 18, 2.2 * bl).x, 18, at(-3 * bg, 18, 2.2 * bl).z],
    wingFR: [at(3 * bg, 18, 2.2 * bl).x, 18, at(3 * bg, 18, 2.2 * bl).z],
    wingHL: [at(-3 * bg, 18, -2.6 * bl).x, 18, at(-3 * bg, 18, -2.6 * bl).z],
    wingHR: [at(3 * bg, 18, -2.6 * bl).x, 18, at(3 * bg, 18, -2.6 * bl).z],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    antennaLeft: [
      antennaBase.antennaLeft.x,
      antennaBase.antennaLeft.y,
      antennaBase.antennaLeft.z,
    ],
    antennaRight: [
      antennaBase.antennaRight.x,
      antennaBase.antennaRight.y,
      antennaBase.antennaRight.z,
    ],
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    ...Object.fromEntries(Object.keys(legPivots).map((n) => [n, dark])),
    wingFL: main,
    wingFR: main,
    wingHL: dark,
    wingHR: dark,
    neck: main,
    head: main,
    antennaLeft: dust,
    antennaRight: dust,
  }
  if (stage === "juvenile" || stage === "champion") {
    for (const [n, sx] of [
      ["dustScaleLeft", -1],
      ["dustScaleRight", 1],
    ] as const) {
      const root = at(sx * 3.4 * bg, 18.6, 1.5 * bl)
      pivots[n] = [root.x, root.y, root.z]
      colors[n] = dust
    }
  }
  if (stage === "champion") {
    for (const [n, sx] of [
      ["lunarCrestLeft", -1],
      ["lunarCrestRight", 1],
    ] as const) {
      pivots[n] = [
        headC.x + sx * 1.3 * hk,
        headC.y + skullHalf.y + 0.4,
        headC.z - 1 * hk,
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
      wingFL: ramp,
      wingFR: ramp,
      wingHL: ramp,
      wingHR: ramp,
      legFL: ramp,
      legFR: ramp,
      legML: ramp,
      legMR: ramp,
      legBL: ramp,
      legBR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: {
      wingFL: "body",
      wingFR: "body",
      wingHL: "body",
      wingHR: "body",
      neck: "body",
      head: "neck",
      antennaLeft: "head",
      antennaRight: "head",
      ...(stage === "juvenile" || stage === "champion"
        ? { dustScaleLeft: "head", dustScaleRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { lunarCrestLeft: "head", lunarCrestRight: "head" }
        : {}),
      ...face.parents,
    },
  }
}
