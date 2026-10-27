# Phase 1 evidence — Roster Wave 4 (Fire/Plant/Water Discovery)

- Track: 20261027-roster-wave-4 — Roster Wave 4 (Fire/Plant/Water Discovery)
- Phase: 1 — Species data, kits & discovery lookup
- Date: 2026-10-27 (UTC)
- Branch: feat/20261027-roster-wave-4
- Base: 331edfb072912494847885adfdde0f0be39bb576
- Heads: 61f6744e (sim species/discovery work), 1cab6162 (roster test pins); evidence committed separately
- Result: verified

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| full suite (pre-fix) | `bun test --check --parallel=4 --timeout 120000` | 1 | 3337 pass, 1 skip, 3 fail across 312 files (57.47s). All sim tests green, including every new/updated Phase-1 test. The only 3 failures were `apps/client/src/graduation/nursery-vm.test.ts` option-list pins that the new recipes intentionally change (water+fire now offers `mistkit`; water+plant now offers `mossboar`). Fixed immediately after (see Deviations). |
| full suite (final, run by primary) | `bun test --check --parallel=4 --timeout 120000` | 0 | 3340 pass, 1 skip, 0 fail across 312 files (61.26s). The `scripts/smoke/smoke.test.ts` "RESULT fail" line in the log is that test's own intentional negative-case output for a `file:///tmp/x` URL, not a suite failure — 0 fail overall. Fixed nursery-vm pins hold; phase green. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| -- | --------- | -------- | ------ |
| AC-1 (FR-1, FR-3, FR-4) | `ALL_SPECIES` holds 15 species; fire×plant→Embercub, plant×water→Mossboar, fire×water→Mistkit resolve deterministically inside the existing breeding flow in both parent orders; Wave-3 pairs untouched; same-element and unlisted pairs inherit exactly as before; no save change (still v25) | `packages/sim/src/species/discovery.ts`, `packages/sim/src/breeding/discovery.ts`, `packages/sim/src/species.test.ts` (15-count, identity, locked/tier-gate, kit-distinctness vs both siblings, falcon/tortoise extremals, sibling-profile, archetype, breed-true), `packages/sim/src/breeding/discovery.test.ts` (both-order recipes, 6 same-element null, 9 unlisted null, parents-arity, speciesOptions append/unchanged/dedupe, embercub graduation, invalid-species, SAVE_VERSION 25 + round-trip) | pass |
| AC-3 (FR-3, NFR-1) | Each new six-move kit uses only its element's existing vocabulary, lands inside the shipped roster's sustained-score band, is battle-legal, and sibling duels terminate on the production path | `packages/sim/src/battle/species-discovery-balance.test.ts` extended to all six lines (band gate, legality, 864 seeded sibling duels both side orders fresh + capped) | pass |
| AC-4 (NFR-5) | No new persisted state; save schema version unchanged | `packages/sim/src/breeding/discovery.test.ts` save-shape test (`SAVE_VERSION` 25, top-level keys unchanged, save/load round-trip hatches embercub-line state) | pass |

## Probe outcome (P1.T1.2)

Kits follow the Wave-3 Option-1 pattern: each new kit embeds its element's
already-claimed branch signatures and omits exactly two free specials,
reserving them for its own Phase-3 branches.

- Embercub (fire): flame_charge, blaze_bolt, flare_dart, pyre_lance, cinder_dive, pyre_wall — omits spark + cinder_shot
- Mossboar (plant): thorn_volley, spore_burst, vine_lash, root_quake, thorn_charge, bramble_guard — omits seed_shot + bramble_dart
- Mistkit (water): tide_shot, foam_volley, mist_spray, maelstrom, riptide_rush, tide_aegis — omits bubble + splash_bolt

Analytical sustained sums (tier-contribution linearisation, cf. Wave-3
finding 17.28–18.93) sit mid-band: embercub ≈ 18.38, mossboar ≈ 18.21,
mistkit ≈ 18.21, against the shipped band [≈18.16, ≈18.93]. The runtime
band gate (all six discovery lines vs the nine shipped kits) and the full
duel matrix passed in the suite run above. A dedicated
`APEX_DISCOVERY_REPORT=1` score-table run was not possible (shell denied);
the primary can reproduce it with the documented command.

## Deviations (outside Touches, smallest change to keep the suite green)

- `packages/sim/src/cup/gatekeeper-reach.test.ts` — legend field pin `12` → `15` (nine obtainable + six discovery lines); test title likewise.
- `apps/client/src/graduation/nursery-vm.test.ts` — three option-list pins extended with the newly discovered chip (`mistkit` for water+fire pairs, `mossboar` for the water+plant pair). Production code untouched; the VM reads the sim lookup dynamically.
- `packages/sim/src/breeding.test.ts` — `speciesOptions` pin for fire_drake × plant_ox now includes `embercub` (co-located with the breeding barrel; treated as in-Touches).

## Notes

- No product/design decisions were needed; Wave-3 precedent fixed every seam.
- Stat profiles respect the falcon (fastest/frailest) and tortoise (bulkiest/slowest) extremals and differ from both element siblings; temperaments: embercub obedient, mossboar rush, mistkit rush (each element now fields all three temperaments except fire, which was rush/rush).
- Branch invariants untouched: still 24 branches; new lines' kits deliberately exclude their two reserved specials, so Phase 3 can claim globally-unique signatures.
- Blocker (resolved): the final confirmatory `bun test` re-run and `git` operations were initially denied by tool permissions; the primary ran both on my behalf (suite exit 0, working tree as expected) and this resumed session completed the commits below.

## Evidence paths

- `conductor/tracks/20261027-roster-wave-4/verification/phase-1.md` (this file)

## Primary verification

- Working tree clean at acceptance; range `331edfb0..1d249352` matches the
  report (squashed to one commit; no foreign commits).
- Deviations accepted: three test-pin files outside `Touches`
  (`cup/gatekeeper-reach.test.ts` legend pin 12→15,
  `graduation/nursery-vm.test.ts` option-list pins,
  `breeding.test.ts` speciesOptions pin) — smallest necessary changes,
  production code untouched.
- Phase command `bun test --check --parallel=4 --timeout 120000`: exit 0
  (3340 pass, 1 skip, 0 fail, 312 files).
- `bun run verify`: exit 0 (after primary formatting fixes: `biome check
  --write` on 3 code files + pretty-print of track `metadata.json`).
- `bun run build`: exit 0.
