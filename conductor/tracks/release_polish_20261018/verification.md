# Verification Notes — Release Polish & Accessibility

Track: `release_polish_20261018` · Last updated: 2026-10-18

## Performance baseline

Production build (`bun run --filter @apex/client build`, Vite 8.3.4, 161
modules, 14.29 s):

| Asset | Raw | Gzip |
|---|---:|---:|
| `index-*.js` | 798.75 kB | **216.74 kB** |
| `index-*.css` | 53.92 kB | **10.65 kB** |
| `index.html` | 2.13 kB | 0.94 kB |

Final build after the narrow and cup fixes: JS 798.77 kB / **216.75 kB gzip**,
CSS 54.02 kB / **10.66 kB gzip** — +0.01 kB each, inside the caps below.

Budgets for future work (current + 10%):

- Initial JS: **≤ 238.4 kB gzip** (216.74 × 1.1)
- Initial CSS: **≤ 11.72 kB gzip** (10.65 × 1.1)
- No new per-frame work, timers, or retained listeners on overlay open/close.

Vite warns that the single JS chunk exceeds 500 kB before gzip (Three.js).
Code splitting is a deferred optimisation, not part of this track.

Navigation timing (production preview, headless Chromium):

| Pass | DCL | Load | Notes |
|---|---:|---:|---|
| Cold context, 1280×720 | 7,387 ms | 13,088 ms | First WebGL/voxel scene build; no cache |
| Warm reload, 1280×720 | 1,584 ms | 2,003 ms | Cached bundle |
| Warm reload, 393×659 | 459 ms | 893 ms | No horizontal overflow; 632 elements |

Overlay cleanliness (CDP `Performance.getMetrics`, 5× Settings and 5× Handbook
open/close cycles): nodes 892 → 892, JS heap 4.8 → 4.8 MB, 20 layouts across
the cycle. No growth signal.

Lighthouse was not run: no local binary is installed and `bunx lighthouse`
timed out trying to install. Navigation Timing + CDP metrics above are the
recorded baseline; run Lighthouse when the tool is available offline.

## Gate reliability

Under 20× parallel execution, CPU-heavy tests sat right at their ceilings and
failed intermittently: boss balance at 5.04 s against a 5 s default, drake
boundary at 31.8 s against 30 s, and the juvenile proportion audit at 42.5 s
against 40 s. Every failure passed on an immediate rerun; no assertion failed.
The default test timeout is now 120 s (`package.json` `test`/`verify`) and the
explicit voxel/boss ceilings are 120 s. Two consecutive `bun run verify` runs
after the change: exit 0, 1567 pass / 1 skip / 0 fail, 26.5 s and 24.9 s.

## Narrow layout fixes (found during the device pass)

At 393×659 the starter picker was vertically centred under the stacked
Settings/Handbook chips: the "Draft day" tab and heading were clipped and
overlapped the chips. `starter.css` now reserves 124 px at the top, starts the
overlay at the top, and scrolls if a future card stack is taller than the
viewport. After the fix: head top 124 px (chips end at 108 px), grid bottom
629 px in a 659 px viewport, no scroll, no overlap.

The cup had two phone breakages. Its bracket is `width: auto` inside a centred
flex column, so it shrink-wrapped to 181 px and read as a thin strip; it now
stretches to 365 px with 14 px margins. Entry also focused the close control
at the end of the tall scroll column, which scrolled the reader straight past
the board; focus now uses `preventScroll` so the bracket opens at scrollTop 0.
The overlay was z-index 40 under the HUD motion chips (45), which sat on top of
the cup header; it is now 50, so the broadcast owns the screen on every
viewport. Verified: bracket x 14 / width 365, head 12–60, chips not hit-testable
under the overlay, no horizontal overflow, desktop 1280×720 unchanged.

## Contrast audit

Text on `--kit-panel-bg-solid` (`#14100c`):

| Token | Hex | Ratio | Use |
|---|---|---:|---|
| `--ink` | `#f4ecdf` | 16.15:1 | primary text |
| `--ink-dim` | `#b8ad9c` | 8.56:1 | labels, secondary copy |
| `--accent` | `#ffd166` | 13.13:1 | focus ring, headings, CTAs |
| `--danger` | `#ff6b6b` | 6.82:1 | destructive action |
| silver | `#c9d4e3` | 12.63:1 | Silver tier |
| gold | `#ffbf3f` | 11.52:1 | Gold tier |
| legend | `#c9a0ff` | 8.98:1 | Legend tier |

All pass 4.5:1 for normal text. No neutral token changes were needed; element
hues were not touched. Deferred: none.

## Reduced-motion matrix

| Surface | Mechanism | Evidence |
|---|---|---|
| Evolution / graduation send-off | `scene.setMotionReduced`, evolution ceremony reduced flag | Code path reviewed; same machinery as care ceremonies; CSS class covers DOM beats |
| Feed / rest / treat / play | per-machine reduced flag in `ranch-motion` | Code path reviewed; CSS class covers DOM overlays |
| Petting | scene motion preference + calm cue mix | Code path reviewed; `careCueForEvent` swaps calm variants |
| Nursery hatch | no per-frame work; CSS surfaces under `body.is-reduced` | Class verified live |
| Cup bracket / coach / results | `beat()` returns 0 when reduced; schedule settles immediately | Cup opened under reduced motion; animation:none / transition:0s |
| Arena battle | `playbackDriver` reduced read, instant dump, staging shake off, vignette skipped | Code path reviewed; settings reach staging and swap |
| OS preference | global `@media (prefers-reduced-motion: reduce)` rule | Emulated `reducedMotion: reduce`: `matchMedia` true, `body.is-reduced`, card animation `none`, overlay transition `0s` |

