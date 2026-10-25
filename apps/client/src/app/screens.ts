import {
  type CupSession,
  canBreed,
  clearLoadout,
  graduate,
  graduateFromStable,
  graduateWithPair,
  setLoadout,
} from "@apex/sim"
import { type Cup, createCup } from "../cup"
import { createGraduation, type GraduationFlow } from "../graduation"
import type { Hud } from "../hud"
import { createSpar, type Spar } from "../spar"
import { visualSeedOf } from "../staging-seed"
import type { ScreenDeps } from "./screen-deps"

/**
 * Screen construction (composition-root split): the spar, the cup and the
 * graduation flow, each as the handler object `main.ts` used to build inline.
 * Moved unchanged — `main.ts` still calls the factories in the original boot
 * order, so construction and subscription order are untouched.
 */
export interface CupScreenDeps extends ScreenDeps {
  /** A session restored from the save at boot (save v7), or null. */
  restoredSession: CupSession | null
}

export interface GraduationScreenDeps extends ScreenDeps {
  /**
   * The HUD's send-off line. The HUD is constructed after this screen (its
   * own position in the boot order), so the reference stays late-bound —
   * exactly as the inline handler closed over the later `hud` const.
   */
  getHud(): Hud
}

/**
 * The spar: the arena hand-off, one playback step into staging, the saved
 * pacing and the kit write-back — the same handler object `main.ts` built.
 */
export function createSparScreen(deps: ScreenDeps): Spar {
  const { app, store, audio, arena, staging } = deps

  // The spar reads the live state through this hook; kit changes write
  // through the store like every other sim change.
  return createSpar(app, {
    onSetLoadout: (moveIds) => {
      const current = store.get()
      if (!current.creature) return
      store.commit(
        moveIds === null ? clearLoadout(current) : setLoadout(current, moveIds),
      )
    },
    // Fight start: dissolve into the broadcast arena and cast both fighters
    // on the stage; every event now also steps the arena playback. The ranch
    // creature retires while a fight plays. Back at the ranch the stage
    // clears and the ranch star returns.
    onFightStart: arena.enterArena,
    onStep: (step, instant) => {
      audio.playStepCue(step, instant)
      staging.applyStep(step, instant)
    },
    onClose: arena.exitArena,
    // The arena scales its action animations to the playback pace, so
    // fast-forward speeds the whole fight up instead of cutting swings.
    onPace: (msPerStep) => staging.setPace(msPerStep),
    // The saved setting gates the playback too — an in-app "reduced" holds
    // even when the OS reports motion-ok.
    motionPref: () => store.get().settings.reducedMotion,
  })
}

/**
 * The live cup: prepareCup opens the bracket view, rival matches reveal at
 * their own pace, the player's branch resolves live in the arena, and
 * finalizeCup lands the rewards. Nothing here re-resolves the sim — every
 * state adoption flows through the store (persist + hud/spar/cup fanout).
 */
export function createCupScreen(deps: CupScreenDeps): Cup {
  const {
    app,
    store,
    audio,
    arena,
    staging,
    scene,
    sceneSync,
    restoredSession,
  } = deps

  return createCup(
    app,
    {
      onFightStart: arena.enterArena,
      onStep: (step, instant) => {
        audio.playStepCue(step, instant)
        staging.applyStep(step, instant)
      },
      onPace: (msPerStep) => staging.setPace(msPerStep),
      onArenaExit: arena.exitArena,
      // The first arena fight consumes the cup (endCup flips the phase) —
      // adopted through the store so a mid-cup refresh keeps the commitment.
      onCommit: (next) => {
        store.commit(next)
      },
      // Results are in and finalizeCup applied the rewards — the store's fixed
      // fanout updates hud/spar/cup; only the site-specific scene refresh is
      // added here.
      onFinalize: (next) => {
        // The cup is consumed: the persisted session must not resurrect —
        // clear it first so the finalize commit writes the cleared save.
        store.setSession(null)
        store.commit(next)
        // Conditions may carry the reward bump (mood/bond) — refresh the idle.
        sceneSync.sceneVisuals()
      },
      // Every session mutation rides the save (prepare, fight, forfeit,
      // completion) so a refresh anywhere in the walk resumes exactly here.
      onSession: (session) => {
        store.setSession(session)
        if (session !== null) return
        // Postcup morning-after (FR-2, FR-9): the cup overlay's close is
        // the first ranch arrival. A banked derivation starts the arrival
        // ceremony here; a reload (nothing banked — the ledger is
        // client-held) and an evolution-yield day (null return, the
        // derivation stays banked for the debrief) are silent no-ops.
        const derivation = store.takeMorningAfterArrival()
        if (derivation) scene.startMorningAfterCeremony(derivation)
      },
    },
    { restoredSession },
  )
}

