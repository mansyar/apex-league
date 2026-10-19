/**
 * Settings modal (coach_knowledge_20261016 Phase 5): the three floating
 * settings chips (motion / camera style / new game) consolidated into one
 * modal behind a single Settings chip. 1:1 relocation — same chips, same
 * labels, same handlers, zero new behavior. The chips keep their surface
 * classes, so the cross-surface rules stay honest: the camera row only
 * exists inside the arena (it is a battle-presentation control) and the
 * new game row only in the ranch, exactly as the floating chips did.
 */

import { focusTrap } from "./battleUI"
import { volumePercent } from "./hud/settings"
import { chip } from "./ui/kit"

/** The settings chip trio plus the cluster wrapper they float in. */
export interface SettingsChipRefs {
  motionWrap: HTMLElement
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  soundChip: HTMLButtonElement
  resetChip: HTMLButtonElement
}

/**
 * Build the three settings chips. Handlers are optional: the design mock
 * wires its own live toggle, while the settings modal attaches listeners
 * itself (the modal owns close-then-open for the reset flow).
 */
function buildSettingsChips(
  opts: {
    onToggleReducedMotion?: () => void
    onToggleArenaCamera?: () => void
    /** Flips the persisted audio mute toggle (save v13). */
    onToggleMuted?: () => void
    /** Opens the reset-confirm modal (built by buildResetModal). */
    onNewGame?: () => void
  } = {},
): SettingsChipRefs {
  const motionChip = chip({
    label: "Motion: full",
    variant: "dim",
    onClick: opts.onToggleReducedMotion,
  })
  const motionWrap = document.createElement("div")
  motionWrap.className = "hud-motion"
  motionWrap.append(motionChip)

  const cameraChip = chip({
    label: "Camera: cinematic",
    variant: "dim",
    onClick: opts.onToggleArenaCamera,
  })
  cameraChip.classList.add("camera-chip")
  motionWrap.append(cameraChip)
  const soundChip = chip({
    label: "Sound: on",
    variant: "dim",
    onClick: opts.onToggleMuted,
  })
  soundChip.classList.add("sound-chip")
  motionWrap.append(soundChip)
  const resetChip = chip({
    label: "New game",
    variant: "dim",
    onClick: opts.onNewGame,
  })
  // Ranch-only: the arena hide-list targets this class.
  resetChip.classList.add("new-game-chip")
  motionWrap.append(resetChip)
  return { motionWrap, motionChip, cameraChip, soundChip, resetChip }
}

export interface SettingsModalRefs {
  root: HTMLElement
  /** Show the settings modal (focus lands on the motion chip). */
  open: () => void
  /** Live chip refs — update() mirrors preference labels onto them. */
  motionChip: HTMLButtonElement
  cameraChip: HTMLButtonElement
  soundChip: HTMLButtonElement
  resetChip: HTMLButtonElement
  /** Mirror the persisted mix onto the two sliders (0..1 bus levels). */
  setVolumes: (volumes: { music: number; sfx: number }) => void
  /** Show (or clear, with "") a calm notice under the rows. */
  notice: (message: string, warn?: boolean) => void
  /** Disable import while a cup session is live. */
  setImportBlocked: (blocked: boolean) => void
}

/** Which audio bus a slider edits (save v16). */
export type VolumeBus = "music" | "sfx"

/** One labeled 0-100 volume row; `input` is live, `change` is the commit. */
function buildVolumeRow(
  labelText: string,
  onInput: (value: number) => void,
  onChange: (value: number) => void,
): { row: HTMLElement; sync: (value: number) => void } {
  const row = document.createElement("label")
  row.className = "settings-volume"
  const label = document.createElement("span")
  label.className = "settings-volume-label"
  label.textContent = labelText
  const slider = document.createElement("input")
  slider.className = "settings-volume-slider"
  slider.type = "range"
  slider.min = "0"
  slider.max = "100"
  slider.step = "1"
  slider.value = "100"
  const value = document.createElement("output")
  value.className = "settings-volume-value"
  value.textContent = "100%"
  slider.addEventListener("input", () => {
    value.textContent = `${slider.value}%`
    onInput(Number(slider.value) / 100)
  })
  slider.addEventListener("change", () => onChange(Number(slider.value) / 100))
  row.append(label, slider, value)
  return {
    row,
    sync: (level) => {
      const percent = volumePercent(level)
      slider.value = String(percent)
      value.textContent = `${percent}%`
    },
  }
}

/**
 * The top-left preference cluster: the Settings entry chip and the
 * Handbook entry chip inside the shared `.hud-motion` wrapper. Both the
 * live HUD and the design mock assemble it identically — one builder so
 * the parity stays structural (coach_knowledge_20261016 review).
 */
export function buildPrefCluster(
  openSettings: () => void,
  openHandbook: () => void,
): HTMLElement {
  const wrap = document.createElement("div")
  wrap.className = "hud-motion"
  const settingsChip = chip({
    label: "Settings",
    variant: "dim",
    onClick: openSettings,
  })
  settingsChip.classList.add("settings-chip")
  const handbookChip = chip({
    label: "Handbook",
    variant: "dim",
    onClick: openHandbook,
  })
  handbookChip.classList.add("handbook-chip")
  wrap.append(settingsChip, handbookChip)
  return wrap
}