Live check: toggling Motion: reduced persisted `settings.reducedMotion`, added
`body.is-reduced`, survived reload, and computed `animation: none` /
`transition: 0s` on a cup card.

## Keyboard / focus matrix

| Surface | Focus in | Trap | Escape / close | Focus return |
|---|---|---|---|---|
| Starter | first card on boot | n/a (screen) | n/a | n/a |
| Settings | Motion chip | yes | yes | opener (Settings chip) |
| New game confirm | Start over | yes | yes | Settings chip |
| Handbook | Back to the ranch | yes | yes | Handbook chip |
| Partner details | Back to the ranch | yes | yes | creature head |
| Hall of Fame | Close | yes | yes | Hall opener (Lineage chip) |
| Graduation confirm | Graduate | yes | yes | Graduate chip |
| Egg screen | first egg card after send-off | yes (screen) | n/a | pick lands on new creature head |
| Nursery (line path) | first parent plate | yes | Keep champion | hatch lands on new creature head |
| Cup bracket | Back to the ranch | yes (overlay) | Back / Escape | Enter Cup chip |
| Coach room | Back to bracket | yes (overlay) | Back | bracket opener |
| Arena exit / results | Back | yes (overlay) | Back | results/back then cup chip |
| Save import confirm | Replace save | yes | Escape/backdrop | import opener |
| Corrupt recovery | primary action | yes | no dismiss (blocking) | reset reloads |

Keyboard walkthrough evidence: ranch order Spar → Settings → Handbook →
Lineage → creature head → rename → dock → Actions → Feed/Rest/Treat/Play/Train
→ Advance Day → onboarding hint, all with 2 px rings; Settings sliders moved
with ArrowLeft and persisted; dialogs restored focus. Hall opened on Close and
returned to Lineage; graduation confirm focused Graduate, trapped
Not yet/Graduate, and returned on Escape; the send-off opened the egg screen on
the first egg, and picking landed on the new creature head (founder path fixed
here after focus fell to body); the line nursery focused the first parent plate
and asked for the egg species.

## Device emulation

| Viewport | Result |
|---|---|
| 1280×720 desktop | Clean; settings, cup, recovery all fit |
| 393×800 (portrait) | Settings dialog 343 px wide, rows 287 px, no horizontal overflow |
| 393×659 (iPhone-class) | Starter fixed (see above); cup bracket 365 px and opens at the top; no overflow, all three cards visible |

Real-device follow-up (not required for this track's sign-off): iOS Safari and
Android Chrome — starter pick, sliders, save download, touch targets, safe
areas. Record device, OS version, and screenshots when run.

## Acceptance matrix

| # | Criterion | Evidence | Result |
|---|---|---|---|
| 1 | Export/import round-trip | Phase 3 export imported into a fresh profile restored day, creature, Hall/lineage, ladder, AP, and settings; live save session dropped by design; `buildSaveExport`/`inspectSaveImport` tests | Pass |
| 2 | Older import + rejection | Full v0→v16 migration chain tested (including v14/v15); v15 fixture imported manually with 100% volumes; newer/malformed refused with the live save byte-identical | Pass |
| 3 | Corrupt boot recovery | Phase 3: dialog on boot, exact retained bytes downloaded, Start over confirmed and landed on the starter | Pass |
| 4 | Music/SFX | Phase 2: live gain updates, reload persistence, mute overrides; v15→v16 defaults both to 1.0 | Pass |
| 5 | Keyboard-only walkthrough | Phase 4 ranch/starter/settings/detail/handbook/cup; final run covered Hall, graduation confirm, egg screen, founder focus handoff, and line nursery | Pass |
| 6 | Reduced motion | Matrix above; in-app setting live + reload; OS preference emulated with `body.is-reduced`, `animation: none`, `transition: 0s` | Pass |
| 7 | Contrast | Table above, all ≥4.5:1; no neutral token changes needed; element hues untouched | Pass |
| 8 | Performance | JS 216.75 kB gzip (+0.01 kB, cap 238.4), CSS 10.66 kB (cap 11.72); 10 overlay cycles held nodes/heap; no new rAF or timers | Pass |
| 9 | Device passes | Screenshots `phase5-narrow-fixed2.png`, `phase5-narrow-cup-fixed2.png`, `phase5-cup-desktop.png`, `phase5-nursery-focus.png`; real-device checklist above | Pass |
| 10 | Docs + gate | `docs/save-schema.md` v16, README release checklist, dated tech-stack note; two consecutive `bun run verify` runs exit 0 (1567 pass / 1 skip) | Pass |

Known deferrals: Lighthouse (binary unavailable); code splitting of the
Three.js bundle; the real-device pass above. The intermittent gate failures
were timeout-only and are addressed in “Gate reliability”.
