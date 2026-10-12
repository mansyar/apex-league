# Track: Bronze Ladder (`bronze_ladder_20261012`)

- **Type:** Feature
- **Status:** New
- **Branch:** `track/bronze_ladder_20261012` (base: `main @ eba72d5`)

Complete the last open Phase 1 deliverable: a Bronze-tier ladder that turns
cup placements into persistent progression. Placement-based points (champion
+3 / runner-up +2 / semifinal +1 / else 0) climb the creature through Bronze
III → II → I automatically; Silver stays Phase 2. Ladder state persists in
save v8 (fresh 0-point init, no backfill). Client surfaces a broadcast-kit
rank plate on the ranch HUD plus ladder context on the cup entry chip and
results screen.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
