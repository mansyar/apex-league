# Track: Client Scene Architecture Pass II

- **Status:** new
- **Type:** refactor
- **Branch:** `client_scene_pass2_20261013`
- **Created:** 2026-10-13

Behavior-preserving client architecture pass completing the 20261012
presentation refactor: split the `scene.ts` god-file (renderer/bloom/sky
setup, orbit camera, ranch motion composing the existing scene-logic
machines), convert `staging.ts`'s `runStep` switch into per-move step
modules behind a registry table plus a `FighterDriver` class and roster
module, extract a shared `battle-session.ts` factory finishing the
spar-vs-cup wiring dedup, consolidate reduced-motion resolution into
`motion.ts`, fix the `arena.ts → scene.ts` inverted dependency and the
`cup.ts` TDZ trap, rebuild `mock.ts` from the real HUD factories, and
rename the `spar-*` battle-HUD CSS classes to `battle-*`. Newly pure
modules get deterministic unit tests.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
