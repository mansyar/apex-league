/**
 * Passphrases are hashed with Argon2id through `Bun.password`, which is
 * memory-hard and whose `verify` compares in constant time. No dependency is
 * added for this: it ships with the runtime.
 *
 * Storage scheme: `Bun.password` embeds a fresh random salt inside the hash
 * string it returns (`$argon2id$v=19$m=...$<salt>$<digest>`), so the whole
 * string goes in `trainers.passphrase_hash` and `trainers.passphrase_salt`
 * holds `SALT_MARKER` to record which scheme produced it. A future scheme that
 * salts separately can write its own salt there without a migration.
 */
export const PASSPHRASE_SCHEME = "argon2id"

/** Marks a hash produced by `Bun.password`, whose salt is embedded in the hash. */
export const SALT_MARKER = "argon2id-embedded"

/**
 * Eight characters is the floor the brief sets: long enough that a guess is not
 * casual, short enough that a player will actually type one on a phone. There
 * is no reset, so a passphrase nobody can remember protects nothing.
 */
export const MIN_PASSPHRASE_LENGTH = 8

/**
 * The ceiling exists because hashing is deliberately expensive: without it a
 * single request could submit a megabyte and turn Argon2 into a denial of
 * service against the server's own memory.
 */
export const MAX_PASSPHRASE_LENGTH = 128

/** The hash stored for a passphrase. Never logged, never returned. */
export function hashPassphrase(passphrase: string): Promise<string> {
  return Bun.password.hash(passphrase, { algorithm: PASSPHRASE_SCHEME })
}

/**
 * One hash of a value nobody knows, built on first use and reused afterwards.
 * It is what an unknown trainer and a passphrase-less trainer verify against, so
 * every failing claim costs the same Argon2 work and the endpoint cannot be
 * timed to learn which ids exist.
 */
let decoy: Promise<string> | undefined

export function decoyHash(): Promise<string> {
  decoy ??= hashPassphrase(crypto.randomUUID())
  return decoy
}

async function verifyAgainstDecoy(passphrase: string): Promise<false> {
  await Bun.password.verify(passphrase, await decoyHash())
  return false
}

/**
 * Whether `passphrase` matches `hash`. An empty or malformed stored hash is a
 * plain `false` rather than an exception, because a 500 on that path would be a
 * distinguishable answer and a truncated row is not the caller's fault.
 */
export async function verifyPassphrase(
  passphrase: string,
  hash: string,
): Promise<boolean> {
  if (hash === "") return verifyAgainstDecoy(passphrase)
  try {
    return await Bun.password.verify(passphrase, hash)
  } catch {
    return false
  }
}

/** Whether a value is acceptable as a passphrase at all. */
export function isPassphrase(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSPHRASE_LENGTH &&
    value.length <= MAX_PASSPHRASE_LENGTH
  )
}
