import * as THREE from "three"

export interface SceneHandle {
  /** Stop the render loop and free GPU resources. */
  dispose(): void
}

const CREATURE_COLOR = 0xe2b04a
const GROUND_COLOR = 0x2a3040
const SKY_COLOR = 0x1a1f2e

/**
 * Bootstrap the 3D scene: camera, lights, ground, and a placeholder voxel
 * creature performing a breathe idle (gentle squash-and-stretch).
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
    container.clientWidth / container.clientHeight,
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

  // Placeholder voxel creature: chunky body + head + legs.
  const creature = new THREE.Group()
  const material = new THREE.MeshLambertMaterial({ color: CREATURE_COLOR })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 1.4), material)
  body.position.y = 0.75
  creature.add(body)

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), material)
  head.position.set(0, 1.15, 0.85)
  creature.add(head)

  const legGeometry = new THREE.BoxGeometry(0.25, 0.4, 0.25)
  const legOffsets: Array<[number, number]> = [
    [-0.35, 0.45],
    [0.35, 0.45],
    [-0.35, -0.45],
    [0.35, -0.45],
  ]
  for (const [x, z] of legOffsets) {
    const leg = new THREE.Mesh(legGeometry, material)
    leg.position.set(x, 0.2, z)
    creature.add(leg)
  }
  scene.add(creature)

  const clock = new THREE.Clock()
  let raf = 0

  const tick = (): void => {
    const t = clock.getElapsedTime()
    // Breathe idle: gentle squash-and-stretch, ~0.33 Hz.
    const breath = Math.sin(t * 2)
    body.scale.set(1 - breath * 0.025, 1 + breath * 0.05, 1 - breath * 0.025)
    body.position.y = 0.75 + breath * 0.02
    head.position.y = 1.15 + breath * 0.03
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  const onResize = (): void => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener("resize", onResize)

  return {
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
