# Track: Battle Animation Overhaul — Arena to AAA (`battle_animation_overhaul_20261012`)

- **Type:** Feature
- **Status:** New
- **Branch:** `battle_animation_overhaul_20261012` (base: `main @ 5c2a5fa`)

Transform the arena battle playback into AAA-grade spectator battle — AAA
timing/framing/feedback density on the stylized voxel rig (not skeletal
realism) — while preserving the deterministic replay architecture. Fixes
the arena pivot-anchor bug (learnings §1–2) first, adds curated battle-feel
sim changes (stagger, range-shifting knockback, finishing-move preference)
with golden tests updated deliberately, enriches the playback contract,
builds a shared procedural animation primitive layer, authors tiered
bespoke choreography, adds a cinematic camera director (fixed camera kept;
toggle + live switch; reduced-motion aware), a full VFX/post pass, and a
signature KO moment. Phases 0–2 are core; 3–4 are re-scopeable stretch.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
