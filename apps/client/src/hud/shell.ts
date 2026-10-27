import { buildCreatureDetail } from "../creature-detail"
import { buildGiftChip, buildGiftModal } from "../gift"
import { buildHandbook } from "../handbook"
import { buildPrefCluster, buildSettingsModal } from "../settings-modal"
import { buildStableChip, buildStableModal } from "../stable"
import { buildCommandDock } from "./dock"
import { createDockCollapseSession } from "./dock-collapse"
import { assembleOverflow, buildOverflow, seatOverflowBelow } from "./overflow"
import {
  buildCreaturePlate,
  buildLineagePlate,
  buildScoreBug,
  wireLineage,
} from "./plates"
import { buildResetModal } from "./settings"
import type { HudShell, HudShellHandlers, HudViewState } from "./types"

/**
 * The HUD's shell: every plate, modal and dock is built and wired here, in
 * the order createHud always built them, and the interaction state the daily
 * update has to see (the picker, the two collapsible corners, the inline
 * rename) lives on `view`. Values stay `update`'s business — this module only
 * builds, binds, and re-renders through the injected pass.
 */
export function createHudShell(
  root: HTMLElement,
  handlers: HudShellHandlers,
): HudShell {
  // Corner clusters collapse by clicking their headers (session-only:
  // always expanded on load). The creature plate starts collapsed on narrow
  // viewports — the stacked plates would otherwise eat the whole scene —
  // and in a short landscape window (852x393), where the expanded plate's
  // head row has no clear seat under the lineage plate. The dock's default
  // comes from its width-class decision (hud/dock-collapse) and re-derives
  // when the viewport crosses a tier, while an explicit head click holds
  // for the session.
  const startsCollapsed = window.matchMedia("(max-width: 767.98px)").matches
  const plateStartsFolded =
    startsCollapsed ||
    window.matchMedia("(orientation: landscape) and (max-height: 500px)")
      .matches
  const dockCollapse = createDockCollapseSession(window.innerWidth)
  const view: HudViewState = {
    current: null,
    pickerOpen: false,
    creatureOpen: !plateStartsFolded,
    dockOpen: dockCollapse.dockOpen(),
    renaming: false,
    // The More panel and the lineage detail fold where the ranch is narrow
    // (the house phone tier, like the creature plate) and read open where
    // it has room; an explicit click holds for the session either way.
    overflowOpen: !startsCollapsed,
    lineageOpen: !startsCollapsed,
  }

  // Top-center score bug — the shared builder; update() owns the values.
  const scoreBug = buildScoreBug()

  // Bottom-left creature lower-third — the shared builder; createHud
  // wires its interactions and update() owns the values.
  const creaturePlate = buildCreaturePlate()
  const {
    root: lowerThird,
    creatureHead,
    collapseButton,
    headRow,
    nameInput,
    renameButton,
    renameConfirm,
    renameCancel,
    editRow,
    statusTicker,
  } = creaturePlate

  // Bottom-right command dock — the shared builder. Care/pick clicks go
  // straight to the handlers; the train-toggle and collapse interactions
  // stay local (they re-render through update()).
  const dock = buildCommandDock({
    onCare: (action) => handlers.onCare(action),
    onTrain: (program) => {
      // The row is a toggle: picking tonight's program again clears it, and
      // clearing is free, so the picker never traps a choice.
      const assigned = view.current?.creature?.trainingProgram ?? null
      view.pickerOpen = false
      handlers.onTrain(assigned === program ? null : program)
    },
    // Escape leaves the picker without folding the dock away.
    onClosePicker: () => {
      if (!view.pickerOpen) return
      view.pickerOpen = false
      if (view.current) shell.render(view.current)
      trainButton.focus()
    },
    onAdvanceDay: () => handlers.onAdvanceDay(),
    onGraduate: () => handlers.onGraduate(),
  })
  const { root: cluster, dockHead, trainButton } = dock

  // Settings cluster (top-left) + reset modal — the modal owns the three
  // settings chips now; the HUD cluster keeps only the entry chip.
  const { resetModal, open: openReset } = buildResetModal(
    () => handlers.onReset(),
    () => document.querySelector<HTMLElement>(".settings-chip")?.focus(),
  )
  const settings = buildSettingsModal({
    onToggleReducedMotion: () => handlers.onToggleReducedMotion(),
    onToggleArenaCamera: () => handlers.onToggleArenaCamera(),
    onToggleMuted: () => handlers.onToggleMuted(),
    onVolume: (bus, value, commit) => handlers.onVolume(bus, value, commit),
    onDownloadSave: () => handlers.onDownloadSave(),
    onImportFile: (file) => handlers.onImportFile(file),
    isImportBlocked: () => handlers.isImportBlocked(),
    onNewGame: () => {
      openReset()
    },
  })
  // Coach's Handbook: type chart, ladder rules, raising guidance — one
  // persistent ranch chip (Phase 5 moved the settings chips into their
  // own modal behind the Settings chip).
  const handbook = buildHandbook()
  const motionWrap = buildPrefCluster(
    () => settings.open(),
    () => handbook.open(),
  )
  // Partner-details modal: opened by tapping the creature plate head; it
  // reads state fresh on every open.
  const creatureDetail = buildCreatureDetail()

  // Storm Gift (electric species line FR-5): the league's one-time Silver
  // reward. The card lives in the HUD and opens from a chip that only shows
  // while an egg is waiting in the nursery.
  const gift = buildGiftModal(() => handlers.onHatchGift())
  const giftChip = buildGiftChip(() => {
    const current = view.current
    if (!current) return
    gift.open(current)
  })

  // The stable (stable & partner reserve FR-9): the chip opens the modal
  // that lists the pets waiting there, the swap inside it hands one of them
  // the ranch, and the pencil on a row renames the pet where it waits.
  const stable = buildStableModal({
    onBringToRanch: (creatureId) => handlers.onBringToRanch(creatureId),
    onRename: (creatureId, name) => handlers.onRenameStable(creatureId, name),
    // The swap is done: the partner plate is the thing the player just
    // changed, so the keyboard goes back to it.
    onSwapped: () => creatureHead.focus(),
  })
  const stableChip = buildStableChip(() => {
    const current = view.current
    if (!current) return
    stable.open(current)
  })

  // Lineage plate (top-left, under the settings pill): the family name stays
  // visible and the bloodline detail folds behind it; the Hall of Fame
  // opener rides inside the detail. Built before the overflow — the open
  // panel seats below this plate, so every primary stays visible behind it.
  const lineage = buildLineagePlate()

  // Ranch overflow (UI cleanliness): Handbook, Gift, Stable, and the
  // composition root's extra chips (Cloud, Boards) fold behind one More
  // toggle; Settings stays primary beside it.
  const overflow = buildOverflow()
  assembleOverflow(overflow, view, {
    handbookChip: motionWrap.querySelector(".handbook-chip"),
    giftChip,
    stableChip,
    extraChips: handlers.extraChips ?? [],
    mount: motionWrap,
    anchor: lineage.root,
  })
  const reseatOverflow = (): void => {
    if (view.overflowOpen) {
      seatOverflowBelow(overflow, motionWrap, lineage.root)
    }
  }
  wireLineage(lineage, view, () => handlers.onOpenHallOfFame(), reseatOverflow)

  // The two bottom plates live in a stack wrapper so the phone tier can
  // lay them out as a column; display:contents keeps the desktop
  // corner-pinned layout untouched (children position against the root).
  const hudStack = document.createElement("div")
  hudStack.className = "hud-stack"
  hudStack.append(lowerThird, cluster)
  // The onboarding callout is appended after this by createHud — it stays
  // the last child of the HUD root, where it has always been.
  root.append(
    scoreBug.root,
    motionWrap,
    lineage.root,
    hudStack,
    resetModal,
    creatureDetail.root,
    gift.root,
    stable.root,
    handbook.root,
    settings.root,
  )

  lowerThird.classList.toggle("is-collapsed", !view.creatureOpen)
  cluster.classList.toggle("is-collapsed", !view.dockOpen)

  const shell: HudShell = {
    view,
    refs: {
      scoreBug,
      creaturePlate,
      dock,
      settings,
      creatureDetail,
      gift,
      giftChip,
      stable,
      stableChip,
      motionWrap,
      lineage,
      overflow,
    },
    render: () => {},
    closeRename: () => closeRename(),
  }

  // Toggling the picker spends nothing — render only. Opening moves focus into
  // the sheet: at narrow widths the train button itself is hidden while the
  // sheet is up, so leaving focus on it would drop the caret to <body>.
  trainButton.addEventListener("click", () => {
    view.pickerOpen = !view.pickerOpen
    if (view.current) shell.render(view.current)
    if (view.pickerOpen) dock.pickerRows[0]?.button.focus()
  })

  // Tapping the plate head opens the partner-details modal. The scrim
  // covers the HUD while it shows, so the readout is fresh for the visit.
  creatureHead.addEventListener("click", () => {
    if (view.current?.creature) creatureDetail.open(view.current)
  })

  collapseButton.addEventListener("click", () => {
    view.creatureOpen = !view.creatureOpen
    lowerThird.classList.toggle("is-collapsed", !view.creatureOpen)
    collapseButton.setAttribute(
      "aria-expanded",
      view.creatureOpen ? "true" : "false",
    )
  })

  // Rename flow: pencil opens the inline edit, Enter/click confirms,
  // Escape/cancel backs out. A sim rejection (mid-cup) coaches and stays.
  const openRename = () => {
    const current = view.current
    if (!current?.creature || current.phase === "cup") return
    view.renaming = true
    nameInput.value = current.creature.name
    headRow.style.display = "none"
    editRow.style.display = ""
    nameInput.focus()
    nameInput.select()
  }
  const closeRename = () => {
    view.renaming = false
    editRow.style.display = "none"
    headRow.style.display = ""
  }
  const confirmRename = () => {
    if (!view.current) return
    if (handlers.onRename(nameInput.value)) closeRename()
    else statusTicker.say("Renaming waits until the cup is done.")
  }
  renameButton.addEventListener("click", openRename)
  renameCancel.addEventListener("click", closeRename)
  renameConfirm.addEventListener("click", confirmRename)
  nameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmRename()
    if (event.key === "Escape") closeRename()
  })

  dockHead.addEventListener("click", () => {
    view.dockOpen = dockCollapse.toggle()
    if (!view.dockOpen) view.pickerOpen = false
    cluster.classList.toggle("is-collapsed", !view.dockOpen)
    dockHead.setAttribute("aria-expanded", view.dockOpen ? "true" : "false")
    if (view.current) shell.render(view.current)
  })

  // Rotating a device or resizing across a kit tier re-derives the dock's
  // default (a held head-click choice wins over any default). One listener
  // per breakpoint; the sync is idempotent when both fire at once.
  const syncDockViewport = () => {
    const wasOpen = dockCollapse.dockOpen()
    dockCollapse.onViewportChange(window.innerWidth)
    if (dockCollapse.dockOpen() === wasOpen) return
    view.dockOpen = dockCollapse.dockOpen()
    if (!view.dockOpen) view.pickerOpen = false
    cluster.classList.toggle("is-collapsed", !view.dockOpen)
    dockHead.setAttribute("aria-expanded", view.dockOpen ? "true" : "false")
    if (view.current) shell.render(view.current)
  }
  for (const query of ["(max-width: 767.98px)", "(max-width: 1023.98px)"]) {
    window.matchMedia(query).addEventListener("change", syncDockViewport)
  }

  return shell
}
