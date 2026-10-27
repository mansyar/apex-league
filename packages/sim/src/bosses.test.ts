/**
 * The boss registry (silver_ladder_bosses_20261016, FR8).
 *
 * Bosses are authored rivals: existing species with pinned absolute stats
 * (legal by construction), pinned kits that obey the equip rules, and coach
 * persona copy the client reads in Phase 4. The registry is pure frozen
 * data — no RNG, no state.
 */
import { describe, expect, it } from "bun:test"
import { BASIC_MOVE } from "./battle/moves"
import type { Tactic } from "./battle/policy"
import { BOSSES, CUP_ROUTES, getBoss } from "./bosses"
import { BRANCHES } from "./branches"
import { createCreature } from "./creature"
import { battleSideForSlot, makeBracket, substituteFinalBoss } from "./cup"
import { getSpecies } from "./species"

describe("boss registry", () => {
  it("holds exactly six bosses with stable ids, tiers and milestones", () => {
    expect(BOSSES.map((b) => b.id)).toEqual([
      "koda",
      "hesse",
      "marlow",
      "delmar",
      "fenn",
      "thessa",
    ])
    expect(BOSSES.map((b) => [b.tier, b.milestone])).toEqual([
      ["bronze", "promotion"],
      ["silver", "checkpoint"],
      ["silver", "apex"],
      ["silver", "promotion"],
      ["gold", "checkpoint"],
      ["gold", "apex"],
    ])
  })

  it("keeps one boss per (tier, milestone) pair", () => {
    const seen = new Set(BOSSES.map((b) => `${b.tier}:${b.milestone}`))
    expect(seen.size).toBe(BOSSES.length)
  })

  it("freezes the registry so callers cannot bend it", () => {
    expect(Object.isFrozen(BOSSES)).toBe(true)
  })

  it("looks bosses up by id and returns undefined for unknown ids", () => {
    expect(getBoss("koda")?.name).toBe("Sear Marshal Koda")
    expect(getBoss("nope")).toBeUndefined()
  })

  it("gives every boss a species that exists in the catalog", () => {
    for (const boss of BOSSES) {
      expect(getSpecies(boss.speciesId)).toBeDefined()
    }
  })

  it("pins absolute stats inside the species' legal roll bounds", () => {
    for (const boss of BOSSES) {
      const species = getSpecies(boss.speciesId)
      expect(species).toBeDefined()
      if (!species) continue
      for (const stat of ["hp", "atk", "def", "spd"] as const) {
        const [min, max] = species.statBounds[stat]
        expect(boss.stats[stat]).toBeGreaterThanOrEqual(min)
        expect(boss.stats[stat]).toBeLessThanOrEqual(max)
      }
    }
  })

  it("pins a legal loadout: 2-4 unique moves from the species' kit", () => {
    for (const boss of BOSSES) {
      const species = getSpecies(boss.speciesId)
      expect(species).toBeDefined()
      if (!species) continue
      expect(boss.loadout.length).toBeGreaterThanOrEqual(2)
      expect(boss.loadout.length).toBeLessThanOrEqual(4)
      expect(new Set(boss.loadout).size).toBe(boss.loadout.length)
      for (const move of boss.loadout) {
        expect(species.kit).toContain(move)
        expect(move).not.toBe(BASIC_MOVE.id)
      }
    }
  })

  it("fields at least one move from the wider pool", () => {
    // move_pool_20261018: the six-move pool is only felt if the ladder's
    // gatekeepers actually bring it. Every boss carries at least one of the
    // two post-tier-4 rows.
    for (const boss of BOSSES) {
      const species = getSpecies(boss.speciesId)
      if (!species) continue
      const wider = boss.loadout.filter(
        (move) => species.kit.indexOf(move) >= 4,
      )
      expect(wider.length).toBeGreaterThanOrEqual(1)
    }
  })

  it("uses a tactic from the existing tactic set", () => {
    const LEGAL: readonly Tactic[] = ["balanced", "specials"]
    for (const boss of BOSSES) {
      expect(LEGAL).toContain(boss.tactic)
    }
  })

  it("carries complete persona copy: name, intro, win and loss quips", () => {
    for (const boss of BOSSES) {
      expect(boss.name.length).toBeGreaterThan(0)
      expect(boss.intro.length).toBeGreaterThan(0)
      expect(boss.quips.win.length).toBeGreaterThan(0)
      expect(boss.quips.loss.length).toBeGreaterThan(0)
    }
  })

  it("pins every boss to the pre-branch legacy form", () => {
    for (const boss of BOSSES) expect(boss.branch).toBe("legacy")
  })

  it("never wields a form-exclusive special of a species the boss is not", () => {
    // User decision 2026-10-25 (species-roster-expansion Phase 1): a
    // signature move may double as another species' kit row, so the
    // invariant is scoped to its spirit — a legacy-form boss may wield a
    // kit row of its own species even when a later line's champion form
    // claims that row as its signature, but never the signature of a
    // species it is not.
    const signaturesBySpecies = new Map<string, Set<string>>()
    for (const branch of BRANCHES) {
      if (branch.speciesId === null || branch.signatureMove === null) continue
      const set = signaturesBySpecies.get(branch.speciesId) ?? new Set()
      set.add(branch.signatureMove)
      signaturesBySpecies.set(branch.speciesId, set)
    }
    // Every real branch still owns a distinct form-exclusive special.
    const allSignatures = new Set(
      [...signaturesBySpecies.values()].flatMap((set) => [...set]),
    )
    expect(allSignatures.size).toBe(BRANCHES.length)
    // The exemption is real but narrow, so it is recorded as data instead of
    // asserted with a predicate that the loadout-subset rule above already
    // satisfies. Each entry is a boss wielding another species' champion
    // signature that its own species kit carries: the only overlap the user
    // decision allows. A new overlap — or a stale entry — fails here.
    const sharedSignatures = BOSSES.flatMap((boss) => {
      // Kit is a 6-tuple at the type level; read it as a readonly list here.
      const ownKit: readonly string[] = getSpecies(boss.speciesId)?.kit ?? []
      return boss.loadout
        .filter(
          (move) =>
            ownKit.includes(move) &&
            [...signaturesBySpecies.entries()].some(
              ([speciesId, signatures]) =>
                speciesId !== boss.speciesId && signatures.has(move),
            ),
        )
        .map((move) => `${boss.id}/${move}`)
    })
    expect(sharedSignatures).toEqual([
      // fire_drake wields soot_warden's (embercub) signature, a kit row.
      "koda/spark",
      // fire_drake wields ember_bank's (cindermoor) signature, a kit row.
      "koda/flame_charge",
      // plant_ox wields moss_warden's (mossboar) signature, a kit row.
      "hesse/seed_shot",
      // plant_ox wields spore_warden's (fernstag) signature, a kit row.
      "hesse/spore_burst",
      // water_axolotl wields foam_warden's (mistkit) signature, a kit row.
      "marlow/bubble",
      // water_axolotl wields mist_courser's (mistkit) signature, a kit row.
      "marlow/splash_bolt",
      // water_axolotl wields foam_warden's (mistkit) signature, a kit row.
      "delmar/bubble",
      // water_axolotl wields tide_sentinel's (reefclaw) signature, a kit row.
      "delmar/tide_shot",
      // fire_drake wields soot_warden's (embercub) signature, a kit row.
      "fenn/spark",
      // fire_drake again, via both cindermoor forms' signatures.
      "fenn/flame_charge",
      "fenn/pyre_lance",
      // plant_ox wields moss_warden's (mossboar) signature, a kit row.
      "thessa/seed_shot",
      // plant_ox wields briar_charger's (mossboar) signature, a kit row.
      "thessa/bramble_dart",
      // plant_ox wields frond_lasher's (fernstag) signature, a kit row.
      "thessa/root_quake",
    ])
  })

  it("a substituted boss slot keeps its pinned build and fights legacy", () => {
    const bracket = makeBracket(createCreature("fire_drake", 11), 7, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("The koda boss is missing")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    expect(promoted.finalRival.bossId).toBe(boss.id)
    expect(promoted.finalRival.stats).toEqual(boss.stats)
    const side = battleSideForSlot(promoted.finalRival, 99)
    expect(side.branch).toBe("legacy")
    expect(side.stats).toEqual(boss.stats)
    expect(side.kit).toEqual(boss.loadout)
    expect(side.tactic).toBe(boss.tactic)
  })
})

describe("CUP_ROUTES — the table behind bossForCup (cup_module_refactor_20261018)", () => {
  it("routes every tier through a frozen, ordered rule list", () => {
    expect(Object.isFrozen(CUP_ROUTES)).toBe(true)
    expect(CUP_ROUTES.bronze.map((r) => r.when)).toEqual(["gate"])
    expect(CUP_ROUTES.silver.map((r) => r.when)).toEqual([
      "gate",
      "checkpoint",
      "apex",
    ])
    expect(CUP_ROUTES.gold.map((r) => r.when)).toEqual([
      "gate",
      "checkpoint",
      "apex",
    ])
    // Legend is the capstone — no boss, no gate.
    expect(CUP_ROUTES.legend).toEqual([])
  })

  it("pins the gate→milestone pairing per tier (silver gates on 'promotion', gold on 'apex')", () => {
    expect(CUP_ROUTES.bronze.find((r) => r.when === "gate")?.milestone).toBe(
      "promotion",
    )
    expect(CUP_ROUTES.silver.find((r) => r.when === "gate")?.milestone).toBe(
      "promotion",
    )
    expect(CUP_ROUTES.gold.find((r) => r.when === "gate")?.milestone).toBe(
      "apex",
    )
  })

  it("gates open Promotion Cups; checkpoint and apex rules open championships", () => {
    for (const tier of ["bronze", "silver", "gold"] as const) {
      for (const rule of CUP_ROUTES[tier]) {
        if (rule.when === "gate") expect(rule.kind).toBe("promotion")
        else expect(rule.kind).toBe("championship")
      }
    }
  })

  it("every rule's (tier, milestone) resolves to exactly one registry boss", () => {
    for (const tier of ["bronze", "silver", "gold"] as const) {
      for (const rule of CUP_ROUTES[tier]) {
        const boss = BOSSES.find(
          (b) => b.tier === tier && b.milestone === rule.milestone,
        )
        expect(boss).toBeDefined()
      }
    }
  })
})
