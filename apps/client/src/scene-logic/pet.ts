/**
 * Scene logic - the ambient pet reaction: mood-aware variant picker, the
 * reaction machine with its spam cooldown, and the tap-vs-drag rule. Split
 * out of scene-logic.ts (ranch_decomposition); behavior unchanged.
 */
// ---------------------------------------------------------------------------
// Pet reaction (ranch_rituals_20261018 FR6) — a free, purely visual response
// to tapping the creature. The picker maps mood bands to a reaction variant;
// the machine plays a short reaction and enforces a cooldown so petting stays
// a small delight rather than a spammy trigger. No sim state is touched.
// ---------------------------------------------------------------------------

export type PetVariant = "hop" | "wiggle" | "lean" | "stir"

export type PetPhase = "idle" | "react"

export interface PetDrive {
  phase: PetPhase
  /** Which reaction is (or was last) playing. */
  variant: PetVariant
  /** Reaction arc 0..1 (eases in and out over the reaction's duration). */
  react: number
  /** True while a reduced-motion (subtle) reaction plays. */
  subtle: boolean
  active: boolean
}

/** Reaction length per variant, in seconds. */
const PET_REACT_TIME: Record<PetVariant, number> = {
  hop: 0.9,
  wiggle: 1.2,
  lean: 1.0,
  stir: 0.7,
}
const PET_REACT_TIME_REDUCED = 0.6
/** Quiet window after a reaction before the next pet is accepted. */
const PET_COOLDOWN = 1.6

/**
 * Map mood/condition to a pet reaction variant. Mood bands choose the energy
 * of the response (happy hop, content wiggle, low-energy lean); a sick
 * creature always gives the weak "stir" override, never a perky reaction.
 */
export function pickPetReaction(mood: number, sick: boolean): PetVariant {
  if (sick) return "stir"
  if (mood >= 80) return "hop"
  if (mood >= 50) return "wiggle"
  return "lean"
}

export interface PetMachine {
  /** Start a reaction. Rejected while reacting or cooling down. */
  begin(variant: PetVariant, reducedMotion: boolean): boolean
  advance(dt: number): PetDrive
}

export function createPetMachine(): PetMachine {
  let phase: PetPhase = "idle"
  let variant: PetVariant = "wiggle"
  let subtle = false
  let elapsed = 0
  let duration = 0
  let cooldown = 0

  const begin = (next: PetVariant, reducedMotion: boolean): boolean => {
    if (phase !== "idle" || cooldown > 0) return false
    phase = "react"
    variant = next
    subtle = reducedMotion
    elapsed = 0
    duration = reducedMotion ? PET_REACT_TIME_REDUCED : PET_REACT_TIME[next]
    return true
  }

  const advance = (rawDt: number): PetDrive => {
    const dt = Math.min(Math.max(rawDt, 0), 0.1)
    if (phase === "react") {
      elapsed += dt
      if (elapsed >= duration) {
        phase = "idle"
        cooldown = PET_COOLDOWN
        return { phase: "idle", variant, react: 0, subtle, active: false }
      }
      const k = elapsed / duration
      const react = Math.sin(k * Math.PI)
      return {
        phase: "react",
        variant,
        react: subtle ? react * 0.35 : react,
        subtle,
        active: true,
      }
    }
    cooldown = Math.max(0, cooldown - dt)
    return { phase: "idle", variant, react: 0, subtle, active: false }
  }

  return { begin, advance }
}

/** Pointer travel (CSS px) still treated as a tap rather than a drag. Kept
 * below the orbit's smallest useful drag so a tap never nudges the camera. */
const TAP_SLOP_PX = 8
/** Longest press that still reads as a tap; a held press is not a pet. */
const TAP_MAX_MS = 500

/**
 * Click-vs-drag discriminator for the pet raycast (ranch_rituals_20261018
 * FR6). True when a press both stayed within {@link TAP_SLOP_PX} of where it
 * started and released within {@link TAP_MAX_MS}. Pure so the gesture rule is
 * tested without a DOM; the scene passes pointer samples straight in.
 */
export function isTap(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  elapsedMs: number,
): boolean {
  if (elapsedMs < 0 || elapsedMs > TAP_MAX_MS) return false
  return Math.hypot(endX - startX, endY - startY) <= TAP_SLOP_PX
}
