# Bunny Stream behavior spike

Status: **In progress — single-region library, secure TUS, representative movie,
short-form storage control, caption mutation, refresh recovery, Bunny support,
and storage-setting evidence recorded; representative episode remains**

Decision authority: ARCHITECTURE.md §6.1–§6.2, §13.2–§13.4, and ADR-122.

All tests use a disposable Bunny Stream library. Never enable a replication
region on a future real library for this spike: Bunny documents that replication
regions cannot be removed without recreating the underlying storage zone.

## Officially documented baseline

- Stream API base URL: `https://video.bunnycdn.com`.
- Requests use the per-library Stream API key in the `AccessKey` header.
- Caption add and delete use
  `/library/{libraryId}/videos/{videoId}/captions/{srclang}`.
- Bunny describes `srclang` as the unique caption shortcode.
- Video and play-data responses expose caption shortcode, label, and version.
- Standard storage supports a selectable primary region and optional
  replication regions; the disposable Stream-library dashboard options were
  observed separately below.
- TUS uploads use `https://video.bunnycdn.com/tusupload`. A video object must be
  created first; the server then signs
  `SHA256(library_id + api_key + expiration_time + video_id)` and the browser
  sends only that short-lived signature plus its expiry, library ID, and video
  ID. Bunny explicitly warns that the permanent API key must remain server-side.
- `KeepOriginalFiles` and `EnableMP4Fallback` are Stream-library properties.
  Bunny's encoding documentation says both settings affect videos uploaded
  after the setting is changed, rather than retroactively rebuilding existing
  videos.

Official references checked 2026-07-29 and 2026-07-30:

