# Track: Save Safety & QoL Pass (`save_safety_20261012`)

- **Type:** Bug fix + Feature (QoL pass)
- **Status:** New
- **Branch:** `track/save_safety_20261012` (base: `main @ 0c90e48`)

Close the largest player-trust gaps: the cup session dies on refresh after the
first commit (silently losing placement + rewards), a corrupt save falls to the
starter screen with no message, and a juvenile's cup arena look can diverge
from its ranch look (missing stage arg in the cup's `visualSeedOf` call). Then
three QoL surfaces: creature rename (≤16 chars, blocked during cup), a "New
game" dock affordance with confirm modal, and persisted first-day onboarding
callouts. Rides one save bump to v7 with a v6→v7 migration.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
