# Live Cup — Design Notes (Phase A addendum)

Source of truth: [live-cup-mock.html](./live-cup-mock.html) (4 screens, user-approved
2026-10-11). Shared broadcast family with the arena track's `hud-mock.html`.

## Global language

- **Fonts**: Barlow (400–700) body, Barlow Condensed (500–800) for names/titles/stamps.
- **Palette**: same vars as the arena mock — `--panel` warm dark glass,
  `--panel-border` pale gold hairline, `--ink`/`--ink-dim`, `--gold #ffd257`
  as the single accent, `--danger #ff5a4e` for loss/forfeit, element hues
  fire/plant/water per the arena chart.
- **Plate language**: every chrome piece is a clipped polygon plate with a
  skewed gold tab (`clip-path` corner cuts). Match cards cut per column:
  QF left-cut, SF both-cut, F right-cut — the bracket reads as a funnel.
- **Scaling rule (hard-won)**: all chrome sizes are **pure container units
  (`cqw`)** with `container-type: inline-size` on the stage. No `clamp()`
  pixel floors — they reintroduce overflow at narrow pane widths. The whole
  graphic is one proportionally-scaling object; verified 0-overhang at
  1020/700/560/460px stage widths.
- **No in-card verdict lines.** Results speak through slot states (winner
  gold, loser struck-through + "out" tag) and the APEX FEED ticker. Cards are
  fixed-height so nothing ever grows into neighboring chrome.

## Bracket HUD (screen 1)

- Strict match-order reveal: QF1 → QF2 → QF3 → player QF → SF1 → SF2 → player
  SF → Final; matches slide in (`opacity + translateX(-16px)` spring).
- **Column headers follow the bracket**: QUARTERFINALS/SEMIFINALS/FINAL fade
  in with the first match of their column, never visible from the start.
- Player's next match: gold border pulse + gold **"YOUR MATCH" ribbon** —
  an in-flow tab row *inside* the card (absolute overhangs get clipped by the
  card's own `clip-path`; keep it inside, inset 14px to clear corner cuts).
- CTA pair appears during the player's match reveal: gold "STEP INTO THE
  ARENA" + ghost "Scout the rival" (free back-out; only stepping in commits).
- **Champion pedestal materializes only at crowning**: cup, "CHAMPION" label,
  and name are all invisible until the final concludes; cup scales in, label
  follows, name pops 0.3s later.
- APEX FEED ticker narrates every result; 20% bottom inset keeps it clear.

## Coach screen (screen 2)

- Three columns: your fighter card (big crest, 4 stat bars) · rival scouting
  card (stats, known kit, "Tactic unknown — watch the first exchanges") ·
  your kit card (2–4 move checkboxes, tier-locked rows) + BALANCED/SPECIALS
  tactic selector.
- Foot note carries the contract: "Nothing is committed until you step in."
- Actions: "Back to bracket" (free) / "STEP INTO THE ARENA" (commit).

## Give-up modal (screen 3)

- Danger-bordered corner-cut plate over a dimmed decorative bracket.
- Copy states the exact stakes: counts as a loss in this round, placement
  stands as a quarterfinal exit, consolation (+2 mood) still applies, no cup.
- Buttons: "STAY IN THE BRACKET" / "GIVE UP" (→ results screen).

## Results screen (screen 4)

- Centered card: giant stamp (CHAMPION gold / ELIMINATED red variant),
  gold rule draw, placement plate ("1ST — unbeaten through three rounds").
- Reward rows staggered in (AP tomorrow / bond / mood / cups-won), then
  "BACK TO THE RANCH".
