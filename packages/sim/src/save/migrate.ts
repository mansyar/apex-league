/**
 * The save-migration driver: it walks the versioned migration chain and
 * hands back the current-schema payload.
 *
 * The chain itself lives one module per version step under
 * `save/migrations/`; this module owns the walk and re-exports the shared
 * migration primitives the steps lean on.
 */
import { migrations } from "./migrations"
import { SAVE_VERSION, type SaveData } from "./schema"

export { STARTER_GRANT_SEED, validateStateShape } from "./migrations/common"

/**
 * Migrate any versioned save payload to the current schema.
 * Throws on unknown/missing versions — callers treat throws as corrupt data.
 */
export function migrate(raw: unknown): SaveData {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("invalid save: not an object")
  }
  let obj = raw as Record<string, unknown>
  const rawVersion: unknown = obj.version
  if (typeof rawVersion !== "number") {
    throw new Error("invalid save: missing version")
  }
  let version: number = rawVersion
  while (version < SAVE_VERSION) {
    const step = migrations[version]
    if (!step) {
      throw new Error(`invalid save: no migration from version ${version}`)
    }
    obj = step(obj)
    version = obj.version as number
  }
  if (version !== SAVE_VERSION) {
    throw new Error(`invalid save: future version ${version}`)
  }
  return obj as unknown as SaveData
}
