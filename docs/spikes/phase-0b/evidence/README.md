# Sanitized spike evidence

This directory may contain small, reviewable artifacts that substantiate Phase
0B results. Every artifact must be understandable from its linked result
document and safe to publish to every repository collaborator.

## Allowed

- Cropped screenshots with secrets and personal identifiers removed.
- Short text logs with tokens, cookies, codes, emails, and provider identifiers
  redacted.
- Small measurement summaries such as timing tables.
- Automated test output that contains no credentials or personal information.

## Forbidden

- Access tokens, refresh tokens, authorization codes, cookies, client secrets,
  private keys, invitation codes, or passwordless-email links.
- Personal email addresses, phone numbers, names, provider user IDs, or
  unredacted audit events.
- Provider configuration exports.
- Media files or large binary recordings.
- Evidence whose meaning or origin is not documented in a result file.

Use descriptive names such as `auth0-auth-01-browser-redacted.png`. Inspect the
final staged file—not only the original—before committing it.
