/**
 * The spar battle-log toggle's presentation mapping (audit finding: the
 * "log formatting" lives in battle-session; this module only owns the
 * toggle's label/aria pair).
 */

/** "Battle log ▸" when hidden, "Battle log ▴" when open. */
export function logToggleLabel(hidden: boolean): string {
  return hidden ? "Battle log ▸" : "Battle log ▴"
}
