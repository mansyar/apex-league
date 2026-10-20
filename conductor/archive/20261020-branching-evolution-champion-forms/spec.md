# Branching Evolution & Champion Forms

## Overview

Each starter species grows into one of two champion forms, and the form is earned by how the player trained, not chosen from a menu. At the juvenile gate, the creature's accumulated trained stats decide the branch: power and sprint work lean the offense form; endurance and ring work lean the defense form. The branch then carries through the champion gate, bringing its own stat distribution and one signature special.

This turns the four training programs into a long-horizon decision, makes the day-10 evolution a consequence of the care loop, and adds a second champion identity per species without new species, new elements, or regenerated voxel artifacts.

## Problem / Motivation

Evolution is currently a straight line. Every Ember Drake becomes the same Ember Drake on day 10 and the same champion on day 25; the only variation is rolled base stats, training totals, and form. The product describes 3-stage branching evolution trees (`conductor/product.md`, Key Systems), and Phase 2 still lists evolution branching as open.

The training system landed in the previous track gives every creature a per-stat record of how it was raised, but that record currently only adds flat stats. Nothing about *how* the player trained changes *what* the creature becomes. A fork derived from that record makes the existing programs strategic and gives each run a readable identity without adding a decision modal or a new resource.

A free-choice picker was considered and rejected: it interrupts the day loop, needs defer/pause and respec state, and makes the training history cosmetic. Deriving the branch keeps the loop uninterrupted and makes the choice emergent, at the cost of explicit agency — mitigated by a visible lean preview before the gate.

## Goals & Success Metrics

- Every creature that reaches the juvenile gate leaves it on a branch, with no picker, modal, or extra click.
- The branch is predictable from play: a player who trains one side of the stat split always gets that side's form.
- Training programs gain strategic weight: at least one program pair steers each branch, and both branches are reachable from a normal day-10 training budget.
- Saves migrate with zero stat drift for existing creatures; legacy goldens stay byte-identical.
- No new voxel artifacts or GLB changes; the determinism gate remains byte-identical.
- Both branches stay viable: no branch wins more than 55% of same-species mirror probes, and neither falls outside the existing 40–70% band against the legacy form.

## Scope

### In Scope

- Two branches per starter species (six forms total).
- A pure derivation rule over `creature.trained`, with a documented tie-break and a natural-stat fallback.
- Branch-specific juvenile and champion stat boosts that preserve the legacy effective-stat budget.
- One signature special per branch, known from the juvenile gate and equippable only on that branch.
- Save v19: `creature.branch`, migration, validation, export/import, schema docs.
- Branch on Hall of Fame records; new eggs start unchosen; no branch inheritance.
- Deterministic branch derivation for generated rivals; bosses remain legacy forms.
- Lean preview from day 5, evolution reveal copy, growth panel, creature plate, detail modal, handbook.
- Runtime accent tint and a branch label/crest badge; no GLB regeneration.
- Balance probes and golden coverage for both branches.

### Out of Scope

- A branch picker, defer, pause, or respec of any kind.
- Branch-specific geometry, palettes baked into GLBs, or new voxel signature parts.
- New species, elements, moves beyond the six signatures, or boss rebalances.
- Branch inheritance, affinity drift, or breeding changes beyond recording the parent branch.
- Backend, cloud saves, or leaderboards.
- Renaming or re-theming the existing starter species.

## Functional Requirements

**FR-1 — Branch catalog (P0).** `packages/sim/src/branches.ts` defines exactly two real branches per starter species, each with: stable id, species id, label, coach line, favored stat pair, juvenile boost, cumulative champion boost, signature move id, and accent hue. A synthetic `legacy` branch carries the pre-v19 juvenile and champion boosts and no signature move. `getBranch` and `branchesForSpecies` are the only lookups; unknown ids return undefined.

| Species | Branch id | Form | Lean | Signature |
| --- | --- | --- | --- | --- |
| `fire_drake` | `cinder_courser` | Cinder Courser | ATK + SPD | Cinder Dive, 12/75/2 |
| `fire_drake` | `pyre_warden` | Pyre Warden | HP + DEF | Pyre Wall, 9/100/2 |
| `plant_ox` | `thorn_ram` | Thorn Ram | ATK + SPD | Thorn Charge, 12/75/2 |
| `plant_ox` | `bramble_bulwark` | Bramble Bulwark | HP + DEF | Bramble Guard, 9/100/2 |
| `water_axolotl` | `riptide_runner` | Riptide Runner | ATK + SPD | Riptide Rush, 12/75/2 |
| `water_axolotl` | `reef_keeper` | Reef Keeper | HP + DEF | Tide Aegis, 9/100/2 |

