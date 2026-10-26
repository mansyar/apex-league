/**
 * Shared face kit: one plan per archetype, one builder for every species.
 *
 * The face is deliberately not part of the head SDF. Eyes are separate parts so
 * a blink can scale them around their own pivot with no second pipeline change,
 * and so pupil/catchlight voxels ride along with the eye instead of being
 * repainted every frame.
 *
 * What the head keeps: a socket dish carved by `smoothSubtract` around each eye,
 * and a classifier that paints the mouth line and nostril cells dark. The mouth
 * and nostrils are painted rather than carved: at 56³ a groove deep enough to
 * read is a hole the width of the muzzle.
 */
import { type Sdf, sdBox, sdEllipsoid, union, type Vec3, vec3 } from "./sdf"
import type { Palette } from "./vertex-color"
import type { PartField } from "./voxelizer"

/** Surface classes inside one eye part. Ids are local to the eye palette. */
export const EYE_CLASS = {
  pupil: 0,
  catchlight: 1,
} as const

/** Surface classes inside the head part. Ids are local to the skin palette. */
export const SKIN_CLASS = {
  coat: 0,
  dark: 1,
} as const

const PUPIL: readonly [number, number, number] = [0.09, 0.07, 0.08]
/** One cell lifts a step above the pupil, not a colour. At two voxels across the
 * highlight is a quarter of the eye, so anything brighter reads as a second
 * block stuck on the bead rather than a glint. */
const CATCHLIGHT: readonly [number, number, number] = [0.17, 0.13, 0.1]

const EYE_PALETTE: Palette = [PUPIL, CATCHLIGHT]

/**
 * How far past the recess wall a voxel still counts as "in shadow". Keep this
 * under a voxel: a wider band turns a mouth line into a painted muzzle.
 */
const DARK_BAND = 0.45

/** Skull volume the face is laid out on, in grid space. */
export interface HeadShape {
  center: Vec3
  half: Vec3
  /** Muzzle box, when the species has one separate from the skull. */
  snout?: { center: Vec3; half: Vec3 }
}

export interface EyePlan {
  center: Vec3
  /**
   * Ellipsoid radii: x protrudes out of the head, y is height and z is width,
   * so the eye reads on a side-facing socket without rotating the field.
   */
  radii: Vec3
  /** -1 faces -x (the creature's left), +1 faces +x. */
  side: -1 | 1
}

export interface BrowPlan {
  center: Vec3
  half: Vec3
  side: -1 | 1
}

export interface FacePlan {
  eyes: [EyePlan, EyePlan]
  /** Heavy eye ridges. Only species whose silhouette reads with a brow. */
  brows?: [BrowPlan, BrowPlan]
  mouth: { center: Vec3; half: Vec3 }
  /** Nostrils are single painted cells, not carved pits. */
  nostrils: Vec3[]
}

const eye = (
  head: HeadShape,
  side: -1 | 1,
  y: number,
  z: number,
  radii: Vec3,
): EyePlan => {
  // Seat the eye on the skull's outward voxel column. Samples sit at x + 0.5, so
  // that column is the first centre inside the skull; an eye centred on the
  // skull's mathematical surface instead falls between two samples, and with a
  // sub-voxel radius it captures nothing at all.
  const surface =
    side < 0
      ? Math.ceil(head.center.x - head.half.x - 0.5) + 0.5
      : Math.floor(head.center.x + head.half.x - 0.5) + 0.5
  return {
    // y and z snap to a cell corner, so a sub-voxel radius covers all four
    // neighbouring cells instead of one.
    center: vec3(surface, snap(y), snap(z)),
    radii,
    side,
  }
}

/**
 * Half-integer snap. The voxelizer samples cell centres, so an eye centred
 * between four cells captures all four at half a voxel each, while an eye
 * centred on a cell captures only that one until its radius passes a whole
 * voxel. Snapping to the cell corner is what makes a small radius a two-by-two
 * patch instead of a single dot.
 */
const snap = (v: number): number => Math.round(v)

/** The centre of the voxel cell that contains `v`. */
const cell = (v: number): number => Math.floor(v) + 0.5

/**
 * A painted jaw line: one cell row on the muzzle's front face.
 *
 * The mouth is deliberately *not* carved. At this resolution a subtract deep
 * enough to show as a groove is a hole the width of the snout -- the drake read
 * as an open beak with a brown slab above it -- so the line is painted by the
 * head classifier and the skull keeps its surface.
 */
const mouthLine = (
  muzzle: { center: Vec3; half: Vec3 },
  y: number,
  halfX: number,
): { center: Vec3; half: Vec3 } => ({
  // Half a cell past an integer is a cell centre, which makes the dark band
  // exactly one row tall at every resolution.
  center: vec3(
    muzzle.center.x,
    Math.floor(y) + 0.5,
    muzzle.center.z + muzzle.half.z,
  ),
  half: vec3(halfX, 0.2, 0.6),
})

