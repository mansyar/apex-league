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
export { sampleDna as sampleSmolderDna } from "./sample"

// Smolder archetype: the Moor Cinder's body plan. An ember-fleeced ram — a
// heavy two-capsule barrel on thick short legs, a thick rising neck into a
// heavy skull with a broad grazing muzzle, curled horn beams and a drooping
// tassel tail. Authored in voxel units on a 56^3 grid (y up, +z forward).
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed still reads as a smolder.

export const SMOLDER_GRID = 56

export const smolderTemplate: Template = {
  id: "smolder",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.3 },
    bodyGirth: { min: 0.9, max: 1.35 },
    legLength: { min: 0.75, max: 1.2 },
    neckLength: { min: 0.8, max: 1.25 },
    neckThickness: { min: 0.85, max: 1.3 },
    headSize: { min: 0.8, max: 1.25 },
    hornLength: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.75, max: 1.3 },
  },
  styles: {
    horns: [
      { id: "curl", params: { curlTightness: { min: 0.6, max: 1.4 } } },
      { id: "sweep", params: { sweepBack: { min: 0.6, max: 1.4 } } },
      { id: "spiral", params: { spiralTurns: { min: 0.6, max: 1.4 } } },
    ],
    tail: [
      { id: "tassel", params: { tasselLength: { min: 0.6, max: 1.4 } } },
      { id: "switch", params: { switchWidth: { min: 0.6, max: 1.4 } } },
      { id: "stump", params: {} },
    ],
  },
  palette: { hue: 18, valueJitter: { min: 0.4, max: 0.58 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface SmolderBuild extends CreatureBuild {}

const O = SMOLDER_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Assemble the smolder from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildSmolder(dna: Dna, stage: Stage = "baby"): SmolderBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const hl = p.hornLength ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // -- Key skeleton points -------------------------------------------------
  // A HEAVY body: the barrel hangs lower and rounder than the hound's, on
  // thick columns. Hips lift a touch per stage so the ram reads older.
  const hipY = 11.4 + 0.6 * j
  const chestA = at(0, 15, 5.2 * bl)
  const chestB = at(0, 14.8, 0.6 * bl)
  const rumpA = at(0, 15.2, 0.6 * bl)
  const rumpB = at(0, 15.4, -4.4 * bl)
  const footY = 2 + 1.5 * bg
  const legFrontZ = 4.6 + (ll - 1) * 1.4
  const legBackZ = -4.2 - (ll - 1) * 1.4

  // Surface zones: the torso's real y extent, derived from the capsule
  // radii, so a stage or girth shift moves the bands with the body.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 5.4 * bg,
    torsoTop: rumpA.y + 5 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry because the face needs the coat colour and
  // the ember accents are painted from the resolved hue.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = smolderTemplate.palette.valueJitter
  const hue = gilded ? 12 : smolderTemplate.palette.hue
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
  // The ember accent: one hot bright step of the fire hue, used on the
  // fleece vents and signature parts. Same hue family as the coat — never
  // a foreign colour.
  const ember: [number, number, number] = hslToRgb(hue, 0.9, 0.72)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Heavy two-capsule barrel plus a drooping belly, smooth-unioned into one
  // grazer mass.
  const chestField: Sdf = sdCapsule(chestA, chestB, 5.4 * bg)
  const rumpField: Sdf = sdCapsule(rumpA, rumpB, 5 * bg)
  const bellyField: Sdf = sdEllipsoid(
    at(0, 13.8, 0.4),
    vec3(5.2 * bg, 3.4 * bg, 7.4 * bl),
  )
  fields.push({
    name: "body",
    sdf: smoothUnion(smoothUnion(chestField, rumpField, 2.4), bellyField, 2),
    classify: classifyTorso,
  })

  // Four thick column legs with a thigh bridge angling into the flank.
  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 4.2 * bg, hipY, legZ)
    const knee = at(leg.sx * 4.5 * bg, (hipY + footY) / 2, legZ + 0.4)
    const foot = at(leg.sx * 4.6 * bg, footY, legZ + 0.2)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    const thighTop = at(leg.sx * 2.6 * bg, 14.8, legZ + 0.2)
    const legField: Sdf = union(
      union(
        union(sdSphere(hip, 2.5 * bg), sdCapsule(hip, knee, 2.1 * bg)),
        sdCapsule(knee, foot, 1.7 * bg),
      ),
      sdCapsule(hip, thighTop, 2.4 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Drooping tail with a dressed end: the ram's flag hangs off the rump.
  // It starts just inside the rump capsule's rear cap (radius 5 * bg) so the
  // stub joins the body, then runs well clear of it — a base buried any deeper
  // leaves the body claiming every voxel and the part reads as a dead field.
  const tailBase = at(0, 15.4, -4.4 * bl - 3.8 * bg)
  const tailStyle = dna.styles.tail ?? "tassel"
  const tasselLength = dna.styleParams.tasselLength ?? 1
  const switchWidth = dna.styleParams.switchWidth ?? 1
  const tailEnd =
    tailStyle === "tassel"
      ? at(0, 11.6, -4.4 * bl - 8.4 * bg - 2.4 * tl * tasselLength)
      : at(0, 12, -4.4 * bl - 8.6 * bg - 2 * tl)
  fields.push({
    name: "tail",
    sdf: sdCapsule(tailBase, tailEnd, 1.2),
  })
  // The dressed end sits past the capsule's own end cap and is wider than the
  // tail radius, so it claims its own voxels instead of vanishing inside them.
  const tipCenter = vec3(tailEnd.x, tailEnd.y - 0.9, tailEnd.z - 1)
  const tailTipPieces: Sdf[] =
    tailStyle === "tassel"
      ? [sdSphere(tipCenter, 1.75)]
      : tailStyle === "switch"
        ? [sdEllipsoid(tipCenter, vec3(1.9 * switchWidth, 1.5, 1.7))]
        : [sdSphere(tipCenter, 1.5)]
  fields.push({
    name: "tailTip",
    sdf: tailTipPieces.reduce((a, s) => union(a, s)),
  })

  // Thick neck rising steeply into the heavy skull. It starts at the
  // withers and reaches well clear of the barrel so the skull reads above
  // the fleece instead of sinking into it.
  const neckA = at(0, 15.8, 5.2 * bl)
  const neckMid = at(0, 18.4 + 1.4 * nl, 6.2 * bl)
  const neckB = at(0, 20.8 + 2.2 * nl, 6.8 * bl)
  const neckField: Sdf = union(
    sdCapsule(neckA, neckMid, 2.8 * nt),
    sdCapsule(neckMid, neckB, 2.2 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // Stage head shaping: a lamb carries a proportionally larger skull, then
  // grows into the ram frame. Identity layer untouched — only the head
  // reads younger at the baby stage.
  const hk = hs * (stage === "baby" ? 1.14 : stage === "juvenile" ? 1.05 : 1)
  const headC = vec3(neckB.x, neckB.y + 0.9, neckB.z + 2 * hk)
  const skullHalf = vec3(2.8 * hk, 2.4 * hk, 2.8 * hk)
  // A BROAD grazing muzzle, hung below the skull like the ox's — this is
  // the head that carries the nostril pair.
  const snoutC = vec3(headC.x, headC.y - 0.7 * hk, headC.z + 3.6 * hk)
  const snoutHalf = vec3(2.05 * hk, 1.6 * hk, 2.3 * hk)
  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    sdBox(snoutC, snoutHalf),
  )
  const face = faceParts(
    facePlan("smolder", {
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

  // Horn beams on the skull's top corners, dressed per style. Identity
  // layer — every stage carries them, growing with hornLength.
  const hornStyle = dna.styles.horns ?? "curl"
  const curlTightness = dna.styleParams.curlTightness ?? 1
  const sweepBack = dna.styleParams.sweepBack ?? 1
  const spiralTurns = dna.styleParams.spiralTurns ?? 1
  const hornBaseY = headC.y + skullHalf.y - 0.5
  for (const sx of [-1, 1]) {
    const name = sx === -1 ? "hornLeft" : "hornRight"
    const base = vec3(headC.x + sx * 2.2 * hk, hornBaseY, headC.z - 0.6)
    const pieces: Sdf[] = []
    if (hornStyle === "curl") {
      // Out and up, then curling forward and down under its own weight.
      const outer = vec3(
        headC.x + sx * (2.4 + 1.4 * hl) * hk,
        hornBaseY + 1.8 * hl,
        headC.z - 1 * hl,
      )
      const tip = vec3(
        outer.x - sx * 1.1 * hl * curlTightness,
        outer.y - 1.2 * hl * curlTightness,
        outer.z + 2 * hl * curlTightness,
      )
      pieces.push(sdCapsule(base, outer, 0.95), sdCapsule(outer, tip, 0.85))
    } else if (hornStyle === "sweep") {
      // A straight beam swept back and out from the skull.
      const tip = vec3(
        headC.x + sx * (2.2 + 1.2 * sweepBack) * hk,
        hornBaseY + 2.2 * hl,
        headC.z - (2.2 + 1.6 * sweepBack) * hl,
      )
      pieces.push(sdCapsule(base, tip, 0.95))
    } else {
      // spiral: three segments winding out, up and forward-in.
      const mid = vec3(
        headC.x + sx * (2.4 + 1.2 * hl) * hk,
        hornBaseY + 1.4 * hl,
        headC.z - 0.4 * hl,
      )
      const outer = vec3(mid.x, hornBaseY + 2.8 * hl, mid.z + 1.2 * spiralTurns)
      const tip = vec3(
        outer.x - sx * 1.4 * spiralTurns,
        outer.y + 0.6 * hl,
        outer.z + 1.4 * spiralTurns,
      )
      pieces.push(
        sdCapsule(base, mid, 0.95),
        sdCapsule(mid, outer, 0.85),
        sdCapsule(outer, tip, 0.7),
      )
    }
    fields.push({ name, sdf: pieces.reduce((a, s) => union(a, s)) })
  }

  // Juvenile signature: a pair of first embers breaking out of the fleece
  // behind the skull — the ram is starting to smolder. They sit on the
  // skull's rear-top corner: a sphere buried inside the skull box claims
  // nothing, so the tuft has to rise clear of it.
  if (j >= 1) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "emberTuftLeft" : "emberTuftRight"
      const base = vec3(
        headC.x + sx * 1.5 * hk,
        headC.y + skullHalf.y - 0.4,
        headC.z - 1.5 * hk,
      )
      const tip = vec3(
        headC.x + sx * 2.7 * hk,
        headC.y + skullHalf.y + 1.4,
        headC.z - 2.6 * hk,
      )
      fields.push({ name, sdf: sdCapsule(base, tip, 0.8) })
    }
  }

  // Champion signature: a pair of flame plumes rising off the skull's top
  // corners — the earned crown of the cinder.
  if (j === 2) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownFlameLeft" : "crownFlameRight"
      const base = vec3(headC.x + sx * 1.4 * hk, hornBaseY + 0.2, headC.z + 0.4)
      const tip = vec3(headC.x + sx * 2.6 * hk, hornBaseY + 3.4, headC.z - 0.4)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.8) })
    }
  }

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // The body pivot sits at the HIP LINE (hipY): breathe squash-stretch
  // around this pivot keeps the legs visually attached.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    hornLeft: [headC.x - 2.2 * hk, hornBaseY, headC.z - 0.6],
    hornRight: [headC.x + 2.2 * hk, hornBaseY, headC.z - 0.6],
  }
  if (j >= 1) {
    pivots.emberTuftLeft = [
      headC.x - 1.5 * hk,
      headC.y + skullHalf.y - 0.4,
      headC.z - 1.5 * hk,
    ]
    pivots.emberTuftRight = [
      headC.x + 1.5 * hk,
      headC.y + skullHalf.y - 0.4,
      headC.z - 1.5 * hk,
    ]
  }
  if (j === 2) {
    pivots.crownFlameLeft = [headC.x - 1.4 * hk, hornBaseY + 0.2, headC.z + 0.4]
    pivots.crownFlameRight = [
      headC.x + 1.4 * hk,
      hornBaseY + 0.2,
      headC.z + 0.4,
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
    hornLeft: bone,
    hornRight: bone,
  }
  if (j >= 1) {
    colors.emberTuftLeft = ember
    colors.emberTuftRight = ember
  }
  if (j === 2) {
    colors.crownFlameLeft = ember
    colors.crownFlameRight = ember
  }

  const parents: Record<string, string> = {
    neck: "body",
    head: "neck",
    hornLeft: "head",
    hornRight: "head",
    tail: "body",
    tailTip: "tail",
    ...(j >= 1 ? { emberTuftLeft: "head", emberTuftRight: "head" } : {}),
    ...(j === 2 ? { crownFlameLeft: "head", crownFlameRight: "head" } : {}),
    ...face.parents,
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
      neck: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents,
  }
}
