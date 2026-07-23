import { z } from "zod";

// The shape of a JWKS document, shared by env validation (inline MOCK_JWKS),
// the JWKS fetcher and the auth config. Lives in its own module so env.ts and
// auth/config.ts can both use it without importing each other.
//
// A provider may publish keys for several algorithms. Validate the fields we
// rely on, require at least one key, and leave algorithm-specific material for
// Web Crypto/Hono to validate when the matching key is used.
export const jwksSchema = z
  .object({
    keys: z
      .array(
        z
          .object({
            kid: z.string().min(1),
            kty: z.string().min(1),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

export type Jwks = z.infer<typeof jwksSchema>;
export type JwksKey = Jwks["keys"][number];
