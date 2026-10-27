# Phase R1 verification — review fix F1 (trophy accessible name)

Executor: `conductor-phase` subagent (code-complete, shell-denied); primary
verified the delta directly (mechanical one-attribute fix + test extension).

## Fix

- `apps/client/src/hud/plates-score.ts` (+3): `trophy.setAttribute("role",
  "img")` at build beside `className`/`title`, with a why-comment
  (aria-label on a role-less generic span is ignored by assistive tech).
  Visible text (`× N`) and layout untouched; the existing paint-time
  `aria-label` ("Cup championships: N") is now exposed as the accessible name.
- `apps/client/src/hud/plates.test.ts`: `FakeNode` gained the DOM surface
  the score-bug path needs (`attrs`/`getAttribute`, `cloneNode`,
  `replaceChildren`, `classList.toggle`, `style.display`); new
  `describe("score-bug trophy")` builds through the real `buildScoreBug()`
  and paints `cupsWon` 3 (visible, label contains "3", count "× 3") and 0
  (hidden via `display: none`, label exactly "Cup championships: 0").

## Gate (green)

- Focused: `bun test apps/client/src/hud/plates.test.ts` — 38 pass / 0 fail.
- Full: `bun run verify` — typecheck clean (449 client files), **3320 pass /
  0 fail** (+3 new), Biome clean (one import-sort auto-fix by
  `biome check --write`, no hand edits), determinism gate OK.
- `bun run build` — exit 0 (pre-existing chunk-size warning only).

No deviations: diff is exactly the two Touched files; the Biome formatter's
import reorder is its own safe fix.
