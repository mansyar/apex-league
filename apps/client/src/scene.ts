import { buildDrake, drakeTemplate, sampleDna } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

export interface SceneHandle {
  /** Stop the render loop and free GPU resources. */
  dispose(): void
}

const STARTER_SEED = 42
const GROUND_COLOR = 0x2a3040
const SKY_COLOR = 0x1a1f2e

/**
 * Bootstrap the 3D scene: camera, lights, ground, and the generated starter
 * drake performing a breathe idle driven by the part-hierarchy rig.
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

  // Drag-to-orbit camera around the creature, so the breathe idle can be
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

  // The player's starter drake, generated from a fixed seed (creature
  // ownership comes with the raise loop later).
  const dna = sampleDna(drakeTemplate, STARTER_SEED)
  const creature = buildCreatureGroup(dna, buildDrake(dna))
  scene.add(creature)

  // Grab the rig parts by name — the hierarchy contract guarantees they exist.
  const body = creature.getObjectByName("body")
  const head = creature.getObjectByName("head")
  const tail = creature.getObjectByName("tail")
  const tailTip = creature.getObjectByName("tailTip")
  const bodyBaseY = body?.position.y ?? 0
  const headBaseY = head?.position.y ?? 0

  const clockStart = performance.now()
  let raf = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Breathe idle: a gentle vertical BOB of the whole body hierarchy. No
    // per-part scale — non-uniform scale makes the body's voxel pattern slide
    // against the planted legs and reads as joint separation. The bob keeps
    // every voxel aligned to the grid while the chest rises and falls; the
    // head and tail add small secondary motion on top.
    const breath = Math.sin(t * 2)
    if (body) {
      body.position.y = bodyBaseY + breath * 0.5
    }
    if (head) {
      head.position.y = headBaseY + breath * 0.15
    }
    const sway = Math.sin(t * 1.3)
    if (tail) {
      tail.rotation.y = sway * 0.06
    }
    if (tailTip) {
      tailTip.rotation.y = sway * 0.12
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

  return {
    dispose() {
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
  }
}
