# Phase 1 — Identity foundation: evidence

- Title: Elemental Identity Pass, Phase 1 (Identity foundation)
- Track: 20261028-elemental-identity
- Phase: 1
- Date: 2026-10-28
- Branch: feat/20261028-elemental-identity
- Base: 57aa2e306d2b9a6b052b30df7df73c05220684bd
- Head: working tree, reviewed + verified by primary (phase agent had no shell)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| verify | `bun run verify` | 0 | types clean (160 + 169 + 44 + 455 files), tests 3425 pass / 0 fail, biome clean, determinism gate OK (15 species × 3 stages + 5 props byte-identical). The `smoke: RESULT fail … file:///tmp/x` line is smoke.test.ts's own negative-path probe (invalid-URL rejection), not a failure. |
| build | `bun run build` | 0 | client bundle builds (pre-existing chunk-size warning only). |
| screenshots | `bun run dev` + playwright-cli captures | n/a (visual) | 12 key frames + full trios captured, console 0 errors / 0 warnings. |
| commit | `git commit` (conventional messages) | 0 | Phase 1 implementation + tests + evidence committed by primary. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| -- | --------- | -------- | ------ |
| P1.T1.1 | Fire, water, plant fallbacks authored | `apps/client/src/move-fx/moves/fallback.ts`: fire (held coil, rise 0.05, buoyant gravity −2.2 arrival), water (crouch, ring burst, gravity 10), plant (held coil, drifting ring, sway 1.0) | verified visually |
| P1.T1.2 | Electric, earth, wind fallbacks authored | same file: electric (charge orb, sway 2.2 arrival), earth (deep coil, `flash: false`, dust tint `#9c8f7d`), wind (rising windup, gust ring, sway 1.6) | verified visually |
| P1.T1.3 | Element-typed floor-mark treatments (FR-6) | `fx-data.ts` `decalRing()` (water/wind/electric → ring; fire/earth/plant → disc) + `decal.ts` `RingGeometry` branch; pinned in `fx-data.test.ts` | verified (ring decal visible in electric/wind captures) |
| P1.T2.1 | barrier, dash, eruption builders (FR-5) | `apps/client/src/move-fx/moves/verbs.ts`: `barrierBody` (no shots, shove 0, ring), `dashBody` (fast shot, deep shove), `eruptionBody` (coil ≥ 0.28, wide ring) | verified (unit-pinned; bespoke verb composition lands Phases 2–7) |
| P1.T2.2 | cone, volley-fan, beam builders (FR-5) | same file: `coneBody` (3 lanes), `volleyFanBody` (3 fanned beats), `beamBody` (charge + heavy shot, element burst preserved) | verified (unit-pinned) |
| P1.T3 | Unknown moveId resolves to its element's fallback; instant mode unaffected | `moves.ts` `fxFor(moveId, element?)` → bespoke → `fallbackFor(element)` → `DEFAULT_FX`; `steps/fire.ts` passes `step.element` at both call sites; `impact.ts` never imports `fxFor` so the instant path is untouched; pinned in `moves/fallback.test.ts` (12-id spot check, 2 per element) | verified |
| NFR-1 | Every touched module stays ≤ 12 KB | `module-size.test.ts` walks the tree automatically and passes inside `bun run verify` (largest new file `fallback.ts` ≈ 7 KB; tests exempt) | verified |
| NFR-4 | No second hue source | No color literals added except the earth dust tint override (a `BurstStyle.tint`, same mechanism `quake_stomp` already uses); element hues still single-sourced in `ui/element.ts` | verified |
| — | 6 fallback screenshots, desktop + phone, clean console | `verification/phase-1/*-flight.png` (12 key frames); full flight/impact/decay trios + seed saves in gitignored `.conductor/evidence/phase-1/`; console 0 errors | verified |

## Screenshot catalog (key frames)

| Element | Move captured | Desktop | Phone | What it shows |
| ------- | ------------- | ------- | ----- | ------------- |
| fire | Spark (Ember Drake → Bramble Ox) | `fire-d-flight.png` | `fire-p-flight.png` | orange muzzle flash + halo + ember trail dots |
| plant | Seed Shot (Bramble Ox → Tide Axolotl) | `plant-d-flight.png` | `plant-p-flight.png` | green octahedron trail + impact shell + halo/mote decay |
| water | Bubble (Tide Axolotl → Ember Drake) | `water-d-flight.png` | `water-p-flight.png` | blue bubble launch, mid-flight droplets, shell decay |
| electric | Static Jolt (Voltfox → Tide Axolotl) | `electric-d-flight.png` | `electric-p-flight.png` | yellow-white burst + halo on target, dark ring decal aftermath |
| earth | Pebble Shot (Shalemole → Ember Drake) | `earth-d-flight.png` | `earth-p-flight.png` | brown/tan rock-shard octahedron + trail puffs + muzzle dust decal |
| wind | Gust (Galeheron → Bramble Ox) | `wind-d-flight.png` | `wind-p-flight.png` | teal burst shell + halo, faint teal floor ring in decay |

Capture method (for reproducibility): seeded saves per element in
`.conductor/evidence/phase-1/save-<element>.json` (legal 1–2-chip loadouts —
note `policy.ts` `worthFiring`: a single neutral P6/cd1 chip never fires, so
neutral-matchup seeds need 2-chip kits; SE matchups fire with one chip).
Bouts run via ranch free-match setup; chip feed text polled (double-poll to
defeat transient duplicates), then event-driven 3-shot burst at +100/+250/+400
ms. Full trios (`<el>-<d|p>-{flight,impact,decay}.png`) kept alongside the
seeds in `.conductor/evidence/phase-1/`.

## Evidence paths

- `apps/client/src/move-fx/moves/fallback.ts` (new)
- `apps/client/src/move-fx/moves/verbs.ts` (new)
- `apps/client/src/move-fx/moves/fallback.test.ts` (new)
- `apps/client/src/move-fx/moves.ts` (lookup wiring + docs)
- `apps/client/src/steps/fire.ts` (`step.element` at both `fxFor` call sites)
- `apps/client/src/fx/fx-data.ts` (electric/earth/wind `ELEMENT_BURST` + `decalRing`)
- `apps/client/src/fx/decal.ts` (ring geometry branch)
- `apps/client/src/fx/fx-data.test.ts` (new pins)
- Screenshots: `verification/phase-1/*-flight.png` (12 key frames, committed)

## Deviations

- `apps/client/src/move-fx/moves.ts` (lookup barrel): not literally in Touches (`moves/*.ts`), but the phase goal — "six authored fallback bodies wired through the `MOVE_FX` lookup" — requires the `fxFor` fallthrough. Smallest change: optional `element?` param (backward compatible; all existing single-arg calls keep resolving to `DEFAULT_FX`), plus doc updates. Existing `move-fx.test.ts` pins (`fxFor("basalt_guard")` → `DEFAULT_FX`, etc.) keep passing unchanged.
- `apps/client/src/steps/fire.ts`: within the conditional Touches allowance ("only if lookup needs verb dispatch") — passing the already-present `step.element` through is the lookup need; no dispatch logic added.
- `beamBody` keeps the element's burst (`...base.arrival.burst`) instead of a fresh glow burst so earth beams stay non-luminous.
- Primary-side test fix: two strict-indexing errors in `fallback.test.ts` (`noUncheckedIndexedAccess`) narrowed with throw-guards per `typescript.md` (no `!`/`as`).
