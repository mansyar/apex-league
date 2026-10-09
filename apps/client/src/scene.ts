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
  camera.position.set(3.5, 3, 5.5)
  camera.lookAt(0, 0.6, 0)

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
  const headBaseY = head?.position.y ?? 0

  const clockStart = performance.now()
  let raf = 0

  const tick = (): void => {
    const t = (performance.now() - clockStart) / 1000
    // Breathe idle: squash-and-stretch on the body, a subtle head bob, and a
    // slow tail sway — each animated around its declared pivot joint.
    const breath = Math.sin(t * 2)
    if (body) {
      body.scale.set(1 - breath * 0.02, 1 + breath * 0.04, 1 - breath * 0.02)
    }
    if (head) {
      head.position.y = headBaseY + breath * 0.05
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
