import type { CreatureConditions } from "@apex/sim"
import type { Stage } from "@apex/voxel"
import type * as THREE from "three"
import {
  createEvolutionCeremony,
  createPetMachine,
  createPlayCeremony,
  createRestCeremony,
  createTreatCeremony,
  createWalk,
  type EvolutionMachine,
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
  evolutionSwap: { archetypeId: string; seed: number; stage: Stage } | null
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
}

export function createRanchState(deps: RanchMotionDeps): RanchState {
  return {
    deps,
    reducedMotion: false,
    creatureGroup: null,
    rigParts: {},
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
  }
}
