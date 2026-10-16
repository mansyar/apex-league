# Track: Responsive Layout Foundation

- **Status:** new
- **Type:** feature
- **Branch:** `responsive_foundation_20261013`
- **Created:** 2026-10-13

First slice of the roadmap's mobile-responsive pass: a mobile-first
breakpoint system (base / ≥480 / ≥768 / ≥1024 / ≥1200) and fluid design
tokens in the shared broadcast kit, then reflow every gameplay surface —
ranch HUD (stacked corner plates on phones), starter choice, cup
bracket/coach/results (scroll-first on phones, type floors over `cqw`),
spar panel and battle HUD — plus portrait-aware arena camera framing and
DPR refresh. Desktop ≥1200px keeps today's layout with conservative polish.
Touch-input ergonomics and a Playwright device-matrix harness are follow-up
tracks.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
