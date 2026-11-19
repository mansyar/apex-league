/**
 * Roster Wave 2 motion profiles, split out of choreo.ts to keep that module
 * inside the 12 KB client cap. The three body-language identities follow the
 * same 12-knob contract as the arena's original profiles.
 */
import type { BodyProfile } from "./choreo"

export const WAVE_PROFILES: Record<string, BodyProfile> = {
  // A thornvolt darts on springy half-steps, hums with a quick idle tremor,
  // and lashes out from a tight coil into a sharp, high-commit strike.
  sprite: {
    gaitAmp: 1.3,
    gaitFreq: 1.5,
    leanPitch: 1.3,
    swayAmp: 0.025,
    swayFreq: 1.55,
    breathAmp: 0.8,
    breathFreq: 1.45,
    hurtMult: 0.8,
    staggerMult: 0.7,
    windupMult: 0.55,
    recoilMult: 1.35,
    strikeMult: 1.5,
  },
  // A siltback lumbers on a low, heavy tread with a slow deep breath; it
  // barely flinches, coils a long time, then commits the whole stone frame.
  golem: {
    gaitAmp: 1.4,
    gaitFreq: 0.65,
    leanPitch: 0.65,
    swayAmp: 0.009,
    swayFreq: 0.6,
    breathAmp: 1.35,
    breathFreq: 0.55,
    hurtMult: 0.6,
    staggerMult: 0.55,
    windupMult: 1.55,
    recoilMult: 1.1,
    strikeMult: 1.4,
  },
  // An emberwing flits on a near-weightless stride, sways on a slow hot
  // updraft, and dives from a short coil into a fast skirmishing strike.
  wing: {
    gaitAmp: 0.9,
    gaitFreq: 1.4,
    leanPitch: 1.45,
    swayAmp: 0.021,
    swayFreq: 0.95,
    breathAmp: 0.7,
    breathFreq: 1.3,
    hurtMult: 0.85,
    staggerMult: 0.75,
    windupMult: 0.65,
    recoilMult: 1.25,
    strikeMult: 1.35,
  },
}
