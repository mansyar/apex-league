/**
 * Dev-only variant gallery: an 8-creature grid regenerated from a seed
 * input. This is the instrument for herd tests (wild variation + rare
 * tiers) and the vision-gate lineups. Usage: /gallery.html?seed=42
 */
import "./ui/kit.css"
import "./base.css"
import { archetypes, generate } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "./creature"

const app: HTMLDivElement = (() => {
  const el = document.querySelector<HTMLDivElement>("#app")
  if (!el) throw new Error("missing #app element")
  return el
})()

const VARIANTS = 8
// Mixed herds rotate every registered archetype in registration order, so a
// newly registered archetype joins the rotation with zero edits here.
const roster = Object.keys(archetypes)
const archetypeParam = (() => {
  const raw =
    new URLSearchParams(window.location.search).get("archetype") ?? "draconic"
  // "mixed" rotates the whole registry; anything else must be a real
  // archetype id so unknown params fail loudly to the default.
  return raw === "mixed" || raw in archetypes ? raw : "draconic"
})()

const bar = document.createElement("div")
bar.style.cssText =
  "position:absolute;top:12px;left:12px;z-index:10;display:flex;gap:8px;align-items:center;color:#f0f4fa;font:13px monospace;background:rgba(10,14,24,.85);padding:8px 12px;border-radius:10px"
const label = document.createElement("span")
label.textContent = "base seed"
const input = document.createElement("input")
input.type = "number"
input.value = new URLSearchParams(window.location.search).get("seed") ?? "42"
input.style.cssText =
  "width:90px;background:#141a26;color:#f0f4fa;border:1px solid #3a4256;border-radius:6px;padding:4px 8px;font:13px monospace"
const note = document.createElement("span")
note.style.color = "#8fa3c0"
bar.append(label, input, note)
app.appendChild(bar)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
app.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1f2e)

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)

scene.add(new THREE.AmbientLight(0xffffff, 0.7))
const sun = new THREE.DirectionalLight(0xffffff, 1.6)
sun.position.set(4, 6, 2)
scene.add(sun)

const ground = new THREE.Mesh(
  new THREE.BoxGeometry(400, 0.2, 400),
  new THREE.MeshLambertMaterial({ color: 0x2a3040 }),
)
ground.position.set(0, -0.1, -150)
scene.add(ground)

let creatures: THREE.Group[] = []

function rebuild() {
  for (const c of creatures) {
    scene.remove(c)
    c.userData.tag?.remove()
    c.traverse((obj) => {
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
  }
  creatures = []
  const base = Number.parseInt(input.value, 10)
  if (!Number.isFinite(base)) return
  for (let i = 0; i < VARIANTS; i++) {
    const seed = base + i
    // ?archetype=<id> picks one; "mixed" rotates every registered archetype
    // (herd test for cross-archetype scale/palette harmony).
    const archetype =
      archetypeParam === "mixed"
        ? (roster[i % roster.length] ?? "draconic")
        : archetypeParam
    const { dna, build, def } = generate(archetype, seed)
    const creature = buildCreatureGroup(dna, build, def.grid)
    // Line them up along x, facing the camera (-z toward viewer). The rotated
    // body sits ~+0.9 ahead of the group origin, so shift the row to recenter.
    creature.position.x = (i - (VARIANTS - 1) / 2) * 2 - 0.9
    creature.rotation.y = Math.PI / 2
    creature.name = `creature-${seed}`
    const box = new THREE.Box3().setFromObject(creature)
    const center = box.getCenter(new THREE.Vector3())
    const tag = document.createElement("div")
    tag.textContent = String(seed)
    tag.style.cssText =
      "position:absolute;color:#8fa3c0;font:11px monospace;pointer-events:none"
    creature.userData.tag = tag
    creature.userData.center = center
    app.appendChild(tag)
    creatures.push(creature)
    scene.add(creature)
  }
  const rarityNote = creatures
    .map((c) => c.userData.dna.rarity.join("+") || "")
    .filter(Boolean)
    .join(", ")
  note.textContent = rarityNote ? `rare: ${rarityNote}` : "no rare tiers rolled"
}

// Project each creature's position to screen space to place its seed tag.
function placeTags() {
  const w = app.clientWidth
  const h = app.clientHeight
  for (const c of creatures) {
    const tag = c.userData.tag as HTMLDivElement | undefined
    if (!tag) continue
    const pos = (c.userData.center as THREE.Vector3).clone()
    pos.y = 1.6
    pos.project(camera)
    tag.style.left = `${((pos.x + 1) / 2) * w}px`
    tag.style.top = `${((-pos.y + 1) / 2) * h}px`
  }
}

input.addEventListener("change", rebuild)
rebuild()

function onResize() {
  const w = app.clientWidth
  const h = app.clientHeight
  if (w === 0 || h === 0) return
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener("resize", () => {
  onResize()
  placeTags()
})
onResize()

camera.position.set(0, 3, 17)
camera.lookAt(0, 0.9, 0)
placeTags()

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera)
})
