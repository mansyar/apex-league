/**
 * The coaching room (cup_modules_per_screen split): fighter/rival/kit
 * cards over a note + CTA foot. Moved verbatim from cup-screens.ts.
 */

/** The coaching room's writable surfaces. */
export interface CoachScreenRefs {
  screen: HTMLElement
  coachTab: HTMLElement
  fighterCard: HTMLElement
  rivalCard: HTMLElement
  kitCard: HTMLElement
  coachNote: HTMLElement
  coachBack: HTMLButtonElement
  coachGo: HTMLButtonElement
}

/** The coaching room: fighter/rival/kit cards over a note + CTA foot. */
export function buildCoachScreen(): CoachScreenRefs {
  const screen = document.createElement("div")
  screen.className = "cup-screen cup-screen-coach"
  const coachHead = document.createElement("div")
  coachHead.className = "cup-head"
  const coachTab = document.createElement("span")
  coachTab.className = "cup-head-tab"
  const coachTitle = document.createElement("span")
  coachTitle.className = "cup-head-title"
  coachTitle.textContent = "Coaching room"
  coachHead.append(coachTab, coachTitle)
  const coachBody = document.createElement("div")
  coachBody.className = "cup-coach-body"

  const fighterCard = document.createElement("div")
  fighterCard.className = "cup-card cup-card-fighter"
  const rivalCard = document.createElement("div")
  rivalCard.className = "cup-card cup-card-rival"
  const kitCard = document.createElement("div")
  kitCard.className = "cup-card cup-card-kit"
  coachBody.append(fighterCard, rivalCard, kitCard)

  const coachFoot = document.createElement("div")
  coachFoot.className = "cup-coach-foot"
  const coachNote = document.createElement("div")
  coachNote.className = "cup-coach-note"
  coachNote.textContent = "Nothing is committed until you step in."
  const coachBack = document.createElement("button")
  coachBack.type = "button"
  coachBack.className = "cup-cta-ghost"
  coachBack.textContent = "Back to bracket"
  const coachGo = document.createElement("button")
  coachGo.type = "button"
  coachGo.className = "cup-cta-go"
  coachGo.textContent = "Step into the arena"
  coachFoot.append(coachNote, coachBack, coachGo)
  screen.append(coachHead, coachBody, coachFoot)
  return {
    screen,
    coachTab,
    fighterCard,
    rivalCard,
    kitCard,
    coachNote,
    coachBack,
    coachGo,
  }
}
