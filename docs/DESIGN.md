# Project Laya — Design Program

*Private streaming platform · Design plan v0.3 · July 2026 · Project Laya · Authority: ARCHITECTURE.md v1.3*

---

## 1. How to read this document, and what was verified

This document answers one question: **what do I design, in what order, and how do I know when a phase is done?** It is the design counterpart to the architecture document and shares its sequencing, because design that runs on a different rhythm from engineering produces beautiful screens nobody can build and built screens nobody designed.

**Verification status.** The technical constraints below are grounded in the verified decisions of ARCHITECTURE.md v1.3 — see its ADR register, especially ADR-121 (stable playables), ADR-122 (subtitle extraction provisional), ADR-126/127 (D1; managed auth pending Phase 0B), and ADR-133 (lean catalog surface). Two of them shape design scope materially:

1. **Quality is sometimes a visible user choice** (per ADR-104). The platform (Bunny Stream) provides silent adaptive HLS, but constrained connections — the Philippines case — still warrant explicit control: a "Data saver / quality" preference (Design Phase 2) and a quality control in the player (Design Phase 1), plus a per-download quality choice on mobile.

2. **Offline is a first-class designed mechanism, not an outsourced one** (per ADR-103). Downloads ship in our own mobile app via signed MP4s into app-private storage — there is no interim third-party client to lean on, which is why the download-management surface in D5 is real scope, and why subtitle files travel with every download.

This is the pattern to repeat: **before designing a surface, confirm what the platform actually does.** Designing against imagined capabilities is how teams ship flows that die in engineering review.

---

## 2. Who this is for, and their mental models

Ten people, three distinct roles. Most design failures on projects like this come from designing for one and forgetting the others.

**The Viewer (all 10 users).** Their mental model is Netflix. That is a gift and a trap. A gift because navigation, rows, poster grids, the player, and "continue watching" need no explanation — deviating from those conventions costs comprehension and buys almost nothing. A trap because Netflix's model also implies *infinite catalogue, instant availability, and someone else's problem*, none of which are true here. The core design tension of this product: **it looks like a streaming service, but the library is small, personal, and contributed by the people using it.** Design should lean into that rather than hide it — a library of 80 films your friends chose is a different, warmer proposition than a wall of algorithmic filler, and pretending otherwise makes it feel like a bad Netflix instead of a good private cinema.

**The Contributor (maybe 4 of the 10).** Their mental model is Google Drive or AirDrop: pick file, upload, done. Reality is a multi-minute pipeline of validation, provider processing, metadata matching, and publication checks, with encoding alone taking 30–60 minutes. The gap between "done" in their head and "published" in the system is the single largest source of confusion this product will generate, and §8 is devoted to closing it.

**The Operator (you, alone).** Currently an unstaffed role with no interface, which is the most commonly forgotten surface in products like this. When a friend's upload fails to match metadata, when someone's account needs creating, when storage costs creep past the budget threshold — that is you, at 11pm, on a phone. Operator surfaces are designed in D3, not "later," because "later" means SSH and shame.

**Jobs to be done, in priority order:** (1) *Continue what I was watching* — the highest-frequency action in any streaming product, and it must be reachable in one tap from launch. (2) *Find something to watch tonight* — with a small library this is browsing, not searching. (3) *Watch on a plane / bad connection* — offline, the Philippines case. (4) *Share something I love with the group* — upload, the emotional core of the product and the thing that makes it not-Netflix.

---

## 3. Constraints every design decision must respect

These come from the architecture and are non-negotiable inputs, not preferences. A junior designer should read this section before opening Figma.

**Uploads are not instant.** Transfer of a multi-GB file plus provider transcoding takes minutes to tens of minutes, and metadata matching may need human help. No flow may imply immediacy. Anything that says "Done!" at the end of a file transfer is lying.

**No DRM, invite-only, no public sign-up.** There is no marketing site, no password reset via public form, no account creation flow in the conventional sense. Onboarding is *invite redemption*, which is a fundamentally different — and much shorter — design problem than sign-up. Designing a Netflix-style registration funnel here would be wasted work.

**Ten users means no algorithmic cold start ever resolves.** Collaborative filtering needs data volume that ten people watching a few hundred titles will never produce. Recommendations must be designed as *curation with light personalization*, and honest about it. "Because you watched Arrival" works with one data point; "Top 10 in the US today" is meaningless with ten users.

**Quality is sometimes a visible choice** (see §1). Assume every user in the Philippines will at some point need to drop quality manually.

**Metadata comes from TMDB and will sometimes be wrong or missing**, especially for obscure titles, foreign films, or anything a friend uploads with a messy filename. Design for the broken-poster case as a first-class state, not an afterthought.

