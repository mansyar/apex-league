/**
 * Cup entry and exit (cup_module_refactor_20261018 FR3): the Enter Cup
 * chip sync, the open flow (prepare → repair → walk) and the free-close.
 * Relocated verbatim from `createCup` — the close decision lives in
 * view-models (closeIntent), the chip copy in chipView, the open header
 * in bracketHeader.
 */
import { bossForCup, completeCup, prepareCup } from "@apex/sim"
import { closeModal, openModal } from "../ui/modal"
import { WALK_SETTLE } from "./board"
import type { CupShared } from "./shared"
import { bracketHeader, chipView, entryLine } from "./view-models"

/** Create the entry/exit flows over the shared cup context. */
export function createEntry(shared: CupShared): {
  syncChip(): void
  closeFree(): void
  open(): void
} {
  const { mem, handlers } = shared
  const { overlay, battleHud, cupButton, cupHint, giveup } = shared
  const { cards, colHeadEls, champ, champName, cta, headTitle, headSub } =
    shared.bracket

  const syncChip = (): void => {
    const state = mem.state
    if (!state) return
    const view = chipView({
      day: state.day,
      phase: state.phase,
      hasCreature: state.creature !== null,
      ladder: state.ladder,
      hasSession: mem.session !== null,
      gate: bossForCup(state),
    })
    cupHint.textContent = view.hint
    cupButton.classList.toggle("is-hidden", !view.visible)
    cupButton.disabled = !view.enabled
  }

  let opener: HTMLElement | null = null

  const closeFree = (): void => {
    shared.clearTimer()
    shared.driver.stop()
    // A live player-turn session rides the save and stays resumable from
    // the chip; anything else (finalized, consumed) is dropped here.
    if (mem.session && mem.session.status !== "player-turn") {
      mem.session = null
      handlers.onSession?.(null)
    }
    mem.committed = false
    mem.cursor = 0
    mem.pendingId = null
    mem.picks = null
    mem.inBattle = false
    mem.fightNow = null
    // The overlay and the give-up fold through the helper; the focus handoff
    // below stays manual (opener, else the chip) as before.
    closeModal(overlay, { returnFocus: false })
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    for (const [id, card] of cards) {
      card.el.className = `cup-match kit-surface m-${id}`
      card.slots.a.replaceChildren()
      card.slots.b.replaceChildren()
      colHeadEls[card.column].classList.remove("in")
    }
    cta.classList.remove("show")
    closeModal(giveup.root, { returnFocus: false })
    syncChip()
    // Hand focus back to whatever opened the cup (usually the cup chip).
    if (opener?.isConnected) opener.focus()
    else if (cupButton.getClientRects().length > 0) cupButton.focus()
    opener = null
  }

  const open = (): void => {
    const state = mem.state
    if (!state?.creature) return
    opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    // Standing snapshot for the results screen's ladder row.
    mem.ladderBefore = { ...state.ladder }
    if (!mem.session || mem.session.bracket.day !== state.day) {
      const prepared = prepareCup(state)
      if (!prepared) return
      mem.session = prepared
      handlers.onSession?.(prepared)
    }
    let session = mem.session
    if (!session) return
    // A refresh can land inside the window between the fight resolving and
    // the rival bracket auto-completing (the stamp hold): the persisted
    // session is eliminated but has no champion yet, and the resumed walk
    // would stall on a rival match that has no verdict to show. Finish the
    // rival bracket now — the per-pairing seeds make it deterministic and
    // idempotent.
    if (session.status === "eliminated" && session.championName === null) {
      session = completeCup(session)
      mem.session = session
      handlers.onSession?.(session)
    }
    // A consumed cup (phase "day" — the entry commit already ran) must not
    // try to endCup again; derive the flag instead of trusting the closure.
    mem.committed = state.phase === "day"
    mem.cursor = 0
    mem.pendingId = null
    mem.picks = null
    mem.inBattle = false
    mem.fightNow = null
    const header = bracketHeader(session, state.day, state.ladder.tier)
    headSub.textContent = header.sub
    // The occasion leads the board (FR11): a Promotion Cup carries its own
    // banner from the sim, a boss final reads "Boss Final · <name>", and
    // every regular cup is named for the tier it serves.
    headTitle.textContent = header.title
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    // Reset the board, then start the strict-order reveal.
    for (const [id, card] of cards) {
      card.el.className = `cup-match kit-surface m-${id}`
      colHeadEls[card.column].classList.remove("in")
    }
    shared.showScreen("bracket")
    // The helper traps Tab while the cup owns the screen; Escape stays on
    // the Back mirror in cup.ts and the scrim never closes a cup.
    openModal(overlay, {
      dismissOnScrim: false,
      dismissOnEscape: false,
      initialFocus: shared.close,
    })
    // The bracket owns the screen: put the keyboard on its close control.
    // On a phone the bracket is a tall scroll column and the close control
    // sits at its end, so focusing it must not scroll the reader past the
    // board.
    shared.close.focus({ preventScroll: true })
    shared.setLine(entryLine(shared.playerName()))
    mem.cursor = 0
    shared.schedule(() => shared.walk(), WALK_SETTLE)
  }

  return { syncChip, closeFree, open }
}
