# Product Guidelines — Apex League

## Brand Identity
- **Name**: Apex League. The game IS the league — the player is a trainer/agent
  competing in it.
- **One-line pitch**: "Raise the champion. Win the league."
- **Feel**: Saturday-morning sports broadcast meets cozy creature ranch. The
  ranch is warm and personal; the championship is bright, loud, and formal.

## Voice & Tone
- **Announcer energy in battle/tournament contexts**: short, punchy, present
  tense. "KAINO lands the Flame Charge!" — never walls of text mid-battle.
- **Warm coach voice in ranch contexts**: encouraging, never punishing. Care
  mistakes get gentle narration ("Rolo seems sluggish today…"), not blame.
- **No legalese, no grimdark.** Retirement is framed as "graduation" — a
  proud send-off, never death.
- **Copy rules**: ≤2 sentences per tooltip; stat names always visible
  (HP/ATK/DEF/SPD); numbers over jargon; creature names are proper nouns,
  capitalized everywhere.

## Visual Language
- **World**: chunky voxel creatures in clean, low-detail 3D arenas; stadium
  dressing (rank badges, crowd silhouettes, sponsor-free branding slots).
- **Palette**: saturated team colors per element type; neutral arena floors so
  creature silhouettes read instantly.
- **Creature surface ramp (2026-10-19, `creature_readability_20261018`)**: a
  creature's colour is decided by its archetype palette, never by ad-hoc RGB in
  a builder — semantic classes (coat, underside, dorsal, face, eye) map to a
  per-voxel class id, so a belly reads as a belly and a dapple as a dapple.
  Ambient occlusion is the *only* darkening pass (four levels, 0.72 floor,
  folded into the vertex colour); no material adds a second shadow term. Eyes
  are dark by design — a near-black bead plus a faint warm catchlight — so they
  read at silhouette scale without lighting tricks. Painted features (mouth,
  nostrils, brow) are colour, never carved geometry: they must cost triangles
  only when they must *move* (a lid is a pivot plus scale, not a socket mesh).
- **Type colors are a contract**: each of the 6 elements has one fixed hue used
  identically in badges, move icons, and particle effects (single-sourced in
  `apps/client/src/ui/element.ts`): Fire = 18° (draconic), Plant = 110°
  (bovine), Water = 205° (axolotl), Electric = 50°, Earth = 28°, Wind = 165°;
  crest glyphs for all 6 exist ahead of the remaining archetypes.
- **UI**: flat panels over the 3D scene; big touchable targets; rank/ladder
  visuals echo sports broadcast lower-thirds.
- **UI amendment (2026-10-12, Broadcast HUD Overhaul)**: all UI surfaces are
  built from one shared broadcast kit (`apps/client/src/ui/`) — chamfered
  plates, slanted tabs, hex crests, skewed meters. "Flat panels" now means a
  dark translucent scrim **plus a subtle backdrop-filter blur + saturate**
  behind plates; gradients remain banned on panels. Motion is weighty and
  broadcast-style (settle entrances, spend flashes, change feedback) and must
  honor both the in-game reduced-motion setting and
  `prefers-reduced-motion`. Element hues are single-sourced per element in
  code; all 6 element crests exist as glyphs ahead of their archetypes.
- **Creature variation (decided 2026-10-09)**: "Wild" — same-species
  individuals may look strongly different (aggressive proportion jitter
  ±20-30%, multiple signature-part style swaps, rare near-bound mutant
  builds from seeds). Species identity is carried by the archetype
  contract (topology, rig, type hue), which is never seed-touchable.
  Seeds can also roll **rare cosmetic tiers** (e.g. 1-in-N gilded/albino
  markings) as a collection hook; rarity is cosmetic only and never
  affects stats.

## UX Principles
1. **Never block on the clock.** Accelerated days tick while playing, but the
   player can always pause/plan — no real-time penalties.
2. **Preparation is the fun — make it legible.** Every pre-battle decision
   (training, moves, loadout) shows a plain-language preview of its effect.
3. **Respect the watch.** Auto-battles must be *entertaining to watch*:
   readable animations, dramatic pacing, no skip-by-default (offer fast-forward).
4. **Discovered, not hidden.** Partially-hidden evolution thresholds always
   provide direction (hints), never dead ends.
5. **Death-free stakes.** Failure states are setbacks (rank, form, condition),
   not loss of the creature.
6. **Session-friendly.** A meaningful play session is 5-15 minutes; the game
   autosaves constantly and resumes in ≤5 seconds.
7. **Desktop-first, keyboard+mouse primary**; every screen reachable in ≤2
   clicks from the ranch.
8. **The mobile bar — fully playable at 393px in both orientations.** The
   design posture stays desktop-first; mobile is an adaptation of the same
   screens, not a redesign. A screen passes the bar at 393×852 and 852×393
   when: there is no horizontal page scroll; no panel occludes an
   interactive element or the scene's action area; all text is at readable
   size; and the browser console stays clean.

## Accessibility & Inclusion
- Color is never the only carrier of meaning (type icons + color).
- Readable default font sizes; no essential info conveyed by tiny text.
- Reduced-motion setting disables camera shake and flash effects.
- All gameplay achievable without precise timing (no dexterity gates).

## Content Boundaries
- Original IP only — no Pokémon/Digimon names, designs, or likenesses.
- Cartoon-safe violence: battles are sporty contests, no gore/blood.
