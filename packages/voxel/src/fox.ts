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
export { sampleDna as sampleFoxDna } from "./sample"

// Voltfox archetype: the Electric line's second body plan. A low-slung
// compact fox quadruped — tucked barrel held low over short legs, a pointed
// muzzle, erect triangular ears and an oversized brush tail carried high
// over the back. The quick-striker silhouette: everything the storm hound
// is not (no leggy sighthound frame, no low whip tail, no long narrow
// muzzle). Authored in voxel units on a 56^3 grid (y up, +z forward).
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed is guaranteed to still read as a fox.

export const FOX_GRID = 56

export const foxTemplate: Template = {
  id: "fox",
  version: 1,
  proportions: {
    bodyLength: { min: 0.8, max: 1.15 },
    bodyGirth: { min: 0.7, max: 1.0 },
    legLength: { min: 0.7, max: 1.1 },
    neckLength: { min: 0.7, max: 1.1 },
    neckThickness: { min: 0.7, max: 1.1 },
    headSize: { min: 0.85, max: 1.2 },
    earLength: { min: 0.7, max: 1.4 },
    tailLength: { min: 0.85, max: 1.3 },
  },
  styles: {
    ears: [
      { id: "erect", params: { flare: { min: 0.2, max: 1 } } },
      { id: "tipped", params: { flare: { min: 0.2, max: 1 } } },
      { id: "rounded", params: {} },
    ],
    tail: [
      { id: "brush", params: { bush: { min: 0.6, max: 1.4 } } },
      { id: "flame", params: { bush: { min: 0.6, max: 1.4 } } },
      { id: "curl", params: {} },
    ],
  },
  palette: { hue: 50, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface FoxBuild extends CreatureBuild {}

const O = FOX_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildFox(dna: Dna, stage: Stage = "baby"): FoxBuild {
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
  // A compact three-capsule torso carried LOW: deep chest, level back, round
  // rump. Smaller in every radius than the hound's and a full body lower —
  // the fox darts under, not over.
  const chestA = at(0, 11.5, 5 * bl)
  const chestB = at(0, 11.5, 1 * bl)
  const waistA = at(0, 12, 1 * bl)
  const waistB = at(0, 12.5, -4 * bl)
  const rumpA = at(0, 12.5, -4 * bl)
  const rumpB = at(0, 12, -6.5 * bl)
  const tailBase = at(0, 13.5, -6.8 * bl)
  const tailMid = at(0, 17, -6.8 * bl - 3.5 * tl)
  const tailKnee = at(0, 19.5, -6.8 * bl - 6 * tl)
  const tailEnd = at(0, 19, -6.8 * bl - 8.5 * tl)

  // Short legs: the stance stays crouched while the body matures upward.
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 9.2 + 0.8 * j
  const footY = 0.9 + 1.5 * bg
  const legFrontZ = 4.6 + (ll - 1) * 2
  const legBackZ = -5.8 - (ll - 1) * 2

  // Surface zones: the torso's real y extent, derived from the chest and rump
  // radii, so a stage or girth shift moves the bands with the body instead of
  // letting them drift off it.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4.6 * bg,
    torsoTop: rumpA.y + 4.2 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // Neck: short and level, carrying the skull forward — a pounce posture, not
  // the hound's upright working-dog angle.
  const neckA = at(0, 12, 4.5 * bl)
  const neckB = at(0, 13.6 + 2.4 * nl, 4.5 * bl + 1.6 * nl)
  const neckC = at(0, 14.4 + 3.6 * nl, 4.5 * bl + 3.4 * nl)

  // Stage head shaping: a cub carries a proportionally larger skull and a
  // shorter neck, then grows into the adult frame. Identity layer
  // untouched — only the head reads younger at the baby stage.
  const hk = hs * (stage === "baby" ? 1.14 : stage === "juvenile" ? 1.05 : 1)

  const headC = vec3(neckC.x, neckC.y + 0.6, neckC.z + 2 * hk)
  const skullHalf = vec3(2.9 * hk, 2.3 * hk, 2.9 * hk)
  // A pointed fox muzzle: narrower than the hound's long box, tapering to
  // the nose.
  const snoutC = vec3(headC.x, headC.y - 0.4, headC.z + 3.9 * hk)
  const snoutHalf = vec3(1.7 * hk, 1.5 * hk, 2.8 * hk)
  const jawBox = sdBox(
    vec3(headC.x, headC.y - 2 * hk, headC.z + 3.1 * hk),
    vec3(1.45 * hk, 0.95 * hk, 2.4 * hk),
  )

  const earStyle = dna.styles.ears ?? "erect"
  const flare = dna.styleParams.flare ?? 0.6
  const tailStyle = dna.styles.tail ?? "brush"
  const bush = dna.styleParams.bush ?? 1

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Compact three-capsule torso: deep chest, level back, round rump.
  const chestField: Sdf = sdCapsule(chestA, chestB, 4.6 * bg)
  const waistField: Sdf = sdCapsule(waistA, waistB, 3.6 * bg)
  const rumpField: Sdf = sdCapsule(rumpA, rumpB, 4.2 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnion(smoothUnion(chestField, waistField, 2), rumpField, 2),
    classify: classifyTorso,
  })

  // Tail: rises from the rump and curls high over the back — the fox brush
  // reads against the sky, never dragging the ground like the hound's whip.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 2 * bg),
    sdCapsule(tailMid, tailKnee, 1.5),
  )
  fields.push({ name: "tail", sdf: tailField })

  const tailTipPieces: Sdf[] = [sdCapsule(tailKnee, tailEnd, 1.2)]
  if (tailStyle === "brush") {
    // A fat upright tuft riding the curl's end.
    tailTipPieces.push(
      sdBox(at(0, tailEnd.y + 0.4, tailEnd.z), vec3(1.8 * bush, 2.4, 1.9)),
    )
  } else if (tailStyle === "flame") {
    tailTipPieces.push(sdSphere(vec3(tailEnd.x, tailEnd.y + 1, tailEnd.z), 2.2 * bush))
  } else {
    // curl: a second knob tipped forward over the curl, closing the ring.
    tailTipPieces.push(
      sdSphere(vec3(tailEnd.x, tailEnd.y - 0.6, tailEnd.z + 2.2), 1.7),
    )
  }
  const tailTipField: Sdf = tailTipPieces.reduce((acc, s) => union(acc, s))
  fields.push({ name: "tailTip", sdf: tailTipField })

  // Four short sturdy legs — the fox's crouch. Thigh bridge angles up into
  // the flank; the shin is short and straight.
  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 3.4 * bg, hipY, legZ)
    const knee = at(leg.sx * 3.6 * bg, (hipY + footY) / 2, legZ + 0.6)
    const foot = at(leg.sx * 3.8 * bg, footY, legZ + 0.3)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    const thighTop = at(leg.sx * 2.2 * bg, 13.5, legZ + 0.2)
    const legField: Sdf = union(
      union(
        union(sdSphere(hip, 2.3 * bg), sdCapsule(hip, knee, 1.8 * bg)),
        sdCapsule(knee, foot, 1.4 * bg),
      ),
      sdCapsule(hip, thighTop, 1.9 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Short two-segment neck, thick at the shoulders.
  const neckMid = at(0, 13 + 1.4 * nl, 4.5 * bl + 0.9 * nl)
  const neckField: Sdf = union(
    union(
      sdCapsule(neckA, neckMid, 2.5 * nt),
      sdCapsule(neckMid, neckB, 2.1 * nt),
    ),
    sdCapsule(neckB, neckC, 1.8 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry because the face needs the coat colour and
  // the head's palette is built from it.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = foxTemplate.palette.valueJitter
  const hue = gilded ? 45 : foxTemplate.palette.hue
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
    facePlan("fox", {
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

  // Ears: triangular fox ears on the skull's top corners. Style-driven
  // silhouettes share one base so the rig pivot never moves underneath.
  const earBaseY = headC.y + skullHalf.y - 0.3
  const earBaseL = vec3(headC.x - 1.7 * hk, earBaseY, headC.z - 0.7 * hk)
  const earBaseR = vec3(headC.x + 1.7 * hk, earBaseY, headC.z - 0.7 * hk)

  function earTip(sign: number): Vec3 {
    const bx = sign * 1.7 * hk
    if (earStyle === "tipped") {
      return vec3(
        headC.x + bx + sign * (1.6 + 1.6 * flare),
        earBaseY + 2.6 * el,
        headC.z - 0.6 * hk - 1.4 * el,
      )
    }
    // erect (default): tall and sharp.
    return vec3(
      headC.x + bx + sign * 2 * flare,
      earBaseY + 4.2 * el,
      headC.z - 0.4,
    )
  }

  if (earStyle === "rounded") {
    // Round cub ears: a ball on a nub, no sharp tip.
    for (const [base, sign] of [
      [earBaseL, -1],
      [earBaseR, 1],
    ] as const) {
      fields.push({
        name: sign < 0 ? "earLeft" : "earRight",
        sdf: union(
          sdSphere(base, 1.6),
          sdCapsule(
            base,
            vec3(base.x, base.y + 1.6 * el, base.z - 0.4),
            1.1,
          ),
        ),
      })
    }
  } else {
    fields.push({ name: "earLeft", sdf: sdCapsule(earBaseL, earTip(-1), 1) })
    fields.push({ name: "earRight", sdf: sdCapsule(earBaseR, earTip(1), 1) })
  }

  // Juvenile signature: a pair of crackling cheek ruffs jutting sideways
  // from the skull — static the cub is learning to shed. New growth the
  // baby does not have yet; the ears (identity layer) stay untouched.
  if (stage === "juvenile" || stage === "champion") {
    const ruffBaseL = vec3(
      headC.x - 2.4 * hs,
      headC.y - 0.2 * hs,
      headC.z + 0.5 * hs,
    )
    const ruffBaseR = vec3(
      headC.x + 2.4 * hs,
      headC.y - 0.2 * hs,
      headC.z + 0.5 * hs,
    )
    fields.push({
      name: "voltRuffLeft",
      sdf: sdCapsule(
        ruffBaseL,
        vec3(ruffBaseL.x - 1.8, ruffBaseL.y + 0.6, ruffBaseL.z - 1.2),
        0.8,
      ),
    })
    fields.push({
      name: "voltRuffRight",
      sdf: sdCapsule(
        ruffBaseR,
        vec3(ruffBaseR.x + 1.8, ruffBaseR.y + 0.6, ruffBaseR.z - 1.2),
        0.8,
      ),
    })
  }

  // Champion signature: a crown pair of lightning-bolt horns rising from the
  // upper skull behind the ear line, kinking outward mid-rise. The earned
  // crown reads at broadcast distance without changing the body plan.
  if (stage === "champion") {
    for (const sx of [-1, 1] as const) {
      const name = sx === -1 ? "crownBoltLeft" : "crownBoltRight"
      const boltBase = vec3(
        headC.x + sx * 1.2 * hs,
        headC.y + 2.3 * hs,
        headC.z - 2 * hs,
      )
      const boltMid = vec3(
        headC.x + sx * 2.4 * hs,
        headC.y + 3.9 * hs,
        headC.z - 3.4 * hs,
      )
      const boltTip = vec3(
        headC.x + sx * 1.6 * hs,
        headC.y + 5.4 * hs,
        headC.z - 2.6 * hs,
      )
      fields.push({
        name,
        sdf: union(
          sdCapsule(boltBase, boltMid, 0.85),
          sdCapsule(boltMid, boltTip, 0.85),
        ),
      })
    }
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
    pivots.voltRuffLeft = [
      headC.x - 2.4 * hs,
      headC.y - 0.2 * hs,
      headC.z + 0.5 * hs,
    ]
    pivots.voltRuffRight = [
      headC.x + 2.4 * hs,
      headC.y - 0.2 * hs,
      headC.z + 0.5 * hs,
    ]
  }
  if (stage === "champion") {
    pivots.crownBoltLeft = [
      headC.x - 1.2 * hs,
      headC.y + 2.3 * hs,
      headC.z - 2 * hs,
    ]
    pivots.crownBoltRight = [
      headC.x + 1.2 * hs,
      headC.y + 2.3 * hs,
      headC.z - 2 * hs,
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
    colors.voltRuffLeft = spark
    colors.voltRuffRight = spark
  }
  if (stage === "champion") {
    colors.crownBoltLeft = bone
    colors.crownBoltRight = bone
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
        ? { voltRuffLeft: "head", voltRuffRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { crownBoltLeft: "head", crownBoltRight: "head" }
        : {}),
      ...face.parents,
    },
  }
}
