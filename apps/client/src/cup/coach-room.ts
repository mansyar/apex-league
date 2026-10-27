/**
 * The coaching room (cup_module_refactor_20261018 FR3): the fighter and
 * scouting cards, the kit picker and the tactic call. Relocated verbatim
 * from `createCup` — the pick bounds and labels live in battleUI, the
 * fresh-picks decision in view-models (initialPicks).
 */
import { battleStats, type Creature, getMove, getSpecies } from "@apex/sim"
import { buildKitPicker, buildTacticRow, toggleKitChoice } from "../battleUI"
import { formRead } from "../hud/copy-care"
import type { CupShared } from "./shared"
import { coachTabLabel, initialPicks } from "./view-models"

/** Create the coaching room over the shared cup context. */
export function createCoachRoom(shared: CupShared): {
  statRow(label: string, value: number, max?: number): HTMLElement
  openCoach(): void
  closeCoach(): void
} {
  const { mem } = shared
  const { coachTab, fighterCard, rivalCard, kitCard } = shared.coach
  let opener: HTMLElement | null = null

  const statRow = (label: string, value: number, max = 60): HTMLElement => {
    const row = document.createElement("div")
    row.className = "cup-stat"
    const name = document.createElement("span")
    name.className = "cup-stat-name"
    name.textContent = label
    const bar = document.createElement("span")
    bar.className = "cup-stat-bar"
    const fill = document.createElement("span")
    fill.className = "cup-stat-fill"
    fill.style.width = `${Math.min(100, Math.round((value / max) * 100))}%`
    bar.append(fill)
    const num = document.createElement("span")
    num.className = "cup-stat-num"
    num.textContent = String(value)
    row.append(name, bar, num)
    return row
  }

  /**
   * The form line (FR-14): the tier word in a chip, the sim's own consequence
   * sentence beside it, and — only for a sick partner — the sentence that
   * explains why the tier is pinned. Wording is `formRead`'s (the sim's copy),
   * never a second copy, so the coach room cannot drift from the fight.
   */
  const formRow = (creature: Creature): HTMLElement => {
    const view = formRead(creature)
    const row = document.createElement("div")
    row.className = "cup-form"
    const word = document.createElement("span")
    word.className = "cup-form-tier"
    word.textContent = view.label
    const line = document.createElement("span")
    line.className = "cup-form-line"
    line.textContent = view.line
    row.append(word, line)
    if (view.sickNote !== null) {
      const note = document.createElement("span")
      note.className = "cup-form-line"
      note.textContent = view.sickNote
      row.append(note)
    }
    return row
  }

  const openCoach = (): void => {
    if (!mem.state?.creature || !mem.session || !mem.pendingId) return
    opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const creature = mem.state.creature
    const opponent = mem.session.nextOpponent
    if (!opponent) return
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot open the coach")
    const entry = shared.matchOf(mem.pendingId)
    if (!entry) return
    coachTab.textContent = coachTabLabel(entry.label)
    mem.picks = initialPicks(creature)

    // Your fighter card.
    fighterCard.replaceChildren()
    const fHead = document.createElement("div")
    fHead.className = "cup-card-title"
    fHead.textContent = "Your fighter"
    const fName = document.createElement("div")
    fName.className = "cup-fighter-name"
    fName.textContent = creature.name
    const fSpecies = document.createElement("div")
    fSpecies.className = "cup-fighter-species"
    fSpecies.textContent = `${cs.displayName} · ${cs.element}`
    fighterCard.append(fHead, fName, fSpecies)
    // The numbers the fight will actually use: `battleStats` is the same seam
    // the owned side of a spar and the cup entry snapshot resolve with, so the
    // readout above the form line cannot disagree with the arena.
    const fight = battleStats(creature)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      fighterCard.append(statRow(label, fight[key]))
    }
    fighterCard.append(formRow(creature))

    // Rival scouting card (tactic withheld — that is the scouting tension).
    rivalCard.replaceChildren()
    const rHead = document.createElement("div")
    rHead.className = "cup-card-title"
    rHead.textContent = "Scouting report"
    const rName = document.createElement("div")
    rName.className = "cup-fighter-name rival"
    rName.textContent = opponent.name
    const rSpecies = document.createElement("div")
    rSpecies.className = "cup-fighter-species"
    rSpecies.textContent = `${rs.displayName} · ${rs.element}`
    rivalCard.append(rHead, rName, rSpecies)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      rivalCard.append(statRow(label, opponent.stats[key]))
    }
    const rKit = document.createElement("div")
    rKit.className = "cup-kit-list"
    for (const id of rs.kit) {
      const move = document.createElement("div")
      move.className = "cup-kit-move kit-line"
      move.textContent = getMove(id)?.displayName ?? id
      rKit.append(move)
    }
    const rTactic = document.createElement("div")
    rTactic.className = "cup-tactic-unknown"
    rTactic.textContent =
      "Fields four of these six — tactic unknown, watch the first exchanges."
    rivalCard.append(rKit, rTactic)

    // Your kit card: picker + tactic call.
    kitCard.replaceChildren()
    const kHead = document.createElement("div")
    kHead.className = "cup-card-title"
    kHead.textContent = "Your kit"
    kitCard.append(kHead)
    const kitRows: HTMLElement[] = []
    const renderKit = (): void => {
      const picks = mem.picks
      if (!picks) return
      const chosen = picks.loadout
      for (const row of kitRows) row.remove()
      kitRows.length = 0
      const picker = buildKitPicker({
        species: cs,
        creature,
        chosen: () => chosen,
        classes: { base: "cup-pick", locked: "locked", chosen: "on" },
        onToggle: (id) => {
          const live = mem.picks
          if (!live) return
          const next = toggleKitChoice(live.loadout, id, 2, 4)
          if (next) {
            live.loadout = next
            renderKit()
          }
        },
      })
      kitRows.push(...picker.rows)
      kitCard.append(picker.fragment)
    }
    renderKit()
    const tacticHead = document.createElement("div")
    tacticHead.className = "cup-card-title tactic"
    tacticHead.textContent = "Tactic"
    kitCard.append(tacticHead)
    const { row: tacticRow } = buildTacticRow({
      rowClass: "cup-tactic-row",
      describe: (t) => ({ label: t === "balanced" ? "Balanced" : "Specials" }),
      classes: { base: "cup-tactic kit-line", on: "on" },
      initialOn: "balanced",
      onPick: (t) => {
        if (mem.picks) mem.picks.tactic = t
      },
    })
    kitCard.append(tacticRow)

    shared.showScreen("coach")
    // The coaching room is a screen change, not a modal: hand focus to its
    // back control so keyboard players can act without tabbing the HUD.
    shared.coach.coachBack.focus()
  }

  const closeCoach = (): void => {
    shared.showScreen("bracket")
    if (opener?.isConnected) opener.focus()
    opener = null
  }

  return { statRow, openCoach, closeCoach }
}