The signature pairs share cooldown 2 and expected damage 9 per hit (4.5 per action): one heavy and risky, one reliable. Labels and move names are placeholders that can change without touching ids; the probe in Phase 3 may retune the numbers.

**FR-2 — Training-derived branch (P0).** `branchLean(creature, species)` returns the branch the creature would earn now, plus whether the lean came from training or natural stats. The rule is:
1. Compare `trained.atk + trained.spd` against `trained.hp + trained.def`; the higher side wins.
2. If equal, take the highest single trained stat. If every stat at that maximum belongs to one side, that side wins; if the maximum is shared across sides, continue.
3. Repeat steps 1–2 with `effectiveStats`.
4. If still tied, the species' branch catalog order wins (first entry).

The function is pure, integer-only, and has no randomness. `evolveCreature` calls it; the growth panel calls it. There is no second copy of the rule.

**FR-3 — Evolution integration (P0).** `Creature.branch` is `string | null`. A baby evolving at the juvenile gate derives and stores its branch, then applies that branch's juvenile boost. A juvenile evolving at the champion gate keeps its branch and applies that branch's cumulative champion boost. A `legacy` creature applies the original `EVOLUTION_STAT_BOOST` and `CHAMPION_STAT_BOOST` exactly as today. Evolution stays automatic in `settleCreature`; there is no offer, pending state, or blocking gate.

**FR-4 — Signature moves (P0).** Add one special per real branch to the catalog (six total), each using its species element. A branched creature knows its signature as a seventh known move from the juvenile gate; `legacy` knows only the species kit. `setLoadout` accepts the signature only for the matching branch, rejects it for the other branch and for legacy, and the default loadout stays the first four species-kit moves. Signature pairs share equal expected damage per cooldown with different variance (one reliable, one heavy), and neither may strictly dominate the best existing special of its element on expected damage per action.

**FR-5 — No picker, no pause (P0).** No surface asks the player to choose a branch. The gate resolves overnight as it does today. The morning reveal names the earned form in coach voice, using the branch label, and never asks for confirmation.

**FR-6 — Lean preview (P1).** From `EVOLUTION_HINT_DAY` (day 5) while the creature is a baby, the growth panel shows a direction-only lean row: the branch the current training favors, or a "nature" variant when the lean comes from base stats rather than training. The row updates after settlement and must not reveal the mood, bond, cup, or day thresholds. The same preview is available without a new modal.

**FR-7 — Persistence (P0).** Save version 19 adds `creature.branch` (`null` before the juvenile gate) and `RetiredRecord.branch`. Migration: v18 babies become `null`; v18 juveniles and champions become `legacy`; Hall records become `legacy`. Validation rejects unknown branch ids and a branch on a baby. Export/import round-trips the field. `docs/save-schema.md` documents v19.

**FR-8 — Records and breeding (P1).** Hall of Fame entries display and store the branch. A bred egg starts with `branch: null` and derives its own at the gate; a parent's branch never pre-selects the child. Breeding floors and traits are unchanged.

**FR-9 — Rivals and bosses (P1).** Generated rivals derive a branch deterministically from their seeded trained profile, falling back to natural stats, so cup fields show both forms. Boss definitions remain `legacy` with their pinned stats, loadouts, and tactics; no boss numbers change.

**FR-10 — Presentation (P1).** The grown form is visible without reading a stat block: a per-instance runtime accent tint on the creature and a branch label plus element crest on the plate, growth panel, and detail modal. Tinting must not mutate shared materials across instances. The detail modal lists the signature move in the move pool with its branch tag.

**FR-11 — Handbook and copy (P1).** The handbook gains a Paths section that explains the stat split, the day-5 lean preview, and the legacy exception, using sim constants and branch labels rather than duplicated numbers. All new copy stays within two sentences per tooltip, uses coach voice, and never states a threshold the player has not discovered.

**FR-12 — Accessibility (P1).** The lean row, reveal, branch label, and signature tag are conveyed by text as well as hue. The reveal does not depend on animation, and reduced motion removes any tint transition. No new pointer-only interaction is added.

## Non-Functional Requirements

**NFR-1 — Determinism.** Branch derivation, boosts, and signature selection are integer-only and independent of `Math.random`. Legacy evolution output is unchanged. `bun run gate:determinism` stays byte-identical for every committed artifact.

**NFR-2 — No artifact churn.** No GLB, palette table, or voxel source changes. Branch presentation is runtime-only.

**NFR-3 — Module size.** Every new or changed `apps/client/src` module stays at or below the 12,288-byte cap enforced by `module-size.test.ts`; split along seams rather than raising the cap.

**NFR-4 — Save safety.** Migration is total for v18 inputs, idempotent, and leaves corrupt or unreadable saves on the existing recovery path. A failed validation never half-writes a save.

