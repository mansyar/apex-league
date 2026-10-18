import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  smoothUnion,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

// Draconic archetype: a quadruped western drake. Authored in voxel units on a
// 56^3 grid (y up, +z forward), creature roughly 40 voxels long and 30 tall.
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed is guaranteed to still read as a drake.

export const DRAKE_GRID = 56

export const drakeTemplate: Template = {
  id: "draconic",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.1 },
    bodyGirth: { min: 0.85, max: 1.25 },
    neckLength: { min: 0.8, max: 1.15 },
    neckThickness: { min: 0.75, max: 1.25 },
    headSize: { min: 0.85, max: 1.15 },
    hornLength: { min: 0.7, max: 1.4 },
    tailLength: { min: 0.8, max: 1.3 },
    legLength: { min: 0.85, max: 1.15 },
  },
  styles: {
    horns: [
      { id: "backSwept", params: { spread: { min: 0.2, max: 1 } } },
      { id: "straight", params: {} },
      { id: "forward", params: { spread: { min: 0.2, max: 1 } } },
    ],
    tail: [
      { id: "spade", params: {} },
      { id: "club", params: {} },
      { id: "plain", params: {} },
    ],
  },
  palette: { hue: 18, valueJitter: { min: 0.42, max: 0.6 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface DrakeBuild extends CreatureBuild {}

const O = DRAKE_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildDrake(dna: Dna, stage: Stage = "baby"): DrakeBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const hl = p.hornLength ?? 1
  const tl = p.tailLength ?? 1
  const ll = p.legLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  // Slimmer, longer body than the first rebalance pass (user feedback) but
  // still low-slung: the belly line stays close enough to the ground that
  // exposed leg remains shorter than the torso is tall (see budgets).
  const chestA = at(0, 15.5, 5 * bl)
  const chestB = at(0, 15.5, 0.5 * bl)
  const rearA = at(0, 19, 0.5 * bl)
  const rearB = at(0, 19, -7 * bl)

  const tailBase = at(0, 17.5, -6.5 * bl)
  const tailMid = at(0, 12.8, -6.5 * bl - 5.5 * tl)
  const tailKnee = at(0, 12, -6.5 * bl - 10.5 * tl)
  const tailEnd = at(0, 16.5, -6.5 * bl - 13 * tl)

  // Legs emerge from the lower belly (hip line low): a deep chest over
  // short, stout legs is the silhouette fix for the leggy-drake defect.
  // Juveniles stand a touch taller at the hip — legs read longer as the
  // body matures (see stage.ts for the maturity frame).
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 10 + 0.8 * j
  const footY = 0.9 + 1.7 * bg
  const legFrontZ = 5 + (ll - 1) * 2
  const legBackZ = -5.5 - (ll - 1) * 2

  // Surface zones: the torso's real y extent, derived from the chest and rump
  // radii, so a stage or girth shift moves the bands with the body instead of
  // letting them drift off it. surface.ts decides how much of that extent
  // reads as belly and dorsal.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 6.2 * bg,
    torsoTop: rearA.y + 5 * bg,
    sockTop: footY + 1.2,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // Neck rises steeply from the shoulders then sweeps forward to the head —
  // a near-vertical arch reads "drake" and stair-steps far less than a ramp.
  const neckA = at(0, 17.5, 4.5 * bl)
  const neckB = at(0, 17.5 + 6 * nl, 4.5 * bl + 2.5 * nl)
  const neckC = at(0, 17.5 + 8.5 * nl, 4.5 * bl + 5.5 * nl)

  const headC = vec3(neckC.x, neckC.y + 0.8, neckC.z + 2.2 * hs)
  const skullHalf = vec3(3.6 * hs, 2.7 * hs, 3.6 * hs)
  const snoutC = vec3(neckC.x, neckC.y + 0.4, neckC.z + 6 * hs)
  const snoutHalf = vec3(2.4 * hs, 1.9 * hs, 3.8 * hs)
  // Defined lower jaw and brow ridge: a boxy head reads as "farm animal";
  // a protruding chin plus a brow instantly reads "reptile".
  const jawBox = sdBox(
    vec3(headC.x, headC.y - 2 * hs, headC.z + 3.8 * hs),
    vec3(2.1 * hs, 1 * hs, 3.2 * hs),
  )
  const browBox = sdBox(
    vec3(headC.x, headC.y + 2.6 * hs, headC.z + 1.6 * hs),
    vec3(3.2 * hs, 0.6 * hs, 2.4 * hs),
  )

  const hornBaseY = headC.y + 2.4 * hs
  const hornBaseZ = headC.z - 0.8
  const hornSpread = dna.styleParams.spread ?? 0.6
  const hornStyle = dna.styles.horns ?? "backSwept"

  function hornTip(sign: number): Vec3 {
    const bx = sign * 1.7 * hs
    if (hornStyle === "straight") {
      return vec3(headC.x + bx, hornBaseY + 5.5 * hl, hornBaseZ + 0.3)
    }
    if (hornStyle === "forward") {
      return vec3(
        headC.x + bx + sign * 2 * hornSpread,
        hornBaseY + 1.2,
        hornBaseZ + 5 * hl,
      )
    }
    // backSwept (default)
    return vec3(
      headC.x + bx + sign * 2.4 * hornSpread,
      hornBaseY + 2,
      hornBaseZ - 5.5 * hl,
    )
  }

  const tailStyle = dna.styles.tail ?? "spade"

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Deep chest + higher rump gives the arched back drakes are recognized by.
  const chestField: Sdf = sdCapsule(chestA, chestB, 6.2 * bg)
  const rearField: Sdf = sdCapsule(rearA, rearB, 5 * bg)
  // Haunches: big rounded thigh mass as part of the torso silhouette —
  // classic wyvern hindquarters. They anchor the rear legs to the rump
  // (fixing the floating-back-leg defect) and keep exposed leg short.
  const haunchL = sdSphere(at(-3.5 * bg, 13, legBackZ), 4 * bg)
  const haunchR = sdSphere(at(3.5 * bg, 13, legBackZ), 4 * bg)
  // Shoulders: front counterpart of the haunches so the forelegs read as
  // emerging from muscle, not pegs jammed into a block.
  const shoulderL = sdSphere(at(-3.5 * bg, 12.5, legFrontZ), 3.4 * bg)
  const shoulderR = sdSphere(at(3.5 * bg, 12.5, legFrontZ), 3.4 * bg)
  // Subtle spine ridge: breaks the flat capsule top line into an arch.
  const spine = sdCapsule(at(0, 14.5, 2 * bl), at(0, 17.5, -2 * bl), 2.4 * bg)
  const spinePeak = sdSphere(at(0, 16.5, 0), 2.8 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnion(
      smoothUnion(
        smoothUnion(
          smoothUnion(chestField, rearField, 3),
          union(haunchL, haunchR),
          2,
        ),
        union(shoulderL, shoulderR),
        2,
      ),
      union(spine, spinePeak),
      2.5,
    ),
    classify: classifyTorso,
  })

  // Tail: a three-segment taper that droops from the rump and flicks up at
  // the tip — a straight horizontal tail reads as a plank. Radii step down
  // aggressively: at 56-voxel resolution a gentle taper is invisible.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 2.6 * bg),
    sdCapsule(tailMid, tailKnee, 1.6),
  )
  fields.push({ name: "tail", sdf: tailField })

  const tailTipZ = -6.5 * bl - 13 * tl
  const tailTipPieces: Sdf[] = [sdCapsule(tailKnee, tailEnd, 1.0)]
  if (tailStyle === "spade") {
    // Upright diamond fin at the very tip, facing up with the flick.
    tailTipPieces.push(
      sdBox(at(0, tailEnd.y + 0.4, tailTipZ), vec3(2.8, 2.6, 1.5)),
    )
  } else if (tailStyle === "club") {
    tailTipPieces.push(sdSphere(tailEnd, 2.2))
  }
  const tailTipField: Sdf = tailTipPieces.reduce((acc, s) => union(acc, s))
  fields.push({ name: "tailTip", sdf: tailTipField })

  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 4.8 * bg, hipY, legZ)
    const knee = at(leg.sx * 5.2 * bg, (hipY + footY) / 2, legZ + 0.9)
    const foot = at(leg.sx * 5.4 * bg, footY, legZ + 0.5)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Thigh bridge angles up and inward into the flank so the leg visibly
    // attaches to the body (a floating rear leg read as a defect), while
    // the thigh bulge + tapered shin reads as a real limb, not a stick.
    const thighTop = at(leg.sx * 3 * bg, 15.5, legZ + 0.3)
    const legField: Sdf = union(
      union(
        union(sdSphere(hip, 2.6 * bg), sdCapsule(hip, knee, 2.1 * bg)),
        sdCapsule(knee, foot, 1.5 * bg),
      ),
      sdCapsule(hip, thighTop, 2.3 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Three-segment taper: thick at the shoulders, thinner under the skull —
  // a uniform neck reads sauropod, a tapering neck reads drake.
  const neckMid = at(0, 17.5 + 3 * nl, 4.5 * bl + 1.2 * nl)
  const neckField: Sdf = union(
    union(
      sdCapsule(neckA, neckMid, 3.8 * nt),
      sdCapsule(neckMid, neckB, 3.2 * nt),
    ),
    sdCapsule(neckB, neckC, 2.6 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  const headField: Sdf = union(
    union(union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)), jawBox),
    browBox,
  )
  fields.push({ name: "head", sdf: headField })

  const hornBaseL = vec3(headC.x - 1.7 * hs, hornBaseY, hornBaseZ)
  const hornBaseR = vec3(headC.x + 1.7 * hs, hornBaseY, hornBaseZ)
  fields.push({
    name: "hornLeft",
    sdf: sdCapsule(hornBaseL, hornTip(-1), 1.15),
  })
  fields.push({
    name: "hornRight",
    sdf: sdCapsule(hornBaseR, hornTip(1), 1.15),
  })

  // Juvenile signature: a pair of horn nubs breaking through on the
  // forehead, between the horns. Seed-derived placement (the horn spread
  // jitters them) — the existing horns are the identity layer and stay
  // untouched; the nubs are new growth the baby does not have yet.
  if (stage === "juvenile" || stage === "champion") {
    const nubBaseL = vec3(headC.x - 1.1 * hs, headC.y + 2.5 * hs, headC.z - 0.2)
    const nubBaseR = vec3(headC.x + 1.1 * hs, headC.y + 2.5 * hs, headC.z - 0.2)
    const nubLean = 0.6 + 0.8 * hornSpread
    fields.push({
      name: "hornNubLeft",
      sdf: sdCapsule(
        nubBaseL,
        vec3(nubBaseL.x - nubLean, nubBaseL.y + 2.2, nubBaseL.z - nubLean),
        0.9,
      ),
    })
    fields.push({
      name: "hornNubRight",
      sdf: sdCapsule(
        nubBaseR,
        vec3(nubBaseR.x + nubLean, nubBaseR.y + 2.2, nubBaseR.z - nubLean),
        0.9,
      ),
    })
  }

  // Champion signature: a crown pair — taller horns rising from the upper
  // skull behind the horn line, sweeping back and outward. The earned
  // crown reads at broadcast distance without changing the body plan.
  if (stage === "champion") {
    const crownBaseL = vec3(
      headC.x - 2.1 * hs,
      headC.y + 2.9 * hs,
      headC.z - 0.6,
    )
    const crownBaseR = vec3(
      headC.x + 2.1 * hs,
      headC.y + 2.9 * hs,
      headC.z - 0.6,
    )
    const crownLean = 2 + 1.8 * hornSpread
    fields.push({
      name: "crownHornLeft",
      sdf: sdCapsule(
        crownBaseL,
        vec3(crownBaseL.x - crownLean, crownBaseL.y + 3.8, crownBaseL.z - 3.4),
        1,
      ),
    })
    fields.push({
      name: "crownHornRight",
      sdf: sdCapsule(
        crownBaseR,
        vec3(crownBaseR.x + crownLean, crownBaseR.y + 3.8, crownBaseR.z - 3.4),
        1,
      ),
    })
  }

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // The body pivot sits at the HIP LINE (hipY), not the body center: breathe
  // squash-stretch around this pivot keeps the body voxels at the leg
  // junction fixed (scale never moves the pivot), so the legs stay visually
  // attached while the chest and belly flex.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailKnee.x, tailKnee.y, tailKnee.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckC.x, neckC.y, neckC.z],
    hornLeft: [hornBaseL.x, hornBaseL.y, hornBaseL.z],
    hornRight: [hornBaseR.x, hornBaseR.y, hornBaseR.z],
  }
  if (stage === "juvenile" || stage === "champion") {
    pivots.hornNubLeft = [headC.x - 1.1 * hs, headC.y + 2.5 * hs, headC.z - 0.2]
    pivots.hornNubRight = [
      headC.x + 1.1 * hs,
      headC.y + 2.5 * hs,
      headC.z - 0.2,
    ]
  }
  if (stage === "champion") {
    pivots.crownHornLeft = [
      headC.x - 2.1 * hs,
      headC.y + 2.9 * hs,
      headC.z - 0.6,
    ]
    pivots.crownHornRight = [
      headC.x + 2.1 * hs,
      headC.y + 2.9 * hs,
      headC.z - 0.6,
    ]
  }

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = drakeTemplate.palette.valueJitter
  const hue = gilded ? 45 : drakeTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.72
  // Juveniles read a touch brighter and more saturated — same hue family,
  // same seed jitter, just a maturing coat (see stage.ts). Champions lift
  // a step further: the same individual wearing its record.
  const lift = stage === "baby" ? 0 : stage === "juvenile" ? 0.05 : 0.1
  const main = hslToRgb(hue, Math.min(1, sat + lift), Math.min(1, light + lift))
  // The zone ramp is built from the same lifted hsl values, so its lateral
  // step is `main` and its limb step is `dark` - the flat colours this
  // creature had before zones existed.
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
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    tailTip: dark,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
    hornLeft: bone,
    hornRight: bone,
  }
  if (stage === "juvenile" || stage === "champion") {
    colors.hornNubLeft = bone
    colors.hornNubRight = bone
  }
  if (stage === "champion") {
    colors.crownHornLeft = bone
    colors.crownHornRight = bone
  }

  return {
    fields,
    pivots,
    colors,
    palettes: {
      body: ramp,
      legFL: ramp,
      legFR: ramp,
      legBL: ramp,
      legBR: ramp,
    },
    parents: {
      neck: "body",
      head: "neck",
      hornLeft: "head",
      hornRight: "head",
      tail: "body",
      tailTip: "tail",
      ...(stage === "juvenile" || stage === "champion"
        ? { hornNubLeft: "head", hornNubRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { crownHornLeft: "head", crownHornRight: "head" }
        : {}),
    },
  }
}
