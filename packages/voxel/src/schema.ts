/**
 * DNA schema — the contract language between authored archetype templates
 * and generated creatures.
 *
 * A Template is the archetype's law: parameter bounds, style slots, palette
 * spec, rarity gates. A Dna is one resolved individual. Seeds may jitter
 * within bounds but never break them (assertDnaInBounds).
 */

export interface ParamRange {
  min: number
  max: number
}

export interface StyleDef {
  id: string
  params: Record<string, ParamRange>
}

export interface RaritySpec {
  id: string
  /** One-in-N chance; e.g. weight 128 = 1/128. Must be >= 1. */
  weight: number
}

export interface PaletteSpec {
  /** Fixed element hue in degrees — the type-color contract. */
  hue: number
  valueJitter: ParamRange
}

export interface Template {
  id: string
  version: number
  proportions: Record<string, ParamRange>
  styles: Record<string, StyleDef[]>
  palette: PaletteSpec
  rarity: RaritySpec[]
}

export interface Dna {
  archetype: string
  archetypeVersion: number
  seed: number
  proportions: Record<string, number>
  /** slot name -> style id */
  styles: Record<string, string>
  /** flat style-param values, keyed by param name */
  styleParams: Record<string, number>
  rarity: string[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isBadRange(range: unknown): boolean {
  return (
    typeof range !== "object" ||
    range === null ||
    !isFiniteNumber((range as ParamRange).min) ||
    !isFiniteNumber((range as ParamRange).max) ||
    (range as ParamRange).min >= (range as ParamRange).max
  )
}

/** Validate a template's declaration shape. Returns a list of problems. */
export function validateTemplate(template: Template): string[] {
  const errors: string[] = []
  const propKeys = Object.keys(template.proportions)
  if (propKeys.length === 0) {
    errors.push("template must declare at least one proportion")
  }
  for (const key of propKeys) {
    if (isBadRange(template.proportions[key])) {
      errors.push(`proportion "${key}" has an invalid range`)
    }
  }
  const slotNames = Object.keys(template.styles)
  if (slotNames.length === 0) {
    errors.push("template must declare at least one style slot")
  }
  for (const slot of slotNames) {
    const styles = template.styles[slot]
    if (!Array.isArray(styles) || styles.length === 0) {
      errors.push(`style slot "${slot}" must declare at least one style`)
      continue
    }
    for (const style of styles) {
      for (const param of Object.keys(style.params)) {
        if (isBadRange(style.params[param])) {
          errors.push(
            `style "${style.id}" param "${param}" has an invalid range`,
          )
        }
      }
    }
  }
  if (!isFiniteNumber(template.palette.hue)) {
    errors.push("palette.hue must be a finite number")
  }
  if (isBadRange(template.palette.valueJitter)) {
    errors.push("palette.valueJitter has an invalid range")
  }
  for (const gate of template.rarity) {
    if (!Number.isInteger(gate.weight) || gate.weight < 1) {
      errors.push(`rarity "${gate.id}" must have an integer weight >= 1`)
    }
  }
  return errors
}

/** Check a resolved Dna against its template. Returns a list of violations. */
export function assertDnaInBounds(dna: Dna, template: Template): string[] {
  const violations: string[] = []
  if (dna.archetype !== template.id) {
    violations.push(
      `dna archetype "${dna.archetype}" does not match template "${template.id}"`,
    )
  }
  for (const key of Object.keys(template.proportions)) {
    const value = dna.proportions[key]
    if (value === undefined) {
      violations.push(`missing proportion "${key}"`)
      continue
    }
    const range = template.proportions[key]
    if (
      !range ||
      !isFiniteNumber(value) ||
      value < range.min ||
      value > range.max
    ) {
      violations.push(
        `proportion "${key}" = ${value} outside [${range?.min}, ${range?.max}]`,
      )
    }
  }
  for (const key of Object.keys(dna.proportions)) {
    if (!(key in template.proportions)) {
      violations.push(`unknown proportion "${key}"`)
    }
  }
  for (const slot of Object.keys(template.styles)) {
    const styleId = dna.styles[slot]
    if (styleId === undefined) {
      violations.push(`missing style for slot "${slot}"`)
      continue
    }
    const styles = template.styles[slot]
    const known = styles?.some((style) => style.id === styleId) ?? false
    if (!known) {
      violations.push(`unknown style "${styleId}" for slot "${slot}"`)
    }
  }
  return violations
}
