# Phase 1 — Kit baseline & ranch portrait

- Track: 20261025-mobile-layout-pass
- Phase: 1 (Kit baseline & ranch portrait)
- Date: 2026-10-25
- Branch: `feat/20261025-mobile-layout-pass`
- Base commit: `b349f46f` · Head commit: `d7729c1e`

## Result

**verified** — ranch + HUD day view fully playable at 393×852 with zero
occlusion; kit gains its first width breakpoints (phone ≤767.98px, tablet
768–1023.98px); desktop 1440×900 and the tablet band verified unchanged.

## How the bar was met (measurable bar adopted from spec)

- **No horizontal page scroll**: `scrollWidth === innerWidth` checked at
  393×852 (before: 393/393 — the pre-existing phone tier already held this;
  after: still holds through every state), 800×1000, and 1440×900.
- **No panel occludes an interactive element or the action area**: pre-fix,
  expanding both panels covered y≈263–838 (the entire yard — see
  `p1-before-393-both-expanded.png`). Post-fix the two bottom panels are
  mutually exclusive via CSS `:has()` — measured live:
  - dock expanded → `.creature-plate` computed `display: none`; dock spans
    y 572–838 (h 266); scene sample point (196, 470) resolves to the
    `CANVAS` element; FEED button 44px tall, center hit resolves to the
    button.
  - plate expanded → `.command-dock` computed `display: none`; plate spans
    y 569–838 (h 269, compacted rows); pet fully visible above.
  - elementFromPoint hit-tests pass for rename, collapse-toggle, dock head,
    FEED; real taps drove feed / rest / play (AP 3→0 across pips), the
    training picker (open via tap, close via Escape), callout dismissal,
    and the creature-detail modal.
- **All text ≥ readable size**: no type sizes reduced; phone compaction
  tightens spacing only (padding/gaps). Kit primitives keep the fluid type
  scale.
- **Clean console**: `playwright-cli console` → "Total messages: 2 (Errors:
  0, Warnings: 0)" at 393×852; same at 1440×900.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Unit (phase gate) | `bun test --check --parallel=4 --timeout 120000` | 0 | 2633 pass, 1 skip, 0 fail (47.6s, 208 files) |
| Static (CSS) | `bunx biome check apps/client/src/ui/kit.css apps/client/src/ranch.css` | 0 | Clean after reordering the phone-block rules |
| Visual | `bun run dev` + `playwright-cli` (1440×900 and 393×852) | 0 | See screenshots below; console clean at both viewports |

## How each state was reached (real app seams only)

Fresh save via draft screen (Ember Drake card tapped at 393); panels toggled
by tapping their real heads/chevrons; feed/rest/play/-picker driven by real
button taps at 393×852; callout dismissed via its GOT IT button; modals
opened via the settings/handbook/plate-head seams. No save files were
hand-edited. Viewport 393×852 was set with `playwright-cli resize` and
preserved through `goto`/`reload` (note: `open` resets the viewport to
default — resize must precede goto, not follow it).

## Acceptance criteria (Phase 1 scope)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | kit.css gains coherent width breakpoints (≤767.98 phone, 768–1023.98 tablet) so shared components are legible at 393px | kit.css responsive tiers section (touch floor on `.kit-chip`/`.kit-button`/`.kit-cta`, CTA density, reason-tooltip wrap guard); chips measured 40–45px at 393 and 800; desktop chip 32px / CTA 48px unchanged | done |
| FR-2 | ranch+HUD at 393×852: no occlusion, no horizontal scroll | Accordion + compact sheets + touch floors; measured geometry and hit-tests above; screenshots `p1-after-393-*.png` | done |
| NFR-1 | No sim/save changes, no new deps | Only `kit.css` + `ranch.css` touched; save stays v25 | met |
| NFR-2 | Desktop + tablet non-regression | 1440×900: plate (t597 l18 w330) and dock (r1422 w354) absolute corner-pinned, chip 32px, CTA 48px — matches baseline; 800×1000: `.hud-motion` stacks column (tablet rule alive), both panels visible corner-pinned with no overlap | met |
| NFR-3 | prefers-reduced-motion unchanged | Both reduced-motion blocks untouched by this phase | met |
| NFR-4 | A11y held: touch targets not tiny, colour never sole carrier | Kit touch floor 40px for chips/buttons/CTA on phone+tablet; plate head buttons 36px inside the 44px head (icon affordances paired with the 40px head tap target and the 40px dock head); no colour-only meaning introduced | met |
| NFR-5 | Changes stay in existing stylesheets, no restructuring | +41 lines kit.css, +39 lines ranch.css, appended/tier-block-local; no CSS file restructuring; no TS touched | met |
| NFR-6 / AC-8 | Clean console at every audited viewport | 0 errors / 0 warnings at 393×852 and 1440×900 | met |
| AC-1 (portrait leg) | Ranch day view passes the bar at 393×852 | Live state walkthrough + screenshots below | done |
| AC-7 | Desktop+tablet non-regression proven at the phase gate | NFR-2 measurements + `p1-after-desktop-*.png` | done |