/**
 * Per-archetype face layout, derived from the skull so it follows the head
 * through every stage.
 */
export function facePlan(archetype: string, head: HeadShape): FacePlan {
  const { center, half } = head
  const snout = head.snout
  // A beady eye: one dark block with a bright corner, two voxels across. That is
  // as small as a surfaced eye gets -- a radius under half a voxel catches no
  // cell centre at all, and the patch stops growing at 0.65 because the sampler
  // only has cell centres to offer. It is also the size the spec asks for:
  // roughly a third of the skull, where the three-class eye needed half the head
  // to hold a rim around its pupil.
  const eyeHeight = EYE_RADIUS
  const radii = vec3(eyeHeight * 0.55, eyeHeight, eyeHeight)

  if (archetype === "bovine") {
    // Wide-set and round, set back from the muzzle on the corners of a broad
    // bovine skull.
    const eyeY = center.y + half.y * 0.4
    const eyeZ = center.z - half.z * 0.1
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.5,
        muzzle.half.x * 0.72,
      ),
      // Low on the muzzle, one row above the mouth. Set at mid-height they sit
      // level with the eyes on the skull's sides and read as a second pair.
      nostrils: [
        vec3(
          cell(center.x + muzzle.half.x * 0.55),
          cell(muzzle.center.y),
          cell(muzzle.center.z + muzzle.half.z * 0.95),
        ),
        vec3(
          cell(center.x - muzzle.half.x * 0.55),
          cell(muzzle.center.y),
          cell(muzzle.center.z + muzzle.half.z * 0.95),
        ),
      ],
    }
  }

  if (archetype === "axolotl") {
    // Large and round on a flat salamander head; the wide smile is the whole
    // expression, and there are no nostrils to carve.
    const eyeY = center.y + half.y * 0.2
    const eyeZ = center.z + half.z * 0.25
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        { center, half },
        center.y - half.y * 0.62,
        half.x * 0.5,
      ),
      nostrils: [],
    }
  }

  if (archetype === "storm_hound") {
    // Alert canine eyes: set high and forward on the skull but not under a
    // heavy ridge — the hound's expression is keen, not armored. The long
    // narrow muzzle carries the mouth line on its own; at two to four cells
    // across there is no room for a nostril pair (see the drake note below).
    const eyeY = center.y + half.y * 0.35
    const eyeZ = center.z + half.z * 0.4
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.55,
        muzzle.half.x * 0.72,
      ),
      nostrils: [],
    }
  }

  if (archetype === "tortoise") {
    // Small wide-set eyes on a blunt armored skull, mid-height so they read
    // under the dome's shadow line rather than as a brow ridge. The short
    // beak jaw carries the mouth line; the snout is too narrow for a
    // nostril pair (see the drake note below).
    const eyeY = center.y + half.y * 0.25
    const eyeZ = center.z + half.z * 0.3
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.55,
        muzzle.half.x * 0.72,
      ),
      nostrils: [],
    }
  }

  if (archetype === "falcon") {
    // Raptor eyes: large, set high and far forward on the skull so the
    // stare reads over the beak root. The beak is its own bone part, so the
    // mouth line stays a faint crease low on the skull where the beak
    // meets it; no nostril pair on a beak this small.
    const eyeY = center.y + half.y * 0.35
    const eyeZ = center.z + half.z * 0.35
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.62,
        muzzle.half.x * 0.5,
      ),
      nostrils: [],
    }
  }

  if (archetype === "frond") {
    // Gentle herbivore eyes: large, set high and wide on the skull but well
    // back from the short muzzle — the deer reads alert, not keen. The
    // short muzzle carries the mouth line on its own; at three cells across
    // there is no room for a nostril pair (see the drake note below).
    const eyeY = center.y + half.y * 0.45
    const eyeZ = center.z + half.z * 0.05
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.55,
        muzzle.half.x * 0.72,
      ),
      nostrils: [],
    }
  }

  if (archetype === "crab") {
    // Bead eyes set high and wide on the head wedge, well above the mouth
    // line so they read over the carapace's brow. The mouth is a crease low
    // on the wedge; no nostrils on a crustacean face.
    const eyeY = center.y + half.y * 0.4
    const eyeZ = center.z + half.z * 0.25
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.6,
        muzzle.half.x * 0.55,
      ),
      nostrils: [],
    }
  }

  if (archetype === "smolder") {
    // Ram eyes: wide-set and mid-high on a heavy skull, set back from the
    // broad grazing muzzle. That muzzle IS broad enough for a nostril pair,
    // so the smolder paints one like the ox.
    const eyeY = center.y + half.y * 0.4
    const eyeZ = center.z - half.z * 0.1
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.5,
        muzzle.half.x * 0.72,
      ),
      nostrils: [
        vec3(
          cell(center.x + muzzle.half.x * 0.55),
          cell(muzzle.center.y),
          cell(muzzle.center.z + muzzle.half.z * 0.95),
        ),
        vec3(
          cell(center.x - muzzle.half.x * 0.55),
          cell(muzzle.center.y),
          cell(muzzle.center.z + muzzle.half.z * 0.95),
        ),
      ],
    }
  }

  if (archetype === "fox") {
    // Keen fox eyes: set high and forward on a narrower skull than the
    // hound's, reading alert over the pointed muzzle. The tapered snout is
    // too narrow for a nostril pair, so the mouth line carries it alone.
    const eyeY = center.y + half.y * 0.4
    const eyeZ = center.z + half.z * 0.35
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.55,
        muzzle.half.x * 0.72,
      ),
      nostrils: [],
    }
  }

  if (archetype === "heron") {
    // Wader eyes: large, set high and far forward on the small skull so the
    // stare reads over the spear-beak root. The beak is its own bone part,
    // so the mouth line stays a faint crease low on the skull where the beak
    // meets it; no nostril pair on a beak this thin.
    const eyeY = center.y + half.y * 0.35
    const eyeZ = center.z + half.z * 0.35
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.62,
        muzzle.half.x * 0.5,
      ),
      nostrils: [],
    }
  }

  if (archetype === "mole") {
    // Digger eyes: small and low on a blunt armored skull, set forward over
    // the digging snout. The pointed nose carries the mouth line; the snout
    // is too narrow for a nostril pair.
    const eyeY = center.y + half.y * 0.2
    const eyeZ = center.z + half.z * 0.35
    const muzzle = snout ?? { center, half }
    return {
      eyes: [eye(head, -1, eyeY, eyeZ, radii), eye(head, 1, eyeY, eyeZ, radii)],
      mouth: mouthLine(
        muzzle,
        muzzle.center.y - muzzle.half.y * 0.55,
        muzzle.half.x * 0.72,
      ),
      nostrils: [],
    }
  }

  // Drake (the default silhouette): angled eyes under a heavy brow, a mouth
  // line running the length of the jaw, and a nostril pair on the snout top.
  const eyeY = center.y + half.y * 0.3
  const eyeZ = center.z + half.z * 0.45
  const muzzle = snout ?? { center, half }
  const eyes: [EyePlan, EyePlan] = [
    eye(head, -1, eyeY, eyeZ, radii),
    eye(head, 1, eyeY, eyeZ, radii),
  ]
  // A heavy ridge on the outer-top of each eye, derived from the *snapped* eye
  // centre rather than the skull: a brow has to land on columns and cell corners
  // the sampler can hit, or it voxelizes to nothing at every resolution.
  const ridge = (e: EyePlan): BrowPlan => ({
    center: vec3(e.center.x + e.side * 0.45, e.center.y + 2, e.center.z),
    half: vec3(0.6, 0.62, 0.85),
    side: e.side,
  })
  return {
    eyes,
    brows: [ridge(eyes[0]), ridge(eyes[1])],
    mouth: mouthLine(muzzle, center.y - half.y * 0.55, muzzle.half.x * 0.72),
    // No nostril pair. The drake muzzle is only four cells across, so two dots
    // either sit at eye height (a second pair of eyes) or land on the row above
    // the mouth and merge with it into one dark mask. The mouth line carries the
    // muzzle on its own.
    nostrils: [],
  }
}

