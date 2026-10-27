# Phase 5 executor handoff — Board/Ghosts/Cloud clarity + copy pass

## Status: code-complete (unverified — no shell/build/tests per brief)

## Files changed (source)

- `apps/client/src/board/copy.ts` — added `staleAgeLine(fetchedAt, now)`,
  `boardOfflineLine(...)`, `ghostStaleLine(...)`; extended `ghostPreviewLine`
  with optional `kit` param (default `[]`, old 3-arg calls unchanged).
- `apps/client/src/board/fetch.ts` — `BoardLoad` snapshot now carries
  `fetchedAt`; fallback returns the snapshot's stamp.
- `apps/client/src/board/panel.ts` — snapshot status renders
  `boardOfflineLine(...)` (names last boards + age); imports updated.
- `apps/client/src/board/ghost-section.ts` — preview lists the contender's
  kit resolved via `getMove` display names (same kit the spar borrows);
  `style.display` → `hidden` discipline; snapshot status uses
  `ghostStaleLine(...)`; parity-contract comment added.
- `apps/client/src/board/board.css` — row keyline separators
  (`--kit-keyline`, existing palette) + `.board-fight:focus-visible`.
- `apps/client/src/cloud/ghosts.ts` — `GhostBoardLoad` snapshot carries
  `fetchedAt`; fallback returns it.
- `apps/client/src/cloud/copy.ts` — offline line gains actionable 2nd
  sentence ("It sends when you are back online."); added `cloudQueueLine`.
- `apps/client/src/cloud/panel.ts` — added hidden `role=status` queue line
  + optional `queued?: () => number` reader; `paint` renders queue sentence.
- `apps/client/src/cloud/cloud.css` — `.cloud-queue` shares `.cloud-status`
  style (selector change only).
- `apps/client/src/hud/copy-cup.ts` — added `ladderTeaser("bronze"|"silver")`
  template; silver/gold teasers read through it; training-tier now says
  "Training programs…"; boss-koda "DOWN" → "down".
- `apps/client/src/hud/copy.ts` — re-exports `ladderTeaser`.
- `apps/client/src/hud/dock.ts` — `PickerRowRefs` gains `blurb`; picker rows
  render the catalog blurb inline (title kept as tooltip only).
- `apps/client/src/hud/plates-creature.ts` — form chip text now
  `"Label · ATK ±N"` (consequence inline, not title-only).
- `apps/client/src/hud/plates-score.ts` — trophy sets dynamic
  `aria-label` (`Cup championships: N`); `style.display` toggle kept
  (ran­ch.css sets `display:flex`, so `hidden` would not hide it).
- `apps/client/src/ranch.css` — see DEVIATION 1.

## Per-task summary

- **P5.T1 (FR-12/AC-11):** every Board state renders explicit inline copy;
  offline/snapshot notes now say they are snapshots AND how stale
  ("Updated just now / N min ago / Nh ago / Nd ago"). Future stamps clamp
  to "just now". Loading/empty/error lines unchanged.
- **P5.T2 (FR-13/AC-12):** preview = name (fight rival name) + day/round
  stamp + kit moves (fight rival kit, display names). Fight intake
  (`ghostSparSetup`) consumes exactly name+kit; exhibition stats are NOT
  shown in preview (nothing preview-only). Partial/pre-migration bundles
  still list bare via `readGhostContender === null` → no Fight button;
  Fight never blocked (button only exists for complete contenders).
- **P5.T3 (FR-14/AC-11):** offline status says what happened + what to do;
  new `cloudQueueLine` distinguishes offline-with-queue in words;
  signed-out line untouched ("this device"). Panel renders the queue
  sentence only when `queued()` reports > 0.
- **P5.T4 (FR-15/FR-16/AC-13):** ladder teasers deduped into `ladderTeaser`
  (test pins table reads through it); period/jargon fixes (2); program
  blurbs inline in picker rows; form ATK delta inline in chip text;
  trophy count meaning in `aria-label`; detail/kit-rows/path audited —
  already fully inline, no change needed. Kit-only restyle bounded to
  existing palette/keylines + focus ring; no new components, no gradients,
  type hues untouched.

## Deviations

1. **`apps/client/src/ranch.css` (outside Touches):** one-line rule
   `.train-blurb { font-size: 11px; color: var(--ink-dim); }` (+ 1 comment
   line) so the newly inlined picker blurb matches note typography.
   Justification: FR-16 requires the blurb inline; without it the span
   inherits entry font and reads louder than tradeoff/note. No other file
   outside Touches was touched. (Note: `main.ts` does NOT yet pass
   `queued` to `buildCloudPanel` — left for the primary as a 2-line wiring
   hunk; the panel hides the queue line until then. Not applied: wiring it
   myself would be a second outside-Touches file.)

## Size accounting (line-count method, cap 12,288 B/file)

- board/copy.ts 102→~150; fetch.ts 73→~79; panel.ts 206→~211;
  ghost-section.ts 133→~147; cloud/copy.ts 65→~83; panel.ts 184→~201;
  copy-cup.ts 144→~158 — all small files, well under cap.
- hud/dock.ts 261→271 (~+450 B; est. total ~8–9 KB) — under cap.
- hud/plates-creature.ts net +1 line; hud/plates-score.ts +4 lines —
  under cap, no extraction needed.
- CSS (board/cloud/ranch) exempt in practice (ranch.css already >> cap).

## Watch items for the primary's matrix

- Snapshot age uses wall-clock `Date.now()` at paint; "Updated …" buckets
  (just-now < 60 s, min, h, d) — hard to trigger Nh/dh states without
  clock control.
- `queued` is NOT wired in `main.ts` — queue line stays hidden until the
  primary passes a reader (e.g. pending ghost + score submissions).
- Form chip is wider ("Sluggish · ATK -2") — check 393 px plate head fit.
- Ghost preview kit names depend on sim `getMove` display names.
- Trophy `style.display` kept deliberately (CSS `display:flex` beats
  `hidden`); flag if a hidden-attribute convention check complains.
- Boss-koda "down" + training-tier reword: announcer/coach voice call,
  reversible in copy-cup.ts.

## Honest test accounting (nothing run — no shell per brief)

- Extended: board/copy.test.ts (kit preview + staleness units),
  board/fetch.test.ts (fetchedAt in 3 snapshot expects),
  board/panel.test.ts (deterministic contains/regex snapshot assertions),
  board/ghost-section.test.ts (kit wiring via getMove + stale regex),
  cloud/copy.test.ts (offline actionability + queue line units),
  cloud/ghosts.test.ts (fetchedAt rides fallback), hud/copy.test.ts
  (ladderTeaser dedupe pin), hud/plates.test.ts (chip text expectation).
- No suites run, no build, no Playwright. Do NOT treat anything as green;
  primary runs `bun run verify && bun run build` + state matrix.
