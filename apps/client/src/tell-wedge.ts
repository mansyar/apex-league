/**
 * The startup telegraph's meshes (presentation mapping FR-6): one wedge plus
 * one pulse ring per side, aimed down the stream facing at the body's feet.
 * Length and arc derive from the committed move's reachMm (the stream's
 * move index when the trace carries one, else estimated from the startup
 * run) plus the attacker's body radius; geometry is rebuilt only when the
 * reach changes, never per frame. The first sample stays hidden: until a
 * second sample firms the run, the wedge would paint an unconfirmed threat.
 * Two fixed meshes per side, so instances are capped by construction.
 */

import { STREAM_PHASE, type StreamFrame } from "@apex/sim"
import * as THREE from "three"
import { clamp01 } from "./anim"
import {
  DEFAULT_TELL_REACH_MM,
  estimateStartupMs,
  reachForMoveIdx,
  reachForStartupMs,
  TELL_INNER,
  tellHalfAngle,
  tellOuterWorld,
  tellRing,
} from "./tell-scale"

/** Telegraph tint: warm amber, distinct from every element burst. */
const TELL_COLOR = 0xffb347
const TELL_LIFT = 0.03
const WEDGE_SEGMENTS = 18

interface TellSide {
  group: THREE.Group
  mesh: THREE.Mesh
  wedgeMat: THREE.MeshBasicMaterial
  ring: THREE.Mesh
  ringMat: THREE.MeshBasicMaterial
  outer: number
  halfAngle: number
  runSteps: number
  firstPhaseT: number
  lastStep: number
  reachMm: number
}

function wedgeGeometry(outer: number, halfAngle: number): THREE.RingGeometry {
  return new THREE.RingGeometry(
    TELL_INNER,
    outer,
    WEDGE_SEGMENTS,
    1,
    -Math.PI / 2 - halfAngle,
    halfAngle * 2,
  )
}

function createSide(arenaGroup: THREE.Group): TellSide {
  const group = new THREE.Group()
  const outer = tellOuterWorld(DEFAULT_TELL_REACH_MM, 220)
  const halfAngle = tellHalfAngle(DEFAULT_TELL_REACH_MM)
  const wedgeMat = new THREE.MeshBasicMaterial({
    color: TELL_COLOR,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(wedgeGeometry(outer, halfAngle), wedgeMat)
  // The ring is authored in the XY plane; lay it flat, then let the group's
  // yaw aim the wedge down the fighter's facing.
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = TELL_LIFT
  mesh.visible = false
  group.add(mesh)
  const ringMat = new THREE.MeshBasicMaterial({
    color: TELL_COLOR,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 40), ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = TELL_LIFT + 0.005
  ring.visible = false
  group.add(ring)
  arenaGroup.add(group)
  return {
    group,
    mesh,
    wedgeMat,
    ring,
    ringMat,
    outer,
    halfAngle,
    runSteps: 0,
    firstPhaseT: 0,
    lastStep: -1,
    reachMm: DEFAULT_TELL_REACH_MM,
  }
}

export interface TellSet {
  /**
   * Draw one side's telegraph for this frame. `step` guards the reach
   * estimator: a repeated frame (slow display tick) must not count the run
   * twice. `radiusMm` is the attacker's sim body radius in mm.
   */
  update(
    side: 0 | 1,
    body: THREE.Group,
    frame: StreamFrame,
    radiusMm: number,
    stepMs: number,
    step: number,
  ): void
  /** Hide both telegraphs and forget every startup run (new fight). */
  reset(): void
  /** Free the telegraph meshes. */
  dispose(): void
}

export function createTellSet(arenaGroup: THREE.Group): TellSet {
  const sides: [TellSide, TellSide] = [
    createSide(arenaGroup),
    createSide(arenaGroup),
  ]

  return {
    update(side, body, frame, radiusMm, stepMs, step) {
      const tell = sides[side]
      const charging = frame.phase === STREAM_PHASE.startup
      if (!charging) {
        tell.mesh.visible = false
        tell.ring.visible = false
        tell.runSteps = 0
        return
      }
      // One observation per step: the committed row's own index wins when
      // the trace carries it (R1/F2) — exact, no bucket — else the phaseT
      // span across the run measures the authored startup length, which
      // names the move's reach. The first sample stays hidden (R1/F5):
      // until the run firms up, the wedge would paint an unconfirmed row.
      if (step !== tell.lastStep) {
        tell.lastStep = step
        tell.runSteps += 1
        if (tell.runSteps === 1) {
          tell.firstPhaseT = frame.phaseT
        }
        const exact = reachForMoveIdx(frame.moveIdx ?? 0)
        if (exact !== undefined) {
          tell.reachMm = exact
        } else if (tell.runSteps > 1) {
          const estimate = estimateStartupMs(
            tell.runSteps,
            tell.firstPhaseT,
            frame.phaseT,
            stepMs,
          )
          if (estimate !== undefined) {
            tell.reachMm = reachForStartupMs(estimate)
          }
        }
      }
      const settled = tell.runSteps >= 2
      tell.mesh.visible = settled
      tell.ring.visible = settled
      const outer = tellOuterWorld(tell.reachMm, radiusMm)
      const halfAngle = tellHalfAngle(tell.reachMm)
      if (outer !== tell.outer || halfAngle !== tell.halfAngle) {
        tell.mesh.geometry.dispose()
        tell.mesh.geometry = wedgeGeometry(outer, halfAngle)
        tell.outer = outer
        tell.halfAngle = halfAngle
      }
      const t = clamp01(frame.phaseT / 255)
      // Aim the wedge down the body's facing, at its feet.
      tell.group.position.set(body.position.x, 0, body.position.z)
      tell.group.rotation.y = Math.atan2(frame.facingX, frame.facingZ)
      const grow = 0.55 + t * 0.45
      tell.group.scale.setScalar(grow)
      tell.wedgeMat.opacity = 0.16 + t * 0.62
      // The ring rides the same growth so its world radius tracks the sweep.
      const pulse = tellRing(t, outer)
      tell.ring.scale.setScalar(Math.max(0.001, pulse.radius / grow))
      tell.ringMat.opacity = pulse.opacity
    },
    reset() {
      for (const tell of sides) {
        tell.mesh.visible = false
        tell.ring.visible = false
        tell.runSteps = 0
        tell.lastStep = -1
        tell.reachMm = DEFAULT_TELL_REACH_MM
      }
    },
    dispose() {
      for (const tell of sides) {
        arenaGroup.remove(tell.group)
        tell.mesh.geometry.dispose()
        tell.ring.geometry.dispose()
        tell.wedgeMat.dispose()
        tell.ringMat.dispose()
      }
    },
  }
}
