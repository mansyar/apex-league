import type { CreatureConditions } from "@apex/sim"
import type { Stage } from "@apex/voxel"
import type * as THREE from "three"
import type { FaceEyes } from "../face-motion"
import {
  createEvolutionCeremony,
  createMorningAfterCeremony,
  createPetMachine,
  createPlayCeremony,
  createRestCeremony,
  createTreatCeremony,
  createWalk,
  type EvolutionMachine,
  type MorningAfterClass,
  type MorningAfterMachine,
  type MorningAfterTintState,
  type PetMachine,
  type PlayDrive,
  type PlayMachine,
  type RestMachine,
  type TreatMachine,
  type WalkMachine,
  type WanderMachine,
} from "../scene-logic"
import type { SparkleBurst } from "./effects"
import type { MoodMode } from "./mood"
import type { RanchMotionDeps, Swayer } from "./types"

/** Rig part refs cached at rebuild time (avoids per-frame lookups). */
export interface RigParts {
  body?: THREE.Object3D
  head?: THREE.Object3D
  tail?: THREE.Object3D
  tailTip?: THREE.Object3D
  eyes: FaceEyes
}

/**
 * The ranch creature's whole performing state. It is one mutable object
 * instead of a closure so the frame loop, the pose writers, and the
 * ceremony starters can each own a file and still share the same
 * machines (ranch_decomposition_20261018).
 */
export interface RanchState {
  readonly deps: RanchMotionDeps
  reducedMotion: boolean
  creatureGroup: THREE.Group | null
  rigParts: RigParts
  /** Face idle seed — the creature's seed, so a blink survives a rebuild. */
  faceSeed: number
  currentStage: Stage
  /** Stays in the head's LOCAL units — the pose writers write it back in
   * the same space (the rig runs in grid units). */
  headBaseY: number
  mode: MoodMode
  lastConditions: CreatureConditions | null
  droopyUntil: number
  walk: WalkMachine
  /** One wanderer per scene lifetime (FR3). */
  wander: WanderMachine | null
  wanderSeed: number
  wanderCandidates: { x: number; z: number }[]
  evolution: EvolutionMachine
  /** The rebuild the ceremony's swap frame should perform. */
  evolutionSwap: {
    archetypeId: string
    seed: number
    stage: Stage
    branch: string | null
  } | null
  /** Invoked once when the ceremony settles; null when nobody is waiting. */
  evolutionDone: (() => void) | null
  /** True while the machine owns the creature — the settle edge ends it. */
  evolutionActive: boolean
  rest: RestMachine
  /** Whether the rest machine currently owns the creature (drives the
   * deep-sleep breathing override; cleared by preemption or settle). */
  restActive: boolean
  treat: TreatMachine
  treatActive: boolean
  sparkle: SparkleBurst | null
  /** Standing spot near the pile, on the creature→pile line, chosen at
   * start by startFeed. */
  standX: number
  standZ: number
  windProps: Swayer[]
  windSalt: number
  play: PlayMachine
  playActive: boolean
  playHome: { x: number; z: number }
  playLanding: { x: number; z: number }
  prevPlayPhase: PlayDrive["phase"]
  prevWalkMoving: boolean
  playSeedCounter: number
  ball: THREE.Mesh | null
  petMachine: PetMachine
  /** Reaction-local clock, for the oscillating variants (wiggle, stir). */
  petTime: number
  // -- The morning-after ritual (postcup_morning_after FR-2/FR-3 -----------
  /** The arrival ceremony's machine (client-held; never persisted). */
  morningAfter: MorningAfterMachine
  /** True while the ceremony machine owns the creature. */
  morningAfterActive: boolean
  /** The class the running ceremony plays (latched at begin). */
  morningAfterClass: MorningAfterClass
  /** The day-long idle tint's latch — set on the ceremony's settle edge,
   * cleared by the night settle (FR-3). */
  morningAfterTint: MorningAfterTintState
  /** True from the ceremony's begin until the first accepted pet or the
   * night settle — the window in which the class conditions the pet's
   * reaction variant (FR-5). */
  morningAfterPetPending: boolean
  /** The archetype of the current rig — the pose choreography's key. */
  archetypeId: string
  /** The sim day driving the tint's retire check, latched each update. */
  day: number
}

export function createRanchState(deps: RanchMotionDeps): RanchState {
  const machine = createMorningAfterCeremony()
  const s: RanchState = {
    deps,
    reducedMotion: false,
    creatureGroup: null,
    rigParts: { eyes: {} },
    faceSeed: 0,
    currentStage: "baby",
    headBaseY: 0,
    mode: "normal",
    lastConditions: null,
    droopyUntil: 0,
    walk: createWalk(false),
    wander: null,
    wanderSeed: 0,
    wanderCandidates: [],
    evolution: createEvolutionCeremony(),
    evolutionSwap: null,
    evolutionDone: null,
    evolutionActive: false,
    rest: createRestCeremony(),
    restActive: false,
    treat: createTreatCeremony(),
    treatActive: false,
    sparkle: null,
    standX: 0,
    standZ: 0,
    windProps: [],
    windSalt: 0,
    play: createPlayCeremony(),
    playActive: false,
    playHome: { x: 0, z: 0 },
    playLanding: { x: 0, z: 0 },
    prevPlayPhase: "idle",
    prevWalkMoving: false,
    playSeedCounter: 0,
    ball: null,
    petMachine: createPetMachine(),
    petTime: 0,
    morningAfter: machine,
    morningAfterActive: false,
    morningAfterClass: "exit",
    morningAfterTint: { active: false, day: null, strut: 0, droop: 0 },
    morningAfterPetPending: false,
    archetypeId: "",
    day: 0,
  }
  // The adaptor's begin latches the ceremony's class for the settle edge
  // (the tint latch needs it once the machine leaves the drive surface).
  s.morningAfter = {
    begin(derivation, reducedMotion): void {
      s.morningAfterClass = derivation.class
      // The class-conditioned first-pet window opens with the ritual (FR-5).
      s.morningAfterPetPending = true
      machine.begin(derivation, reducedMotion)
    },
    dismiss: machine.dismiss,
    advance: (dt) => machine.advance(dt),
  }
  return s
}