**One person builds all of this in evenings.** Every component designed is a component that must be built, tested, and maintained by the same person who designed it. Ruthless economy is a design virtue here, not a compromise.

---

## 4. Information architecture

The whole product, one page:

```
Laya
├── Home ─────────────── Continue Watching · curated rows · recently added
├── Library ──────────── Movies | Series · filter (genre, year, unwatched) · sort
├── Search ───────────── titles, genres (small library ⇒ instant, forgiving; people search deferred, ADR-133)
├── Title detail ─────── hero, synopsis, limited cast (cached metadata), play/resume, episode list
├── Player ───────────── playback, subtitles, quality, next episode
├── Upload ───────────── pick file → identify → confirm → track progress
├── My stuff ─────────── my uploads · watch history · downloads (native only)
└── Settings ─────────── profile, playback prefs, data saver, account
    └── [Operator only] Library health · pending uploads · users · storage
```

Four primary destinations (Home, Library, Search, Upload) plus profile. This maps to a bottom tab bar on mobile and a top nav on web, and it does not change between phases — the IA is designed once, up front, so that later phases *fill* it rather than *restructure* it. Restructuring navigation mid-project is the most expensive design mistake available, and it is entirely avoidable by deciding the shape now.

---

## 5. Design system foundation

Existing token architecture work from Tala (W3C DTCG spec, Style Dictionary v4, three-layer token system) transfers directly and should be reused rather than reinvented — same primitive → semantic → component structure, retargeted at a dark, cinematic surface set.

**What D0 must produce, and nothing more:** a colour set built dark-first (video products live in dark mode; light mode is optional and deferred), with semantic tokens that name *roles* not values (`surface/raised`, `text/muted`, `accent/primary`, `state/error`), so the visual identity can change later without touching a single component. A type scale of no more than six steps. A 4pt spacing scale. Two elevation levels. Motion tokens for exactly three durations (instant/short/medium) with one easing curve, because unprincipled animation is how self-built products come to feel amateur.

**The component inventory for the entire product** is smaller than it feels — roughly twenty five components carry every screen: poster card, row, hero, button (3 variants), icon button, input, select, toggle, progress bar, skeleton, empty state, error state, badge, chip/filter, modal, sheet, toast, avatar, nav bar, tab bar, list row, episode row, player controls cluster, upload dropzone, status stepper. Design these once with all their states and the rest of the product is assembly.

**The states rule, which is the difference between a junior and a senior component library:** every component is designed in *default, hover, focus-visible, active, disabled, loading, empty, and error* before it is considered done. Focus-visible is not optional — it is the keyboard and TV-remote affordance, and retrofitting it later means touching every component again.

---

## 6. How design phases relate to engineering phases

**Design runs exactly one phase ahead of engineering.** While engineering builds Phase N, design is finishing Phase N+1 and validating Phase N as it lands. This keeps a buffer without designing so far ahead that specs go stale.

| Design phase | Feeds engineering | Design effort (solo, evenings/weekends) |
|---|---|---|
| D0 · Foundations & system | Eng 0A–1, plus all later UI work | 3–4 weekends |
| D1 · The Watch Core | Eng Phase 3 | 4–5 weekends |
| D2 · Identity & preferences | Eng 0B–1 and Phase 4 | 2 weekends |
| D3 · Contribution & operator | Eng Phase 4 | 3–4 weekends |
| D4 · Discovery | Eng Phase 6 | 2 weekends |
| D5 · Native & offline | Eng Phase 5 | 3–4 weekends |

Estimates assume design only — not build. They are deliberately generous on D1 and D3 because those are where the product is won or lost, and deliberately tight on D2 and D4 because those phases are mostly assembly from the existing system.

---

## 7. Phase D0 — Foundations & system *(start here)*

**Goal:** decide what the product *is* and what it's made of, before designing any screen.

**Scope:** product principles (3–5 statements that settle future arguments — e.g. "the library's smallness is a feature, not something to hide"); the IA in §4 confirmed; the content model (what a Title *is*: fields, artwork, and what happens when each is missing); visual direction, explored as two or three distinct moods applied to a single home screen rather than as mood boards, because moods are cheap and screens are honest; the token set; the component inventory above with full state coverage; and an accessibility baseline (WCAG 2.2 AA contrast on all text including over hero imagery, visible focus rings, 44pt minimum targets, subtitle rendering that respects OS text-size settings).

**Definition of done:** a junior developer can build any screen from tokens + components without asking a question about spacing, colour, or state.

**Trap to avoid:** designing a beautiful home screen before the tokens exist. The screen will get rebuilt.

---

## 8. Phase D1 — The Watch Core *(the heart of the product)*

