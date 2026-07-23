// MOCK ISSUER FIXTURE — DELIBERATELY COMMITTED. TEST AND DEV USE ONLY.
//
// This RSA keypair is public knowledge by design: §3.4 requires
// deterministic JWT/JWKS fixtures so local dev, deployed dev and tests all
// verify the same tokens. It protects nothing. Production can never trust
// tokens signed with it because production environment validation rejects
// the MOCK_JWKS variable outright (ADR-132 / ADR-134) and production has no
// issuer configured at all until Phase 0B.
//
// Keep MOCK_ISSUER, MOCK_AUDIENCE and the public key in sync with the dev
// `vars` block in apps/api/wrangler.jsonc.

export const MOCK_ISSUER = "https://mock-issuer.laya.invalid";
export const MOCK_AUDIENCE = "laya-api-dev";
export const MOCK_KID = "laya-mock-2026-07";

export const MOCK_PUBLIC_JWK = {
  kty: "RSA",
  n: "rrAwthawKO5q1pouTujp1wd8pVZCbQSqr7OFlEefEWhJIMWX5ZnNI70NrnnHS4kxjnXNGIPt1P3OJ5ZQfa5M8efjxMhWHN05zSFRshqcao76E3ccxjM73qwfMFaldAs7bJX0isuqcDiDkuOXI59x_mz93RJ7LiS041VnBi-D-as1if1w-BKBYhDrqL2UMj7YSL3uUH3GiHUM699boi_M7J43w5JfEIQE0GrsXBCdYuCctU_3V6niumC2MuLPRHj1fU-v1U4s09wiybljEtIELZbu90sbiyR2JAWYDjIM4nE68WcznD9h3aEbhijk95V5f_ONPJOarU-MVVwaR6w0vQ",
  e: "AQAB",
  alg: "RS256",
  kid: MOCK_KID,
  use: "sig",
};

export const MOCK_PRIVATE_JWK = {
  kty: "RSA",
  n: MOCK_PUBLIC_JWK.n,
  e: "AQAB",
  d: "5fUKKqmzPC6edeKBE1-IdIhmjUAAMYLzLlgkgA3IWCHwIjP6wUS1x1YXrJaiw8zWb7KjSqJhcwCpYXN-gfPxVoDsVR9kPJr8fAxgfxSI071jdjxWpJLNPVNXu0pUg25Fy6ubPxrcQt4iVjtDuqEqbsMLbPnnLdckSB8kgAAMu5t5GvNuREC1BJYCVSj73D19riTKNyn7PE1qUgeEe3h9gLun7vc49CTg2uIdag3HP1OhdM6gRsMkYP-GvjAlAqKJugcZSHLTztHPbkRmSrqaH4Bt5IMnaodMY_MKSnw7t5wPOMP5BlMyoCcS3n0sEstxo2vekLjofDnZCxI4uvgB",
  p: "0__9ioLUy3Q3tO5kaLnIRzKDkLVKUxtyyUSoWmW8iDYfW8hBxHSjyxA3kXC9wdIHYG81wBV9-8bl_l6IeRK7YDhtu7RFEbx-xc_VD5h7ZHYRHnYjTfbbrq5QgL5SoAvSDJNObdeKKVDH8lfl1xIISGr1yGAwtsnxaqy9IH4BwgE",
  q: "0vG_rta3Rg5KYVRtcJUo0PUUyTPsp4mo5Dl9A-LSPqfkh-ohYzdTDzYgYwyerP-tRMt3luj_hl57jLn7d3fLmY1g8l-rlfVy7FvTvim38FoB-fxDHWVtdXrWMDKbaypNTykN_WG6XpHmTaCKbfG7IxRVgIDHkCtulzLwDnLr-r0",
  dp: "MzQwM8U3ylAuqEev_s9ofTHJLylqYzpM9incE8Fg0PFpj4yFvgKCESjAkyNM4cRtva_-pn9KZ4Z5xH9mrP-GPE5EysJWsFr7r6FsD5E_tFsD9XyJOGp4Uu-NSBsv77ILMLhfiA44M5RsRq9ONy0GzR7wcE4zVeLeqWpBX9ivagE",
  dq: "OvuX4nZtVqxmReLKmyFKAWuV_VCEirAmRnKAr1Z7_UMK1qoz3b85fVZgJfIAaFUxiLvv24WY9WRz3XyfgN9BUdVDV2JC4zJ3iPmAMnsN0KoKRXEw_wY-XgwT2fQ8mvGAHnNXUxNBfnIDWI9cRbPC5OMpqT3ZD0nlqWd30kJ2E20",
  qi: "NugR-f-q_v3ZXwd65qhBUvx8lxUuWL9W8l5GI4XJJG8L4xLZlmrNePx3Of9qVOkysJSzFYGDMuP3GAUBLT3r4dkoFwnEbK-ECn0sgZGkkmRuNRUIy3G6I0kWoxJf8SOo6_wEDJdc-4RjNk1PVQuwrCm13Dv4HGRb0oc377qF6EU",
  alg: "RS256",
  kid: MOCK_KID,
  use: "sig",
};

// The exact JSON the dev Worker serves at /dev/.well-known/jwks.json and
// carries in its MOCK_JWKS variable.
export const MOCK_JWKS_JSON = JSON.stringify({ keys: [MOCK_PUBLIC_JWK] });
