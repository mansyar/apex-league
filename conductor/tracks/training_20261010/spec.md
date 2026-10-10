# Spec: Training Programs

**Track ID:** `training_20261010` · **Type:** Feature (Phase 1) · **Branch:** `track/training_20261010`

## Overview

Training is the missing day-loop verb. The player spends 1 AP to assign a single stat focus — HP, ATK, DEF, or SPD — and the nightly settlement may add +1 to that stat. A good night pays. A poor night pays nothing, and the coach says why. Each stat can rise at most +6 above its rolled base. Stats stay visible on the ranch HUD, with the trained bonus shown beside the total, so preparation is legible before any battle exists.

Moves, evolution, and battles are not in this track. The stored focus is the seam they will consume later.

## Functional Requirements

### 1. Creature training fields (sim)

- A creature gains three fields:
  - `stats` stays the rolled base. It does not change in this track.
  - `trained` is a per-stat bonus, each field an integer 0–6, starting at 0.
  - `trainingFocus` is `"hp" | "atk" | "def" | "spd" | null`.
- The displayed value, and the value later systems must read, is `stats + trained`.
- Creation sets `trained` to zeros, `trainingFocus` to null, and `trainingResult` to null.
- `TRAINING_CAP` is 6. `TRAINING_GAIN` is 1. `TRAINING_AP_COST` is 1.

### 2. Assigning a focus

- One new action, `assignTraining(state, stat)`, pure, with friendly rejections the UI maps to copy.
- First assignment of the day spends 1 AP and sets the focus.
- Swapping to a different uncapped stat the same day is free. It does not spend AP and does not clear the assignment.
- Picking the stat that is already focused is a no-op.
- There is no cancel and no AP refund. Skipping training means never assigning.
- A stat at +6 is rejected before any spend. The previous focus, if any, stays. The other stats remain assignable.
- Assignment is allowed while sick, hungry, or exhausted. Only lights-out state decides whether the night pays, so Treat or Feed after assigning can still save the session.
- Rejections: `no-creature`, `no-ap` (only when no focus is set yet), `at-cap`. A swap with 0 AP still succeeds.

### 3. Nightly gain

Inserted into the existing settlement after the hunger drop and before the sickness roll. It does not draw from the rng, so existing sickness seeds stay valid.

A focus pays +1 only when that night is a full rest, using the same predicate as `NIGHT_RECOVERY.rested`:

- health at lights-out is at or above `SICK_HEALTH` (80), and
- hunger after the 15-point drop is still above 0.

Otherwise it pays 0. Exhaustion does not waste the session. The sickness roll does not claw a gain back.

When a focus was set, settlement writes `trainingResult`:

- `"gained"` if it paid,
- `"sick"` if it did not and the creature was sick at lights-out,
- `"hungry"` if it did not and the creature was not sick (the hunger drop is what wasted it).

Sickness wins when both apply. The focus is then cleared. A night with no focus sets `trainingResult` to null. A new assignment also clears `trainingResult`.

### 4. Preview

A pure helper reports what tonight would do from current hunger and health, without mutating state. Same predicate as the gain. The UI uses it for the status line and the picker.

- No focus: the existing condition coach line stands.
- Focus, would pay: "A full night's rest will sharpen ATK."
- Focus, sick: "Too unwell to gain from training — medicine would help."
- Focus, will wake starving: "Too hungry to gain from tonight's training."
- After Advance Day, the result leads the status line for that morning, one sentence, warm, not punishing. It does not repeat the condition line. Examples: "Last night's rest sharpened ATK." / "Ember Drake was too unwell to gain from training." / "Ember Drake was too hungry to gain from training."

### 5. Ranch HUD

- A compact stat row under the name, above the condition bars. Each cell shows the stat name, the total, and the trained bonus when it is above 0. Example: `ATK 12` and `+3`. Color is never the only carrier.
- A Train control in the action cluster, visually separate from Feed / Rest / Treat / Play. It opens an inline four-stat picker in the cluster, not a modal. Opening or closing the picker spends nothing.
- Each picker entry shows the stat and tonight's delta when the night would pay (`ATK 12 → 13`), or the waste reason when it would not. Capped stats are disabled: "ATK is as sharp as it can get for now."
- Train is disabled with "No AP left today" when nothing is assigned and AP is 0. It stays enabled when a focus is set, so a swap is still possible. If all four stats are capped: "Nothing left to train for now."
- The current focus is marked in the picker. Cup day does not special-case training. Advance Day is unchanged.

### 6. Save migration

- `SAVE_VERSION` becomes 3. v2→v3 adds `trained` zeros, `trainingFocus: null`, and `trainingResult: null`. Rolled `stats` are unchanged.
- v1 still walks v1→v2→v3. Corrupt and future saves are still rejected.

## Non-Functional Requirements

- Sim stays DOM-free and deterministic. Training logic is test-first. The new step must not consume the settlement rng.
- Client stays a typed DOM overlay. No UI framework. Copy is at most two sentences, coach voice, stat names always `HP` / `ATK` / `DEF` / `SPD`.
- No new motion. Reduced-motion behavior is unchanged.
- `bun run verify` stays green. Suite stays under 10 seconds.

## Acceptance Criteria

1. Assigning a focus spends 1 AP. Swapping it the same day does not. A capped stat cannot be assigned, and a failed assign spends nothing.
2. A full-rest night adds +1 to the focused stat and no other. A sick or will-wake-starving night adds 0 and records the matching result. Exhaustion and a sickness roll do not remove a gain that the rest predicate already granted.
3. No stat's trained bonus exceeds 6. The rolled base never changes.
4. Treating or feeding after assigning, before Advance Day, can turn a wasted preview into a gain.
5. The HUD shows totals and trained bonuses, the preview matches the settlement predicate, and disabled reasons match the sim.
6. A v2 save loads as v3 with zeros and no focus. A v1 save still migrates through v2 to that same shape.
7. `bun run verify` passes.

## Out of Scope

- Move learning, move equip, and battle resolution.
- Evolution and life-stage changes.
- Cup brackets, rewards, and any cup-day training exception.
- Unlocking the Water starter.
- Stat changes from any source other than this nightly focus.
- Cancelling a focus or refunding its AP.
- Multiple creatures, audio, the icon pipeline, and ranch set dressing.