## Screenshots (gitignored, under `.conductor/evidence/20261025-mobile-layout-pass/`)

Before (Phase-1 baseline, pre-change):

- `p1-baseline-desktop.png` — desktop draft, pre-change
- `p1-baseline-desktop-ranch.png` — desktop ranch day 1, pre-change
- `p1-before-393-draft-fresh.png` — 393 draft (pre-existing STABLE/DRAFT-DAY overlap, Phase 4 scope)
- `p1-before-393-ranch-load.png` — 393 ranch fresh load (collapsed defaults fine)
- `p1-before-393-both-expanded.png` — 393 worst case: both panels expanded cover the whole yard

After (Phase-1 changes live):

- `p1-after-desktop-draft.png` — desktop draft, unchanged
- `p1-after-desktop-ranch.png` — desktop ranch day 1, unchanged (same save, AP spent by the phone walkthrough)
- `p1-after-393-draft.png` — 393 draft, starter cards full-width and legible
- `p1-after-393-dock-open.png` — 393 dock expanded, plate folded, pet fully visible
- `p1-after-393-fed.png` — 393 after a real FEED tap (AP 2/3)
- `p1-after-393-train-picker.png` — 393 training picker sheet, all four programs readable
- `p1-after-393-rest-play.png` — 393 after rest+play (AP 0/3, wrapped disabled-reason tooltip)
- `p1-after-393-plate-open.png` — 393 plate expanded, dock folded, pet fully visible

Also verified live at 393 (pre-change): handbook, settings, and
creature-detail modals already fit and scroll internally within 393×852 —
the kit phone tier therefore adds touch/density floors, not modal resizing.

## Deviations

- `apps/client/src/hud/**` needed **no changes**: the panel mutual-exclusion
  is pure CSS (`:has()` inside the existing ranch.css phone tier), so the
  allowed class/markup surface went unused.
- `playwright-cli delete-data` reported "No user data found" on this setup;
  fresh-draft captures used `localStorage.clear()` via `eval` + reload
  instead (same effect, still a real app seam).
- CSS lint used `bunx biome check <changed files>` (the workflow's biome
  check narrowed to the touched stylesheets; full `bun run verify &&
  bun run build` remains the primary's phase-acceptance leg).

## Notes

- The occlusion fix is the accordion: at phone widths exactly one of the
  two bottom panels may be open; the other folds away entirely and its
  collapsed state is untouched, so closing the open sheet restores its
  head. Discovered-ability is preserved (each panel's head/chevron is the
  40px-min tap target that reopens it).
- Known pre-existing issue recorded for Phase 4: on the 393px draft screen
  the STABLE chip overlaps the DRAFT DAY stamp (starter-surface layout,
  `starter.css` domain — untouched here per Touches).
- Sheets replay their settle-up animation on each reopen (display:none
  restarts it) — cosmetic, reads as intentional motion.
- The brief's safe-top concern (lineage plate vs `.hud-stack` top offset)
  did not materialise at 393×852: the stack is bottom-anchored, and the
  measured callout/lineage bands never reach the open sheets.
- Phone state at capture time was a real playthrough (day 1, AP spent);
  desktop guard screenshots share that save, which explains spent AP pips —
  layout geometry is what the guard verifies.

## Primary verification

Independent verification by the Conductor primary (2026-10-25):

- `git status --porcelain` → clean (evidence committed by phase).
- `git log --oneline b349f46f..HEAD` → exactly the 3 reported commits
  (bb2c1e5d, d7729c1e, e396e5a0) — squash guard passed.
- `git diff --name-only b349f46f..HEAD` → `ui/kit.css`, `ranch.css`,
  evidence only — Touches respected (`hud/**` legitimately unused;
  `:has()` accordion is pure CSS).
- `bun run test:phase` → exit 0: 2633 pass / 1 skip / 0 fail, 130,555
  expect() calls, 208 files, 26.75s.
- `bun run verify` → exit 0: typechecks clean, Biome clean,
  determinism gate OK (storm_hound/falcon/tortoise seed 42 byte-identical,
  5 props digests match).
- `bun run build` → exit 0 (pre-existing >500 kB chunk advisory only).
- Evidence file read in full: measurable bar met with live measurements
  (scrollWidth === innerWidth; mutually exclusive panels with pet visible;
  40px touch floors; console 0/0 at both viewports); AC table maps FR-1/2,
  NFR-1..6, AC-1/7/8.

**Result: phase accepted.**
