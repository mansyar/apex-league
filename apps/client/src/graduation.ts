/**
 * The legacy surfaces (legacy_breeding_20261013): the graduation confirm
 * modal, the egg screen (choose the next creature, with the inherited stat
 * floor previewed), and the Hall of Fame panel. Presentation only — the sim
 * decides eligibility (canGraduate) and performs the succession (graduate);
 * main.ts owns the wiring and the ceremony.
 *
 * graduation_modules split: the copy/derivations, the modal shell, the egg
 * screen, the Hall of Fame and the flow live in ./graduation/*; this file is
 * the surface every importer already uses, re-exported unchanged.
 */

export {
  confirmCopy,
  confirmLabel,
  floorSummary,
  hallEntryLabel,
  hallEntryMeta,
  hatchFailureCopy,
  lineageSummary,
  perkLabels,
} from "./graduation/copy"
export { createGraduation } from "./graduation/flow"
export type { GraduationFlow, GraduationHandlers } from "./graduation/types"
