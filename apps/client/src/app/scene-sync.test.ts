import { describe, expect, test } from "bun:test"
import {
  advanceDay,
  chooseStarter,
  createInitialState,
  type GameState,
  type SaveAdapter,
} from "@apex/sim"
import * as THREE from "three"
import type { CameraIntent } from "../orbit-camera"
import type { SceneHandle } from "../scene"
import { createGameStore } from "../store"
import { createSceneSync } from "./scene-sync"

/**
 * The scene sync's morning-after day push (postcup_morning_after carry-over):
 * the ranch frame's night-settle retire reads the sim day it is handed, and
 * the sync is the only app seam that runs on every day mover — these tests
 * pin the push so the tint cannot silently outlive its day (FR-3).
 */

function fakeAdapter(): SaveAdapter {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (_key, value) => {
      map.set(_key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function startState(): GameState {
  return chooseStarter(createInitialState(), "fire_drake", 42)
}

/** A SceneHandle stub that only records the day latch (and nothing else). */
function fakeScene(): SceneHandle & { days: number[] } {
  const days: number[] = []
  return {
    days,
    sceneRoot: new THREE.Scene(),
    setCameraMode() {},
    setRanchBlend() {},
    setPaused() {},
    dispose() {},
    setCreature() {},
    updateConditions() {},
    setProps() {},
    setFedToday() {},
    shake() {},
    setArenaCameraStyle() {},
    applyDirectorIntent(_intent: CameraIntent) {},
    setMotionReduced() {},
    setRanchCreatureVisible() {},
    startFeedCeremony() {},
    startRestCeremony() {},
    startTreatCeremony() {},
    startPlayCeremony() {},
    startEvolutionCeremony() {},
    startMorningAfterCeremony() {},
    setRanchDay(day) {
      days.push(day)
    },
  }
}

describe("sceneVisuals' morning-after day push", () => {
  test("the sim day rides every visuals pass, creature or not", () => {
    const store = createGameStore(createInitialState(), fakeAdapter(), {
      now: () => 0,
    })
    const scene = fakeScene()
    const sync = createSceneSync(scene, store)
    sync.sceneVisuals()
    expect(scene.days).toEqual([store.get().day])
  })

  test("a day advance reaches the frame before the next render", () => {
    const store = createGameStore(startState(), fakeAdapter(), { now: () => 0 })
    const scene = fakeScene()
    const sync = createSceneSync(scene, store)
    sync.sceneVisuals()
    const next = advanceDay(store.get())
    store.commit(next)
    sync.sceneVisuals()
    expect(scene.days.at(-1)).toBe(next.day)
    expect(scene.days.length).toBe(2)
  })
})