**NFR-5 — Performance.** The tint adds no draw calls or geometry; it reuses the existing per-instance material path. The lean preview runs once per HUD sync and allocates no per-frame work.

**NFR-6 — Test coverage.** Branch derivation covers trained, tie, natural, and species-order cases; evolution covers juvenile, champion, and legacy; loadout covers accept and both reject paths; migration covers baby, juvenile, champion, and Hall record fixtures.

**NFR-7 — Docs truth.** `docs/save-schema.md`, the product roadmap, and the handbook agree with the shipped behavior; no speculative branch features are documented as present.

## Acceptance Criteria

- **AC-1** — A v18 save with a champion migrates to v19 with `branch: "legacy"`, identical stats, and no signature move. `Verifies: FR-7, NFR-4`
- **AC-2** — A v18 baby migrates with `branch: null` and earns a real branch at its juvenile gate. `Verifies: FR-2, FR-7`
- **AC-3** — A creature trained only in power and sprint evolves into the offense form at day 10; one trained only in endurance and ring evolves into the defense form. `Verifies: FR-2, FR-3`
- **AC-4** — Equal trained pairs fall through to the highest single stat, then effective stats, then species order, in that order, and the result is identical across repeated runs. `Verifies: FR-2, NFR-1`
- **AC-5** — Juvenile and champion boosts leave both branches at the same effective-stat budget as the legacy form (11 and 22, HP weighted double). `Verifies: FR-1, FR-3`
- **AC-6** — The signature move is known and equippable on its branch at juvenile, rejected on the sibling branch and on legacy, and absent from the default loadout. `Verifies: FR-4`
- **AC-7** — No client surface asks for a branch choice; the evolution morning names the earned form and the day loop is unchanged. `Verifies: FR-5, FR-10`
- **AC-8** — The growth panel shows the correct lean from day 5, updates when training changes it, and never prints an undiscovered threshold. `Verifies: FR-6, FR-11`
- **AC-9** — Hall of Fame, save export/import, and the detail modal all round-trip and display the branch and signature. `Verifies: FR-7, FR-8, FR-10`
- **AC-10** — Generated rivals receive deterministic branches; boss definitions stay legacy and their pinned numbers are unchanged. `Verifies: FR-9, NFR-1`
- **AC-11** — Same-species mirror probes for both branches stay within 45–55%, and each branch stays within the existing 40–70% band against legacy; both branches appear in at least one viable loadout. `Verifies: FR-4, FR-9, NFR-6`
- **AC-12** — The determinism gate is byte-identical, the 12 KB module cap passes, and the tint does not change another creature's materials. `Verifies: NFR-1, NFR-2, NFR-3, NFR-5`

## Edge Cases

- **Zero training at the gate:** derivation falls through to effective stats, then species order; the preview labels it as a nature lean, not a training lean.
- **Even trained split:** the highest-single-stat step breaks the tie; if the maximum is shared across both sides, effective stats decide.
- **Trained totals tied after the champion gate:** the branch is already stored and is never re-derived.
- **Legacy creature trained heavily:** it keeps the legacy boosts and never gains a signature move or changes branch.
- **A v18 juvenile imported mid-run:** migrates to `legacy`, keeps its current stats, and finishes its run without a signature.
- **A creature renamed on evolution morning:** branch and label follow the creature record, not the name.
- **Cup day:** no interaction changes; the gate resolves on the existing night advance, and the branch cannot change mid-cup.
- **Unknown branch id in a save:** rejected by validation and routed to the existing recovery flow.
- **Species with no branch entry (future):** `branchesForSpecies` returns an empty list and the creature evolves legacy; the catalog test forbids this for shipped starters.

## Assumptions

- One fork, at the juvenile gate; the champion form follows the branch chosen there.
- The branch is earned from training totals, not chosen, rolled, or inherited.
- `legacy` is migration-only and boss-only; new creatures can never enter it.
- Both branches are intended to be sidegrades, not a good and a bad path.
- Presentation is a tint and a label; geometry variants are a later track.
- The existing 40–70% boss band is the right fairness reference for branch probes.

## References

- `packages/sim/src/evolution.ts` — gates, boosts, verdicts.
- `packages/sim/src/settlement.ts` — the night that applies evolution.
- `packages/sim/src/loadout.ts` — known moves, tiers, 4-of-7 equipping.
- `packages/sim/src/battle/moves.ts` — special catalog and stat lines.
- `packages/sim/src/save/` and `docs/save-schema.md` — v18 persistence and migrations.
- `conductor/archive/20261020-training-programs-form/spec.md` — trained stats, programs, form.
- `conductor/product.md` — branching trees, Phase 2 open items.
- `conductor/product-guidelines.md` — element hues, crests, voice, a11y.
