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

## Narrow layout fix (found during the device pass)

At 393×659 the starter picker was vertically centred under the stacked
Settings/Handbook chips: the "Draft day" tab and heading were clipped and
overlapped the chips. `starter.css` now reserves 124 px at the top, starts the
overlay at the top, and scrolls if a future card stack is taller than the
viewport. After the fix: head top 124 px (chips end at 108 px), grid bottom
629 px in a 659 px viewport, no scroll, no overlap.

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
| OS preference | global `@media (prefers-reduced-motion: reduce)` rule | Existing rule retained |

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
| Hall of Fame | close | yes | yes | Hall opener |
| Graduation / nursery | primary action / first card | yes | yes | opener / post-hatch handoff |
| Cup bracket | Back to the ranch | yes (overlay) | Back / Escape | Enter Cup chip |
| Coach room | Back to bracket | yes (overlay) | Back | bracket opener |
| Arena exit / results | Back | yes (overlay) | Back | results/back then cup chip |
| Save import confirm | Replace save | yes | Escape/backdrop | import opener |
| Corrupt recovery | primary action | yes | no dismiss (blocking) | reset reloads |

Keyboard walkthrough evidence: ranch order Spar → Settings → Handbook →
Lineage → creature head → rename → dock → Actions → Feed/Rest/Treat/Play/Train
→ Advance Day → onboarding hint, all with 2 px rings; Settings sliders moved
with ArrowLeft and persisted; dialogs restored focus.

## Device emulation

| Viewport | Result |
|---|---|
| 1280×720 desktop | Clean; settings, cup, recovery all fit |
| 393×800 (portrait) | Settings dialog 343 px wide, rows 287 px, no horizontal overflow |
| 393×659 (iPhone-class) | Starter fixed (see above), no overflow, all three cards visible |

Real-device follow-up (not required for this track's sign-off): iOS Safari and
Android Chrome — starter pick, sliders, save download, touch targets, safe
areas. Record device, OS version, and screenshots when run.
