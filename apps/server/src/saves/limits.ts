/**
 * How large a save may be. The payload is the client's whole career and the
 * server never parses it, so the only thing that can go wrong with size is the
 * server accepting a body it has no business storing.
 *
 * 256 KiB is generous for a v25 save and leaves room for several more species.
 * The client's own storage has no such limit, so this is a server decision, not
 * a schema one: an oversized body is refused, never truncated.
 */
export const MAX_PAYLOAD_BYTES = 256 * 1024

/**
 * The payload's size on the wire. Bytes, not characters: a save full of
 * multi-byte creature names is larger than `payload.length` suggests, and a
 * character count would let a body through that then exceeds the limit.
 */
export function payloadBytes(payload: string): number {
  return Buffer.byteLength(payload, "utf8")
}

export function isWithinPayloadLimit(payload: string): boolean {
  return payloadBytes(payload) <= MAX_PAYLOAD_BYTES
}