- [Stream API](https://docs.bunny.net/api-reference/stream)
- [Add caption](https://docs.bunny.net/api-reference/stream/manage-videos/add-caption)
- [Delete caption](https://docs.bunny.net/api-reference/stream/manage-videos/delete-caption)
- [Get video](https://docs.bunny.net/api-reference/stream/manage-videos/get-video)
- [Get video play data](https://docs.bunny.net/api-reference/stream/manage-videos/get-video-play-data)
- [Stream replication](https://docs.bunny.net/stream/replication)
- [Video specification](https://docs.bunny.net/stream/video-specification)
- [TUS resumable uploads](https://docs.bunny.net/stream/tus-resumable-uploads)
- [Create video](https://docs.bunny.net/api-reference/stream/manage-videos/create-video)
- [Delete video](https://docs.bunny.net/api-reference/stream/manage-videos/delete-video)
- [Encoding settings](https://docs.bunny.net/stream/encoding)
- [Update video library](https://docs.bunny.net/api-reference/core/stream-video-library/update-video-library)
- [MP4 downloads](https://docs.bunny.net/stream/mp4-downloads)

## Disposable-library prerequisites

- [x] Disposable Bunny account/library identified.
- [x] Stream library ID stored only in temporary configuration outside git.
- [x] Stream API key stored only in temporary configuration outside git.
- [x] Disposable video IDs remain ephemeral outside git; no identifier is
      displayed or retained after cleanup.
- [x] Representative movie remains outside git.
- [ ] Representative episode fixture remains to be identified outside git.
- [x] Representative movie byte size recorded under a neutral evidence label.
- [ ] Representative episode byte size remains to be measured.
- [x] Current primary/replication dashboard options captured without IDs or
      credentials.
- [x] Original-retention and MP4-fallback scope and current disposable-library
      values verified without changing either setting.

## Secure TUS smoke evidence — 2026-07-30

A disposable local harness outside the repository used Bunny's recommended
`tus-js-client` flow. Its local server read the per-library credentials, created
the video object, and returned a six-hour, video-scoped upload signature. The
browser bundle was scanned after its production build: neither saved credential
value was present. The browser UI and result omit file names, local paths,
Bunny identifiers, signatures, and media content.

Chrome uploaded an 11,538-byte synthetic MP4 through the public TUS endpoint in
1,865 ms with zero retries. The completed object was then deleted through the
local server, and a second smoke cycle verified the page's own
`Delete completed video` control. Both exact disposable smoke objects were
confirmed absent afterward. This proves connectivity, browser CORS behavior,
the credential boundary, and cleanup mechanics; it is not representative
throughput or encoded-size evidence.

The harness was then hardened for refresh recovery. Its local server keeps an
in-memory set containing only video objects created during that server process;
page reload requests deletion of that set without persisting or displaying any
identifier. A concurrent extraction/upload run reached 18% upload before
refresh. Reload reported one attempted deletion, one success, and zero failures.
The exact neutral test object was absent from Bunny afterward while the retained
representative movie remained present. Restarting the local server during an
upload still loses this intentionally ephemeral set and requires manual
provider verification; the disposable harness documents that limitation.

The first representative object then uploaded 938,773,287 source bytes in
27,301 ms at 34,385,662 bytes/second with zero retries while the 8 GB subtitle
fixture was parsed concurrently. Bunny accepted the object and reported the
source duration as 5,931 seconds with no transcoding messages. Its first status
read showed encoding at 15%; the final encoded storage evidence is recorded
below.

A later list response and dedicated video response both returned API status
`3` while simultaneously returning `encodeProgress: 15`, no available
resolutions, and zero encoded storage bytes. The dedicated storage endpoint
likewise reported zero encoded bytes while correctly reporting the
938,773,287-byte original. At the same time, the Bunny dashboard visibly showed
`Transcoding` with no playable preview.

Bunny support clarified on 2026-07-31 that a TUS-uploaded video is fully
playable at **API status `4`**, while **webhook status `3`** represents the
corresponding completion event. The earlier interpretation had incorrectly
compared the API value with the webhook enum. Production polling must use the
API contract and require status `4`; webhook handling must use the separate
webhook contract and status `3`. Encoding progress and playable output remain
useful diagnostics, but they do not replace those endpoint-specific states.

After the dashboard visibly completed transcoding, the dedicated response
reported 100% and four H.264 renditions (`240p`, `360p`, `480p`, and `720p`)
with no transcoding messages. The storage endpoint reported:

- 3,551,877,784 encoded rendition bytes;
- 3,166,874,689 MP4 fallback bytes;
- 13,774,332 thumbnail, preview, and miscellaneous bytes;
- the retained 938,773,287-byte original; and
- 7,671,300,092 total stored bytes.

Delivery assets alone were 7.1716 times the source; total storage with the
retained original was 8.1716 times the source. Bunny's `dateUploaded` was later
than the storage endpoint's `calculatedAt` timestamp by several hours, so an
encoding-duration calculation from those provider timestamps would be invalid.
The duration remains unmeasured rather than estimated.

## Caption-key and mutation sequence

Use tiny, synthetic WebVTT payloads that contain no dialogue from copyrighted
media.

1. Add shortcode `en` with label `English` and payload A.
2. Read video and play data immediately, after 30 seconds, and after 2 minutes.
3. Add shortcode `en` again with label `English replacement` and payload B.
4. Repeat the reads and verify whether the version changes and whether any
   stale payload remains reachable.
5. Add distinct candidate shortcodes `en-sdh` and `en-forced`.
6. Record whether the API accepts both, how the player/play data labels them,
   and whether all three coexist.
7. Delete `en-forced`, then `en-sdh`, then `en`, repeating the timed reads after
   each mutation.
8. Do not issue a purge unless current documentation, Bunny support, or the
   observed result demonstrates one is required.

| Mutation | API status | Immediate state | 30-second state | 2-minute state | Version/cache observation |
| --- | --- | --- | --- | --- | --- |
| Add `en` payload A | HTTP 200 | API and player expose one `English` caption | API remains `English`, version 1 | API remains `English`, version 1; player rendered payload A | Initial publication passed |
| Replace `en` with payload B | HTTP 200 | API changes to `English replacement`, version 2; player still renders A | API remains version 2; player still renders A | API remains version 2; player still renders A | Direct CDN reads with `v=2`, `version=2`, and a unique query all return cache hits containing A; replacement is stale beyond two minutes |
| Add `en-sdh` candidate | HTTP 403 | Rejected: `srclang` permits only 1–3 lowercase letters | Not applicable | Not applicable | `sdh` was then accepted as an opaque spike key with label `English SDH`, version 1 |
| Add `en-forced` candidate | HTTP 403 | Rejected by the same 1–3-letter rule | Not applicable | Not applicable | `frc` was then accepted as an opaque spike key with label `English Forced`, version 1 |
| Verify three variants | HTTP 200 for `sdh` and `frc` | API exposes `en`, `sdh`, and `frc` simultaneously | Player exposes three distinct labels after refresh | Not separately sampled | Standard, SDH, and Forced rendered as distinct selectable tracks; ADR-122 treats the shortcode as a stable opaque provider key and keeps language/track semantics in Laya |
| Delete Forced (`frc`) | HTTP 200 | API immediately removes only Forced | Player removes Forced after normal refresh | Not separately sampled | Standard and SDH remain unaffected |
| Delete SDH (`sdh`) | HTTP 200 | API immediately removes only SDH | Player removes SDH after normal refresh | Not separately sampled | Standard remains unaffected |
| Delete `en` | HTTP 200 | API immediately reaches zero captions | Player exposes no caption choices after normal refresh | Old direct URL still returns payload A on the delayed recheck | The old direct caption URL remains an HTTP 200 cache hit after deletion, including with unique queries |

### Support-directed Edge Rule retest — passed 2026-07-31

On 2026-07-31, Bunny support suggested that an Edge Rule bypassing cache for
caption files **might** address the stale replacement/deletion behavior. The
supplied example used both of these actions with a value of zero seconds:

1. `Override Browser Cache Time`
2. `Override Cache Time`

The condition was limited to caption request URLs matching
`*/captions/*`. The account-specific CDN hostname is intentionally omitted from
git.

The rule was enabled only on the disposable library's pull zone. Its exact URL
condition excludes playlists, video segments, thumbnails, and preview paths;
the pre-existing `.m3u8` cache rule remained unchanged. Unsigned spot requests
to the playlist and thumbnail returned HTTP 403, so they provide no additional
cache-header evidence beyond the rule's structural path isolation.

The retest produced:

| Step | API state | Direct CDN | Player |
| --- | --- | --- | --- |
| Add payload A | `English Edge A`, version 1 | HTTP 200, marker A, `CDN-Cache: BYPASS`, `Cache-Control: public, max-age=0` | Current 45-second payload A rendered |
| Replace with payload B | `English Edge B`, version 2 | HTTP 200 and marker B immediately with the same bypass/zero-cache headers | A fresh browser session rendered the 45-second payload B |
| Replace B with C | `English Edge C`, version 3 | HTTP 200 and marker C immediately with the same bypass/zero-cache headers | The same fresh session rendered C after an ordinary refresh |
| Delete `en` | zero captions | HTTP 404 immediately and on the delayed recheck; no old marker; `CDN-Cache: BYPASS` | The same fresh session exposed no caption choices after an ordinary refresh |

One deliberate stale-client check preserved a browser profile that had loaded a
two-second payload before the Edge Rule existed. Even after a hard page refresh,
that profile continued rendering its old response while showing the current
`English Edge B` label. A clean browser session fetched B correctly. This shows
that the rule controls new responses but cannot retroactively evict a response
already stored in a user's browser cache.

**Conclusion:** accept the caption-scoped zero-cache rule under ADR-140 and
provision it before the first production caption is published. With the rule
already active, replacement and deletion passed in both direct CDN and player
tests. Do not use a pull-zone-wide purge for normal caption mutations. If a
future deployment introduces or repairs the rule after clients have cached
captions, treat those pre-rule clients as a separate migration problem rather
than claiming the rule invalidates their local cache.

## Region evidence

Record the disposable Stream library's selectable primary region and available
replication locations. Ask Bunny support:

> For a new Bunny Stream Standard library serving a private audience mainly in
> the eastern United States with some viewers in the Philippines, can New York
> be selected as the primary storage region without first creating a default
> European copy? If Singapore replication is later added, can it ever be
> removed without recreating the library/storage zone?

Preserve the dated support answer. Do not infer Stream behavior solely from the
general Storage product.

### Bunny support answer — 2026-07-31

Bunny support confirmed that Stream encoders are located in Frankfurt, so
Frankfurt is the default main storage point and cannot be changed to a U.S.
primary. Support also confirmed that removing replication regions requires
creating another library and re-uploading its videos.

This closes the provider-behavior question. ADR-139 selects one Frankfurt copy
for launch and defers every replica until measurements justify its irreversible
addition. Canonical originals remain on the owner's drive under ADR-110.

### Dashboard observation — 2026-07-30

Before the disposable library was created, Bunny Stream's creation screen
showed:

- Frankfurt (`DE`) marked `Main`;
- Singapore (`SG`), Los Angeles (`LA`), and New York (`NY`) with selected-style
  green check marks;
- London, Stockholm, Sydney, São Paulo, and Johannesburg as additional
  unselected locations priced at `$0.005/GB`;
- a pricing summary of storage from `$0.03/GB`, CDN from `$0.005/GB`, premium
  encoding from `$0.025/min`, transcription at `$0.10/language minute`, and
  Multi-DRM from `$99/month`; and
- the explicit warning that replication regions cannot be removed after the
  storage zone is created.

The screen alone did not prove whether a non-Frankfurt Stream primary could be
selected. The 2026-07-31 Stream-specific support answer above resolves that
question: Frankfurt is the required main storage point.

After deselecting Singapore, Los Angeles, and New York, every non-primary
location showed a `+` icon, Frankfurt remained `Main`, and the page warned that
running without replication may reduce performance or risk data loss. At that
point each optional location displayed `$0.01/GB`, while the pricing summary
displayed storage at `$0.00/GB`. These values differ from the same page's
initial preselected-state display and are recorded as observations without
inferring Bunny's pricing calculation. Single-region durability is acceptable
only for this disposable spike because the canonical source remains on the
owner’s drive.

The single-region `laya-phase-0b-disposable` Stream library was then created
successfully with Frankfurt as `Main`, no replication regions, zero videos,
zero stored bytes, and zero traffic. No library identifier or credential is
retained in git.

## Representative encoding-size evidence

Upload one representative movie and one episode. After encoding completes,
record only neutral labels and measurements:

| Label | Source bytes | Duration | Resolution/codecs | Encoded storage bytes | Encoded/source ratio | Encode duration | Messages/failures |
| --- | ---: | ---: | --- | ---: | ---: | ---: | --- |
| `movie-01` | 938,773,287 | 5,931.134 s | Source: 1920×808 HEVC, 10-bit 4:2:0; output: H.264 240p–720p | 7,671,300,092 total; 6,732,526,805 excluding original | 8.1716 total; 7.1716 excluding original | Unmeasured: provider timestamps conflict | None |
| `episode-01` | | | | | | | |

### Library settings and short-form control — 2026-08-06

The disposable library's Encoding dashboard showed **Keep original files**,
**MP4 fallback**, and **Multi-audio track support** enabled; Early-Play was
disabled. Read-only DOM inspection correlated each visible setting card with
its underlying checked state. No setting was changed. Together with Bunny's
library-update contract and encoding documentation, this closes the question
of scope: original retention and MP4 fallback are per-library settings, and
changes apply to subsequent uploads rather than retroactively rebuilding
existing videos.

A separately uploaded 10:34 synthetic 1080p/30 fps MP4 completed at API status
`4` with five H.264 renditions (`240p` through `1080p`). It is recorded as
`short-control-01`, not `episode-01`: synthetic Big Buck Bunny footage is much
shorter than a normal episode and is not representative of the owner's HEVC
catalog. Relabeling it would create false confidence in the cost baseline.

| Label | Source bytes | Duration | Resolution/codecs | Encoded storage bytes | Encoded/source ratio | Encode result | Messages/failures |
| --- | ---: | ---: | --- | ---: | ---: | --- | --- |
| `short-control-01` | 276,134,947 | 634 s | Source: 1920×1080, 30 fps; output: H.264 240p–1080p | 1,872,032,578 total; 1,595,897,631 excluding original | 6.7794 total; 5.7794 excluding original | API status `4`, 100% | Audio was 0.333 s shorter than video; Bunny padded silence automatically |

The component breakdown was 692,958,260 encoded-rendition bytes, 823,634,910
MP4-fallback bytes, 79,304,461 thumbnail/preview/miscellaneous bytes, and the
276,134,947-byte retained original. This equals 10.630 GB per content hour with
the original or 9.062 GB per content hour without it. Those per-hour values are
not a catalog forecast: the short control includes a full 1080p ladder and has
different source bitrate, codec, and duration characteristics from `movie-01`.

The measured storage multipliers are tracked as ARCHITECTURE.md §13.13. The
setting-scope question is answered, but §11.2 must not be re-baselined from the
movie plus a synthetic short control. A representative episode remains required.
Offline downloads (FR-4) are expected to depend on the MP4 fallback path, while
originals already live on the owner's drive (ADR-110) — so retention at Bunny
duplicates a copy that already exists.

Delete disposable media after the measurements and after any required cache
observation window.
