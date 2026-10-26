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
export { sampleDna as sampleFrondDna } from "./sample"

// Frond archetype: the Whistlefern's body plan. A sapling stag — a slim,
// leggy herbivore with a short deer neck, a small skull under leafy antler
// branches and a short flag tail. Authored in voxel units on a 56^3 grid
// (y up, +z forward). The template owns the body plan and bounds; DNA only
// jitters within them, so every seed still reads as a frond.

export const FROND_GRID = 56

export const frondTemplate: Template = {
  id: "frond",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.25 },
    bodyGirth: { min: 0.8, max: 1.15 },
    legLength: { min: 0.85, max: 1.25 },
    neckLength: { min: 0.85, max: 1.25 },
    neckThickness: { min: 0.8, max: 1.2 },
    headSize: { min: 0.85, max: 1.2 },
    antlerLength: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.7, max: 1.3 },
  },
  styles: {
    antlers: [
      { id: "tines", params: { spread: { min: 0.6, max: 1.4 } } },
      { id: "palm", params: { spread: { min: 0.6, max: 1.4 } } },
      { id: "spiral", params: { spread: { min: 0.6, max: 1.4 } } },
    ],
    tail: [
      { id: "tuft", params: {} },
      { id: "flag", params: { flagLength: { min: 0.6, max: 1.4 } } },
      { id: "plain", params: {} },
    ],
  },
  palette: { hue: 110, valueJitter: { min: 0.42, max: 0.6 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface FrondBuild extends CreatureBuild {}

const O = FROND_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Assemble the frond from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildFrond(dna: Dna, stage: Stage = "baby"): FrondBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const al = p.antlerLength ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // -- Key skeleton points -------------------------------------------------
  // A slim two-capsule torso set HIGH over long legs — the sapling stag's
  // silhouette is the hound's legginess carried on a deer frame, with the
  // rump a touch higher than the withers.
  const hipY = 12.6 + 0.7 * j
  const chestA = at(0, 14.6, 4.2 * bl)
  const chestB = at(0, 14.4, 0.6 * bl)
  const rumpA = at(0, 14.8, 0.6 * bl)
  const rumpB = at(0, 15.1, -4.2 * bl)
  const footY = 1.6 + 1.2 * bg
  const legFrontZ = 4.2 + (ll - 1) * 1.6
  const legBackZ = -4.2 - (ll - 1) * 1.6

  // Surface zones: the torso's real y extent, derived from the capsule
  // radii, so a stage or girth shift moves the bands with the body.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4.3 * bg,
    torsoTop: rumpA.y + 4.5 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry because the face needs the coat colour and
  // the antlers are painted from the resolved hue.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = frondTemplate.palette.valueJitter
  const hue = gilded ? 104 : frondTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.7
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
  // The leaf accent: one bright step of the plant hue, used only on the
  // antler branches and signature parts. Never a new hue — the coat's
  // family stays intact.
  const leaf: [number, number, number] = hslToRgb(hue, 0.85, 0.52)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Slim two-capsule torso, smooth-unioned so the chest-to-rump line reads
  // as one deer barrel, not a seam.
  const chestField: Sdf = sdCapsule(chestA, chestB, 4.3 * bg)
  const rumpField: Sdf = sdCapsule(rumpA, rumpB, 4.5 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnion(chestField, rumpField, 2.2),
    classify: classifyTorso,
  })

  // Four long slim legs with a thigh bridge angling into the flank.
  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 3.1 * bg, hipY, legZ)
    const knee = at(leg.sx * 3.5 * bg, (hipY + footY) / 2, legZ + 0.5)
    const foot = at(leg.sx * 3.7 * bg, footY, legZ + 0.2)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    const thighTop = at(leg.sx * 2 * bg, 14.4, legZ + 0.2)
    // Radii are deliberately above 1.5 voxels: the proportion audit samples
    // a coarse lattice, so a thinner limb is measured from one column and
    // its y-extent swings with sub-voxel placement.
    const legField: Sdf = union(
      union(
        union(sdSphere(hip, 2.4 * bg), sdCapsule(hip, knee, 1.9 * bg)),
        sdCapsule(knee, foot, 1.7 * bg),
      ),
      sdCapsule(hip, thighTop, 2.1 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Short tail riding off the high rump: a drooping stub the style dresses.
  // It starts just inside the rump capsule's rear cap (radius 4.5 * bg) so the
  // stub joins the body, then runs well clear of it — a base buried any deeper
  // leaves the body claiming every voxel and the part reads as a dead field.
  const tailBase = at(0, 14.6, -4.2 * bl - 3.6 * bg)
  const tailStyle = dna.styles.tail ?? "tuft"
  const flagLength = dna.styleParams.flagLength ?? 1
  const tailEnd =
    tailStyle === "flag"
      ? at(0, 13.4, -4.2 * bl - 8.4 * bg - 2 * tl * flagLength)
      : at(0, 12.4, -4.2 * bl - 8 * bg - 1.6 * tl)
  fields.push({
    name: "tail",
    sdf: sdCapsule(tailBase, tailEnd, 1.1),
  })
  // The dressed end sits past the capsule's own end cap and is wider than the
  // tail radius, so it claims its own voxels instead of vanishing inside them.
  const tailTipPieces: Sdf[] =
    tailStyle === "flag"
      ? [
          sdBox(
            vec3(tailEnd.x, tailEnd.y - 0.6, tailEnd.z - 1.1),
            vec3(1.8, 1.1, 1.5),
          ),
        ]
      : [sdSphere(vec3(tailEnd.x, tailEnd.y - 0.9, tailEnd.z - 1), 1.75)]
  fields.push({
    name: "tailTip",
    sdf: tailTipPieces.reduce((a, s) => union(a, s)),
  })

  // Neck: a deer's neck rises steeply and forward, tapering to the skull.
  const neckA = at(0, 14.6, 4.8 * bl)
  const neckMid = at(0, 15.8 + 1.6 * nl, 6 * bl)
  const neckB = at(0, 16.6 + 2.6 * nl, 6.6 * bl)
  const neckField: Sdf = union(
    sdCapsule(neckA, neckMid, 2.3 * nt),
    sdCapsule(neckMid, neckB, 1.7 * nt),
  )
  fields.push({ name: "neck", sdf: neckField })

  // Stage head shaping: a fawn carries a proportionally larger skull and a
  // shorter neck, then grows into the leggy adult frame. Identity layer
  // untouched — only the head reads younger at the baby stage.
  const hk = hs * (stage === "baby" ? 1.14 : stage === "juvenile" ? 1.05 : 1)
  const headC = vec3(neckB.x, neckB.y + 0.7, neckB.z + 1.8 * hk)
  const skullHalf = vec3(2.1 * hk, 2 * hk, 2.5 * hk)
  // A SHORT deer muzzle: the browse-and-flee head, nothing like the
  // hound's two-skull-length nose or the drake's box.
  const snoutC = vec3(headC.x, headC.y - 0.5 * hk, headC.z + 3.2 * hk)
  const snoutHalf = vec3(1.35 * hk, 1.15 * hk, 2 * hk)
  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    sdBox(snoutC, snoutHalf),
  )
  const face = faceParts(
    facePlan("frond", {
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

  // Leafy antler branches on the skull's top corners: a woody beam rising
  // out and back, dressed per style. These are identity-layer parts —
  // every stage carries them, growing with antlerLength.
  const antlerStyle = dna.styles.antlers ?? "tines"
  const spread = dna.styleParams.spread ?? 1
  const antlerBaseY = headC.y + skullHalf.y - 0.4
  for (const sx of [-1, 1]) {
    const name = sx === -1 ? "antlerLeft" : "antlerRight"
    const base = vec3(headC.x + sx * 0.9 * hk, antlerBaseY, headC.z - 0.2)
    const pieces: Sdf[] = []
    const beamEnd =
      antlerStyle === "spiral"
        ? vec3(
            headC.x + sx * (2.2 + 1.2 * spread) * al,
            antlerBaseY + 2.6 * al,
            headC.z + 0.8 * al,
          )
        : vec3(
            headC.x + sx * (1.6 + 1.2 * spread) * al,
            antlerBaseY + 4 * al,
            headC.z - 1.6 * al,
          )
    // Radii clear 0.71 for the same reason the crab's spike ridge does: a
    // capsule axis that lands on a grid line has every neighbouring voxel
    // centre sqrt(0.5) away, so a thinner beam claims nothing at all.
    pieces.push(sdCapsule(base, beamEnd, 1.05))
    if (antlerStyle === "tines") {
      // Two forward tines off the beam's upper third.
      const tineRoot = vec3(
        base.x + sx * (beamEnd.x - base.x) * 0.62,
        base.y + (beamEnd.y - base.y) * 0.62,
        base.z + (beamEnd.z - base.z) * 0.62,
      )
      pieces.push(
        sdCapsule(
          tineRoot,
          vec3(
            tineRoot.x + sx * 1.1 * al,
            tineRoot.y + 2 * al,
            tineRoot.z + 0.9 * al,
          ),
          0.8,
        ),
      )
      pieces.push(
        sdCapsule(
          tineRoot,
          vec3(
            tineRoot.x + sx * 0.3,
            tineRoot.y + 2.4 * al,
            tineRoot.z - 1 * al,
          ),
          0.75,
        ),
      )
    } else if (antlerStyle === "palm") {
      // A broad leaf-shaped paddle at the beam's end.
      pieces.push(
        sdEllipsoid(
          vec3(beamEnd.x + sx * 0.6, beamEnd.y + 0.4, beamEnd.z - 0.4),
          vec3(0.9, 1.5 * al, 1.9 * al * spread),
        ),
      )
    } else {
      // spiral: a second segment curling forward under the beam's end.
      pieces.push(
        sdCapsule(
          beamEnd,
          vec3(
            beamEnd.x - sx * 1.1 * al,
            beamEnd.y + 0.6 * al,
            beamEnd.z + 1.6 * al,
          ),
          0.8,
        ),
      )
    }
    fields.push({ name, sdf: pieces.reduce((a, s) => union(a, s)) })
  }

  // Juvenile signature: a pair of leaf buds breaking out beside the antler
  // bases — new growth the fawn has started to sprout. The antlers
  // (identity layer) stay untouched.
  if (j >= 1) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "leafBudLeft" : "leafBudRight"
      const base = vec3(
        headC.x + sx * 1.9 * hk,
        antlerBaseY - 0.6,
        headC.z + 0.4,
      )
      const tip = vec3(
        headC.x + sx * 2.8 * hk,
        antlerBaseY + 0.8,
        headC.z - 0.6,
      )
      fields.push({ name, sdf: sdCapsule(base, tip, 0.8) })
    }
  }

  // Champion signature: a pair of pale blooms opening at the antler tips —
  // the earned crown of the grove.
  if (j === 2) {
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownBloomLeft" : "crownBloomRight"
      const base = vec3(
        headC.x + sx * 1.9 * hk,
        antlerBaseY + 0.4,
        headC.z - 0.8,
      )
      const tip = vec3(headC.x + sx * 3 * hk, antlerBaseY + 2.8, headC.z - 1.8)
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
    antlerLeft: [headC.x - 0.9 * hk, antlerBaseY, headC.z - 0.2],
    antlerRight: [headC.x + 0.9 * hk, antlerBaseY, headC.z - 0.2],
  }
  if (j >= 1) {
    pivots.leafBudLeft = [headC.x - 1.9 * hk, antlerBaseY - 0.6, headC.z + 0.4]
    pivots.leafBudRight = [headC.x + 1.9 * hk, antlerBaseY - 0.6, headC.z + 0.4]
  }
  if (j === 2) {
    pivots.crownBloomLeft = [
      headC.x - 1.9 * hk,
      antlerBaseY + 0.4,
      headC.z - 0.8,
    ]
    pivots.crownBloomRight = [
      headC.x + 1.9 * hk,
      antlerBaseY + 0.4,
      headC.z - 0.8,
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
    antlerLeft: leaf,
    antlerRight: leaf,
  }
  if (j >= 1) {
    colors.leafBudLeft = leaf
    colors.leafBudRight = leaf
  }
  if (j === 2) {
    colors.crownBloomLeft = bone
    colors.crownBloomRight = bone
  }

  const parents: Record<string, string> = {
    neck: "body",
    head: "neck",
    antlerLeft: "head",
    antlerRight: "head",
    tail: "body",
    tailTip: "tail",
    ...(j >= 1 ? { leafBudLeft: "head", leafBudRight: "head" } : {}),
    ...(j === 2 ? { crownBloomLeft: "head", crownBloomRight: "head" } : {}),
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
