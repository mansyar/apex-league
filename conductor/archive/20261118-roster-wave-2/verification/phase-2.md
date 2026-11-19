# Phase 2 Verification — Client discoverability and visual evidence

- **Track:** `20261118-roster-wave-2` (Roster Wave 2)
- **Phase:** 2 — Client discoverability and visual evidence
- **Date:** 2026-11-19
- **Branch:** `feat/20261118-roster-wave-2`
- **Phase base:** `bbcde459dc8415424d2b5291793c2829c4738b05`
- **Final head:** `cf45f775` (`test(client): pin wave-2 breeding recipes in handbook`)
- **Scope:** FR-7, FR-8, FR-9, NFR-5, NFR-6, AC-7, AC-8, AC-9, AC-10

## Result

**VERIFIED.** All in-scope automated checks, visual captures, and scope proof are green at the final head. The primary independently re-ran the exact full chain at head `cf45f775`, including standalone determinism and full fuzz sweeps. See `## Primary verification` below.

## Commands and results

| Layer | Command | Result | Exit |
| --- | --- | --- | --- |
| Static + unit + determinism | `bun run verify` | 4367 pass, 1 skip, 0 fail; 665357 `expect()` calls; 4368 tests / 426 files; Biome `Checked 1005 files... No fixes applied`; determinism gate OK for all 63 seed-42 pairs (18 original + 3 wave-1 + 3 wave-2 sprite/golem/wing archetypes × 3 stages) plus 5 prop digests byte-identical | 0 |
| Build | `bun run build` | Vite 8.3.4, 428 modules transformed, built in 347 ms; chunk-size warning only | 0 |
| Balance | `bun run balance` | 21 species / 1680 fights; all 21 inside bound; see figures below; final hash `0xff6f3d62` | 0 |
| Determinism (standalone) | `bun run gate:determinism` | **Permission denied (shell)** — covered inside `bun run verify` above; primary re-run required | — |
| Fuzz (standalone) | `bun run test:fuzz` | **Permission denied (shell)** — unchanged since Phase 1 (baseline 139 pass / 0 fail, 129015 expects / 135 files); primary re-run required | — |
| Focused unit | `bun test apps/client/src/handbook.test.ts` | 18 pass, 0 fail, 356 expects | 0 |
| Visual | `playwright-cli` 0.1.22 against `bun run dev` (Vite 8.3.4, `http://localhost:5173`) | 12 screenshots captured; console clean on every captured surface; layout metrics recorded at 393 px and 852 px | 0 |

### Full balance figures

- Fights: **1680** across **21** species (roster 18 → 21).
- Bounds: **21/21** species inside bound.
- `capShare` 517/1680 (**30.8%**)
- `decisive` 1574/1680 (**93.7%**)
- `capWinQuality` 415/517 (**80.3%**)
- Median duration **32.82 s**; `durationP05` 16.44 s
- `damageBand` 49/49
- All **6** bosses ok
- Final hash `0xff6f3d62`
- Diagnostic design-band misses (not gate failures): plant_ox 44.4%, water_axolotl 57.5%, dune_jerboa 56.9%, emberwing 44.4%. Gates are the ±8% bounds; all pass.

### Counts summary

- 4367 passing tests, 1 skip, 0 failures (up from 4364 at phase base).
- 665357 `expect()` calls.
- 63 seed-42 determinism pairs: 18 original + 3 wave-1 + 3 wave-2 (sprite/golem/wing) archetypes × 3 stages, plus 5 prop digests.
- 9 wave-2 GLB+manifest pairs (Phase 1) unchanged; 54 existing artifact pairs untouched.
- Biome: 1005 files clean, no fixes applied.

## Acceptance criteria

| AC | Text (spec) | Evidence | Status |
| --- | --- | --- | --- |
| AC-7 | Handbook and gallery surfaces derive and show the new recipes/archetypes without a duplicated client recipe table; no hardcoded species list is introduced. | `apps/client/src/handbook.test.ts` extended: 9-row expected recipe list now includes Thornvolt ("Breed Electric with Plant."), Siltback ("Breed Earth with Water."), Emberwing ("Breed Fire with Wind."); new `describe("the handbook's wave-2 breeding recipes")` pins `recipeFor`/`recipeLine` per species and rendered Raising terms. `buildDiscovery` derives rows from `DISCOVERY_SPECIES` — no second client table. Gallery audited: `gallery.ts` resolves `raw === "mixed" \|\| raw in archetypes`, so sprite/golem/wing (registered in Phase 1) are reachable via `?archetype=`; mixed mode still rotates only first 8 registry indices; no hardcoded species list. Gallery unchanged; no `gallery.test.ts` created. | PASS |
| AC-8 | Desktop, portrait, and landscape screenshots exist; console shows zero errors/warnings; `scrollWidth == clientWidth` at 393px and 852px. | 12 PNGs on disk (verified via directory read). `playwright-cli console`: "Total messages: 2 (Errors: 0, Warnings: 0)" on every captured surface. At 393 px and 852 px, handbook and gallery report `document.documentElement.scrollWidth == document.documentElement.clientWidth == window.innerWidth`. One pre-existing `favicon.ico` 404 on the first direct gallery navigation is out-of-scope. | PASS |
| AC-9 | `bun run verify && bun run build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz` all exit 0 at the final head. | `verify`, `build`, `balance` all exit 0 at head `cf45f775`. Determinism green inside `verify`. Standalone `gate:determinism` and `test:fuzz` denied by subagent shell permission — primary re-run required. | PARTIAL (primary re-run) |
| AC-10 | Scope proof shows only approved paths changed; no `SIM_VERSION`, save schema, dependency manifest, balance gate, fence, or debt-pin assertion changed. | `git status --short` clean at head (evidence PNGs gitignored, not force-added). `git diff --stat bbcde459..HEAD` → only `apps/client/src/handbook.test.ts` (31 insertions), an approved Touch path. No gate/threshold/fence/assertion, `SIM_VERSION`, save schema, dependency manifest, or pacing pin changed. | PASS |

