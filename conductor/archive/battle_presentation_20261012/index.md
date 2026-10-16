# Track: Battle Presentation Layer Refactor

- **Status:** new
- **Type:** refactor
- **Branch:** `battle_presentation_20261012`
- **Created:** 2026-10-12

Behavior-preserving client refactor of the battle presentation layer:
split the `staging.ts` god-file (seed / consolidated EffectLoop + HitStop /
move-fx data module / driver), extract a shared `battleUI.ts` deduping the
spar-vs-cup screen logic, one `disposeObject3D` utility, CSS class-ownership
cleanup with mock.css scoped under `.mock`, and small a11y additions
(cup give-up modal focus trap/Escape/aria-modal, `aria-pressed` fast-forward,
focus restore on overlay close).

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
