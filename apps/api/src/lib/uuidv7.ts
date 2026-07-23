// UUIDv7 (RFC 9562): a 48-bit Unix-millisecond timestamp followed by random
// bits, so ids sort by creation time. ADR-129: ids are application-generated
// and stored as TEXT — D1 never generates them.
export function uuidv7(now = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Bytes 0-5 carry the timestamp, big-endian: upper 32 bits, then lower 16.
  const view = new DataView(bytes.buffer);
  view.setUint32(0, Math.floor(now / 0x10000));
  view.setUint16(4, now % 0x10000);

  // Byte 6's high nibble is the version (7); byte 8's top two bits are the
  // variant (10). The remaining 74 bits stay random.
  view.setUint8(6, (view.getUint8(6) & 0x0f) | 0x70);
  view.setUint8(8, (view.getUint8(8) & 0x3f) | 0x80);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
