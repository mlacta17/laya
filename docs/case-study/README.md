# Laya portfolio case-study evidence

This directory preserves sanitized evidence while each decision is fresh.
It supports written and designed case studies plus the future isolated
interactive demo; it is not a public site, production-data mirror, or
additional Laya runtime environment.

## Safety boundary

Evidence committed here may include:

- Synthetic user, catalog, invitation, progress and upload fixtures.
- Redacted diagrams, state matrices and accessibility checks.
- Aggregate measurements that cannot identify a provider object or person.
- Links to repository ADRs, phase briefs, tests, pull requests and commits.
- Screenshots or recordings produced exclusively with synthetic data and
  self-produced or openly licensed media.

Never commit:

- Secrets, tokens, signed URLs, provider or account identifiers.
- Names, email addresses, viewing histories or other private user data.
- Local filesystem paths or filenames that reveal private media.
- Production screenshots containing personal or provider information.
- Video, artwork, subtitles or audio without publication rights.

When redaction would make evidence ambiguous, recreate the scenario with a
deterministic synthetic fixture instead of editing a production capture.

## Evidence cadence

Create one concise note for a phase or material decision after its evidence is
validated. Link to canonical repository artifacts rather than copying their
contents. A note should explain:

1. **Problem** — the user or engineering problem being solved.
2. **Constraints** — scale, security, cost, accessibility and phase boundaries.
3. **Alternatives** — credible options considered, including why they lost.
4. **Decision** — the chosen approach and its ownership boundary.
5. **Evidence** — tests, measurements, research or usability observations.
6. **Outcome** — what changed and whether the acceptance criterion passed.
7. **Lesson** — what a future project or reviewer should learn from the work.

Every claim must be traceable to an ADR, test, measured result, approved
synthetic artifact or explicitly labeled inference. Portfolio storytelling
never outranks `ARCHITECTURE.md`, `DESIGN.md`, or the active phase brief.

## Note template

```markdown
# [Phase or decision] — [outcome]

Status: Draft | Validated
Date: YYYY-MM-DD
Canonical sources: [ADR/brief/PR/test links]

## Problem

## Constraints

## Alternatives considered

## Decision

## Evidence

## Outcome

## Lesson

## Publication review

- [ ] Synthetic or redacted data only
- [ ] No secrets, identifiers, signed URLs, private paths, or personal data
- [ ] All media and imagery are self-produced or openly licensed
- [ ] Claims link to validated sources or are labeled as inference
```

## Current evidence index

- Phase 0A milestone and acceptance evidence:
  `docs/phases/completed/PHASE-0A-BRIEF.md`
- Phase 0B risk-retirement case-study note:
  `docs/case-study/phase-0b-risk-retirement.md`
- Phase 0B provider, authentication and subtitle evidence supporting that note:
  `docs/spikes/phase-0b/README.md`
- Phase 0B completion and decisions:
  `docs/phases/completed/PHASE-0B-BRIEF.md` and ADR-122, ADR-127,
  ADR-138–ADR-141 in `docs/ARCHITECTURE.md`
- Phase 1 evidence: add a validated note here as the First Light milestone is
  completed; do not pre-write outcomes.
