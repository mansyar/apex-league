/**
 * Dev-only voxel preview: builds a creature directly from the generator
 * (no GLB round-trip) for silhouette iteration. Usage: /preview.html?seed=42
 * Grey materials on purpose — palette is judged later in the vision gate.
 */
import "./style.css"
import {
  buildDrake,
  DRAKE_GRID,
  drakeTemplate,
  meshGrid,
  sampleDna,
  voxelize,
} from "@apex/voxel"
import * as THREE from "three"

const app: HTMLDivElement = (() => {
  const el = document.querySelector<HTMLDivElement>("#app")
  if (!el) throw new Error("missing #app element")
  return el
})()

const seed = Number.parseInt(
  new URLSearchParams(window.location.search).get("seed") ?? "42",
  10,
)

const dna = sampleDna(drakeTemplate, seed)
const build = buildDrake(dna)
const grid = voxelize(build.fields, DRAKE_GRID)
const meshes = meshGrid(grid)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1f2e)

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
const angle = new URLSearchParams(window.location.search).get("angle") ?? "3-4"
if (angle === "side") {
  camera.position.set(7, 2.2, 0.5)
} else {
  camera.position.set(4.5, 3.2, 6.5)
}
camera.lookAt(0, 0.75, 0)

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

const grey = new THREE.MeshLambertMaterial({ color: 0x9a9a9a })
const creature = new THREE.Group()
const VOXEL_SIZE = 0.045
for (const part of meshes) {
  const pivot = build.pivots[part.name]
  const px = pivot?.[0] ?? 0
  const py = pivot?.[1] ?? 0
  const pz = pivot?.[2] ?? 0
  // Pivot-relative vertices (same contract as the GLB exporter), so rotating
  // a mesh around its pivot animates the joint.
  const positions = new Float32Array(part.positions.length)
  for (let i = 0; i < part.positions.length; i += 3) {
    positions[i] = (part.positions[i] ?? 0) - px
    positions[i + 1] = (part.positions[i + 1] ?? 0) - py
    positions[i + 2] = (part.positions[i + 2] ?? 0) - pz
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(new Float32Array(part.normals), 3),
  )
  geometry.setIndex(part.indices)
  const mesh = new THREE.Mesh(geometry, grey)
  mesh.position.set(px, py, pz)
  mesh.name = part.name
  creature.add(mesh)
}
creature.scale.setScalar(VOXEL_SIZE)
scene.add(creature)

// DNA readout for context during iteration
const info = document.createElement("div")
info.style.cssText =
  "position:absolute;top:12px;left:12px;color:#f0f4fa;font:13px/1.5 monospace;background:rgba(10,14,24,.85);padding:10px 14px;border-radius:10px"
const styles = Object.entries(dna.styles)
  .map(([slot, id]) => `${slot}=${id}`)
  .join(" ")
info.textContent = `seed ${seed} · ${styles}`
app.appendChild(info)

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
  renderer.render(scene, camera)
})
