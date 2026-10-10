# Spec — Water Axolotl Unlock (Track ID: `water_starter_20261010`)

## Overview
Release the **Tide Axolotl** (`water_axolotl`) as the third playable starter,
completing the Fire/Water/Plant starter trio promised by the MVP. The
archetype art already shipped ([axolotl_20261010](../axolotl_20261010/index.md));
every gate that references it keys off `SpeciesDef.available`. This track
flips the switch and cleans up the ripple: sim tests, exhibition rival pool,
starter UI, plus water-flavored copy, a balance review, and a manual visual
verification pass.

## Functional Requirements
1. **Availability flip** (`packages/sim/src/species.ts`):
   `water_axolotl.available: false → true`. Nothing else in the catalog may
   change unless the balance review (FR5) finds a documented issue.
2. **Sim behavior unlocked**:
   - `createCreature` must now accept `water_axolotl` (previously throws
     `Species not yet available`).
   - `makeExhibition` includes Tide Axolotl in the seeded rival pool; update
     the stale "excluded while unavailable" comment.
3. **Test ripple updates** (TDD per workflow):
   - Update tests asserting the locked state (`creature.test.ts` "throws when
     creating a locked species", `moves.test.ts` availability check,
     `exhibition.test.ts` rival filter) — success *and* failure cases for the
     trio, e.g. generic unavailable-species throw still covered (use a
     synthetic species id rather than the released one).
   - Add trio sanity tests: all three starters `available` with distinct
     elements/archetypes; each appears in the exhibition rival pool across
     seeds.
4. **Client starter UI**: the locked-card branch in `starter.ts` stays
   (data-driven, harmless), but with all starters available the "Coming soon"
   ribbon can never be seen — that is the correct post-unlock state.
5. **Balance review (documented, conservative)**: verify the shipped
   placeholder numbers read reasonably against both starters —
   `hp 40–48 / atk 8–12 / def 8–11 / spd 8–11`, temperament `obedient`
   (middle-of-road vs. Ember Drake rush-offense and Bramble Ox slow-tank).
   Water kit tiers use the standard stat ladder (`bubble`…`splash_bolt`) like
   the other elements so type trade-offs decide matches. Record a short
   balance note in the Post-Review section below; only deviate from current
   numbers with a stated reason.
6. **Flavor copy**:
   - Confirm `flavor` on the starter card lands well next to drake/ox copy
     (already exists: "An easygoing swimmer that hums bubbles when it is
     happy.").
   - Add a water-flavored coach touch: species/element-aware coach-voice line
     on care callouts or a small `unlockCallout`-style addition, following
     `hud.copy.test.ts` patterns (≤2 sentences, never punishing).
7. **Manual visual verification (browser)**: starter overlay shows three
   enabled cards; pick Tide Axolotl → ranch renders the axolotl GLB with
   breath/tail life; conditions and care buttons work; Spar runs vs. a seeded
   rival (rival filter includes axolotl). Capture screenshot + console check
   as evidence, per `workflow.md`.

## Non-Functional Requirements
- Pure-data change in sim; no DOM / no Three.js dependencies added.
- Determinism: no RNG contract changes; exhibition roster index shifts are
  accepted and covered by tests.
- `bun run verify` green; suite runtime unchanged or faster.

## Acceptance Criteria
- [ ] A fresh save shows three enabled, styled starter cards; Tide Axolotl is
      choosable.
- [ ] A Tide Axolotl creature raises, trains (kits unlock at tier days), and
      spars in the free exhibition against the full trio rival pool.
- [ ] All locked-axolotl tests are updated/removed; trio coverage in place;
      `bun test` green.
- [ ] `bun run verify` passes (types, biome, determinism gate untouched — no
      generator changes).
- [ ] Balance note recorded; water-flavored copy lands with its copy test.

## Post-Review Notes
- (Balance review lands here during Phase C.)

## Out of Scope
- Evolution stages, cups/ladder, arena replay, breeding/legacy.
- New axolotl moves beyond the existing 4-tier water kit.
- Save migration version bump (v4 schema already carries axolotl-compatible
  fields; no shape change).
- Removal of the starter-card locked-render code path (data-driven and
  future-safe).