**Goal:** a person can open the app, find something, and watch it, on any device, with no confusion.

**Surfaces:** Home (continue-watching rail first, always), Library browse with filters, Search, Title detail (movie *and* series variants — series is the harder one: seasons, episode lists, next-up logic), and the Player.

**The design problems that deserve real thought here**, in order of difficulty:

*Continue Watching is not a list of things you started; it is a prediction of what you want next.* The rules need explicit design decisions: an item enters when playback passes ~2 minutes and leaves when it passes ~92% (credits). Finished a series episode? The row shows the *next* episode, not the one just watched. Multiple people, multiple devices, multiple half-watched titles is exactly the user's stated need, so the resume rail must handle six-plus items gracefully and let a user dismiss something they abandoned — a "remove from continue watching" affordance is not a power-user feature, it's what keeps the rail trustworthy.

*Resume state follows stable playable identity* (ADR-121): viewers see exactly one resume item per movie or episode, and provider encodes or replacement assets are never visible — the API guarantees this, and the design never surfaces asset-level plumbing.

*The player is a component with unusually high stakes* because it's where every session ends. Scope it deliberately: play/pause, seek with thumbnail-free scrubbing, ±10s skip, volume, subtitle picker, quality picker, next-episode card at credits, fullscreen, and a back affordance that returns to where the user came from. Design the *idle* state (controls hidden) as the primary state — it's what people look at for two hours.

*The empty and broken states* that a small library makes common: no continue-watching yet, search with no results, a title with no poster, a title still encoding, a stream that fails mid-playback.

**Validation:** this is the phase to actually test. Five friends, ten minutes each, one task: "find something you'd want to watch and start it, then come back tomorrow and resume it." At this sample size, moderated usability testing catches essentially everything.

---

## 9. Phase D2 — Identity & preferences

**Goal:** people get in, and the product remembers them.

The reframe that saves a week of work: **there is no sign-up.** There is invite redemption, designed provider-neutral until Phase 0B selects the auth provider (ADR-127): open invitation → authenticate with an allowed method (passwordless email or Google/Apple — whatever the selected provider offers) → Laya validates the invitation → choose display name and avatar → enter the library. Two to three screens, no passwords unless the final provider decision explicitly requires them, no marketing consent, no plan selection. Design the *invite* as an artifact too: what does the message a friend receives look like, and does it explain what this thing is?

**Preferences worth having** (and no more): preferred subtitle language and default-on/off, autoplay next episode, a **data-saver / quality preference** — which is now a real feature rather than a nicety, per §1, and the primary accommodation for family in the Philippines — and optional taste seeding at first run ("pick 5 things you like") that gives the recommendation engine something to work with on day one. Keep taste seeding skippable; forcing it before first playback is a conversion killer even among friends.

**Also design here:** the account-recovery path — primary recovery goes through the selected provider's own mechanism (passwordless re-authentication, social re-login); "message the operator" remains the stated escalation path in the UI, not the primary architecture.

---

## 10. Phase D3 — Contribution & operator *(highest risk, most underestimated)*

**Goal:** a friend adds a movie without help, and you find out about failures before they message you.

This phase is where a home-built product usually reveals itself as home-built, and it deserves disproportionate care. The upload flow has four distinct design problems and only the first is obvious:

*Getting the file in.* Drag-drop or picker, size and format guidance up front, a real progress indicator for what may be a multi-GB transfer over a friend's mediocre connection, and resumability messaging if the connection drops.

*Confirming subtitles.* Embedded extraction is **provisional until the Phase 0B spike passes** (ADR-122), so this flow is designed in two states, both part of D3's definition of done. **If the spike passes:** the upload runs a parallel subtitle scan whose results surface as a track list — "Found subtitles: English, Filipino" — with relabel controls (language tags in wild files are frequently missing or wrong), plus the honest message for image-based tracks ("these can't be imported — attach an .srt"). **If the spike fails:** the same surface reads "embedded subtitles can't be imported yet — attach an SRT/VTT, or continue without subtitles," and the sidecar attach affordance is promoted to the primary path.

*Identifying what it is.* The system must match `The.Northman.2022.1080p.WEB.mkv` to a TMDB record. When it matches confidently, confirm it with poster and title ("Is this The Northman (2022)?"). When it doesn't, the user must be able to search and pick the right title manually. **This screen is the difference between a working upload feature and a permanent operator chore**, and it is the one most likely to be skipped in scoping.

*Waiting.* A status stepper — Uploaded → Checking → Preparing → Ready — with honest time expectations ("usually 30–45 minutes"), the ability to close the tab and get notified, and a clear statement that they don't need to stay. This is where the mental-model gap from §2 gets closed.

