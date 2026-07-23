import { describe, expect, it } from "vitest";
import { uuidv7 } from "../src/lib/uuidv7";

const UUIDV7_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidv7", () => {
  it("emits RFC 9562 format: version 7, variant 10", () => {
    expect(uuidv7()).toMatch(UUIDV7_PATTERN);
  });

  it("encodes the timestamp in the first 48 bits", () => {
    const ms = 1_784_000_000_000;
    const id = uuidv7(ms);
    const timestampHex = id.slice(0, 8) + id.slice(9, 13);
    expect(parseInt(timestampHex, 16)).toBe(ms);
  });

  it("sorts lexicographically by creation time", () => {
    const earlier = uuidv7(1_000_000_000_000);
    const later = uuidv7(2_000_000_000_000);
    expect(earlier < later).toBe(true);
  });

  it("does not collide across many ids in the same millisecond", () => {
    const ms = Date.now();
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7(ms)));
    expect(ids.size).toBe(1000);
  });
});
