/**
 * Shared face kit: one plan per archetype, one builder for every species.
 *
 * The face is deliberately not part of the head SDF. Eyes are separate parts so
 * a blink can scale them around their own pivot with no second pipeline change,
 * and so pupil/catchlight voxels ride along with the eye instead of being
 * repainted every frame.
 *
 * What the head keeps: a socket recess and a mouth/nostril groove carved into
 * it by `smoothSubtract`, plus a classifier that paints those recess walls
 * dark. Carving alone would just make a hole in the coat colour.
 */
import {
  type Sdf,
  sdBox,
  sdEllipsoid,
  sdSphere,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import type { Stage } from "./stage"
import type { Palette } from "./vertex-color"
import type { PartField } from "./voxelizer"

/** Surface classes inside one eye part. Ids are local to the eye palette. */
export const EYE_CLASS = {
  sclera: 0,
  pupil: 1,
  catchlight: 2,
} as const

/** Surface classes inside the head part. Ids are local to the skin palette. */
export const SKIN_CLASS = {
  coat: 0,
  dark: 1,
} as const

const SCLERA: readonly [number, number, number] = [0.95, 0.93, 0.86]
const PUPIL: readonly [number, number, number] = [0.07, 0.06, 0.08]
const CATCHLIGHT: readonly [number, number, number] = [1, 1, 1]

const EYE_PALETTE: Palette = [SCLERA, PUPIL, CATCHLIGHT]

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
  /** `slit` is a vertical reptile pupil; `round` is a mammal/amphibian one. */
  pupil: "round" | "slit"
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
  nostrils: Array<{ center: Vec3; radius: number }>
}

const eye = (
  head: HeadShape,
  side: -1 | 1,
  offsetX: number,
  y: number,
  z: number,
  radii: Vec3,
  pupil: "round" | "slit",
): EyePlan => ({
  // offsetX is measured from the skull centre, so a head that sits off the
  // grid origin still gets a mirrored pair.
  center: vec3(head.center.x + side * offsetX, y, z),
  radii,
  side,
  pupil,
})

/**
 * Per-archetype face layout, derived from the skull so it follows the head
 * through every stage. The stage is taken here rather than applied later
 * because the eye size has to stay consistent with the bands its classifier
 * uses: a radius and a band that scale apart stop producing three classes.
 */
export function facePlan(
  archetype: string,
  head: HeadShape,
  stage: Stage = "juvenile",
): FacePlan {
  const { center, half } = head
  const snout = head.snout
  // Spec FR6: the eye radius never drops below 1.8 voxels. That is what makes
  // the pupil/sclera bands land on whole voxel rows — a two-voxel eye is one
  // solid class and reads as a dot. Thin skulls get a bulge (an axolotl's eyes
  // sit on top of its head), not a smaller eye.
  const eyeHeight =
    Math.max(1.8, half.y * 0.5) * eyeScale(stage) * speciesEyeScale(archetype)
  const radii = vec3(eyeHeight * 0.55, eyeHeight, eyeHeight * 0.95)

  if (archetype === "bovine") {
    // Wide-set and round, set back from the muzzle on the corners of a broad
    // bovine skull.
    const eyeY = center.y + half.y * 0.4
    const eyeZ = center.z - half.z * 0.1
    const eyeX = Math.round(half.x)
    const muzzle = snout ?? { center, half }
    return {
      eyes: [
        eye(head, -1, eyeX, eyeY, eyeZ, radii, "round"),
        eye(head, 1, eyeX, eyeY, eyeZ, radii, "round"),
      ],
      mouth: {
        center: vec3(
          center.x,
          muzzle.center.y - muzzle.half.y * 0.45,
          muzzle.center.z + muzzle.half.z * 0.55,
        ),
        half: vec3(
          muzzle.half.x * 0.9,
          muzzle.half.y * 0.11,
          muzzle.half.z * 0.6,
        ),
      },
      nostrils: [
        {
          center: vec3(
            center.x + muzzle.half.x * 0.45,
            muzzle.center.y + muzzle.half.y * 0.35,
            muzzle.center.z + muzzle.half.z * 0.95,
          ),
          radius: Math.max(0.8, half.y * 0.36),
        },
        {
          center: vec3(
            center.x - muzzle.half.x * 0.45,
            muzzle.center.y + muzzle.half.y * 0.35,
            muzzle.center.z + muzzle.half.z * 0.95,
          ),
          radius: Math.max(0.8, half.y * 0.36),
        },
      ],
    }
  }

  if (archetype === "axolotl") {
    // Large and round on a flat salamander head; the wide smile is the whole
    // expression, and there are no nostrils to carve.
    const eyeY = center.y + half.y * 0.2
    const eyeZ = center.z + half.z * 0.25
    const eyeX = Math.round(half.x)
    return {
      eyes: [
        eye(head, -1, eyeX, eyeY, eyeZ, radii, "round"),
        eye(head, 1, eyeX, eyeY, eyeZ, radii, "round"),
      ],
      mouth: {
        center: vec3(
          center.x,
          center.y - half.y * 0.62,
          center.z + half.z * 0.9,
        ),
        half: vec3(half.x * 0.75, half.y * 0.2, half.z * 0.32),
      },
      nostrils: [],
    }
  }

  // Drake (the default silhouette): angled eyes under a heavy brow, a mouth
  // line running the length of the jaw, and a nostril pair on the snout top.
  const eyeY = center.y + half.y * 0.3
  const eyeZ = center.z + half.z * 0.45
  const eyeX = Math.round(half.x)
  const muzzle = snout ?? { center, half }
  return {
    eyes: [
      eye(head, -1, eyeX, eyeY, eyeZ, radii, "slit"),
      eye(head, 1, eyeX, eyeY, eyeZ, radii, "slit"),
    ],
    brows: [
      {
        center: vec3(center.x - (half.x + 0.25), eyeY + eyeHeight * 0.95, eyeZ),
        half: vec3(0.7, 0.45, eyeHeight * 0.55),
        side: -1,
      },
      {
        center: vec3(center.x + (half.x + 0.25), eyeY + eyeHeight * 0.95, eyeZ),
        half: vec3(0.7, 0.45, eyeHeight * 0.55),
        side: 1,
      },
    ],
    mouth: {
      center: vec3(
        center.x,
        center.y - half.y * 0.42,
        muzzle.center.z + muzzle.half.z * 0.45,
      ),
      half: vec3(muzzle.half.x * 1.05, half.y * 0.11, muzzle.half.z * 0.6),
    },
    nostrils: [
      {
        center: vec3(
          center.x + muzzle.half.x * 0.42,
          muzzle.center.y + muzzle.half.y * 0.85,
          muzzle.center.z + muzzle.half.z * 0.72,
        ),
        radius: Math.max(0.7, half.y * 0.3),
      },
      {
        center: vec3(
          center.x - muzzle.half.x * 0.42,
          muzzle.center.y + muzzle.half.y * 0.85,
          muzzle.center.z + muzzle.half.z * 0.72,
        ),
        radius: Math.max(0.7, half.y * 0.3),
      },
    ],
  }
}

