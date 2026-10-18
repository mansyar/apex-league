# Track: Cup Module Refactor (`cup_module_refactor_20261018`)

Behavior-identical decomposition of the cup domain: sim-first split of
`packages/sim/src/cup.ts` into `cup/` submodules with data-driven boss routing,
then `apps/client/src/cup.ts` into a `cup/` module tree with pure view-models —
golden-test-first, `bun run verify` green throughout.

- [Spec](./spec.md)
- [Plan](./plan.md)
- [Metadata](./metadata.json)
