# Track: Client Module Decomposition & Size Guard

## Documents

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
- [Review](./review.md) — created by `conductor-review`
- [Verification](./verification/) — phase evidence, created as phases complete

## Summary

Eleven non-test modules in `apps/client/src` are over the project's 12 KB cap and the
guard test only scans `scene-logic/` and `ranch/`. This track decomposes those modules
along responsibilities the code already implies, then moves the guard to the whole
client tree so the rule is enforced where it is stated.

## Status

Not started. Five phases: composition root → HUD trio → scene/camera/effects →
screens and dev harness → guard.