/** Eye size per stage: babies read big-eyed, champions are deeper-set. */
export function eyeScale(stage: Stage): number {
  if (stage === "baby") return 1.25
  if (stage === "champion") return 0.9
  return 1
}

/**
 * A thick-skulled species needs a bigger eye for its classes to stand proud of
 * the bone. At the shared size the bovine's champion eye kept only a single
 * sclera voxel and no highlight at all, while the drake and axolotl kept three.
 */
export function speciesEyeScale(archetype: string): number {
  return archetype === "bovine" ? 1.15 : 1
}

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
  /** Volumes to carve out of the head: sockets, mouth, nostrils. */
  recess: Sdf
  /** Head classifier: recess walls read dark, everything else is coat. */
  skinClass: (p: Vec3) => number
}

function eyeClassifier(
  center: Vec3,
  radii: Vec3,
  pupil: "round" | "slit",
): (p: Vec3) => number {
  // A voxel-scale eye straddles the skull surface, so its visible face is the
  // outward column. Classify on height and width only: doing it on depth too
  // would paint that whole face one class, because the face is one voxel deep.
  // Bands carry a floor of just over half a voxel so the narrow slit pupil
  // still claims the centre column, and they stay well inside the eye so the
  // outer rows and columns always fall to sclera: a fixed 0.9-wide pupil
  // covered the whole visible face of a champion eye and shipped as a hole.
  const bandY = Math.min(0.75, radii.y * 0.45)
  const bandZ = Math.min(pupil === "slit" ? 0.55 : 0.9, radii.z * 0.5)
  return (p) => {
    const dy = p.y - center.y
    const dz = p.z - center.z
    // One highlight on the upper-forward corner. The band is loose enough that
    // a small eye still owns a whole voxel there: at the tighter 0.3/0.25 the
    // axolotl's eye fell between cell centres and shipped with no highlight.
    if (dy > radii.y * 0.18 && dz > radii.z * 0.15) return EYE_CLASS.catchlight
    if (Math.abs(dy) <= bandY && Math.abs(dz) <= bandZ) return EYE_CLASS.pupil
    return EYE_CLASS.sclera
  }
}

/**
 * Builds the face for one stage: eyes (scaled and set by stage), optional
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
      classify: eyeClassifier(center, radii, eyePlan.pupil),
    })
    // Top-centre pivot: a `scale.y` collapse closes the lid downward instead
    // of shrinking the eye into its own middle.
    pivots[name] = [center.x, center.y + radii.y, center.z]
    parents[name] = "head"
    palettes[name] = EYE_PALETTE
    // Base colour for the build contract; the palette wins at export.
    colors[name] = [SCLERA[0], SCLERA[1], SCLERA[2]]
    // A shallow dish, pushed a little outboard: it seats the eye in a socket
    // without drilling a hole through a thin skull like the axolotl's.
    sockets.push(
      sdEllipsoid(
        vec3(center.x + side * 0.2, center.y, center.z),
        vec3(radii.x, radii.y * 0.75, radii.z * 0.75),
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
  const nostrils = plan.nostrils.map((n) => sdSphere(n.center, n.radius))
  const recess = unionAll([...sockets, mouth, ...nostrils])

  const skinClass = (p: Vec3): number => {
    if (mouth(p) <= DARK_BAND) return SKIN_CLASS.dark
    for (const nostril of nostrils) {
      if (nostril(p) <= DARK_BAND) return SKIN_CLASS.dark
    }
    return SKIN_CLASS.coat
  }

  return { fields, pivots, parents, colors, palettes, recess, skinClass }
}