/**
 * The legacy flow (v10): a champion's send-off. The confirm modal leads to a
 * ceremony (the evolution ceremony machinery, reused as a farewell), then the
 * egg screen collects the successor's species and `graduate` hands the
 * bloodline on. Nothing commits until the player picks — closing early keeps
 * the champion.
 */
export function createGraduationScreen(
  deps: GraduationScreenDeps,
): GraduationFlow {
  const { app, store, scene, sceneSync, getHud } = deps

  const graduation = createGraduation(app, {
    onConfirm: () => {
      const state = store.get()
      const creature = state.creature
      if (!creature) return
      // Send-off: reuse the evolution ceremony as a farewell walk-to-center.
      // The egg screen opens when the scene reports the ceremony settled —
      // never on a timer, so a long walk can't be cut short and the reduced
      // path needs no special case (it settles a frame later).
      scene.startEvolutionCeremony(
        creature.archetypeId,
        visualSeedOf(creature.stats, creature.stage, creature.branch),
        creature.stage,
        () => {
          const state = store.get()
          if (!state.creature) return
          // A line with at least one archived champion can pair the retiree
          // with the Hall; the founder still gets the free starter choice.
          if (canBreed(state)) graduation.showNursery(state)
          else graduation.showEggScreen(state)
        },
        creature.branch,
      )
    },
    onPick: (choice) => {
      const before = store.get()
      const retiree = before.creature
      if (!retiree) return
      // Two kinds of successor (stable & partner reserve FR-8): a starter
      // species hatches a new pet, a pet waiting in the stable takes the
      // ranch with everything it already is.
      const result =
        choice.kind === "stable"
          ? graduateFromStable(before, choice.creatureId)
          : graduate(before, choice.speciesId, Date.now() % 2 ** 31)
      if (!result.ok) return
      store.commit(result.state)
      graduation.close()
      sceneSync.syncScene()
      // The egg screen is gone: hand focus to the rebuilt partner plate so the
      // keyboard lands on the successor instead of <body>.
      document.querySelector<HTMLButtonElement>(".creature-head")?.focus()
      const successor = store.get().creature
      if (successor) {
        getHud().announceGraduation(
          retiree.name,
          successor.name,
          store.get().lineage.generation,
        )
      }
    },
    onHatch: (generations, speciesId, seed) => {
      const before = store.get()
      const retiree = before.creature
      if (!retiree) return
      const result = graduateWithPair(before, generations, speciesId, seed)
      if (!result.ok) {
        graduation.rejectHatch(result.reason)
        return
      }
      store.commit(result.state)
      graduation.close()
      sceneSync.syncScene()
      // The Nursery's opener (the Graduate action) is gone after a succession;
      // hand focus to the rebuilt partner plate so keyboard users land on the
      // new creature instead of <body>.
      document.querySelector<HTMLButtonElement>(".creature-head")?.focus()
      const successor = store.get().creature
      if (successor) {
        getHud().announceGraduation(
          retiree.name,
          successor.name,
          store.get().lineage.generation,
        )
      }
    },
  })

  return graduation
}
