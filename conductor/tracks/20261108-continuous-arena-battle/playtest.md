# Playtest brief — Continuous Arena Battle

Written for the merge-time playtest. Read this before opening the game so you
know which oddities are bugs and which are decisions.

## How to open it

```bash
bun run dev
```

Then `http://localhost:5173`. At merge time the primary agent opens this URL in a
browser tab, which surfaces in the Review pane, so you can watch a cup and a spar
without leaving the session.

Fastest path to a fight: the cup ladder (any day) and a ranch spar. A single cup
day is enough to see the new engine end to end.

## What you should see

- Fighters walk, circle, close, and separate continuously — no snapping between
  poses, no "I move, then you move".
- Melee swings have a real arc: a fighter that circles out of it whiffs, and the
  announcer says so.
- Shots leave the hand and travel; a body that steps aside is missed.
- Solid blows move the victim. Enough hits near the fence and a fighter gets
  pinned against it instead of sliding through.
- A poise break costs the victim a visible moment; a normal hit costs a shorter
  one.
- The same seed replays the same fight, frame for frame.

## Limitations you will notice

1. **No verticality.** Nothing jumps, crouches, or leaves the floor. Height bands
   exist in the data, but they only decide which moves reach which bodies. A
   "high" move is high in data, not in motion.
2. **You still cannot steer.** This remains an auto-battle; the coach's tactic
   decides engagement distance and aggression, not individual moves.
3. **Camera is unchanged.** It is the existing top-down arena view. No cinematic
   follow, no cut-ins, no impact framing. The dense playback maps simulation
   millimetres to world units; the camera work is a later track.
4. **Projectiles are straight lines.** No lobs, no gravity, no arcs, no splash,
   and shots pass through each other. They also do not collide with scenery,
   because there is no scenery collision at all.
5. **Visual scale can disagree with simulation size.** Bodies now carry a radius
   and a height (tortoise 300 mm wide, heron 1,000 mm tall, and so on), but the
   voxel meshes were not rescaled to match. A visually large creature with a
   small simulated body, or the reverse, is a known mismatch, not a hit-detection
   bug.
6. **No blocking, no ring-out.** Both were excluded by decision. A fighter pinned
   at the fence is in trouble but is never pushed out of the arena.
7. **No armor frames.** Every hit that connects deals its full damage; poise only
   decides whether you are interrupted.
8. **Footwork will look like skating during knockback.** Bodies have no leg IK and
   no turn animation beyond an eased facing vector, so a sliding body may not
   look like it is bracing.
9. **Balance is not tuned for this engine.** Species win rates, boss difficulty,
   and cup outcomes all moved when the engine changed; the golden transcripts were
   re-pinned to the new reality rather than the old one. Expect some cups to be
   noticeably easier or harder than before. A full re-tune is deliberately a
   separate track.
10. **Old ghosts are skipped.** `SIM_VERSION` is now 2, so ghost bundles written
    before this track will not replay — silently, by design. A save that was
    mid-cup should still load and finish.
11. **Two pacing styles can coexist.** Pre-track battles replay through the frozen
    gauge clock, so an old replay and a new fight will look like different games.
    That is intended during the transition.
12. **The announcer is thinner in places.** The legacy log had knockback and
    launch beats; the new event set maps to fewer kinds, so some lines you used to
    hear will not fire.
13. **Bosses share the rival controller.** They are tuned by profile, not written
    bespoke, so a boss may not feel like a distinct opponent yet.
14. **Roughly two in five fights are decided on points** at the 40 second cap
    rather than by knockout. The pacing target is met, but some fights will end
    with both fighters standing and the winner chosen by HP percentage. More
    knockouts is a tuning job, deliberately left to the balance track.
15. **Damage numbers are small against the bar.** A representative body carries
    about 700 HP while a basic strike deals about 4, because HP was scaled up to
    reach the fight-length target. If any surface shows raw damage, it will look
    trivial; the bars themselves are percentage-based and read normally.

## What feedback is most useful

- **Fight length.** Inside 25-40 seconds, or still too short?
- **Engagement.** Does it look like two fighters trying to hit each other, or like
  two fighters orbiting?
- **Contact alignment.** Do blows look like they connect where the bodies are, or
  do they look like they land from a distance?
- **Knockback.** Does a solid hit read as force, and does the fence feel like a
  threat?
- **Camera.** Can you follow the action, or does it leave the frame?
- **Species.** Anything that feels obviously broken or unplayable.
- **Visual vs simulated size.** Any creature whose body looks the wrong size for
  how it gets hit.

Feedback on those seven is worth more than a list of animation polish items,
because animation is Phase 11 and beyond.
16. **No minimum range on any move.** A long lance fires just as happily at
    200 mm as at 5,000 mm, so a weapon with reach has no blind spot. A dead zone
    per move is recorded in the spec as a follow-up, not fixed here.
