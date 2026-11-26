/**
 * The shared verdict stamp shape. DOM only: copy comes from `./copy`, and
 * the caller keeps its own text, class-lifecycle and animation code.
 */

export interface StampClassNames {
  root: string
  title: string
  rule: string
  sub: string
}

export interface StampView {
  root: HTMLDivElement
  title: HTMLDivElement
  rule: HTMLDivElement
  sub: HTMLDivElement
}

export function buildStampView(
  classes: StampClassNames,
  options?: { announce?: boolean; parentChildren?: boolean },
): StampView {
  const root = document.createElement("div")
  root.className = classes.root
  if (options?.announce) {
    root.setAttribute("role", "status")
    root.setAttribute("aria-live", "polite")
  }
  const title = document.createElement("div")
  title.className = classes.title
  const rule = document.createElement("div")
  rule.className = classes.rule
  const sub = document.createElement("div")
  sub.className = classes.sub
  if (options?.parentChildren !== false) {
    root.append(title, rule, sub)
  }
  return { root, title, rule, sub }
}
