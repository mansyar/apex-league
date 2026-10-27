# Phase 5 verification — Board/Ghosts/Cloud clarity + copy pass

Covers FR-12–FR-16, AC-11–AC-13. Executor: `conductor-phase` subagent
(code-complete, shell-denied); primary ran all gates, wired the queue
reader, and captured the state matrix.

## Executor delivery (see `p5-executor-handoff.md`)

- P5.T1: snapshot/offline boards say they are snapshots + age
  (`boardOfflineLine`, `staleAgeLine`; `fetchedAt` rides `BoardLoad`).
- P5.T2: ghost preview = name + day/round stamp + contender kit via
  `getMove` display names (the kit the spar borrows); bare rows for
  unfightable bundles; parity-contract comment.
- P5.T3: offline status actionable second sentence; `cloudQueueLine`;
  queue `role=status` line + optional `queued` reader; `.cloud-queue`
  shares `.cloud-status` style.
- P5.T4: `ladderTeaser` dedupe; "DOWN"→"down"; training-tier reword;
  program blurbs inline; form chip `"Label · ATK ±N"`; trophy dynamic
  `aria-label`. Bounded kit-only restyle (keylines, focus ring).
- 1 deviation: `.train-blurb` rule in ranch.css (new inline blurb needs
  note typography). `queued` wiring left for the primary.

## Primary additions (verification-driven)

1. **Queue reader wiring (T3):** `PushQueue.pending()` (0/1),
   `CloudSync.queuedPushes()` via new owner-module
   `cloud/queue-depth.ts` (keeps `sync.ts`/`main.ts` under the 12,288 B
   module cap), `main.ts` passes `queued: () => cloud.sync.queuedPushes()`.
   New tests: `push-queue.test.ts` (3), `queue-depth.test.ts` (5).
2. **Dock-head aria fix (found by the matrix):** phone boot rendered
   `is-collapsed` on the dock while `aria-expanded` stayed at its
   build-time `"true"` (`dock.ts:169`), so the head announced an expanded
   panel over a collapsed dock. `shell.ts` now initializes the attribute
   from `view.dockOpen` beside the class toggles. One line, no behavior
   change beyond the corrected label.
3. **Flush-drop finding (NOT changed, documented):** `PushQueue.flush`
   nulls `latest` before `send`, so a failed push is dropped by design
   ("the next write will try again"). The queue sentence therefore only
   reads inside the debounce window; the offline status line carries the
   behind-state after that. Pre-existing design, pinned by unit tests —
   out of scope to redesign; the matrix captures the sentence by opening
   the panel within the window.

## Gate (green)

- `bun run verify`: typecheck clean (145 voxel / 167 sim / 44 server /
  449 client files), **3317 pass / 0 fail** (smoke `RESULT fail` line is
  its intentional negative-path output), Biome clean, determinism gate
  OK (12 species × 3 stages byte-identical + 5 props).
- `bun run build`: exit 0 (pre-existing chunk-size warning only).

## Visual state matrix (`p5-matrix-report.json`, 12 shots)

Playwright Chromium, desktop 1280×800 + mobile 393×844. Route
fulfilment for live boards/ghosts; `unrouteAll` + abort for offline;
fresh profile for the no-snapshot error; real trainer creation +
`setOffline(true)` + Advance Day for the queue sentence. Console
`ERR_FAILED`/`ERR_INTERNET_DISCONNECTED` entries are the harness's own
aborts/offline steps — zero pageerrors.

| State | Verdict |
|---|---|
| Board live (both) | 4 boards × rows (rank/name/value), ghost row with GHOST badge + `Ember · day 12 · round 3 · kit: Spark, Flame Charge, Cinder Shot, Blaze Bolt` + Fight Ghost button. `fight-count: 1` |
| Ghost preview→Fight (both) | Fight closes the modal, opens the spar: "Ember answers from the board. A free bout — nothing saved." rival borrows the preview kit. `fight-opens-spar: true`. Closes via panel × |
| Snapshot (both) | "The cloud is out of reach — showing the last boards we saw. Updated just now." + ghost equivalent |
| Error, no snapshot (both) | "Can't reach the boards right now — take another look later." + ghost line, 0 rows |
| Cloud signed-out (both) | "Cloud sync is off — this ranch lives on this device." |
| Cloud signed-in (both) | "Cloud copy is up to date." (trainer id issued, Day 2 after advance) |
| Cloud offline queue (both) | "1 change waiting — they send on their own when the cloud is back." beside the status |

Behavior preservation: no sim/save-schema/voxel change; module caps
hold (queue-depth extraction); reduced-motion/keyboard/393px gates
intact — Escape closes every modal, focus ring on `.board-fight`,
mobile shots show no clipping at 393px.

## Residuals (noted, not in scope)

- Day-one hint callout banner slightly overlaps the open More panel on
  desktop until GOT IT dismisses it (P3/P4 interplay; one click, day 1
  only). Revisit only if the callout system is reworked.
- Snapshot "Nh ago / Nd ago" buckets not visually captured (needs clock
  control); units pin the buckets.
- Form chip is wider ("Sluggish · ATK -2") — mobile plate-head fits in
  the 393px shots, no overflow seen.
