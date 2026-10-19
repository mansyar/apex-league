/**
 * The rival kit rule (move_pool_20261018 FR6): a rival knows its species'
 * six moves but fields four, so a widened pool adds variety to what the
 * player faces without handing opponents a bigger kit than the player can
 * equip. The pick is seeded and draws from its own stream, which is what
 * keeps spar species, tactic, and creature stats byte-identical to the
 * pre-pool seeds.
 */

import { MAX_LOADOUT } from "../loadout"
import { makeRng } from "../rng"
import type { SpeciesDef } from "../species"

/** A fixed salt keeps the pick decorrelated from the battle seed. */
const RIVAL_KIT_SALT = 0x9e3779b9

/**
 * The four moves a rival fields from its species pool. Deterministic per
 * seed, always `MAX_LOADOUT` distinct ids, and independent of any RNG the
 * caller is holding.
 */
export function rivalKit(species: SpeciesDef, seed: number): readonly string[] {
  const rng = makeRng((seed ^ RIVAL_KIT_SALT) >>> 0)
  const pool = [...species.kit]
  const kit: string[] = []
  const size = Math.min(MAX_LOADOUT, pool.length)
  while (kit.length < size) {
    const [moveId] = pool.splice(rng.int(pool.length), 1)
    if (moveId !== undefined) kit.push(moveId)
  }
  return kit
}
