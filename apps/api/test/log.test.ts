import { afterEach, describe, expect, it, vi } from "vitest";
import { logError, logWarn, serializeError } from "../src/log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured logging", () => {
  it.each([
    ["warn", logWarn, "warn"],
    ["error", logError, "error"],
  ] as const)(
    "emits one object through console.%s with the canonical event",
    (_label, log, consoleMethod) => {
      const consoleSpy = vi
        .spyOn(console, consoleMethod)
        .mockImplementation(() => {});

      // Simulate an untyped caller to prove the runtime spread order protects
      // the event name in addition to LogFields' compile-time event?: never.
      const untypedFields = {
        requestId: "request-123",
        event: "caller_override",
        reason: "test_reason",
      } as unknown as Parameters<typeof log>[1];

      log("canonical_event", untypedFields);

      expect(consoleSpy).toHaveBeenCalledOnce();
      expect(consoleSpy).toHaveBeenCalledWith({
        requestId: "request-123",
        reason: "test_reason",
        event: "canonical_event",
      });
    },
  );

  it("serializes errors without messages, stacks, or token-like values", () => {
    const error = new Error(
      "Authorization: Bearer secret-token at https://video.example/path?token=signed-secret",
    );
    error.name = "ProviderRequestError";
    error.stack = "stack containing signed-secret";

    const serialized = serializeError(error);

    expect(serialized).toEqual({ name: "Error" });
    expect(JSON.stringify(serialized)).not.toContain("secret");
  });

  it("preserves only allowlisted standard error names", () => {
    expect(serializeError(new TypeError("not logged"))).toEqual({
      name: "TypeError",
    });
  });

  it("does not stringify non-Error thrown values", () => {
    const toString = vi.fn(() => "secret-token");

    expect(serializeError({ toString })).toEqual({ name: "NonError" });
    expect(toString).not.toHaveBeenCalled();
  });

  it("normalizes an unsafe error name instead of logging it", () => {
    const error = new Error("safe message is still not logged");
    // This deliberately looks like a syntactically harmless error class. A
    // character-based sanitizer would still leak it.
    error.name = "SecretTokenValue123";

    expect(serializeError(error)).toEqual({ name: "Error" });
  });
});
