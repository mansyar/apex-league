/**
 * The spar's casting/start path (spar_modules split): both fighters as arena
 * casts and the HUD's fight view for the bout. Moved verbatim out of spar.ts.
 */

import { type Creature, startingHp } from "@apex/sim"
import type { PlaybackFight } from "../battle-session"
import { castFighter } from "../battleUI"
import type { FightCasting } from "../staging"
import { visualSeedOf } from "../staging-seed"
import type { SparSetup } from "./types"

/** Both fighters as arena casts: species-preserving seeds, ranch-stable. */
export function castingFor(owned: Creature, setup: SparSetup): FightCasting {
  return {
    owned: {
      ...castFighter({
        speciesId: owned.speciesId,
        name: owned.name,
        seed: visualSeedOf(owned.stats, owned.stage, owned.branch),
        // The stage rides along: a champion casts its grander arena build.
        stage: owned.stage,
        // Mirror matches share a display name; the side key disambiguates.
        key: setup.ownedSide.id ?? owned.name,
        context: "the spar",
      }),
      branch: owned.branch,
    },
    rival: {
      ...castFighter({
        speciesId: setup.rivalSpeciesId,
        name: setup.rival.name,
        seed: visualSeedOf(setup.rival.stats, setup.rival.stage),
        key: setup.rivalSide.id ?? setup.rival.name,
        context: "the spar",
      }),
      // A generated rival fights in a derived form (Phase 3); tint that form.
      branch: setup.rivalSide.branch,
    },
  }
}

/** The HUD's view of both fighters for the duration of the bout.
 *
 *  `maxHp` is the pool the resolver actually fights on. Since Phase 5 folded
 *  the old HP scale into the stat, that is the stat HP itself — the setup
 *  panel and the bar now read the same number (FR-2).
 */
export function fightNowFor(setup: SparSetup): PlaybackFight {
  return {
    owned: {
      name: setup.ownedSide.name,
      key: setup.ownedSide.id ?? setup.ownedSide.name,
      element: setup.ownedSide.element,
      maxHp: startingHp(setup.ownedSide),
      doctrine: setup.ownedSide.doctrine,
      rule: setup.ownedSide.rule,
    },
    rival: {
      name: setup.rivalSide.name,
      key: setup.rivalSide.id ?? setup.rivalSide.name,
      element: setup.rivalSide.element,
      maxHp: startingHp(setup.rivalSide),
      doctrine: setup.rivalSide.doctrine,
      rule: setup.rivalSide.rule,
    },
  }
}
