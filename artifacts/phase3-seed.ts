// Phase 3 checkpoint helper: prints a v6 save JSON at a given day so the
// browser session can be seeded mid-playthrough (localStorage apex.save).
// Usage: bun artifacts/phase3-seed.ts [day] > seed.json (or just read stdout)
import {
  chooseStarter,
  createInitialState,
  SAVE_VERSION,
  serializeSave,
  setReducedMotion,
  type SaveData,
} from "../packages/sim/src/index"

const day = Number(process.argv[2] ?? 9)

// A well-cared-for run: full conditions, some training under the belt.
const state = chooseStarter(createInitialState(), "fire_drake", 42)
setReducedMotion(state, false)
state.day = day
state.creature!.trained = { hp: 1, atk: 1, def: 0, spd: 0 }
state.creature!.trainingProgram = null
state.creature!.trainingResult = null
state.creature!.conditions = {
  hunger: 80,
  energy: 80,
  health: 100,
  mood: 60,
  bond: 25,
}
state.creature!.sickCooldown = 0

const data: SaveData = {
  version: SAVE_VERSION,
  state,
  savedAt: Date.now(),
}
process.stdout.write(serializeSave(data))
