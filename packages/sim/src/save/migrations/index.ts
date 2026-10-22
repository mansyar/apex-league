/**
 * Migration chain: each entry upgrades a payload from key version to key + 1.
 * New versions append here; migrate() walks the chain step by step. Keys are
 * ascending; every entry validates through validateStateShape and only shapes
 * fields.
 *
 * This barrel is the only place that knows the chain's order — the step
 * modules below it know nothing about each other and never import this file.
 */
import { migrateFromV0 } from "./v0"
import { migrateFromV1 } from "./v1"
import { migrateFromV2 } from "./v2"
import { migrateFromV3 } from "./v3"
import { migrateFromV4 } from "./v4"
import { migrateFromV5 } from "./v5"
import { migrateFromV6 } from "./v6"
import { migrateFromV7 } from "./v7"
import { migrateFromV8 } from "./v8"
import { migrateFromV9 } from "./v9"
import { migrateFromV10 } from "./v10"
import { migrateFromV11 } from "./v11"
import { migrateFromV12 } from "./v12"
import { migrateFromV13 } from "./v13"
import { migrateFromV14 } from "./v14"
import { migrateFromV15 } from "./v15"
import { migrateFromV16 } from "./v16"
import { migrateFromV17 } from "./v17"
import { migrateFromV18 } from "./v18"
import { migrateFromV19 } from "./v19"
import { migrateFromV20 } from "./v20"
import { migrateFromV21 } from "./v21"
import { migrateFromV22 } from "./v22"
import { migrateFromV23 } from "./v23"

export const migrations: Record<
  number,
  (raw: Record<string, unknown>) => Record<string, unknown>
> = {
  0: migrateFromV0,
  1: migrateFromV1,
  2: migrateFromV2,
  3: migrateFromV3,
  4: migrateFromV4,
  5: migrateFromV5,
  6: migrateFromV6,
  7: migrateFromV7,
  8: migrateFromV8,
  9: migrateFromV9,
  10: migrateFromV10,
  11: migrateFromV11,
  12: migrateFromV12,
  13: migrateFromV13,
  14: migrateFromV14,
  15: migrateFromV15,
  16: migrateFromV16,
  17: migrateFromV17,
  18: migrateFromV18,
  19: migrateFromV19,
  20: migrateFromV20,
  21: migrateFromV21,
  22: migrateFromV22,
  23: migrateFromV23,
}
