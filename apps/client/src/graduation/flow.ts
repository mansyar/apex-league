/**
 * The graduation flow (graduation_modules split): the confirm modal, the egg
 * screen, the Hall of Fame and the Nursery assembled behind one handle, plus
 * the open/show/close wiring. Moved verbatim out of graduation.ts, which still
 * exports createGraduation unchanged.
 */

import type { GameState } from "@apex/sim"
import { chip } from "../ui/kit"
import { closeModal, openModal } from "../ui/modal"
import { confirmCopy, confirmLabel, hatchFailureCopy } from "./copy"
import { buildEgg, renderEgg } from "./egg"
import { buildHall, renderHall } from "./hall"
import { modalShell } from "./modal"
import { createNursery } from "./nursery"
import type { GraduationFlow, GraduationHandlers } from "./types"

/**
 * Build the graduation surfaces: a confirm modal, an egg screen (starter-kit
 * grid with an inherited-floor line per species), and a Hall of Fame modal.
 * All three start hidden; callers open them explicitly.
 */
export function createGraduation(
  root: HTMLElement,
  handlers: GraduationHandlers,
): GraduationFlow {
  // -- Confirm modal ---------------------------------------------------------
  const confirm = modalShell()
  // Open/close, trap, scrim-click, Escape, and return-focus are the shared
  // modal helper's (ui/modal); dismissals below only name the helper.
  /** Dismiss the confirm modal and hand focus back to the Graduate chip. */
  const dismissConfirm = (): void => {
    closeModal(confirm.root)
  }
  const keepChip = chip({
    label: "Not yet",
    variant: "dim",
    onClick: dismissConfirm,
  })
  const confirmButton = document.createElement("button")
  confirmButton.className = "kit-button"
  confirmButton.type = "button"
  confirm.actions.append(keepChip, confirmButton)
  confirm.box.append(confirm.actions)

  // -- Egg screen ------------------------------------------------------------
  // The egg screen offers the starter species and the pets waiting in the
  // stable as successors (stable & partner reserve FR-8).
  const egg = buildEgg((choice) => handlers.onPick(choice))

  // -- Hall of Fame modal ----------------------------------------------------
  const hall = buildHall()
  /** Dismiss the Hall of Fame and hand focus back to the Lineage plate. */
  const dismissHall = (): void => {
    closeModal(hall.root)
  }
  const hallClose = chip({
    label: "Close",
    variant: "dim",
    onClick: dismissHall,
  })
  hall.actions.append(hallClose)
  hall.box.append(hall.actions)

  // -- Nursery ---------------------------------------------------------------
  const nursery = createNursery({ onHatch: handlers.onHatch })

  root.append(confirm.root, egg.root, hall.root, nursery.root)

  const close = (): void => {
    // Teardown: no focus moves, no cleanup notifications.
    closeModal(confirm.root, { returnFocus: false, notify: false })
    egg.root.style.display = "none"
    closeModal(hall.root, { returnFocus: false, notify: false })
    nursery.close()
  }

  const update = (state: GameState): void => {
    const creature = state.creature
    if (!creature) return
    renderEgg(egg, state, creature)
    renderHall(hall, state)
  }

  return {
    openConfirm(state) {
      const creature = state.creature
      if (!creature) return
      confirm.title.textContent = confirmLabel(creature.name)
      confirm.text.textContent = confirmCopy(creature.name)
      confirmButton.textContent = "Graduate"
      confirmButton.onclick = () => {
        // A commit: the egg screen takes focus next, so no handoff here.
        closeModal(confirm.root, { returnFocus: false })
        handlers.onConfirm()
      }
      update(state)
      openModal(confirm.root, { box: confirm.box, initialFocus: confirmButton })
    },
    showEggScreen(state) {
      update(state)
      egg.root.style.display = ""
      // The send-off ends here: put the keyboard on the first egg, not on a
      // body that just stopped being the champion.
      egg.firstCard?.focus()
    },
    showNursery(state) {
      update(state)
      nursery.show(state)
    },
    rejectHatch(reason) {
      nursery.say(hatchFailureCopy(reason))
    },
    openHallOfFame(state) {
      update(state)
      openModal(hall.root, { box: hall.box, initialFocus: hallClose })
    },
    update,
    close,
  }
}
