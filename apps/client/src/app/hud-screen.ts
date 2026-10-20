import {
  advanceDay,
  assignTraining,
  buildSaveExport,
  type CareAction,
  careAction,
  clearSave,
  getSpecies,
  inspectSaveImport,
  markHintSeen,
  renameCreature,
  type SaveData,
  type StatKey,
  setMusicVolume,
  setMuted,
  setReducedMotion,
  setSfxVolume,
} from "@apex/sim"
import { careCueForEvent } from "../audio/careCues"
import type { GraduationFlow } from "../graduation"
import { createHud, type Hud } from "../hud"
import { importBlocked, transferNotice } from "../save-transfer"
import { visualSeedOf } from "../staging-seed"
import type { ScreenDeps } from "./screen-deps"

/**
 * The care HUD (composition-root split). `screens.ts` owns the battle screens;
 * the HUD's handler object outgrew the 12 KB module cap on its own, so it lives
 * here — the object itself is unchanged, and `main.ts` still builds it at the
 * boot position the inline object held (after the import modal, before the
 * store fanout).
 */
export interface HudScreenDeps extends ScreenDeps {
  graduation: GraduationFlow
  storage: Storage
  /** Show the replace-save confirm for a validated payload. */
  askImport(data: SaveData): void
}

/**
 * The care HUD and its command handlers: day advance, care, training, the
 * preference chips, the audio mix, save transfer, rename, reset, hints and
 * the graduation entry points. Same object, same order, same bodies.
 */
export function createHudScreen(deps: HudScreenDeps): Hud {
  const { app, store, audio, arena, scene, sceneSync, graduation, storage } =
    deps
  const { askImport } = deps

  const hud = createHud(app, {
    onAdvanceDay: () => {
      // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
      // to the sim immediately but never interrupts the creature's motion.
      const stageBefore = store.get().creature?.stage
      store.commit(advanceDay(store.get()))
      // Dawn chime (ranch_rituals_20261018 FR5): the day-break punctuation,
      // gated by the same pure table (muted stays silent).
      const dawn = careCueForEvent({ kind: "dawn" }, store.get().settings)
      if (dawn) audio.player.play(dawn)
      const creature = store.get().creature
      const evolved =
        (stageBefore === "baby" && creature?.stage === "juvenile") ||
        (stageBefore === "juvenile" && creature?.stage === "champion")
      if (evolved && creature) {
        // Evolution moment (spec R5): the scene walks the creature to the
        // ranch center, swells, and swaps the rig for the next stage's build
        // at the pulse's peak — so the plain rebuild is skipped. The HUD
        // announces the stat gains while the ceremony plays. The visual seed
        // is unchanged (stage-aware), so the props stay put.
        const archetypeId =
          getSpecies(creature.speciesId)?.archetypeId ?? "draconic"
        sceneSync.sceneVisuals()
        scene.startEvolutionCeremony(
          archetypeId,
          visualSeedOf(creature.stats, creature.stage),
          creature.stage,
        )
        hud.announceEvolution(creature)
      } else {
        // No evolution: the plain rebuild (training does not move the seed;
        // a v5-migrated creature settles the same way).
        sceneSync.syncScene()
      }
    },
    onCare: (action: CareAction) => {
      const result = careAction(store.get(), action)
      if (!result.ok) return // buttons are already disabled; belt and braces
      store.commit(result.state)
      // Care SFX (ranch_rituals_20261018 FR5): the pure table decides — muted
      // stays silent — and the player's gate + silent degradation do the rest.
      const cue = careCueForEvent(
        { kind: "care", action },
        store.get().settings,
      )
      if (cue) audio.player.play(cue)
      // Feed toggles the food pile; conditions drive the mood idle.
      sceneSync.sceneVisuals()
      // Ceremony is visual feedback for an already-committed action, so it
      // starts only after the sim confirms the feed succeeded. The pile is
      // visible immediately; successive feeds re-trigger cleanly.
      if (action === "feed") scene.startFeedCeremony()
      if (action === "rest") scene.startRestCeremony()
      if (action === "treat") scene.startTreatCeremony()
      if (action === "play") scene.startPlayCeremony()
    },
    onTrain: (stat: StatKey) => {
      const result = assignTraining(store.get(), stat)
      if (!result.ok) return // entries are already disabled; belt and braces
      store.commit(result.state)
      // Training may shift the visual seed → resync the scene after the
      // store's standard hud/spar/cup fanout.
      sceneSync.syncScene()
    },
    onToggleReducedMotion: () => {
      const current = store.get()
      store.commit(setReducedMotion(current, !current.settings.reducedMotion))
      arena.applyMotionPref()
    },
    onToggleArenaCamera: () => {
      sceneSync.toggleArenaCamera()
    },
    onToggleMuted: () => {
      const current = store.get()
      store.commit(setMuted(current, !current.settings.muted))
    },
    onVolume: (bus, value, commit) => {
      const current = store.get()
      // Audition live while the slider moves; only a release persists.
      audio.player.setVolumes({
        music: bus === "music" ? value : current.settings.musicVolume,
        sfx: bus === "sfx" ? value : current.settings.sfxVolume,
      })
      if (bus === "music") audio.beds.setVolume(value)
      if (!commit) return
      store.commit(
        bus === "music"
          ? setMusicVolume(current, value)
          : setSfxVolume(current, value),
      )
    },
    onDownloadSave: () => {
      const { filename, json } = buildSaveExport(store.get())
      const url = URL.createObjectURL(
        new Blob([json], { type: "application/json" }),
      )
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      hud.noticeSettings(`Downloaded ${filename}`)
    },
    onImportFile: async (file) => {
      let raw: string
      try {
        raw = await file.text()
      } catch {
        hud.noticeSettings(transferNotice("malformed"), true)
        return
      }
      const result = inspectSaveImport(raw)
      if (!result.ok) {
        hud.noticeSettings(transferNotice(result.reason), true)
        return
      }
      askImport(result.data)
    },
    isImportBlocked: () => importBlocked(store.getSession()),
    onRename: (name) => {
      const next = renameCreature(store.get(), name)
      if (!next.ok) return false
      store.commit(next.state)
      return true
    },
    onReset: () => {
      try {
        clearSave(storage)
      } finally {
        // Reload even if the wipe threw — a stranded player on a hidden
        // modal is worse than a save that survived one more boot.
        window.location.reload()
      }
    },
    onHintSeen: (hintId) => {
      store.commit(markHintSeen(store.get(), hintId))
    },
    onGraduate: () => graduation.openConfirm(store.get()),
    onOpenHallOfFame: () => graduation.openHallOfFame(store.get()),
  })

  return hud
}
