# Broadcast HUD Overhaul - unified AAA-grade broadcast UI kit

*Status: **new** - branch `track/broadcast_hud_20261011`*

Legend: `[ ]` pending / `[~]` in progress / `[x]` complete

- Every UI surface (ranch HUD, Spar, cup, arena chrome, starter) is rebuilt
  on one shared broadcast component kit: AAA corner clusters (score bug,
  creature lower-third, command dock, chip family), layered chamfered plates,
  weighty reduced-motion-aware animation, all-6 element crests, and a
  per-surface CSS split. Mock-first design gate at `/mock.html`.
- **Type:** Feature (UI/UX overhaul + internal refactor)
- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Scope:** `apps/client/src/` only — `ui/` kit module, shared `element.ts`
  (crests + hues), hud/spar/cup/starter/battleHud restyle, CSS split.
  Sim, save schema (v6), and gameplay behavior untouched.

## Outcomes

- The game reads as one broadcast product: the ranch looks like the same TV
  feed that airs its cups.
- A shared kit kills the per-screen bespoke CSS (1,813-line style.css) and
  the duplicated crest/hue/motion snippets.
- The presentation layer is ready for Phase 2 content (ladder, bosses) to
  land on a stable visual language.
