# Track: ui_layer_refactor_20261016

UI-Layer Refactor — decompose `hud.ts` into by-concern modules (copy /
plates / dock / settings), extract `spar.ts` view-models and
`staging-fx.ts` effect data/math as tested pure modules, and conservatively
consolidate duplicated CSS patterns into `ui/kit.css`. Behavior-identical;
golden tests written before extraction.

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
