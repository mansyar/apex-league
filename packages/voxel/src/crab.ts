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
  smoothSubtract,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleCrabDna } from "./sample"

// Crab archetype: the Coral Claw's body plan. A wide, low scuttler — a
// squashed carapace dome riding just above the ground on four short splayed
// legs, a front head wedge under a pair of heavy pincers, and a tucked
// abdomen flap behind. Authored in voxel units on a 56^3 grid (y up, +z
// forward). The template owns the body plan and bounds; DNA only jitters
// within them, so every seed still reads as a crab.

export const CRAB_GRID = 56

export const crabTemplate: Template = {
  id: "crab",
  version: 1,
  proportions: {
    bodyLength: { min: 0.8, max: 1.3 },
    bodyGirth: { min: 0.8, max: 1.3 },
    // The dome floor is 0.9 rather than 0.75: below that the carapace is thin
    // enough that the coarse proportion lattice samples two rows of it, and
    // the measured body-height (and every ratio built on it) swings wildly.
    carapaceHeight: { min: 0.9, max: 1.3 },
    legLength: { min: 0.7, max: 1.3 },
    neckLength: { min: 0.75, max: 1.25 },
    headSize: { min: 0.75, max: 1.25 },
    clawLength: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.7, max: 1.3 },
  },
  styles: {
    carapace: [
      { id: "boulder", params: {} },
      { id: "studded", params: { studSize: { min: 0.6, max: 1.4 } } },
      { id: "spiked", params: { spikeHeight: { min: 0.6, max: 1.4 } } },
    ],
    claws: [
      { id: "heavy", params: {} },
      { id: "serrated", params: { pincerSize: { min: 0.6, max: 1.4 } } },
      { id: "slim", params: {} },
    ],
  },
  palette: { hue: 205, valueJitter: { min: 0.4, max: 0.58 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface CrabBuild extends CreatureBuild {}

const O = CRAB_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Assemble the crab from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildCrab(dna: Dna, stage: Stage = "baby"): CrabBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ch = p.carapaceHeight ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const hs = p.headSize ?? 1
  const cl = p.clawLength ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // -- Key skeleton points -------------------------------------------------
  // A LOW body: the carapace dome floats just above the sand; hips lift a
  // touch per stage so the scuttle reads older without a redesign. The dome
  // sits high enough that the legs clear it — a hip buried in the shell
  // leaves the leg fields claiming no voxels.
  const bodyY = 11.4 + 0.5 * j
  const hipY = bodyY - 2
  // Feet ride clear of the ground plane: a leg capsule that reaches y = 0
  // puts the model's lowest voxel on the grid boundary.
  const footY = 2.4 + 0.4 * bg

  // Surface zones: the carapace's real y extent, derived from the ellipsoid
  // radii, so a stage or girth shift moves the bands with the shell.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 4.6 * ch,
    torsoTop: bodyY + 4.6 * ch,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry because the face needs the coat colour and
  // the coral accents are painted from the resolved hue.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = crabTemplate.palette.valueJitter
  const hue = gilded ? 198 : crabTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.72
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, Math.min(1, light + lift))
  const ramp = creaturePalette({
    hue,
    sat,
    light: Math.min(1, light + lift),
  })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // The coral accent: a pale, desaturated step of the water hue, used on
  // the shell growths and signature parts. Same hue family as the coat —
  // never a foreign colour.
  const coral: [number, number, number] = hslToRgb(hue, 0.55, 0.72)

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // The carapace: one wide, low ellipsoid — the crab's whole identity is
  // this squashed dome.
  const carapaceField: Sdf = sdEllipsoid(
    at(0, bodyY, 0),
    vec3(10.4 * bg, 4.6 * ch, 8.4 * bl),
  )
  fields.push({ name: "body", sdf: carapaceField, classify: classifyTorso })

  // Carapace dressing: the style slot grows the shell — studs as smooth
  // bumps, spikes as a crown ridge. Geometry stays within the dome's
  // footprint; only the silhouette knobble changes.
  const carapaceStyle = dna.styles.carapace ?? "boulder"
  if (carapaceStyle === "studded") {
    const studSize = dna.styleParams.studSize ?? 1
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        fields.push({
          name: `shellStud${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`,
          sdf: sdSphere(
            at(sx * 5.2 * bg, bodyY + 3.2 * ch, sz * 4.2 * bl),
            1.25 * studSize,
          ),
        })
      }
    }
  } else if (carapaceStyle === "spiked") {
    const spikeHeight = dna.styleParams.spikeHeight ?? 1
    // The spike ridge starts ON the dome's crown, not inside it: a base
    // under the shell surface leaves the body claiming the whole spike.
    // Radius clears 0.71 as well: the centre ridge's axis lies on a grid
    // line, so every neighbouring voxel centre sits sqrt(0.5) away and a
    // sub-0.71 radius claims nothing at all.
    const spikeBaseY = bodyY + 5.4 * ch
    for (const zt of [-0.55, 0, 0.55]) {
      fields.push({
        name: `shellSpike${zt < 0 ? "B" : zt > 0 ? "F" : "M"}`,
        sdf: sdCapsule(
          at(0, spikeBaseY, zt * 6.6 * bl),
          at(0, spikeBaseY + 2.6 * spikeHeight, zt * 6.4 * bl),
          0.85,
        ),
      })
    }
  }

  // Four short legs splayed wide from under the carapace rim: the crab's
  // scuttle is a sprawl, not a stride.
  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? 5 * bl : -5 * bl
    const hip = at(leg.sx * 5.6 * bg, hipY, legZ)
    const foot = at(
      leg.sx * (5.6 + 1.4 * ll) * bg,
      footY,
      legZ + leg.sz * 1.1 * ll,
    )
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Limbs are deliberately thicker than a crab's spindle legs read in a
    // drawing: the proportion audit samples a coarse lattice, and a shin
    // under ~1.5 voxels is measured from a single column (or missed
    // entirely), so its y-extent swings with sub-voxel placement.
    const legField: Sdf = union(
      sdSphere(hip, 2.6 * bg),
      sdCapsule(hip, foot, 1.9 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // The abdomen: a small flattened flap tucked under the rear of the dome.
  const tailC = at(0, bodyY - 2.4, -6.2 * bl)
  fields.push({
    name: "tail",
    sdf: sdEllipsoid(tailC, vec3(3.4 * bg, 1.3, 2.6 * tl)),
  })

  // Short neck stalk poking past the carapace's front rim, carrying the
  // head wedge low and forward.
  const neckA = at(0, bodyY - 0.4, 7.2 * bl)
  const neckB = at(0, bodyY - 0.1 + nl * 0.4, 7.2 * bl + 2.2 * nl)
  fields.push({ name: "neck", sdf: sdCapsule(neckA, neckB, 2) })

  // Head wedge: a low box under the carapace's brow, where the eyes and
  // mouth live.
  const hk = hs * (stage === "baby" ? 1.14 : stage === "juvenile" ? 1.05 : 1)
  const headC = vec3(O, bodyY - 0.2, neckB.z + 1.6 * hk)
  const skullHalf = vec3(3.4 * hk, 2.4 * hk, 2.2 * hk)
  const headField: Sdf = sdBox(headC, skullHalf)
  const face = faceParts(
    facePlan("crab", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })
  fields.push(...face.fields)

  // The pincers: the crab's identity weapons. One heavy arm per side — a
  // shoulder capsule out of the carapace's front flanks into a palm sphere
  // carrying a boxy pincer jaw, dressed per style.
  const clawStyle = dna.styles.claws ?? "heavy"
  const pincerSize = dna.styleParams.pincerSize ?? 1
  for (const sx of [-1, 1]) {
    const name = sx === -1 ? "clawLeft" : "clawRight"
    const shoulder = at(sx * 7.2 * bg, bodyY - 0.8, 4.4 * bl)
    const palm = at(sx * 9 * bg, bodyY - 1, 6.2 * bl)
    const arm: Sdf = union(
      sdCapsule(shoulder, palm, 1.8 * bg),
      sdSphere(palm, 2.1 * cl),
    )
    const pincerScale = clawStyle === "slim" ? 0.75 : pincerSize
    const jawCenter = vec3(palm.x, palm.y, palm.z + 2.4 * cl * pincerScale)
    const jawHalf =
      clawStyle === "serrated"
        ? vec3(1 * cl, 1.4 * cl, 2 * cl * pincerScale)
        : vec3(1.1 * cl, 1.6 * cl, 2.2 * cl * pincerScale)
    const pincer: Sdf = sdBox(jawCenter, jawHalf)
    const clawField: Sdf =
      clawStyle === "serrated"
        ? union(
            union(arm, pincer),
            sdBox(
              vec3(jawCenter.x, jawCenter.y + 1.2 * cl, jawCenter.z - 0.8 * cl),
              vec3(0.9 * cl, 0.5, 1.2 * cl),
            ),
          )
        : union(arm, pincer)
    fields.push({ name, sdf: clawField })
  }

  // Juvenile signature: a pair of coral buds breaking out on the head
  // wedge's top corners — the reef starts growing at the crown.
  if (j >= 1) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "coralBudLeft" : "coralBudRight"
      const base = vec3(
        headC.x + sx * 2.2 * hk,
        headC.y + skullHalf.y - 0.3,
        headC.z,
      )
      const tip = vec3(
        headC.x + sx * 2.9 * hk,
        headC.y + skullHalf.y + 1.2,
        headC.z - 0.7,
      )
      fields.push({ name, sdf: sdCapsule(base, tip, 0.8) })
    }
  }

  // Champion signature: a pair of coral branches rising off the head wedge
  // — the earned crown of the reef.
  if (j === 2) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "coralCrownLeft" : "coralCrownRight"
      const base = vec3(
        headC.x + sx * 1.6 * hk,
        headC.y + skullHalf.y - 0.4,
        headC.z + 0.4,
      )
      const mid = vec3(
        headC.x + sx * 2.8 * hk,
        headC.y + skullHalf.y + 1.8,
        headC.z - 0.2,
      )
      const tip = vec3(
        headC.x + sx * 3.4 * hk,
        headC.y + skullHalf.y + 3.4,
        headC.z - 1.2,
      )
      fields.push({
        name,
        sdf: union(sdCapsule(base, mid, 0.85), sdCapsule(mid, tip, 0.6)),
      })
    }
  }

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // The body pivot sits at the HIP LINE (hipY): breathe squash-stretch
  // around this pivot keeps the legs visually attached.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    ...legPivots,
    tail: [tailC.x, tailC.y, tailC.z],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    clawLeft: [O - 7.2 * bg, bodyY - 0.8, O + 4.4 * bl],
    clawRight: [O + 7.2 * bg, bodyY - 0.8, O + 4.4 * bl],
  }
  if (carapaceStyle === "studded") {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        pivots[`shellStud${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`] = [
          O + sx * 5.2 * bg,
          bodyY + 3.2 * ch,
          O + sz * 4.2 * bl,
        ]
      }
    }
  } else if (carapaceStyle === "spiked") {
    for (const zt of [-0.55, 0, 0.55]) {
      pivots[`shellSpike${zt < 0 ? "B" : zt > 0 ? "F" : "M"}`] = [
        O,
        bodyY + 5.4 * ch,
        O + zt * 6.6 * bl,
      ]
    }
  }
  if (j >= 1) {
    pivots.coralBudLeft = [
      headC.x - 2.2 * hk,
      headC.y + skullHalf.y - 0.3,
      headC.z,
    ]
    pivots.coralBudRight = [
      headC.x + 2.2 * hk,
      headC.y + skullHalf.y - 0.3,
      headC.z,
    ]
  }
  if (j === 2) {
    pivots.coralCrownLeft = [
      headC.x - 1.6 * hk,
      headC.y + skullHalf.y - 0.4,
      headC.z + 0.4,
    ]
    pivots.coralCrownRight = [
      headC.x + 1.6 * hk,
      headC.y + skullHalf.y - 0.4,
      headC.z + 0.4,
    ]
  }

  const colors: Record<string, [number, number, number]> = {
    body: main,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    tail: main,
    neck: main,
    head: main,
    clawLeft: dark,
    clawRight: dark,
  }
  if (carapaceStyle === "studded") {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        colors[`shellStud${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`] = coral
      }
    }
  } else if (carapaceStyle === "spiked") {
    for (const zt of [-0.55, 0, 0.55]) {
      colors[`shellSpike${zt < 0 ? "B" : zt > 0 ? "F" : "M"}`] = coral
    }
  }
  if (j >= 1) {
    colors.coralBudLeft = coral
    colors.coralBudRight = coral
  }
  if (j === 2) {
    colors.coralCrownLeft = coral
    colors.coralCrownRight = coral
  }

  const parents: Record<string, string> = {
    neck: "body",
    head: "neck",
    tail: "body",
    clawLeft: "body",
    clawRight: "body",
    ...(j >= 1 ? { coralBudLeft: "head", coralBudRight: "head" } : {}),
    ...(j === 2 ? { coralCrownLeft: "head", coralCrownRight: "head" } : {}),
    ...face.parents,
  }
  if (carapaceStyle === "studded") {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parents[`shellStud${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`] = "body"
      }
    }
  } else if (carapaceStyle === "spiked") {
    for (const zt of [-0.55, 0, 0.55]) {
      parents[`shellSpike${zt < 0 ? "B" : zt > 0 ? "F" : "M"}`] = "body"
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
      tail: ramp,
      neck: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents,
  }
}
