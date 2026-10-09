import type { CreatureConditions } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

export interface SceneHandle {
  /** Stop the render loop and free GPU resources. */
  dispose(): void
  /** Replace (or add) the showcased creature, built from the archetype registry. */
  setCreature(archetypeId: string, seed: number): void
  /** Drive the condition visual states from the owned creature's conditions. */
  updateConditions(conditions: CreatureConditions | null): void
}

const GROUND_COLOR = 0x2a3040
const SKY_COLOR = 0x1a1f2e

/** Visual idle modes derived from the creature's conditions. */
type MoodMode = "normal" | "sluggish" | "droopy" | "happy"

interface MoodProfile {
  breathRate: number
  breathAmp: number
  headDroop: number
  bounce: number
}

const MOOD_PROFILES: Record<MoodMode, MoodProfile> = {
  normal: { breathRate: 2, breathAmp: 0.035, headDroop: 0, bounce: 0 },
  // Low energy: slow, shallow breathing — the creature is dragging through the day.
  sluggish: { breathRate: 0.9, breathAmp: 0.015, headDroop: 0.02, bounce: 0 },
  // Sick: head hangs, breath weak.
  droopy: { breathRate: 1.2, breathAmp: 0.02, headDroop: 0.06, bounce: 0 },
  // High mood: lively breath and a periodic happy bounce.
  happy: { breathRate: 2.6, breathAmp: 0.035, headDroop: 0, bounce: 0.08 },
}

function moodModeFrom(conditions: CreatureConditions): MoodMode {
  if (conditions.health < 80) return "droopy"
  if (conditions.energy <= 30) return "sluggish"
  if (conditions.mood >= 80) return "happy"
  return "normal"
}

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the owned creature
 * performing condition-driven procedural idles via the part-hierarchy rig.
 */
export function createScene(container: HTMLElement): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(SKY_COLOR)

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    100,
  )

  // Drag-to-orbit camera around the creature, so the idles can be
  // inspected from any angle. Wheel zooms, clamped to sane distances.
  const target = new THREE.Vector3(0, 0.8, 0)
  const orbit = { azimuth: 0.567, elevation: 0.326, radius: 6.9 }
  const clamp = (v: number, lo: number, hi: number): number =>
    Math.min(Math.max(v, lo), hi)
  const applyOrbit = (): void => {
    camera.position.set(
      target.x +
        orbit.radius * Math.cos(orbit.elevation) * Math.sin(orbit.azimuth),
      target.y + orbit.radius * Math.sin(orbit.elevation),
      target.z +
        orbit.radius * Math.cos(orbit.elevation) * Math.cos(orbit.azimuth),
    )
    camera.lookAt(target)
  }
  applyOrbit()

  let dragging = false
  let lastX = 0
  let lastY = 0
  const onPointerDown = (e: PointerEvent): void => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return
    orbit.azimuth -= (e.clientX - lastX) * 0.005
    orbit.elevation = clamp(
      orbit.elevation + (e.clientY - lastY) * 0.005,
      0.05,
      1.45,
    )
    lastX = e.clientX
    lastY = e.clientY
    applyOrbit()
  }
  const onPointerUp = (): void => {
    dragging = false
  }
  const onWheel = (e: WheelEvent): void => {
    orbit.radius = clamp(
      orbit.radius * (1 + Math.sign(e.deltaY) * 0.1),
      2.5,
      14,
    )
    applyOrbit()
  }
  const canvas = renderer.domElement
  canvas.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("wheel", onWheel)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.6)
  sun.position.set(4, 6, 2)
  scene.add(ambient, sun)

  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.2, 12),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  )
  ground.position.y = -0.1
  scene.add(ground)

  // Honor reduced motion: keep the gentle breath, drop the bounce.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches

  let creatureGroup: THREE.Group | null = null
  let mode: MoodMode = "normal"
  let headBaseY = 0

  const disposeGroup = (group: THREE.Group): void => {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        const mat = obj.material
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose()
        } else {
          mat.dispose()
        }
      }
    })
    scene.remove(group)
  }

  const handle: SceneHandle = {
    dispose() {
      if (creatureGroup) disposeGroup(creatureGroup)
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("wheel", onWheel)
      // Free every geometry/material on the scene to avoid GPU leaks when
      // scenes are swapped (ranch <-> arena later).
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) {
            for (const m of mat) m.dispose()
          } else {
            mat.dispose()
          }
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    },
    setCreature(archetypeId, seed) {
      if (creatureGroup) disposeGroup(creatureGroup)
      const { dna, build, def } = generate(archetypeId, seed)
      creatureGroup = buildCreatureGroup(dna, build, def.grid)
      scene.add(creatureGroup)
      headBaseY = creatureGroup.getObjectByName("head")?.position.y ?? 0
    },
    updateConditions(conditions) {
      mode = conditions ? moodModeFrom(conditions) : "normal"
    },
  }

  const clockStart = performance.now()
  let raf = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    const profile = MOOD_PROFILES[mode]
    if (creatureGroup) {
      // Breathe idle: squash-and-stretch on the body around its HIP-LINE
      // pivot. Scale never moves the pivot, so body voxels at the leg
      // junction stay fixed and the legs remain visually attached; the chest
      // and belly flex above/below it. Horizontal squash is kept small (it
      // slides the body's voxel pattern against the planted legs); the
      // vertical stretch carries the read. Neck/head/horns/tail ride along
      // via the rig hierarchy.
      const breath = Math.sin(t * profile.breathRate)
      const body = creatureGroup.getObjectByName("body")
      if (body) {
        body.scale.set(
          1 - breath * profile.breathAmp * 0.3,
          1 + breath * profile.breathAmp,
          1 - breath * profile.breathAmp * 0.3,
        )
      }
      const head = creatureGroup.getObjectByName("head")
      if (head) {
        head.position.y =
          headBaseY + breath * profile.breathAmp * 0.6 - profile.headDroop
      }
      const sway = Math.sin(t * 1.3)
      const tail = creatureGroup.getObjectByName("tail")
      if (tail) {
        tail.rotation.y = sway * 0.06
      }
      const tailTip = creatureGroup.getObjectByName("tailTip")
      if (tailTip) {
        tailTip.rotation.y = sway * 0.12
      }
      if (!reducedMotion && profile.bounce > 0) {
        creatureGroup.position.y = Math.abs(Math.sin(t * 3.2)) * profile.bounce
      } else {
        creatureGroup.position.y = 0
      }
    }
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onResize = (): void => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (w === 0 || h === 0) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  return handle
}
