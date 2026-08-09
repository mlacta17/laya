# Laya — Product Opportunities

*Discovery register · Non-authoritative · August 2026*

---

## 1. Purpose and authority

This document preserves product hypotheses that may be worth testing after the
bounded work already in progress. It is not a requirements document, roadmap,
phase brief or architecture decision. Nothing here authorizes design or
implementation.

The active phase brief remains binding. An opportunity enters the product only
after evidence supports it, architecture implications are resolved through an
ADR where required, and a future phase brief explicitly includes the work.
Ideas may remain parked indefinitely without being product debt.

## 2. Status and scoring

Opportunity status:

- **Captured:** the observation and hypothesis are recorded; no research has
  validated them.
- **Exploring:** interviews, concept tests or technical spikes are in progress.
- **Validated:** evidence supports further investment, but the work is not yet
  committed.
- **Promoted:** an ADR and phase brief have accepted and bounded the work.
- **Parked:** potentially valuable, but its present cost or timing is wrong.
- **Rejected:** evidence or constraints do not support proceeding.

Scores are comparative planning aids, not evidence:

- **Product fit (1–5):** alignment with Laya's small, private, contributed
  library and its viewer, contributor and operator needs. Five means the idea
  strengthens what is uniquely Laya; one means it could belong to any streaming
  service.
- **Feasibility (1–5):** ability for one developer to ship and maintain a safe,
  accessible version using the approved architecture. Five means a small change
  built from existing data and components; one means new media processing,
  providers or operating responsibilities.
- **Priority score:** product fit multiplied by feasibility. This intentionally
  rewards useful, testable ideas over ambitious features with no evidence.

Every score must be revisited after research or a provider spike. A high score
does not override the roadmap.

## 3. Ranked register

| Rank | Opportunity | Status | Product fit | Feasibility | Priority | Current disposition |
| ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 | Why I Shared This | Captured | 5 | 5 | 25 | Best first social experiment |
| 2 | Pass It On | Captured | 5 | 4 | 20 | Test after the core title experience exists |
| 3 | My Shelf | Captured | 4 | 4 | 16 | Lightweight identity and curation experiment |
| 4 | Rewatch Reflection | Captured | 4 | 4 | 16 | Build only after ratings/history are real |
| 5 | Post-Watch Circle | Captured | 5 | 3 | 15 | Start with one note per viewer; no threads |
| 6 | Timed Circle Reactions | Captured | 5 | 2 | 10 | High differentiation; prototype before schema work |
| 7 | Movie Night Match | Captured | 4 | 2 | 8 | Useful but crowded concept space; validate demand |
| 8 | Finite Discovery Feed | Captured | 3 | 2 | 6 | Explore only with existing, reviewed clips |
| 9 | Scene Exchange | Captured | 4 | 1 | 4 | Rights and derived-media lifecycle need a spike |
| 10 | Laya Cuts | Captured | 3 | 1 | 3 | Ambitious experiment; do not automate first |

Ties are ordered by the amount of new product and moderation surface they
introduce. The register prioritizes finishing Laya's core over implementing any
item in this table.

## 4. Opportunity cards

### OPP-001 · Why I Shared This

**Observation:** A contributed title has personal provenance that commercial
catalogs cannot express.

**Hypothesis:** A short note from the contributor will help viewers understand
why a title belongs in the library and choose it with more confidence.

**Smallest test:** Add one optional, spoiler-free sentence to a static title-page
prototype. Compare it with the same page without contributor context.

**Success signal:** Viewers read or mention the note and can explain whether it
affected their decision. Contributors can write a useful note without help.

**Risks:** Empty or low-effort notes, accidental spoilers, and additional work
during upload.

**Earliest eligibility:** Design research may begin after D0. Product work must
wait for the catalog/title-detail phase that owns the surrounding surface.

### OPP-002 · Pass It On

**Observation:** Recommendations usually happen in private messages, then lose
their context before the recipient watches.

**Hypothesis:** Sending an already-playable title to one known person with a
short reason, followed by a post-watch response, will be more useful than a
generic recommendation row.

**Smallest test:** Prototype send, accept/dismiss and respond states without
notifications or messaging threads.

**Success signal:** Recipients remember who recommended the title, understand
why, and act on the recommendation more often than an unaddressed catalog card.

**Risks:** Notification pressure, obligation to respond, duplicate requests and
unwanted recommendations.