## Screenshots (all confirmed on disk)

Directory: `.conductor/evidence/20261118-roster-wave-2/`

**Desktop 1440×900**
- `handbook-raising-desktop-1440x900.png`
- `gallery-sprite-desktop-1440x900.png`
- `gallery-golem-desktop-1440x900.png`
- `gallery-wing-desktop-1440x900.png`

**iPhone portrait 393×852**
- `handbook-raising-portrait-393x852.png`
- `gallery-sprite-portrait-393x852.png`
- `gallery-golem-portrait-393x852.png`
- `gallery-wing-portrait-393x852.png`

**Landscape 852×393**
- `handbook-raising-landscape-852x393.png`
- `gallery-sprite-landscape-852x393.png`
- `gallery-golem-landscape-852x393.png`
- `gallery-wing-landscape-852x393.png`

PNG binaries are gitignored under `.conductor/` and `/*.png`; they were **not** force-added and do not appear in `git status`.

## Console results

- Handbook (1440×900, 393×852, 852×393): `Total messages: 2 (Errors: 0, Warnings: 0)`.
- Gallery sprite/golem/wing at all three sizes: `Total messages: 2 (Errors: 0, Warnings: 0)` on the captured surfaces.
- Pre-existing, out-of-scope: a fresh direct navigation to the gallery produced one `favicon.ico` 404 error on the first load only; the main app supplies an inline favicon and the gallery is a standalone dev page. No console errors or warnings are attributable to this phase's changes.

## Layout observations

| Surface | Width | `window.innerWidth` | `doc.scrollWidth` | `doc.clientWidth` | `body.scrollWidth` | `#app.scrollWidth` / `#app.clientWidth` |
| --- | --- | --- | --- | --- | --- | --- |
| Handbook Raising | 393 | 393 | 393 | 393 | 393 | 393 / 393 |
| Gallery (sprite) | 393 | 393 | 393 | 393 | 393 | 682 / 393 (`overflow-x: hidden`) |
| Handbook Raising | 852 | 852 | 852 | 852 | 852 | 852 / 852 |
| Gallery (sprite) | 852 | 852 | 852 | 852 | 852 | 852 / 852 (`overflow-x: hidden`) |

- NFR-5 holds: at both 393 px and 852 px the document reports `scrollWidth == clientWidth == viewportWidth`; no horizontal scrollbar appears.
- Pre-existing, out-of-scope: at 393 px the gallery lays eight specimens on a fixed-width row, so `#app` has internal `scrollWidth` 682 with `overflow-x: hidden` and outer specimens clip. This is unchanged from Phase 1 / roster-wave-1; fixing it requires CSS outside this phase's Touches.

## Deviations

- `apps/client/src/gallery.ts` was audited and intentionally **not** changed. `raw in archetypes` admits every registered archetype (sprite/golem/wing registered in Phase 1); hardcoding a species list into the mixed rotation was deliberately avoided. No `apps/client/src/gallery.test.ts` was created (none existed; registry membership plus the resolution predicate is the reachability proof, corroborated by per-archetype screenshots). This matches the roster-wave-1 precedent.

## Notes for primary agent

- Re-run `bun run gate:determinism` and `bun run test:fuzz` at head `cf45f775` in the primary shell to close AC-9. Determinism already ran green inside `bun run verify`; fuzz is unchanged since Phase 1.
- `bun run verify` chain output: verify pass 4367 / skip 1 / fail 0, 665357 expects, 4368 tests / 426 files; Biome 1005 files clean; determinism 63 seed-42 pairs + 5 prop digests OK.
- The phase evidence file is left **uncommitted** for the primary's state/review commit. Code change (`cf45f775`) is committed with a conventional message; no amend was used.
- No product/design decisions were required; no files outside Touches were modified.

## Primary verification

The primary independently re-ran the exact phase command at head `cf45f775`:

`bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`

| Layer | Result |
| --- | --- |
| `bun run verify` | exit 0; 4367 pass / 1 skip / 0 fail; 665357 `expect()` calls; 4368 tests across 426 files; Biome checked 1005 files with no fixes; determinism gate OK |
| `bun run build` | exit 0; Vite 8.3.4; 428 modules; chunk-size warning only |
| `bun run balance` | exit 0; 21/21 species ok; cap share 517/1680 (30.8%); decisive share 1574/1680 (93.7%); cap-win quality 415/517 (80.3%); median duration 32.82s; damage band 49/49; all six bosses ok; final hash `0xff6f3d62` |
| `bun run gate:determinism` | exit 0; 63 seed-42 artifact pairs byte-identical plus 5 prop digests |
| `bun run test:fuzz` | exit 0; 139 pass / 0 fail; 129015 `expect()` calls; 139 tests across 135 files |

Scope proof: `git status --porcelain` showed only the untracked evidence file before acceptance; `git diff --name-only bbcde459..HEAD` listed only `apps/client/src/handbook.test.ts`; the single commit in range was `cf45f775 test(client): pin wave-2 breeding recipes in handbook`. All 12 PNGs exist under the gitignored `.conductor/evidence/20261118-roster-wave-2/` directory and were not force-added. No gate, threshold, fence, assertion, pacing pin, `SIM_VERSION`, save schema, or dependency manifest changed. Result: verified.
