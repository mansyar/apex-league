import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
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

export { sampleDna as sampleAxolotlDna } from "./sample"

// Axolotl archetype: the Water starter's body plan. Authored in voxel units
// on a 56^3 grid (y up, +z forward). Long low slinky body, wide flat head,
// external gill fronds, a fin ridge down the back and a finned paddle tail —
// nothing like the drake's arch or the ox's mass. The template owns the body
// plan and bounds; DNA only jitters within them, so every seed is guaranteed
// to still read as an axolotl.

export const AXOLOTL_GRID = 56

export const axolotlTemplate: Template = {
  id: "axolotl",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.25 },
    bodyGirth: { min: 0.8, max: 1.2 },
    headWidth: { min: 0.85, max: 1.25 },
    gillLength: { min: 0.8, max: 1.4 },
    finHeight: { min: 0.7, max: 1.35 },
    tailLength: { min: 0.8, max: 1.3 },
    legLength: { min: 0.7, max: 1.25 },
  },
  styles: {
    gills: [
      { id: "sprightly", params: { fan: { min: 0.2, max: 1 } } },
      { id: "drooping", params: {} },
      { id: "crown", params: {} },
    ],
    dorsalFin: [
      { id: "low", params: {} },
      { id: "ridged", params: { ridge: { min: 0.2, max: 1 } } },
      { id: "sail", params: {} },
    ],
  },
  palette: { hue: 205, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface AxolotlBuild extends CreatureBuild {}

const O = AXOLOTL_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildAxolotl(dna: Dna, stage: Stage = "baby"): AxolotlBuild {
  const p = matureProportions(dna.proportions, stage)
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const hw = p.headWidth ?? 1
  const gl = p.gillLength ?? 1
  const fh = p.finHeight ?? 1
  const tl = p.tailLength ?? 1
  const ll = p.legLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  // Reference proportions (San Diego Zoo fact sheet: head ~15% of total
  // length, tail ~35-40%, trunk ~45-50%; Britannica: continuous fin from
  // behind the head to the tail tip). A long, low, near-horizontal tube:
  // the drake arches, the ox bulges, the axolotl slinks. Belly hangs close
  // to the ground; legs are afterthoughts.
  const chestA = at(0, 9.8, 7 * bl)
  const chestB = at(0, 9.8, 0.5 * bl)
  const rearA = at(0, 10.4, 0.5 * bl)
  const rearB = at(0, 10.8, -8 * bl)

  // Tail: droops off the rump and thins to a point — the fin membranes
  // (tailFin) supply the paddle silhouette around it. Long: the tail is a
  // third or more of a real axolotl's length.
  const tailBase = at(0, 10.6, -7.5 * bl)
  const tailMid = at(0, 9.4, -7.5 * bl - 5.5 * tl)
  const tailEnd = at(0, 8.4, -7.5 * bl - 11 * tl)

  const hipY = 8.8 + 0.8 * (stage === "juvenile" ? 1 : 0)
  // Foot sphere bottom must clear the y=0 grid floor: the lowest voxel-row
  // center is y=0.5, so footY - footRadius must stay above 0.5 or the fuzz
  // boundary gate fails (feet clip into the floor plane).
  const footY = 2.5
  const legFrontZ = 5.6 + (ll - 1) * 2
  const legBackZ = -6.2 - (ll - 1) * 2

  // Almost no neck: a short thick connector so the head sits right on
  // the shoulders — the neckless look is part of the axolotl read.
  const neckA = at(0, 10.8, 6.5 * bl)
  const neckB = at(0, 11.2, 8 * bl)

  // Broad flat head, but SMALL in absolute terms: a real axolotl's head is
  // only ~15% of its total length (40-46mm on a 30cm animal). One low slab
  // with a rounded blunt front cap — a shovel face, not a muzzle.
  const headC = at(0, 12.6, 7.6 * bl + 2.2 * hw)
  const skullHalf = vec3(4.6 * hw, 1.6 * hw, 2 * hw)
  // NB: headC is in grid coords; never pass grid coords back through at().

  const gillStyle = dna.styles.gills ?? "sprightly"
  const fan = dna.styleParams.fan ?? 0.6
  const finStyle = dna.styles.dorsalFin ?? "low"
  const ridge = dna.styleParams.ridge ?? 0.6

  // Gill fronds: three near-vertical stalks fanning from the head's mid-side,
  // each with small perpendicular nubs so the cluster reads feathery rather
  // than as rigid antennae bars. Stalks are anchored at the skull edge with a
  // lateral out-thrust so voxel claiming leaves them frond-colored.
  const gillBaseY = headC.y + 0.9 * hw
  function gillFronds(side: number): { sdf: Sdf; base: Vec3 } {
    const base = vec3(headC.x + side * 4.2 * hw, gillBaseY, headC.z - 0.8 * hw)
    const stalks: Sdf[] = []
    const dirs = [
      [1.2, 3.4, -0.4],
      [3, 2.2, -0.9],
      [2.6, 0.2, -2.2],
    ] as const
    // fan (sprightly) widens the whole fan; drooping tips it below horizontal.
    const spread = 0.7 + 0.6 * fan
    for (const [dx, dy, dz] of dirs) {
      const tip = vec3(
        base.x + side * dx * spread * gl,
        base.y +
          (gillStyle === "drooping" ? dy * spread - 1.6 : dy * spread) * gl,
        base.z + dz * gl,
      )
      stalks.push(sdCapsule(base, tip, 0.9))
      for (const t of [0.3, 0.6, 0.85]) {
        const px = base.x + side * dx * spread * gl * t
        const py = base.y + (tip.y - base.y) * t
        const pz = base.z + dz * gl * t
        stalks.push(
          sdCapsule(
            vec3(px, py, pz),
            vec3(px + side * 2.2, py + 0.7, pz - 0.4),
            0.65,
          ),
        )
      }
    }
    return { sdf: stalks.reduce((acc, s) => union(acc, s)), base }
  }
  const gillL = gillFronds(-1)
  const gillR = gillFronds(1)

  // -- Part fields (paint order: earlier parts claim overlapping voxels; put
  // bulk volumes first and outer details after) -----------------------------
  const fields: PartField[] = []

  // Surface zones: chest capsule bottom to rear capsule top, both taken from
  // the geometry so a stage or girth shift carries the bands with the body.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: chestA.y - 4.7 * bg,
    torsoTop: rearB.y + 4.2 * bg,
    sockTop: footY,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // Neck paints FIRST: it is a short thick capsule buried inside the chest
  // silhouette (axolotls are neckless), so the body and head claim its
  // surface anyway. Painting first guarantees the part is never empty while
  // staying visually seamless — neck and body share the main color.
  fields.push({ name: "neck", sdf: sdCapsule(neckA, neckB, 3.4 * bg) })

  // Long low body — two blended capsules, chest slightly plumper than rump.
  const bodyField: Sdf = smoothUnion(
    sdCapsule(chestA, chestB, 4.7 * bg),
    sdCapsule(rearA, rearB, 4.2 * bg),
    5,
  )
  fields.push({ name: "body", sdf: bodyField, classify: classifyTorso })

  fields.push({
    name: "tail",
    sdf: union(
      sdCapsule(tailBase, tailMid, 2.8 * bg),
      sdCapsule(tailMid, tailEnd, 1.4),
    ),
  })

  // Fin tail: a thin vertical membrane wrapping the tail's back half — the
  // paddle silhouette. Painted AFTER the tail so the tail core stays
  // main-colored and the membrane shows as its protruding edges. The plate
  // must stand clearly taller than the tail segment or the tail claims it.
  // tailBase/tailEnd are grid coords; center the plate between them directly.
  const tailFinField: Sdf = (() => {
    const half = Math.abs(tailBase.z - tailEnd.z) / 2 + 1.5
    const bladeH = 5.2 * fh
    // Tapered paddle: three z-steps shrinking toward the tail tip, each
    // plate overlapping the tail axis so it stays connected. The fin grows
    // toward the end like a real axolotl tail fin, not a flat rectangle.
    const pieces: Sdf[] = []
    const tapers = [0.95, 0.65, 0.38]
    for (let i = 0; i < 3; i++) {
      const zHalf = half / 3 + 0.6
      const zCenter = tailBase.z - zHalf - ((2 * (half - zHalf)) / 3) * i
      // Each plate must clear the local tail radius (which thins toward the
      // tip) or the tail claims it whole; clearance scales down along the
      // tail so the plates still taper toward the tip.
      const t = i / 2
      const rLocal = 2.8 * bg * (1 - t) + 1.4 * t
      const yHalf = Math.max(
        ((tapers[i] ?? 0.95) * bladeH) / 2 + 1,
        (rLocal + 2.8) / 2,
      )
      pieces.push(
        sdBox(vec3(O, 9.4 + yHalf - 1.6, zCenter), vec3(0.8, yHalf, zHalf)),
      )
    }
    // Ventral fin: a shorter downward membrane under the tail (Britannica:
    // "a lower fin extends..."). Must dip below the fattest tail segment or
    // the tail claims it whole.
    const ventYHalf = 1.6 + 1.2 * fh
    pieces.push(
      sdBox(
        vec3(O, 9.4 - ventYHalf + 0.8, (tailBase.z + tailEnd.z) / 2),
        vec3(0.8, ventYHalf, half * 0.55),
      ),
    )
    return pieces.reduce((acc, s) => union(acc, s))
  })()
  fields.push({ name: "tailFin", sdf: tailFinField })

  // Dorsal fin: a thin ridge plate along the spine. Its base sits well inside
  // the body and its top always clears the tallest possible back line
  // (clearY), so every style protrudes for every seed. Real axolotls carry a
  // continuous fin from behind the head to the tail tip, so the span reaches
  // forward past the shoulders and heights GROW toward the tail to meet the
  // tail fin — a finfold, not a dimetrodon's sail.
  const finBaseY = 11.5
  const clearY = 16.6
  const extra =
    finStyle === "sail"
      ? 1.3 * fh
      : finStyle === "ridged"
        ? 1.0 * fh * ridge
        : 0.5 * fh
  const finTopY = clearY + extra
  const finPieces: Sdf[] =
    finStyle === "ridged"
      ? [4.4, 1.2, -2, -5.2, -8].map((z, i) => {
          const grow = 0.5 + (i / 4) * 0.5
          const top =
            i % 2 === 0
              ? finBaseY + grow * (finTopY - finBaseY)
              : finBaseY + (grow - 0.18) * (finTopY - finBaseY)
          return sdBox(
            at(0, (finBaseY + top) / 2, z * bl),
            vec3(0.7, (top - finBaseY) / 2, 1.6),
          )
        })
      : finStyle === "sail"
        ? // Crescendo crest: low behind the head, swelling toward the rump
          // so it flows into the tail fin for one continuous ridge.
          [
            { z: 3.5, t: 0.45 },
            { z: 0.4, t: 0.6 },
            { z: -2.8, t: 0.78 },
            { z: -6, t: 1 },
          ].map(({ z, t }) => {
            const top = finBaseY + t * (finTopY - finBaseY)
            return sdBox(
              at(0, (finBaseY + top) / 2, z * bl),
              vec3(0.7, (top - finBaseY) / 2, 3 * bl),
            )
          })
        : [
            sdBox(
              at(0, (finBaseY + finTopY) / 2, -0.5 * bl),
              vec3(0.7, (finTopY - finBaseY) / 2, 8 * bl),
            ),
          ]
  fields.push({
    name: "dorsalFin",
    sdf: finPieces.reduce((acc, s) => union(acc, s)),
  })

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
    const foot = at(leg.sx * 8.2 * bg, footY, legZ + leg.sz * 0.4)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Sprawling salamander stance: short limbs kicked out diagonally with a
    // rounded foot pad — low to the ground, not pillar-straight. The shin
    // capsule's end-cap (radius 1.5bg ≤ foot sphere 1.9) stays inside the
    // foot sphere, and both clear the y=0 floor at the lowest voxel row
    // (footY 2.5 − 1.9 = 0.6 > 0.5).
    const legField: Sdf = union(
      union(sdSphere(hip, 2.3 * bg), sdCapsule(hip, foot, 1.5 * bg)),
      sdSphere(foot, 1.9),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry: the face needs the coat colour and the
  // head's palette is built from it.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = axolotlTemplate.palette.valueJitter
  const hue = gilded ? 45 : axolotlTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.6
  // Juveniles read a touch brighter and more saturated — same hue family,
  // same seed jitter, just a maturing coat (see stage.ts).
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
  // Coral gill fronds — the species' signature flush, cosmetic only.
  const coral: [number, number, number] = gilded
    ? [0.95, 0.75, 0.4]
    : [0.88, 0.48, 0.5]

  // Head paints after the legs so it claims its own silhouette wherever it
  // protrudes past the body front; the neck is already painted (first).
  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    // Rounded nose cap so the slab ends bluntly instead of in a muzzle box.
    sdSphere(vec3(headC.x, headC.y, headC.z + 1.8 * hw), 1.8 * hw),
  )
  const face = faceParts(
    facePlan("axolotl", { center: headC, half: skullHalf }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })
  fields.push(...face.fields)

  // Gill fronds paint after the head, so only the voxels protruding past the
  // skull stay frond-colored — the anchor points merge into the skull.
  fields.push({ name: "gillLeft", sdf: gillL.sdf })
  fields.push({ name: "gillRight", sdf: gillR.sdf })

  // Juvenile signature: the external gills branch outward — a second,
  // smaller frill set hangs below the primary fan. Same seed-derived fan
  // and coral family; the primary fronds are the identity layer and stay
  // untouched. Painted after the primary gills so the branch tips claim
  // their own voxels.
  if (stage === "juvenile" || stage === "champion") {
    for (const side of [-1, 1]) {
      const base = vec3(
        headC.x + side * 3.4 * hw,
        gillBaseY - 1.1 * hw,
        headC.z + 0.4 * hw,
      )
      const branches: Sdf[] = []
      for (const [dx, dy, dz] of [
        [1.6, -1.4, -0.6],
        [2.8, -0.6, -1.4],
      ] as const) {
        const tip = vec3(
          base.x + side * dx * gl,
          base.y + dy * gl,
          base.z + dz * gl,
        )
        branches.push(sdCapsule(base, tip, 0.75))
        branches.push(sdSphere(tip, 0.7))
      }
      const sdf = branches.reduce((acc, s) => union(acc, s))
      fields.push({ name: side < 0 ? "gillFrillLeft" : "gillFrillRight", sdf })
    }
  }

  // Champion signature: a grand third frill tier sweeping above the primary
  // fan, plus a grand fin membrane crowning the tail tip — the full regalia
  // of a record axolotl. Painted after the primary gills and juvenile
  // frills so the grand tips claim their own voxels.
  if (stage === "champion") {
    for (const side of [-1, 1]) {
      const base = vec3(
        headC.x + side * 4.4 * hw,
        gillBaseY + 0.5 * hw,
        headC.z - 0.6 * hw,
      )
      const branches: Sdf[] = []
      for (const [dx, dy, dz] of [
        [2.4, 3.4, -0.5],
        [4, 2, -1.2],
      ] as const) {
        const tip = vec3(
          base.x + side * dx * gl * 1.15,
          base.y + dy * gl * 1.15,
          base.z + dz * gl,
        )
        branches.push(sdCapsule(base, tip, 0.85))
        branches.push(sdSphere(tip, 0.8))
      }
      const sdf = branches.reduce((acc, s) => union(acc, s))
      fields.push({
        name: side < 0 ? "grandFrillLeft" : "grandFrillRight",
        sdf,
      })
    }
    // Grand fin: a tall membrane past the tail tip, extending the paddle.
    // Centered on the tail axis, rising well clear of the tip so it reads
    // as a grand fan from broadcast distance.
    const grandYHalf = 2.8 + 1.6 * fh
    fields.push({
      name: "grandFin",
      sdf: sdBox(vec3(O, 9.4, tailEnd.z - 2), vec3(0.8, grandYHalf, 1.8)),
    })
  }
  if (gillStyle === "crown") {
    fields.push({
      name: "gillCrown",
      sdf: union(
        sdCapsule(
          vec3(headC.x, gillBaseY, headC.z - 0.8 * hw),
          vec3(headC.x, gillBaseY + 4 * gl, headC.z - 2.2 * hw),
          1.2,
        ),
        sdCapsule(
          vec3(headC.x, gillBaseY, headC.z - 0.8 * hw),
          vec3(headC.x, gillBaseY + 2.6 * gl, headC.z - 3.2 * hw),
          1,
        ),
      ),
    })
  }

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // Body pivot at the hip line so breathe squash keeps leg junctions fixed.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailFin: [tailMid.x, tailMid.y, tailMid.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    gillLeft: [gillL.base.x, gillL.base.y, gillL.base.z],
    gillRight: [gillR.base.x, gillR.base.y, gillR.base.z],
    dorsalFin: [O, finBaseY, O - 0.5 * bl],
  }
  if (gillStyle === "crown") {
    pivots.gillCrown = [headC.x, gillBaseY, headC.z - 0.8 * hw]
  }
  if (stage === "juvenile" || stage === "champion") {
    pivots.gillFrillLeft = [
      headC.x - 3.4 * hw,
      gillBaseY - 1.1 * hw,
      headC.z + 0.4 * hw,
    ]
    pivots.gillFrillRight = [
      headC.x + 3.4 * hw,
      gillBaseY - 1.1 * hw,
      headC.z + 0.4 * hw,
    ]
  }
  if (stage === "champion") {
    pivots.grandFrillLeft = [
      headC.x - 4.4 * hw,
      gillBaseY + 0.5 * hw,
      headC.z - 0.6 * hw,
    ]
    pivots.grandFrillRight = [
      headC.x + 4.4 * hw,
      gillBaseY + 0.5 * hw,
      headC.z - 0.6 * hw,
    ]
    pivots.grandFin = [O, 9.4, tailEnd.z - 2]
  }

  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    tailFin: dark,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
    gillLeft: coral,
    gillRight: coral,
    dorsalFin: dark,
  }
  if (gillStyle === "crown") {
    colors.gillCrown = coral
  }
  if (stage === "juvenile" || stage === "champion") {
    colors.gillFrillLeft = coral
    colors.gillFrillRight = coral
  }
  if (stage === "champion") {
    colors.grandFrillLeft = coral
    colors.grandFrillRight = coral
    // Coral, not dark: the grand fin is the champion's accent flag, and a
    // dark fin vanishes against the broadcast backdrop.
    colors.grandFin = coral
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
      tail: "body",
      tailFin: "tail",
      neck: "body",
      head: "neck",
      gillLeft: "head",
      gillRight: "head",
      dorsalFin: "body",
      legFL: "body",
      legFR: "body",
      legBL: "body",
      legBR: "body",
      ...(gillStyle === "crown" ? { gillCrown: "head" } : {}),
      ...(stage === "juvenile" || stage === "champion"
        ? { gillFrillLeft: "head", gillFrillRight: "head" }
        : {}),
      ...face.parents,
      ...(stage === "champion"
        ? {
            grandFrillLeft: "head",
            grandFrillRight: "head",
            grandFin: "tail",
          }
        : {}),
    },
  }
}
