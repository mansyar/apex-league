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
  smoothSubtract,
  smoothUnion,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleStormHoundDna } from "./sample"

// Storm hound archetype: the Electric line's body plan. A sleek canine
// quadruped — narrow deep chest, tucked waist, long legs, long muzzle, erect
// ears and a low whip tail. The SPD-specialist silhouette: everything the
// ox is not (no barrel, no mass) and the drake is not (no arch, no horns,
// no wings). Authored in voxel units on a 56^3 grid (y up, +z forward).
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed is guaranteed to still read as a hound.

export const STORM_HOUND_GRID = 56

export const stormHoundTemplate: Template = {
  id: "storm_hound",
  version: 1,
  proportions: {
    bodyLength: { min: 0.9, max: 1.2 },
    bodyGirth: { min: 0.75, max: 1.05 },
    legLength: { min: 0.9, max: 1.25 },
    neckLength: { min: 0.85, max: 1.2 },
    neckThickness: { min: 0.75, max: 1.15 },
    headSize: { min: 0.85, max: 1.15 },
    earLength: { min: 0.7, max: 1.4 },
    tailLength: { min: 0.85, max: 1.3 },
  },
  styles: {
    ears: [
      { id: "erect", params: { spread: { min: 0.2, max: 1 } } },
      { id: "swept", params: { spread: { min: 0.2, max: 1 } } },
      { id: "folded", params: {} },
    ],
    tail: [
      { id: "brush", params: {} },
      { id: "plume", params: {} },
      { id: "plain", params: {} },
    ],
  },
  palette: { hue: 50, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface StormHoundBuild extends CreatureBuild {}

const O = STORM_HOUND_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildStormHound(
  dna: Dna,
  stage: Stage = "baby",
): StormHoundBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const el = p.earLength ?? 1
  const tl = p.tailLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  // Three-capsule torso like the ox, but every capsule is slimmer and set
  // higher: a deep narrow chest up front, a waist tucked ABOVE the chest line
  // (the sighthound tuck-up), and a modest rump. No spine ridge — the hound's
  // topline reads level-to-slightly-raised at the rump, not arched.
  const chestA = at(0, 14, 5.5 * bl)
  const chestB = at(0, 14, 1 * bl)
  const waistA = at(0, 14.5, 1 * bl)
  const waistB = at(0, 15, -4.5 * bl)
  const rumpA = at(0, 15.5, -4.5 * bl)
  const rumpB = at(0, 15.5, -7 * bl)
  const tailBase = at(0, 16, -7.5 * bl)
  const tailMid = at(0, 13.8, -7.5 * bl - 4.5 * tl)
  const tailKnee = at(0, 12.8, -7.5 * bl - 7.5 * tl)
  const tailEnd = at(0, 16, -7.5 * bl - 10 * tl)

  // Long legs: the hip line stands high over a short exposed... no — over a
  // LONG exposed leg. The hound is the leggiest land archetype on purpose.
  // Juveniles stand a touch taller as the body matures (see stage.ts).
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 10.8 + 0.8 * j
  const footY = 0.9 + 1.5 * bg
  const legFrontZ = 5.2 + (ll - 1) * 2
  const legBackZ = -6.5 - (ll - 1) * 2

  // Surface zones: the torso's real y extent, derived from the chest and rump
  // radii, so a stage or girth shift moves the bands with the body instead of
  // letting them drift off it.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 5.8 * bg,
    torsoTop: rumpA.y + 5 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // Neck: rises forward from the shoulders at a working-dog angle — steeper
  // than the ox's, shallower than the drake's arch — and tapers to the skull.
  const neckA = at(0, 15, 5 * bl)
  const neckB = at(0, 16.4 + 2.6 * nl, 5 * bl + 1.8 * nl)
  const neckC = at(0, 17.2 + 4 * nl, 5 * bl + 3.8 * nl)

  // Stage head shaping: a cub carries a proportionally larger skull and a
  // shorter neck, then grows into the long-legged adult frame. Identity layer
  // untouched — only the head reads younger at the baby stage.
  const hk = hs * (stage === "baby" ? 1.14 : stage === "juvenile" ? 1.05 : 1)

  const headC = vec3(neckC.x, neckC.y + 0.6, neckC.z + 2.2 * hk)
  const skullHalf = vec3(3.15 * hk, 2.5 * hk, 3.15 * hk)
  // A LONG narrow muzzle: the canine read. The drake's snout is a short box;
  // the hound's runs nearly two skull-lengths forward.
  const snoutC = vec3(headC.x, headC.y - 0.4, headC.z + 4.3 * hk)
  const snoutHalf = vec3(1.85 * hk, 1.65 * hk, 3.1 * hk)
  // Defined lower jaw under the muzzle front: a boxy head without a chin
  // reads reptile; the chin plus the long muzzle reads hound.
  const jawBox = sdBox(
    vec3(headC.x, headC.y - 2.2 * hk, headC.z + 3.5 * hk),
    vec3(1.6 * hk, 1 * hk, 2.7 * hk),
  )

  const earStyle = dna.styles.ears ?? "erect"
  const earSpread = dna.styleParams.spread ?? 0.6
  const tailStyle = dna.styles.tail ?? "brush"

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Lean three-capsule torso: chest, tucked waist, rump. Smooth-unioned so
  // the tuck-up reads as a curve, not a seam.
  const chestField: Sdf = sdCapsule(chestA, chestB, 5.8 * bg)
  const waistField: Sdf = sdCapsule(waistA, waistB, 4.2 * bg)
  const rumpField: Sdf = sdCapsule(rumpA, rumpB, 5 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnion(smoothUnion(chestField, waistField, 2.5), rumpField, 2.5),
    classify: classifyTorso,
  })

  // Tail: a three-segment whip that droops from the rump and flicks up at
  // the tip. Slimmer than the drake's at every segment.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 2.3 * bg),
    sdCapsule(tailMid, tailKnee, 1.6),
  )
  fields.push({ name: "tail", sdf: tailField })

  const tailTipZ = -7.5 * bl - 10 * tl
  const tailTipPieces: Sdf[] = [sdCapsule(tailKnee, tailEnd, 1.25)]
  if (tailStyle === "brush") {
    // A bushy rectangular tuft at the tip, upright with the flick.
    tailTipPieces.push(
      sdBox(at(0, tailEnd.y + 0.2, tailTipZ), vec3(1.8, 2.4, 1.9)),
    )
  } else if (tailStyle === "plume") {
    tailTipPieces.push(sdSphere(tailEnd, 2.35))
  }
  const tailTipField: Sdf = tailTipPieces.reduce((acc, s) => union(acc, s))
  fields.push({ name: "tailTip", sdf: tailTipField })

  // Four long slim legs — the hound's defining proportion. Thigh bridge
  // angles up and inward into the flank (no floating rear leg); the shin
  // tapers harder than the drake's because the hound has no bulk to hide it.
  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 3.9 * bg, hipY, legZ)
    const knee = at(leg.sx * 4.2 * bg, (hipY + footY) / 2, legZ + 0.7)
    const foot = at(leg.sx * 4.4 * bg, footY, legZ + 0.4)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    const thighTop = at(leg.sx * 2.4 * bg, 15.5, legZ + 0.2)
    const legField: Sdf = union(
      union(
        union(sdSphere(hip, 2.6 * bg), sdCapsule(hip, knee, 2 * bg)),
        sdCapsule(knee, foot, 1.55 * bg),
      ),
      sdCapsule(hip, thighTop, 2.15 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Three-segment taper: thick at the shoulders, thin under the skull.
  const neckMid = at(0, 16 + 1.5 * nl, 5 * bl + 1 * nl)
  const neckField: Sdf = union(
    union(
      sdCapsule(neckA, neckMid, 2.8 * nt),
      sdCapsule(neckMid, neckB, 2.3 * nt),
    ),
    sdCapsule(neckB, neckC, 1.9 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry because the face needs the coat colour and
  // the head's palette is built from it.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = stormHoundTemplate.palette.valueJitter
  const hue = gilded ? 45 : stormHoundTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.78
  // Juveniles read a touch brighter and more saturated — same hue family,
  // same seed jitter, just a maturing coat (see stage.ts). Champions lift
  // a step further: the same individual wearing its record.
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
  // The electric glow accent: one bright step of the type hue, used only on
  // signature parts. Never a new hue — the coat's family stays intact.
  const spark: [number, number, number] = hslToRgb(hue, 0.9, 0.78)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  const headField: Sdf = union(
    union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
    jawBox,
  )
  // The face is laid out from the same skull box, so its sockets, mouth line
  // and nostril pair follow every proportion change instead of drifting off.
  const face = faceParts(
    facePlan("storm_hound", {
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
  fields.push(...face.fields)

  // Ears: upright canine ears on the skull's top corners. Style-driven
  // silhouettes share one base so the rig pivot never moves underneath.
  const earBaseY = headC.y + skullHalf.y - 0.3
  const earBaseL = vec3(headC.x - 1.8 * hk, earBaseY, headC.z - 0.8 * hk)
  const earBaseR = vec3(headC.x + 1.8 * hk, earBaseY, headC.z - 0.8 * hk)

  function earTip(sign: number): Vec3 {
    const bx = sign * 1.8 * hk
    if (earStyle === "swept") {
      return vec3(
        headC.x + bx + sign * 1.2 * earSpread,
        earBaseY + 3.1 * el,
        headC.z - 3 * el,
      )
    }
    if (earStyle === "folded") {
      return vec3(headC.x + bx + sign * 2.6, earBaseY + 0.6, headC.z - 1 * el)
    }
    // erect (default)
    return vec3(
      headC.x + bx + sign * 2 * earSpread,
      earBaseY + 4.2 * el,
      headC.z - 0.5,
    )
  }

  fields.push({ name: "earLeft", sdf: sdCapsule(earBaseL, earTip(-1), 1) })
  fields.push({ name: "earRight", sdf: sdCapsule(earBaseR, earTip(1), 1) })

  // Juvenile signature: a pair of spark frills breaking through behind the
  // ears — static charge the pup has started to shed. New growth the baby
  // does not have yet; the ears (identity layer) stay untouched.
  if (stage === "juvenile" || stage === "champion") {
    const frillBaseL = vec3(
      headC.x - 2.2 * hs,
      headC.y + 1.4 * hs,
      headC.z - 2 * hs,
    )
    const frillBaseR = vec3(
      headC.x + 2.2 * hs,
      headC.y + 1.4 * hs,
      headC.z - 2 * hs,
    )
    fields.push({
      name: "sparkFrillLeft",
      sdf: sdCapsule(
        frillBaseL,
        vec3(frillBaseL.x - 1.4, frillBaseL.y + 2.4, frillBaseL.z - 1),
        0.8,
      ),
    })
    fields.push({
      name: "sparkFrillRight",
      sdf: sdCapsule(
        frillBaseR,
        vec3(frillBaseR.x + 1.4, frillBaseR.y + 2.4, frillBaseR.z - 1),
        0.8,
      ),
    })
  }

  // Champion signature: a crown pair of horn-like sparks rising from the
  // upper skull behind the ear line, sweeping back and outward. The earned
  // crown reads at broadcast distance without changing the body plan.
  if (stage === "champion") {
    const crownBaseL = vec3(
      headC.x - 1.4 * hs,
      headC.y + 2.5 * hs,
      headC.z - 2.2 * hs,
    )
    const crownBaseR = vec3(
      headC.x + 1.4 * hs,
      headC.y + 2.5 * hs,
      headC.z - 2.2 * hs,
    )
    fields.push({
      name: "crownSparkLeft",
      sdf: sdCapsule(
        crownBaseL,
        vec3(crownBaseL.x - 1.8, crownBaseL.y + 3.2, crownBaseL.z - 2.2),
        0.9,
      ),
    })
    fields.push({
      name: "crownSparkRight",
      sdf: sdCapsule(
        crownBaseR,
        vec3(crownBaseR.x + 1.8, crownBaseR.y + 3.2, crownBaseR.z - 2.2),
        0.9,
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
    earLeft: [earBaseL.x, earBaseL.y, earBaseL.z],
    earRight: [earBaseR.x, earBaseR.y, earBaseR.z],
  }
  if (stage === "juvenile" || stage === "champion") {
    pivots.sparkFrillLeft = [
      headC.x - 2.2 * hs,
      headC.y + 1.4 * hs,
      headC.z - 2 * hs,
    ]
    pivots.sparkFrillRight = [
      headC.x + 2.2 * hs,
      headC.y + 1.4 * hs,
      headC.z - 2 * hs,
    ]
  }
  if (stage === "champion") {
    pivots.crownSparkLeft = [
      headC.x - 1.4 * hs,
      headC.y + 2.5 * hs,
      headC.z - 2.2 * hs,
    ]
    pivots.crownSparkRight = [
      headC.x + 1.4 * hs,
      headC.y + 2.5 * hs,
      headC.z - 2.2 * hs,
    ]
  }

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
    earLeft: dark,
    earRight: dark,
  }
  if (stage === "juvenile" || stage === "champion") {
    colors.sparkFrillLeft = spark
    colors.sparkFrillRight = spark
  }
  if (stage === "champion") {
    colors.crownSparkLeft = bone
    colors.crownSparkRight = bone
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
    parents: {
      neck: "body",
      head: "neck",
      earLeft: "head",
      earRight: "head",
      tail: "body",
      tailTip: "tail",
      ...(stage === "juvenile" || stage === "champion"
        ? { sparkFrillLeft: "head", sparkFrillRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { crownSparkLeft: "head", crownSparkRight: "head" }
        : {}),
      ...face.parents,
    },
  }
}