/**
 * Eye half-height in voxels. One size for every stage and species.
 *
 * 0.8 is the window a beady eye lives in. Below 0.707 -- the corner distance
 * between four cells -- the ellipsoid misses every cell centre and the eye
 * vanishes; above 1.0 it starts adding a third row. 0.8 covers the corner with
 * margin and still stops at two rows. Stage no longer moves the bead: a
 * three-row baby eye would be half its skull again, which is the look this
 * replaced. The age read comes from the skull, which does change.
 */
const EYE_RADIUS = 0.8

/** Skin palette: the coat, plus a deep shadow for recess walls. */
export function skinPalette(coat: readonly [number, number, number]): Palette {
  const dark: [number, number, number] = [
    coat[0] * 0.25,
    coat[1] * 0.25,
    coat[2] * 0.25,
  ]
  return [coat, dark]
}

function unionAll(fields: Sdf[]): Sdf {
  return fields.reduce<Sdf>(
    (a, b) => union(a, b),
    () => Number.POSITIVE_INFINITY,
  )
}

/** Everything a build needs to attach a face, in one object. */
export interface FaceBake {
  /** Eye (and optional brow) parts, ready to append to the field list. */
  fields: PartField[]
  pivots: Record<string, [number, number, number]>
  parents: Record<string, string>
  colors: Record<string, [number, number, number]>
  palettes: Record<string, Palette>
  /** Volumes to carve out of the head: sockets and nostrils. */
  carve: Sdf
  /**
   * Paint source for the head classifier: the carve volumes plus the mouth. The
   * mouth is in here but not in `carve` -- it is a painted line, not a groove.
   */
  recess: Sdf
  /** Head classifier: recess walls read dark, everything else is coat. */
  skinClass: (p: Vec3) => number
}

