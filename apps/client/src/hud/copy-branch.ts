import {
  branchLean,
  type Creature,
  EVOLUTION_HINT_DAY,
  getBranch,
  getMove,
  getSpecies,
  LEGACY_BRANCH,
  type StatKey,
} from "@apex/sim"

/**
 * Branch copy (branching_evolution_champion_forms_20261020). The form label,
 * the day-5 lean preview and the earned form's line, in coach voice and with
 * no gate day or threshold in any string — a player learns the direction, not
 * the date (FR-6). Pure (creature → data) functions; the growth panel, the
 * plate badge, the detail Path section and the evolution callout all read the
 * same readings, so a surface can never disagree with another.
 *
 * The stat labels live here rather than in `copy-care` because `copy-growth`
 * imports this module for the reveal line: importing `copy-care` back would
 * close a cycle across the copy surface.
 */

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  atk: "ATK",
  def: "DEF",
  spd: "SPD",
}

/** "ATK + SPD" — favored stats always spelled out. */
function favoredText(favors: readonly StatKey[]): string {
  return favors.map((key) => STAT_LABELS[key]).join(" + ")
}

function signatureName(id: string | null): string {
  return id === null ? "No signature move" : (getMove(id)?.displayName ?? id)
}

/** The section title before the gate steals the word "Form" for itself. */
export const PATH_LEAN_TITLE = "Path lean"
export const PATH_FORM_TITLE = "Form"

/** The two lean qualifiers — honest about where the direction comes from. */
export const TRAINED_LEAN_LINE = "Your training leans this way."
export const NATURE_LEAN_LINE = "Your natural stats lean this way."

/** The preview never promises a signature, because the gate decides it. */
export const SIGNATURE_WITH_FORM = "The signature arrives with the form."

/** The Path row's readings, shared by every surface that shows the form. */
export interface BranchPathRead {
  /** "Path lean" while a baby, "Form" once the gate has resolved. */
  title: string
  /** The form's display label ("Cinder Courser", "Legacy"). */
  label: string
  /** One coach line: the lean's source, or the earned form's own line. */
  line: string
  /** Accent hue for the text-plus-hue treatment (never hue alone). */
  hue: number
  /** Favored stats spelled out ("ATK + SPD"), or "—" for the legacy line. */
  favored: string
  /** Signature move display name, or "No signature move". */
  signature: string
  /** True for the pre-gate preview: no signature, no earned form. */
  preview: boolean
}

/**
 * The creature's path reading, or null. A baby gets the direction-only lean
 * from the hinted day on; a juvenile or champion gets its earned form, and a
 * null branch (a hand-built or legacy state) reads as the old line.
 *
 * The hint threshold reads the pet's OWN age (save v23), so the lean shows
 * up when the pet has lived long enough — not when the ranch has.
 */
export function branchPath(creature: Creature): BranchPathRead | null {
  const species = getSpecies(creature.speciesId)
  if (!species) return null
  if (creature.stage === "baby") {
    if (creature.ageDays < EVOLUTION_HINT_DAY) return null
    const lean = branchLean(creature, species)
    return {
      title: PATH_LEAN_TITLE,
      label: lean.branch.label,
      line: lean.source === "trained" ? TRAINED_LEAN_LINE : NATURE_LEAN_LINE,
      hue: lean.branch.accentHue,
      favored: favoredText(lean.branch.favors),
      signature: SIGNATURE_WITH_FORM,
      preview: true,
    }
  }
  const branch = getBranch(creature.branch ?? LEGACY_BRANCH.id) ?? LEGACY_BRANCH
  const legacy = branch.speciesId === null
  return {
    title: PATH_FORM_TITLE,
    label: branch.label,
    line: branch.line,
    hue: branch.accentHue,
    favored: legacy ? "—" : favoredText(branch.favors),
    signature: signatureName(branch.signatureMove),
    preview: false,
  }
}

/**
 * The evolution-morning clause naming the form that just came in, appended to
 * the announcement that already names the stat leap. Legacy keeps its old
 * line and claims no signature (FR-5, FR-10); a real form names the family of
 * its line and says the signature came with it.
 */
export function branchRevealLine(creature: Creature): string {
  const branch = getBranch(creature.branch ?? LEGACY_BRANCH.id) ?? LEGACY_BRANCH
  if (branch.speciesId === null)
    return `${branch.label} — the old line, no signature.`
  const kind = branch.label.split(" ").slice(-1)[0]?.toLowerCase() ?? "branch"
  return `${branch.label} — the ${kind} line, signature included.`
}
