/**
 * Scene logic — the morning-after ritual ledger: the client-held day
 * bookkeeping behind the one-shot arrival (postcup_morning_after FR-2,
 * FR-9, NFR-1). The ceremony plays beats; this module owns days — one
 * ritual per its own morning, the night settle, the evolution-reveal
 * yield seedling. Pure; the derivation rides through as an opaque value.
 */
import type { MorningAfterDerivation } from "../morning-after/derive"

export interface MorningAfterLedger {
  /** The derivation waiting for its ritual day (null when none is pending). */
  pending: MorningAfterDerivation | null
  /** The day the pending was minted — the cup finalize's day. */
  mintedDay: number | null
  /** The day the ritual was consumed (one shot; null when never played). */
  consumedDay: number | null
}

export function createMorningAfterLedger(): MorningAfterLedger {
  return { pending: null, mintedDay: null, consumedDay: null }
}

/** Bank a finalized cup's derivation for its ritual day. The derivation is
 * client-held state only — it never touches the persisted save (NFR-1). */
export function mintMorningAfter(
  ledger: MorningAfterLedger,
  derivation: MorningAfterDerivation,
  day: number,
): void {
  ledger.pending = derivation
  ledger.mintedDay = day
}

/** Whether the ritual may still start on `day` (FR-2): one is pending, the
 * day is the finalize's own morning, and the day has not consumed it yet. */
export function morningAfterDue(
  ledger: MorningAfterLedger,
  day: number,
): boolean {
  return (
    ledger.pending !== null &&
    ledger.mintedDay === day &&
    ledger.consumedDay !== day
  )
}

/**
 * Consume the ritual day — the controller calls this at the arrival it
 * means to start (FR-2). Returns the derivation when the machine must
 * start; null when the day already played (no same-day replay) or the day
 * yields to an evolution reveal (the FR-9 seedling: the ceremony does not
 * start, the day is still consumed, and the derivation stays banked so the
 * debrief copy path can still read it until the night settle).
 */
export function takeMorningAfter(
  ledger: MorningAfterLedger,
  day: number,
  yields: boolean,
): MorningAfterDerivation | null {
  const pending = ledger.pending
  if (!pending || ledger.mintedDay !== day || ledger.consumedDay === day) {
    return null
  }
  ledger.consumedDay = day
  return yields ? null : pending
}

/**
 * The night settle (FR-9, NFR-7): anything banked for an earlier day is
 * dropped — the ritual never persists past the day it belonged to, and no
 * lingering morning-after state survives the settle.
 */
export function settleMorningAfterNight(
  ledger: MorningAfterLedger,
  day: number,
): void {
  if (ledger.mintedDay !== null && day > ledger.mintedDay) {
    ledger.pending = null
    ledger.mintedDay = null
  }
  if (ledger.consumedDay !== null && day > ledger.consumedDay) {
    ledger.consumedDay = null
  }
}