function eyeClassifier(center: Vec3): (p: Vec3) => number {
  // One catchlight cell on the upper-forward corner. Picked as a cell, not as a
  // fraction of the radius, because the fraction fails at both sizes: on a
  // two-voxel eye it lands between cell centres and ships no highlight at all,
  // and on the baby's three-row eye it paints a four-voxel quadrant. A beady eye
  // has one highlight whatever its size.
  const lightY = Math.floor(center.y + 0.5)
  const lightZ = Math.floor(center.z + 0.5)
  return (p) => {
    if (Math.floor(p.y) === lightY && Math.floor(p.z) === lightZ) {
      return EYE_CLASS.catchlight
    }
    return EYE_CLASS.pupil
  }
}

/**
 * Builds the face for one skull: eyes (seated in carved sockets), optional
 * brows, and the recess volumes plus classifier the head needs.
 */
export function faceParts(
  plan: FacePlan,
  coat: readonly [number, number, number],
): FaceBake {
  const fields: PartField[] = []
  const pivots: Record<string, [number, number, number]> = {}
  const parents: Record<string, string> = {}
  const colors: Record<string, [number, number, number]> = {}
  const palettes: Record<string, Palette> = {}
  const sockets: Sdf[] = []

  for (const eyePlan of plan.eyes) {
    const side = eyePlan.side
    const center = vec3(eyePlan.center.x, eyePlan.center.y, eyePlan.center.z)
    const radii = vec3(eyePlan.radii.x, eyePlan.radii.y, eyePlan.radii.z)
    const name = side < 0 ? "eyeLeft" : "eyeRight"
    fields.push({
      name,
      sdf: sdEllipsoid(center, radii),
      classify: eyeClassifier(center),
    })
    // Top-centre pivot: a `scale.y` collapse closes the lid downward instead
    // of shrinking the eye into its own middle.
    pivots[name] = [center.x, center.y + radii.y, center.z]
    parents[name] = "head"
    palettes[name] = EYE_PALETTE
    // Base colour for the build contract; the palette wins at export.
    colors[name] = [PUPIL[0], PUPIL[1], PUPIL[2]]
    // The socket is carved wider than the eye, and it is the only thing that
    // seats the eye in the head: the skull claims every voxel inside its own
    // surface, so without the dish the eye is simply swallowed. A dish a little
    // wider than the dot also leaves a ring of shadowed skin at the rim, which
    // is what a beady eye reads against. It carries a voxel-sized floor, because
    // scaling 1.15x off a 0.6 radius would carve nothing at all.
    sockets.push(
      sdEllipsoid(
        vec3(center.x + side * 0.45, center.y, center.z),
        vec3(
          Math.max(0.9, radii.x * 1.45),
          Math.max(1.2, radii.y * 1.15),
          Math.max(1.2, radii.z * 1.15),
        ),
      ),
    )
  }

  for (const brow of plan.brows ?? []) {
    const name = brow.side < 0 ? "browLeft" : "browRight"
    fields.push({ name, sdf: sdBox(brow.center, brow.half) })
    pivots[name] = [brow.center.x, brow.center.y, brow.center.z]
    parents[name] = "head"
    colors[name] = [coat[0], coat[1], coat[2]]
  }

  const mouth = sdBox(plan.mouth.center, plan.mouth.half)
  // Sockets are the only carve. The mouth and nostrils are painted by the
  // classifier: at this resolution a subtract that reads as a groove is a hole
  // the width of the snout, and a nostril pit's dark rim bleeds into its
  // neighbour's until the pair reads as one muzzle-wide bar.
  const carve = unionAll([...sockets])
  const nostrilBoxes = plan.nostrils.map((n) => sdBox(n, vec3(0.5, 0.5, 0.5)))
  const recess = unionAll([carve, mouth, ...nostrilBoxes])

  const skinClass = (p: Vec3): number => {
    if (mouth(p) <= DARK_BAND) return SKIN_CLASS.dark
    for (const n of plan.nostrils) {
      // Exactly one cell each, so two nostrils stay two dots.
      if (
        Math.abs(p.x - n.x) < 0.5 &&
        Math.abs(p.y - n.y) < 0.5 &&
        Math.abs(p.z - n.z) < 0.5
      ) {
        return SKIN_CLASS.dark
      }
    }
    return SKIN_CLASS.coat
  }

  return { fields, pivots, parents, colors, palettes, carve, recess, skinClass }
}
