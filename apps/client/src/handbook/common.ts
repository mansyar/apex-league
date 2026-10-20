/**
 * Shared handbook DOM: element labels, the trusted-glyph append, and the three
 * node shapes every page reuses (terminus-free rule rows, tips, subheads).
 * Kept here so the page builders stay small and the barrel thin.
 */

export const ELEMENT_LABELS: Record<string, string> = {
  fire: "Fire",
  plant: "Plant",
  water: "Water",
  electric: "Electric",
  earth: "Earth",
  wind: "Wind",
}

/**
 * Append a trusted, static glyph SVG without assigning innerHTML on a
 * live element — template parsing keeps the same trusted-source contract
 * with a narrower blast radius.
 */
export function appendGlyph(target: HTMLElement, svg: string): void {
  const template = document.createElement("template")
  template.innerHTML = svg
  target.append(template.content)
}

/** A paragraph of coach copy. */
export function tip(text: string): HTMLParagraphElement {
  const node = document.createElement("p")
  node.className = "handbook-tip"
  node.textContent = text
  return node
}

/** A two-column term/copy row (ladder tiers, programs, form tiers). */
export function ruleRow(term: string, copy: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "handbook-rule"
  const head = document.createElement("span")
  head.className = "handbook-rule-term"
  head.textContent = term
  const text = document.createElement("span")
  text.className = "handbook-rule-copy"
  text.textContent = copy
  row.append(head, text)
  return row
}

/** A section heading inside a page (same skin as the moves table heads). */
export function subhead(text: string): HTMLHeadingElement {
  const head = document.createElement("h3")
  head.className = "handbook-moves-head"
  head.textContent = text
  return head
}