**Earliest eligibility:** After the Phase 3 title and browse experience is
stable. Identity, notification and persistence decisions require review before
implementation.

### OPP-003 · My Shelf

**Observation:** People use favorites and lists to express taste, not only to
retrieve content.

**Hypothesis:** A deliberately small personal shelf will let members express
identity without follower counts, public profiles or engagement ranking.

**Smallest test:** Let a participant choose four favorites and one named shelf
from the real or synthetic catalog, then show it to another member.

**Success signal:** Members enjoy curating the shelf and other members learn
something useful about their taste.

**Risks:** Redundant navigation, stale shelves and pressure to perform taste.

**Earliest eligibility:** After favorites and the title catalog exist. Keep it
private to the shared library unless a later decision explicitly changes that.

### OPP-004 · Rewatch Reflection

**Observation:** A person's relationship with a film can change, but a single
rating hides that history.

**Hypothesis:** Showing a viewer their earlier rating or note after a rewatch
will make watch history personally meaningful.

**Smallest test:** Present a previous synthetic note after a participant marks
a title rewatched and ask for a new response.

**Success signal:** Participants can describe what changed and value retaining
both reactions rather than overwriting the first.

**Risks:** More complicated rating semantics, fabricated precision about what
counts as a rewatch and low use frequency.

**Earliest eligibility:** After durable history and ratings ship and real
rewatch behavior exists.

### OPP-005 · Post-Watch Circle

**Observation:** Reviews are useful after watching but create spoilers and
visual noise before playback.

**Hypothesis:** Unlocking short notes from known members after completion will
support discussion without turning every title page into a public comment
section.

**Smallest test:** One editable note per viewer, an optional rating and a spoiler
flag. No replies, likes, follower counts or engagement sorting.

**Success signal:** Viewers read or write notes after finishing and report that
the discussion adds meaning without affecting playback or exposing spoilers.

**Risks:** Empty rooms, moderation, social pressure, spoilers and ambiguity when
progress does not reflect a true completion.

**Earliest eligibility:** After ratings and reliable completion state exist.
Written social content requires an ADR covering schema, permissions, deletion,
spoilers and operator controls.

### OPP-006 · Timed Circle Reactions

**Observation:** Family and friends in different time zones rarely watch
together, but reactions are most meaningful at the scene that caused them.

**Hypothesis:** Brief reactions attached to playback timestamps can create
asynchronous co-viewing without scheduling a watch party.

**Smallest test:** Prototype a fixed set of reactions that reveal only after the
viewer reaches their timestamps and can be hidden globally.

**Success signal:** Viewers feel another person's presence without distraction,
spoilers or loss of player control.

**Risks:** Player clutter, spoilers, seeking behavior, moderation, notification
noise, asset replacement and timestamp drift across editions.

**Earliest eligibility:** After the custom player and stable playable behavior
ship. An ADR must define reaction identity, timestamp semantics, deletion,
spoiler rules and behavior when media duration changes.

### OPP-007 · Movie Night Match

**Observation:** Groups spend time negotiating what to watch even when every
option is already available.

**Hypothesis:** Private voting over the actual Laya catalog can reach a decision
faster by incorporating history, runtime, subtitle availability and readiness.

**Smallest test:** Give a group a fixed deck and reveal titles accepted by all
participants. Do not build real-time rooms or chat.

**Success signal:** The group chooses faster and accepts the result without
returning to open-ended browsing.

**Risks:** The swipe-to-match pattern is already common, unanimous matching may
fail, and scheduling/group state can exceed the value delivered.

**Earliest eligibility:** After the catalog and individual history are stable.
It remains separate from the explicitly deferred watch-party feature.

### OPP-008 · Finite Discovery Feed

**Observation:** Short clips can help viewers sample a title, while infinite
feeds optimize accidental consumption rather than a deliberate choice.

**Hypothesis:** A small, finite set of reviewed clips can support discovery and
end with a clear transition into a complete title.

**Smallest test:** Use manually selected clips from openly licensed media. Show
a visible endpoint and compare full-title starts against conventional cards.

**Success signal:** Clips improve confident title selection without producing
long, unintended browsing sessions.

**Risks:** Becoming a generic short-video feed, accessibility problems,
spoilers, player complexity and unclear value once the finite set is exhausted.

