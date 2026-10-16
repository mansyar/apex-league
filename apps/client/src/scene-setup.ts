import * as THREE from "three"
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js"
import { RANCH_SKY } from "./environment"
import { BASE_FOV } from "./orbit-camera"
import { arenaFramingAdjust } from "./scene-logic"

const GROUND_COLOR = 0x3a4d34

/**
 * Ranch environment palette (golden hour). The ranch reads as late
 * afternoon: amber light pooling at the horizon, cooling to navy
 * overhead, with a warm key sun and a cool rim to silhouette the
 * creature. These tones are the identity of the ranch look — retune
 * them together, never one alone.
 */
const SKY_HORIZON = RANCH_SKY // dusk amber, pools at the horizon
const SKY_TOP = 0x1a1f2e // navy, cools the sky overhead
const KEY_COLOR = 0xffd9a0 // warm low sun
const RIM_COLOR = 0x8fb4d9 // cool skylight from the far side

/** The lighting rig scene.ts cross-fades away when the arena takes over. */
export interface RanchLights {
  ambient: THREE.AmbientLight
  hemi: THREE.HemisphereLight
  sun: THREE.DirectionalLight
  rim: THREE.DirectionalLight
}

/** Everything `createScene` needs to own its render surface and set dressing. */
export interface RanchSetup {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** Bloom post pass, or null when the environment couldn't support it. */
  composer: EffectComposer | null
  lights: RanchLights
  /** Ranch rig intensities captured at setup for the blend writes. */
  ranchRig: { ambient: number; hemi: number; sun: number; rim: number }
  /** The golden-hour sky dome (hidden when the arena blend kicks in). */
  sky: THREE.Mesh
  /** The mossy ranch ground disc (named "ranch-ground" for blend hides). */
  ground: THREE.Mesh
}

/**
 * Bootstrap the shared render surface: renderer, golden-hour sky dome,
 * fog, camera, bloom post pass, the ranch lighting rig, shadows and the
 * mossy ground. Pure scene dressing — the creature, orbit input and
 * per-frame animation live with their callers.
 */
export function setupRanchScene(container: HTMLElement): RanchSetup {
  // No usable WebGL at boot (blocked, blacklisted driver, no GPU): name it
  // plainly. main.ts catches this and renders the failure plate (F7).
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
  } catch (cause) {
    throw new Error("WebGL unavailable", { cause })
  }
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  // Golden-hour sky: a dome with a vertical gradient from the amber
  // horizon up to navy, replacing the flat color background. The dome
  // has no fog of its own — it IS the horizon color the ground fades into.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(40, 16, 12),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(SKY_TOP) },
        horizon: { value: new THREE.Color(SKY_HORIZON) },
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 top;
        uniform vec3 horizon;
        void main() {
          // Amber pools at the horizon, cools to navy overhead. The ramp
          // is steep because the orbit camera looks slightly down — only
          // the low band of the dome is ever on screen.
          float h = normalize(vPos).y;
          float t = pow(clamp(h * 2.4, 0.0, 1.0), 0.85);
          gl_FragColor = vec4(mix(horizon, top, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  )
  scene.add(sky)

  // Linear fog in the horizon tone: distant ground dissolves into the
  // sunset while the creature (always well inside the near plane) stays
  // crisp even at maximum zoom-out.
  scene.fog = new THREE.Fog(SKY_HORIZON, 16, 30)

  // F6 (responsive_foundation_20261013): narrow viewports widen the lens
  // on top of the base FOV (see orbit-camera's BASE_FOV / resize()).
  const camera = new THREE.PerspectiveCamera(
    BASE_FOV +
      arenaFramingAdjust(container.clientWidth / (container.clientHeight || 1))
        .fovAdd,
    container.clientWidth / (container.clientHeight || 1),
    0.1,
    100,
  )

  // -- Bloom post pass (FR7) --------------------------------------------------
  // Arena-only post processing: bright additive VFX (projectile glows,
  // hit flashes, bursts) bloom softly over the dark show floor. Built
  // defensively - a weak GPU or missing addon support degrades to the
  // plain renderer instead of breaking the game.
  let composer: EffectComposer | null = null
  try {
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.32,
        0.4,
        0.72,
      ),
    )
    composer.setSize(container.clientWidth, container.clientHeight)
  } catch {
    composer = null
  }

  // Lighting rig: warm key from the sun side, cool rim from the far
  // side to keep shadowed voxels readable. A hemisphere ramp gives the
  // creature amber light from above sky and a muted cool bounce from
  // the moss below — the golden-hour bounce that makes the character read.
  const lights: RanchLights = {
    ambient: new THREE.AmbientLight(0xbcc7d6, 0.3),
    hemi: new THREE.HemisphereLight(0xe8ab72, 0x3a4a44, 1.15),
    sun: new THREE.DirectionalLight(KEY_COLOR, 2.0),
    rim: new THREE.DirectionalLight(RIM_COLOR, 0.5),
  }
  lights.sun.position.set(4, 6, 2)
  lights.rim.position.set(-5, 3, -4)
  scene.add(lights.ambient, lights.hemi, lights.sun, lights.rim)
  // Ranch rig intensities kept so the set can be cross-faded away when the
  // arena takes over (arena blend drives its own rig from zero).
  const ranchRig = {
    ambient: lights.ambient.intensity,
    hemi: lights.hemi.intensity,
    sun: lights.sun.intensity,
    rim: lights.rim.intensity,
  } as const

  // Real drop-in shadows: the creature's parts cast, the ground receives.
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  // Palettes are hand-tuned for a linear response; tone mapping stays off
  // explicitly so a three.js default flip can't silently retune the look.
  renderer.toneMapping = THREE.NoToneMapping
  lights.sun.castShadow = true
  lights.sun.shadow.mapSize.set(1024, 1024)
  lights.sun.shadow.camera.left = -9
  lights.sun.shadow.camera.right = 9
  lights.sun.shadow.camera.top = 9
  lights.sun.shadow.camera.bottom = -9
  lights.sun.shadow.camera.near = 1
  lights.sun.shadow.camera.far = 20

  // Mossy ground: a disc as wide as the sky dome, so the moss always
  // runs to the horizon and meets the dome at its equator — there is no
  // visible ground edge to dissolve. Fog takes over at distance.
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshLambertMaterial({ color: GROUND_COLOR }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  // The mossy ground belongs to the ranch set: arena views dissolve the
  // horizon into fog, not moss.
  ground.name = "ranch-ground"

  return { renderer, scene, camera, composer, lights, ranchRig, sky, ground }
}
