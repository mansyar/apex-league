import type { Creature } from "@apex/sim"
import { branchPath, SIGNATURE_WITH_FORM } from "../hud/copy-branch"

/**
 * The detail modal's Path section (branching_evolution_champion_forms_20261020
 * FR-10): the earned form, its favored stats, its signature move and one coach
 * line — or, for a baby past the hinted day, the same direction-only preview
 * the Growth panel shows. Text carries every reading; the accent hue only
 * reinforces it.
 *
 * Lives beside the panel's other sections rather than inside
 * `creature-detail.ts` so that module stays under the 12 KB cap (NFR-2).
 */

/** One "label — value" reading. */
function pathLine(label: string, value: string): HTMLElement {
  const row = document.createElement("div")
  row.className = "detail-path-row"
  const name = document.createElement("span")
  name.className = "detail-path-label"
  name.textContent = label
  const read = document.createElement("span")
  read.className = "detail-path-value"
  read.textContent = value
  row.append(name, read)
  return row
}

/**
 * The Path section for the Stats page, or null before the hinted day (when
 * there is honestly nothing to say yet). Never prints a gate day, a threshold
 * or a signature the creature has not earned.
 */
export function buildPathSection(creature: Creature): HTMLElement | null {
  const path = branchPath(creature)
  if (!path) return null
  const section = document.createElement("div")
  section.className = "detail-path"
  section.dataset.preview = path.preview ? "true" : "false"
  section.setAttribute("style", `--hue: ${path.hue}`)
  const title = document.createElement("h2")
  title.className = "detail-path-title"
  title.textContent = "Path"
  section.append(title, pathLine(path.title, path.label))
  if (path.favored !== "—") section.append(pathLine("Favors", path.favored))
  if (!path.preview) section.append(pathLine("Signature", path.signature))
  const line = document.createElement("p")
  line.className = "detail-path-line"
  line.textContent = path.preview
    ? `${path.line} ${SIGNATURE_WITH_FORM}`
    : path.line
  section.append(line)
  return section
}
