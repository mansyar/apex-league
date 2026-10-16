# Track: Battle Arena Playback (`arena_playback_20261010`)

- **Type:** Feature
- **Status:** complete
- **Branch:** `track/arena_playback_20261010`

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

## Summary

Top-down 3D arena that swaps in when a Spar starts and replays the
deterministic `BattleEvent` stream with type-colored projectiles, HP bars,
announcer lower-third, juice (shake/flash/crowd/celebrations) behind a
reduced-motion toggle (save v5), and play + fast-forward pacing. Ranch
restores after the battle; the resolver stays untouched.