*Failing.* Rejection messages must be human and actionable ("This file didn't look like a video we can play — it may be an unusual format. Try MP4 or MKV.") rather than technical. Every rejection should offer a path: retry, pick a different file, or ask the operator.

**Plus the operator console**, designed in this phase and not later: pending and failed uploads with one-tap metadata repair; metered-cost metrics (encoded storage used, estimated monthly storage cost, delivered data this month, projected monthly total, budget-threshold status — Laya uses Bunny's metered storage, so "storage remaining" only exists as a budget-derived allowance, never a disk); titles missing originals or metadata; user list with invite generation; and a library-health view. Designed mobile-first, because operator work happens on a phone.

---

## 11. Phase D4 — Discovery, honestly scoped

**Goal:** the home screen feels curated rather than empty.

With ten users, the design job is not "build a recommendation UI" but "decide what rows exist and what they promise." A workable row taxonomy: Continue Watching → Recently Added (the highest-value row in a contributed library, because novelty is the actual event) → Because you watched X → From [friend's name] (a genuinely delightful row only this product can have) → Genre rows → Random pick / "Surprise me."

**Design the explanation, not just the row.** Every personalized row should carry its reason in the title. "Because you watched Arrival" is legible with one data point; a bare "Recommended for you" from a ten-user dataset reads as fake. Honesty about the mechanism is what makes small-scale personalization charming instead of hollow.

**Also design:** the cold-start home (a brand-new user has no history — what do they see?) and the operator's ability to pin an editorial row ("Movie night picks"), which at this scale outperforms any algorithm.

---

## 12. Phase D5 — Native & offline

**Goal:** the plane and the Philippines.

Given the verified finding that official iOS clients don't reliably do downloads today, this phase carries more weight than originally assumed. Design scope: iOS-native navigation patterns (tab bar, large titles, native gestures — do not port the web layout wholesale), download management as a first-class surface (per-title download with quality choice, storage used vs available, expiry policy, "downloaded" state everywhere a poster appears), the offline home screen, and the sync-on-reconnect behaviour for watch progress accumulated offline.

**The scope this phase owns, stated plainly:** offline exists only when our app ships — there is no interim client. Download management (per-title quality choice, storage used/available, downloaded-state on every poster, offline home, sync-on-reconnect), subtitle files bundled with every download, and the access-revalidation behaviour when a device reconnects. If offline matters to family in the Philippines sooner, this phase moves earlier in the roadmap — a sequencing call, not a design change.

---

## 13. Cross-cutting standards

**Accessibility, applied throughout rather than audited at the end:** AA contrast including text over artwork (a scrim on every hero is the standard fix), keyboard operability for the entire web app, visible focus for TV-style navigation, subtitle sizing that respects system settings, no motion that can't be disabled via reduced-motion, and captions treated as a core feature rather than a setting buried three levels deep.

**Every screen ships with its state set designed:** loading (skeletons, not spinners, for content grids), empty, error, offline, and permission-denied. A screen designed only in its happy path is half a screen.

**Copy is design work here.** With no content team, the voice of the product is set by upload errors and empty states. Warm, plain, never technical, never cute at the user's expense.

**Design-system maintenance ritual:** at the end of each phase, reconcile Figma against what actually shipped, and delete any component that got designed but never used. Unused components are debt that looks like assets.

---

## 14. Research and validation plan

Ten users is a luxury, not a limitation — it's a full-population research pool. Three moments matter: a concept check after D0 (show two visual directions, pick one), moderated usability tests with five people after D1 (the only formal testing this product needs), and an upload-flow test with three contributors after D3, watching them upload a real file without help. Everything else is continuous: they're your friends, and they'll tell you.

---

## 15. What to start this week

The correct first move is **not** a home screen. In order: write the product principles (one evening), confirm the IA in §4 against your instincts, then build the token set and the poster card / row / button / player-controls components with full state coverage. Then design the home screen — and it will take a third as long as it would have.

---

## 16. Open design decisions needing a call

1. **Offline timing** (§12) — keep the native app in Phase 5, or pull it earlier for family in the Philippines? (There is no interim client — ADR-103 decided offline ships only through Laya's own app; timing is the remaining question.)
2. **Series depth in D1** — full season/episode browsing at launch, or movies-first with series in a follow-up? Series roughly doubles the title-detail design work.
3. **Taste seeding at onboarding** — include in D2 or defer to D4 when recommendations exist to consume it?
4. **Visual direction** — cinematic dark and Netflix-adjacent (fastest to comprehension), or something with more personality that signals "this is a private club, not a corporation"? The second is more interesting and more work.
5. **Light mode** — recommend deferring indefinitely.