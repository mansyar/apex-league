/**
 * Dev-only voxel preview: builds a creature directly from the generator
 * (no GLB round-trip) for silhouette iteration. Usage: /preview.html?seed=42
 * Grey materials on purpose — palette is judged later in the vision gate.
 */
import "./ui/kit.css"
import "./base.css"
import { archetypes, generate, parseStage, VOXEL_SIZE } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"
import { driveFace, findEyes } from "./face-motion"

const app: HTMLDivElement = (() => {
  const el = document.querySelector<HTMLDivElement>("#app")
  if (!el) throw new Error("missing #app element")
  return el
})()

const params = new URLSearchParams(window.location.search)
const seed = Number.parseInt(params.get("seed") ?? "42", 10)

const archetypeParam = params.get("archetype") ?? "draconic"
const archetype = archetypeParam in archetypes ? archetypeParam : "draconic"
const stage = parseStage(params.get("stage") ?? "baby")
const { dna, build, def } = generate(archetype, seed, stage)
const creature = buildCreatureGroup(dna, build, def.grid, {
  grey: params.get("color") === null,
  flat: params.get("surface") === "0",
})

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1f2e)

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
const angle = new URLSearchParams(window.location.search).get("angle") ?? "3-4"
const zoom = Number(
  new URLSearchParams(window.location.search).get("zoom") ?? "1",
)
const faceOn = angle === "face"
// `scale=<n>` previews the rig at arena-normalized size, so the face preset
// has to shrink its framing with it or it would photograph a distant head.
const shrink = Number.parseFloat(params.get("scale") ?? "1")
const fit = Number.isFinite(shrink) && shrink > 0 ? shrink : 1
const headPivot = build.pivots.head ?? [28, 28, 28]
const headAt = new THREE.Vector3(
  headPivot[0] * VOXEL_SIZE * fit,
  headPivot[1] * VOXEL_SIZE * fit,
  headPivot[2] * VOXEL_SIZE * fit,
)
// Everything orbits the framing target, which is also what the URL presets aim
// at: the head for a face shot, the creature's middle otherwise.
const target = new THREE.Vector3(0, (0.75 + (1 - zoom) * 1.2) * fit, 0)
if (faceOn) {
  // Close three-quarter on the head, framed from the declared head pivot so
  // every archetype sits in shot without a per-species camera table.
  target.copy(headAt)
  const framing = zoom * fit
  camera.position.set(
    headAt.x + 0.85 * framing,
    headAt.y + 0.3 * framing,
    headAt.z + 1.7 * framing,
  )
} else if (angle === "side") {
  camera.position.set(7 * zoom, 2.2 * zoom + (1 - zoom) * 1.5, 0.5)
} else if (angle === "front") {
  camera.position.set(0.5, 3.4 * zoom, 10 * zoom)
} else {
  camera.position.set(4.5 * zoom, 3.2 * zoom, 6.5 * zoom)
}
camera.lookAt(target)

// Drag to orbit, wheel to dolly. The opening shot still comes from the URL, so
// the screenshot script is unaffected until a pointer actually moves.
const orbit = new THREE.Spherical().setFromVector3(
  camera.position.clone().sub(target),
)
const MIN_RADIUS = 0.1
const MAX_RADIUS = 40
const PHI_LIMIT = 0.05
const canvas = renderer.domElement
canvas.style.touchAction = "none"
let pointer: number | null = null
let lastX = 0
let lastY = 0
canvas.addEventListener("pointerdown", (event) => {
  pointer = event.pointerId
  lastX = event.clientX
  lastY = event.clientY
  canvas.setPointerCapture(event.pointerId)
})
canvas.addEventListener("pointermove", (event) => {
  if (pointer !== event.pointerId) return
  orbit.theta -= (event.clientX - lastX) * 0.01
  orbit.phi = Math.min(
    Math.PI - PHI_LIMIT,
    Math.max(PHI_LIMIT, orbit.phi - (event.clientY - lastY) * 0.01),
  )
  lastX = event.clientX
  lastY = event.clientY
})
const release = (event: PointerEvent) => {
  if (pointer !== event.pointerId) return
  pointer = null
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }
}
canvas.addEventListener("pointerup", release)
canvas.addEventListener("pointercancel", release)
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault()
    orbit.radius = Math.min(
      MAX_RADIUS,
      Math.max(MIN_RADIUS, orbit.radius * Math.exp(event.deltaY * 0.001)),
    )
  },
  { passive: false },
)
const orbitOffset = new THREE.Vector3()

scene.add(new THREE.AmbientLight(0xffffff, 0.7))
const sun = new THREE.DirectionalLight(0xffffff, 1.6)
sun.position.set(4, 6, 2)
scene.add(sun)

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(12, 0.2, 12),
  new THREE.MeshLambertMaterial({ color: 0x2a3040 }),
)
ground.position.y = -0.1
scene.add(ground)
scene.add(creature)

// Review affordances (dev-only): the face idles live by default, so a blink can
// be watched rather than inferred; `blink=<seconds>` freezes it at that instant
// so a lid can be photographed, and `scale=<n>` shrinks the rig to
// arena-normalized size for a distance check.
const idleEyes = findEyes(creature)
const blinkParam = params.get("blink")
if (blinkParam !== null) {
  driveFace(idleEyes, seed, Number.parseFloat(blinkParam), true)
}
const idleStart = performance.now()
if (fit !== 1) creature.scale.multiplyScalar(fit)

// DNA readout for context during iteration
const info = document.createElement("div")
info.style.cssText =
  "position:absolute;top:12px;left:12px;color:#f0f4fa;font:13px/1.5 monospace;background:rgba(10,14,24,.85);padding:10px 14px;border-radius:10px"
const styles = Object.entries(dna.styles)
  .map(([slot, id]) => `${slot}=${id}`)
  .join(" ")
info.textContent = `seed ${seed} · ${stage} · ${styles}`
app.appendChild(info)

const hint = document.createElement("div")
hint.style.cssText =
  "position:absolute;bottom:12px;left:12px;color:#9fb0c8;font:12px/1.4 monospace;background:rgba(10,14,24,.7);padding:6px 10px;border-radius:8px"
hint.textContent =
  "drag to orbit · wheel to zoom · face idles live (?blink=<s> freezes)"
app.appendChild(hint)

function onResize() {
  const w = app.clientWidth
  const h = app.clientHeight
  if (w === 0 || h === 0) return
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener("resize", onResize)
onResize()

renderer.setAnimationLoop(() => {
  if (blinkParam === null) {
    driveFace(idleEyes, seed, (performance.now() - idleStart) / 1000, false)
  }
  orbitOffset.setFromSpherical(orbit)
  camera.position.copy(target).add(orbitOffset)
  camera.lookAt(target)
  renderer.render(scene, camera)
})