/**
 * Build the settings modal around the chip trio. Hidden until open();
 * Escape, the backdrop, and the footer button all close it, restoring
 * focus to the opener. New game closes this modal first, then hands off
 * to the reset-confirm modal — the same deliberate two-step as before.
 */
export function buildSettingsModal(
  opts: {
    onToggleReducedMotion?: () => void
    onToggleArenaCamera?: () => void
    /** Flips the persisted audio mute toggle (save v13). */
    onToggleMuted?: () => void
    /** Opens the reset-confirm modal (built by buildResetModal). */
    onNewGame?: () => void
    /** Downloads a session-free export of the current save. */
    onDownloadSave?: () => void
    /** Handles a picked save file (parse, confirm, write). */
    onImportFile?: (file: File) => void
    /** True while a cup/battle session blocks a save swap. */
    isImportBlocked?: () => boolean
    /**
     * A volume slider moved (save v16): `commit` is false for live input and
     * true on release, so callers can audition without a save per pixel.
     */
    onVolume?: (bus: VolumeBus, value: number, commit: boolean) => void
  } = {},
): SettingsModalRefs {
  const { motionChip, cameraChip, soundChip, resetChip } = buildSettingsChips()

  const root = document.createElement("div")
  root.className = "kit-modal"
  root.style.display = "none"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-modal", "true")
  root.setAttribute("aria-label", "Settings")
  const box = document.createElement("div")
  box.className = "kit-plate kit-modal-box settings-box"
  const title = document.createElement("h2")
  title.className = "kit-modal-title"
  title.textContent = "Settings"

  const rows = document.createElement("div")
  rows.className = "settings-rows"
  const music = buildVolumeRow(
    "Music volume",
    (value) => opts.onVolume?.("music", value, false),
    (value) => opts.onVolume?.("music", value, true),
  )
  const sfx = buildVolumeRow(
    "SFX volume",
    (value) => opts.onVolume?.("sfx", value, false),
    (value) => opts.onVolume?.("sfx", value, true),
  )
  for (const row of [
    motionChip,
    cameraChip,
    soundChip,
    music.row,
    sfx.row,
    resetChip,
  ])
    rows.append(row)

  // Save transfer (Phase 3): download is always safe; import is a two-step
  // replace and is refused while a cup session is live.
  const transfer = document.createElement("div")
  transfer.className = "settings-transfer"
  const download = chip({
    label: "Download save",
    variant: "dim",
    onClick: () => opts.onDownloadSave?.(),
  })
  const importChip = chip({
    label: "Import save",
    variant: "dim",
    onClick: () => {
      if (importBlocked()) return
      importInput.click()
    },
  })
  const importInput = document.createElement("input")
  importInput.className = "settings-import-input"
  importInput.type = "file"
  importInput.accept = ".json,application/json"
  importInput.hidden = true
  transfer.append(download, importChip, importInput)
  rows.insertBefore(transfer, resetChip)

  const notice = document.createElement("p")
  notice.className = "settings-notice"
  notice.setAttribute("role", "status")
  notice.hidden = true
  let importIsBlocked = false
  const importBlocked = (): boolean => {
    importIsBlocked = opts.isImportBlocked?.() ?? false
    if (importIsBlocked) say("Finish or forfeit the cup first.", true)
    return importIsBlocked
  }
  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0]
    importInput.value = ""
    if (file) opts.onImportFile?.(file)
  })

  function say(message: string, warn = false): void {
    notice.hidden = message === ""
    notice.textContent = message
    notice.classList.toggle("is-warn", warn)
  }

  const actions = document.createElement("div")
  actions.className = "kit-modal-actions"
  const close = document.createElement("button")
  close.className = "kit-button"
  close.type = "button"
  close.textContent = "Done"
  actions.append(close)

  motionChip.addEventListener("click", () => opts.onToggleReducedMotion?.())
  cameraChip.addEventListener("click", () => opts.onToggleArenaCamera?.())
  soundChip.addEventListener("click", () => opts.onToggleMuted?.())
  resetChip.addEventListener("click", () => {
    closeNow()
    opts.onNewGame?.()
  })

  let opener: HTMLElement | null = null
  function closeNow(): void {
    root.style.display = "none"
    if (opener?.isConnected) opener.focus()
    opener = null
  }
  close.addEventListener("click", closeNow)
  const trapFocus = focusTrap(box)
  root.addEventListener("keydown", (event) => {
    trapFocus(event)
    if (event.key === "Escape") {
      event.stopPropagation()
      closeNow()
    }
  })
  root.addEventListener("click", (event) => {
    if (event.target === root) closeNow()
  })

  box.append(title, rows, notice, actions)
  root.append(box)
  return {
    root,
    open: () => {
      opener =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      say("")
      importIsBlocked = opts.isImportBlocked?.() ?? false
      importChip.disabled = importIsBlocked
      importChip.setAttribute("aria-disabled", String(importIsBlocked))
      root.style.display = ""
      motionChip.focus()
    },
    motionChip,
    cameraChip,
    soundChip,
    resetChip,
    setVolumes: ({ music: musicLevel, sfx: sfxLevel }) => {
      music.sync(musicLevel)
      sfx.sync(sfxLevel)
    },
    notice: say,
    setImportBlocked: (blocked) => {
      importIsBlocked = blocked
      importChip.disabled = blocked
      importChip.setAttribute("aria-disabled", String(blocked))
    },
  }
}
