# Track: Cup Engine Consolidation (`cup_engine_consolidation_20261012`)

- **Type:** Refactor
- **Status:** New
- **Branch:** `cup_engine_consolidation_20261012` (base: `main @ 0ebfcc9`)

Make the live cup session path the sole resolution engine by retiring the
legacy one-sitting path (`enterCup`/`resolveCup`/`runRound`), pinning the
rival-seed and placement contracts with tests first, and extracting a pure,
topology-agnostic bracket model from the client's 42KB cup DOM factory. No
gameplay, save-schema, or visual changes — this clears the largest sync
hazard and directly de-risks the Phase 2 Silver/Gold ladder.

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
