# Phase R2 — Review fixes, round 2

| Field | Value |
| --- | --- |
| Track | `20261020-evolution-discovery-ui` |
| Phase | R2 — Review fixes (round 2) |
| Date | 2026-10-20 |
| Branch | `feat/20261020-evolution-discovery-ui` |
| Phase base | `477bd45` |
| Last code commit | `03913d7` (this evidence file follows in its own `docs(conductor)` commit) |
| Result | **verified** |

Four tasks, three code commits — `3fe27a3` (L3, L4, L5), `e98dec9` (M1),
`03913d7` (L1) — followed by two `docs(conductor)` commits: the R1 evidence
correction and this file. No per-task history was squashed this round.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Full (required) | `bun run verify` | 0 | typechecks clean (sim 79, voxel 62, client 234 files); 1762 pass / 1 skip / 0 fail across 141 files (1763 tests); `biome check` 394 files, 0 errors, 7 pre-existing `noNonNullAssertion` warnings in untouched test files; determinism gate OK (9 creature artifacts + 5 prop digests byte-identical) |
| Build | `bun run build` | 0 | Vite production build, 190 modules, `dist/` emitted (pre-existing >500 kB chunk warning) |
| Mutation probe 1 | `bun run verify` with `growthHost.setVisible(true)` removed from `open` | 1 | three of the four new slot tests fail (`expect(host.hidden).toBe(false)` → received `true`; `no Growth row labelled Mood` twice) |
| Mutation probe 2 | `bun run verify` with `growthHost.paint(state)` removed from `sync` | 1 | `sync repaints the open slot …` fails on `detailFor(host, "Mood")`: expected `35 / 40`, received `needs a lift` |

Both probes were reverted immediately; the exit-0 row above is the run on the
committed tree. `bun test <file>`, `bun run test <file>` and `bunx biome check`
are rejected by this sandbox (`permission.rejected`), so every run is the whole
`verify` pipeline.

## Findings

| ID | Severity | Fix | Proof | Status |
| --- | --- | --- | --- | --- |
| M1 | Medium | `apps/client/src/creature-detail.test.ts` grew a fake-DOM harness (`FakeElement`, a `document` with `createElement`/`activeElement`, `HTMLElement` bound to the class) installed in `beforeAll` of a new `describe("the detail modal's Growth slot")` and restored in `afterAll`. Four tests drive the real `buildCreatureDetail()` return value only; no internal import. | The four tests, plus both mutation probes above: dropping either `setVisible(true)` or the `sync` paint now fails the suite by name. | fixed |
| L1 | Low | The two `expect(row.detail.length).toBeGreaterThan(0)` assertions in `growth.test.ts` are `expect(row.detail).not.toContain("/")`. | `growth.test.ts` green in `bun run verify`; the assertion now fails if a qualitative detail ever composes a value/target pair. | fixed |
| L2 | Low | `verification/phase-R1.md`: `Head commit` is `4a1e185`, the three dead per-task SHAs are gone, the squash is stated once (including this evidence file and the F4 corrections), the "lands in a later `docs(conductor)` commit" claim is dropped, `growth-panel.test.ts` and `size-probe.test.ts` are in the Deviations table, and the lint row records `bunx biome check` as run by the primary with 0 errors. | Every SHA in the file (`10fb1e0`, `4a1e185`, `34fc937`, `b039471`, `385a49f`) resolves in `git log`; the seven dead SHAs no longer appear anywhere in the track's verification folder. | fixed |
| L3 | Low | `growth-panel.test.ts` installs the `document` stub in `beforeAll` and, in `afterAll`, re-applies the captured property descriptor or `Reflect.deleteProperty`s it. | The stub is gone after the file's tests; `bun run verify` (which runs the whole suite in one process, in parallel) is green, including the suites that build real DOM only through `document`. | fixed |
| L4 | Low | `GrowthHost.node` is removed from the interface and the returned object; `setVisible`'s docstring now reads "Show or hide the section; when shown, repaints from the last state `paint` was given." The seam test asserts `expect(host).not.toHaveProperty("node")` against the node it created. | Typecheck (`bun run check`) green; the seam test pins the surface. | fixed |
| L5 | Low | `open` calls `growthHost.paint(state)` before `growthHost.setVisible(true)`, so the first open renders once from the state it was handed instead of once on show and again on paint. | The slot test asserts `host.repaints === 1` after `open`; probe 1 shows the show call is load-bearing and probe 2 the paint call. | fixed |

## Panel test coverage map

The four new tests (`describe("the detail modal's Growth slot")`) and the seam
each one pins. `.detail-growth-host` is found by walking the returned root.

| # | Assertion | Seam it pins |
| --- | --- | --- |
| 1 | `open(baby)` → host not hidden, `.detail-growth-title` is "Growing up", three `.detail-growth-row`s, mood detail "needs a lift", `host.repaints === 1` | `open` reaching `growthHost.paint` **and** `setVisible(true)`, in the paint-then-show order (L5) |
| 2 | `sync({ juvenile: true })` while open → same host node identity, `.detail-growth-row` mood detail "35 / 40", `.detail-stat-list` identity and repaint count unchanged | `sync` → `paint` while visible; repaint swaps the slot's own children only (AC-7, FR-7) |
| 3 | Escape through the root's recorded `keydown` handler, then `sync` → host hidden, `repaints` frozen, mood still "needs a lift" | `closeNow` → `setVisible(false)`; `paint` is a no-op while closed, so the HUD's every-commit call costs nothing |
| 4 | `open(createInitialState())` on a fresh detail → host hidden, no children | `open`'s creature-less early return; host starts hidden |

The pre-existing `describe("growth row reading")` block is untouched, so the
pure row reading and the wiring are proven separately.

## Deviations

| File | Reason |
| --- | --- |
| — | None. Every edited path is in the phase's Touches. The panel test lives in `apps/client/src/creature-detail.test.ts` (the brief allowed either that file or a new `creature-detail.dom.test.ts`); `verification/integrated.md` is listed in Touches but needed no change, since round 2 found nothing wrong with it. |

## Notes

1. The harness is ~200 lines of test-local class, no dependency added: no
   jsdom, no happy-dom, no `bun:test` DOM preset. `FakeElement` implements only
   the surface `buildCreatureDetail` and `growth-panel` actually touch, and its
   `repaints` counter is the "did the panel repaint?" signal.
2. Both stubs are restored from captured property descriptors; when the
   runtime never had the global (the brief's "did not exist" case) the restore
   deletes it instead of leaving a stub behind for later suites.
3. Module sizes: exact bytes are not measurable in this sandbox (no `stat`
   path through the allowed commands), so the evidence for NFR-2 is the pin
   itself — `apps/client/src/size-probe.test.ts` caps `creature-detail.ts`,
   `growth.ts` and `growth-panel.ts` at 12,288 B and is green in the run above.
   The R2 edits move `creature-detail.ts` by four lines of comment and
   `growth-panel.ts` by two, far short of the byte headroom measured in
   `phase-R1.md`.
4. AC-7 now has automated coverage at both levels: `growth-panel.test.ts` for
   the host contract, `creature-detail.test.ts` for the panel wiring that the
   review said could be deleted silently. A human browser pass on the real
   modal is still worth doing before the PR.
