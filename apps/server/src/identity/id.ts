/**
 * Trainer ids are credentials: whoever holds one holds that trainer's save, so
 * an id must be unguessable rather than merely unique. Twenty Crockford base32
 * symbols carry 100 bits of entropy, which is far past guessable, and the
 * alphabet drops `i`, `l`, `o` and `u` so a player can read one aloud or copy it
 * by hand without a `1`/`l` mistake.
 */
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"

/** 20 symbols x 5 bits. Not a counter, not a timestamp, nothing about a person. */
const ID_SYMBOLS = 20

const PREFIX = "trn_"

/**
 * `getRandomValues` over 20 bytes gives 160 random bits; taking each byte modulo
 * 32 is uniform because 256 divides evenly by 32, so no rejection sampling and
 * no bias is needed.
 */
export function newTrainerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_SYMBOLS))
  let id = PREFIX
  for (const byte of bytes) id += ALPHABET.charAt(byte % ALPHABET.length)
  return id
}