**Earliest eligibility:** Research only after the Phase 3 experience is stable.
It depends on a reviewed source of clips and does not authorize automated clip
generation.

### OPP-009 · Scene Exchange

**Observation:** People recommend a specific moment in a work, not always the
whole title.

**Hypothesis:** Selecting a bounded scene and sending it to another library
member will preserve the conversational context and create a direct path into
the complete title.

**Smallest test:** Simulate start/end selection and recipient playback using
openly licensed media; do not render or distribute a new asset.

**Success signal:** Senders choose meaningful boundaries and recipients
understand the relationship between the scene and full title.

**Risks:** Derived-media rights, spoiler exposure, clip rendering and storage,
signed access, media replacement, and recipients sharing outside the library.

**Earliest eligibility:** After the custom player. A provider, rights and
derived-asset lifecycle spike is required before an ADR can accept it.

### OPP-010 · Laya Cuts

**Observation:** Some viewers consume caption-heavy, vertically edited movie or
episode recaps instead of—or before—watching the original work.

**Hypothesis:** A short-form cut generated from a title may help younger viewers
discover or consume library stories in a format they already understand.

**Smallest test:** Manually edit 8–12 clips from one openly licensed title. Test
separate spoiler-safe highlights and full-recap concepts before attempting any
automation.

**Success signal:** The test establishes whether cuts drive full-title starts or
serve as a distinct consumption mode, and participants judge the edit coherent
and appropriately spoiler-labeled.

**Risks:** Automated narrative judgment, vertical reframing, transcription,
caption rendering, additional encoding/storage, operator review, rights,
spoilers, tone damage and a new media-processing failure lifecycle. A generic
vertical feed is not differentiated by itself.

**Earliest eligibility:** Phase 6 or a later experimental phase. It requires a
new ADR and a time-boxed provider/processing spike before any production design
or implementation.

## 5. Research sequence

Do not test all opportunities at once. Use this order unless new evidence
changes it:

1. Validate **Why I Shared This** because it is cheap and directly expresses
   Laya's contributed-library identity.
2. Test **Pass It On** and **Post-Watch Circle** as low-fidelity flows after the
   title experience exists.
3. Prototype **Timed Circle Reactions** to assess presence versus distraction.
4. Evaluate **Movie Night Match**, **My Shelf** and **Rewatch Reflection** only
   when the data they depend on is real.
5. Use openly licensed media to test **Finite Discovery Feed**, **Scene
   Exchange** and **Laya Cuts** without building an automated pipeline.

For ten users, moderated tasks and direct observation are more valuable than
invented percentages. Record counts, quotes, failures and design changes; never
claim statistical significance.

## 6. Promotion gate

Before an opportunity can become product scope, record:

- the observed user behavior and sample;
- the problem it solves better than the current experience;
- the smallest accepted version and explicit non-goals;
- accessibility, privacy, moderation, spoiler and abuse implications;
- provider behavior verified from official sources where relevant;
- schema, cost, operations and media-lifecycle implications;
- measurable acceptance criteria;
- an ADR when the decision changes architecture or operating policy; and
- a future phase brief that explicitly includes the work.

The strongest outcome may be to reject or park an idea. Finishing a coherent,
reliable product is more important than accumulating differentiators.

## 7. Adjacent-product signals

These references establish that the surrounding behaviors exist; they do not
validate a Laya implementation. Recheck them when an opportunity enters active
research because products and policies change.

- [Letterboxd](https://letterboxd.com/) combines film logging, ratings, reviews,
  likes, lists, favorites and an activity feed, demonstrating film as identity
  and public self-expression.
- [Serializd](https://www.serializd.com/) applies tracking, reviews and lists to
  shows and episodes.
- [WatchWatch](https://www.watchwatch.tv/) preserves a recommendation from one
  person through selection and a response after watching.
- [Viki Timed Comments](https://support.viki.com/hc/en-us/articles/360009409194-What-are-Timed-Comments)
  attaches discussion to playback moments and lets viewers disable it.
- [Netflix Moments](https://help.netflix.com/en/node/210664027435620) lets a
  member select, save and share a bounded scene.
- [Netflix Clips](https://about.netflix.com/en/news/introducing-exciting-new-ways-to-find-and-enjoy-your-next-favorite-on-mobile)
  uses a personalized vertical feed for discovery, sharing and transitions into
  full titles. A vertical feed is therefore not differentiated by itself.
