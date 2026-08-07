# Browser subtitle-extraction spike

Status: **Complete — embedded desktop-browser extraction accepted for the MVP
within the limits below**

Decision authority: ARCHITECTURE.md §6.2, §13.5, and ADR-122.

No media file, extracted caption body, personal filename, or local drive path
may enter git. Use neutral evidence labels such as `mkv-large-01`.

## Decision rule

- **Pass:** supported text tracks are extracted with correct timing and Unicode
  content across the representative matrix, cancellation/recovery is safe, and
  peak memory plus concurrent-upload degradation are acceptable.
- **Fail:** embedded browser extraction is deferred and sidecar SRT/VTT becomes
  the MVP path.
- **Blocked:** a named media sample, browser/device, or measurement capability
  is unavailable.

## Decision

Accept streaming embedded-text extraction for desktop browser uploads. The
tested implementation preserved timing, text, Unicode, language metadata and
track flags across the representative MKV/MP4 matrix; rejected corrupt input
safely; recovered with fresh workers; cancelled cleanly; and did not degrade a
concurrent TUS upload. Sidecar SRT/VTT remains available as the fallback.

This acceptance is deliberately bounded:

- text subtitles only; PGS/VobSub remain detected but unsupported;
- ASS/SSA styling is flattened while timing and text are preserved;
- desktop browser uploads only; mobile uploads use sidecar/manual captions;
- production dependencies are added in the upload phase, not copied from this
  disposable harness; and
- cancellation, progress and actionable fallback copy are required product
  behavior, not optional polish.

The acceptance matrix requires representative large-file, memory,
upload-interaction and cross-browser evidence. It does not require every large
file and upload-interaction scenario to be repeated in every browser/OS pair.
Windows Chrome, Edge and Firefox exercised the 8.46 GB stream; Windows Chrome
exercised concurrent TUS and refresh cleanup; and Safari, Chrome and Firefox on
macOS produced identical functional results. Requiring a Cartesian product of
those scenarios would add test volume without addressing an observed engine or
OS divergence. Safari and Firefox still expose no standard page-memory API, so
their null measurements are preserved as a limitation rather than reported as
zero allocation.

## Required media inventory

| Label | Container and approximate size | Required characteristic | Available |
| --- | --- | --- | --- |
| `mkv-srt-01` | MKV, 938,773,287 bytes | Real-world single English SubRip track marked default | Yes |
| `mkv-large-01` | Disposable MKV, 8,455,213,426 bytes | Large-file parser, memory, cancellation, and upload-impact fixture | Yes |
| `mkv-multi-text-01` | Synthetic MKV, 11,665 bytes | Multiple text tracks; correct, missing, and wrong language tags | Yes |
| `mkv-ass-unicode-01` | Synthetic MKV, 10,670 bytes | ASS/SSA with Unicode and Filipino text | Yes |
| `mkv-vobsub-01` | MKV, 32,768 bytes | VobSub detection without conversion | Yes |
| `mp4-mov-text-01` | Synthetic MP4, 12,362 bytes | Embedded `mov_text` | Yes |
| `sidecar-srt-01` | Synthetic SRT | Unicode and Filipino text | Yes |
| `sidecar-vtt-01` | Synthetic VTT | Existing WebVTT baseline | Yes |
| `invalid-parser-01` | Synthetic corrupt MKV | Controlled parser failure | Yes |

### Sanitized real-media inventory

The portable FFprobe 8.1.2 inventory completed against `mkv-srt-01` without
copying or modifying the source. The 938,773,287-byte Matroska file is
5,931.134 seconds long and contains one embedded `subrip` subtitle stream. Its
language tag is `eng`; it is marked default and is not marked forced or
hearing-impaired. No filename, path, title, subtitle text, video metadata, or
audio metadata was retained as evidence.

`mkv-large-01` is a disposable nine-pass stream-copy of the same real-world
source, created outside git with the owner's approval. It is 8,455,213,426
bytes and 53,380.197 seconds long, and preserves the source's one default
English `subrip` track. This is valid evidence for size-dependent parser,
memory, cancellation, and concurrent-upload behavior; it is not treated as a
second independent media-content sample. The original source was not modified.
Delete the fixture after the browser benchmark and any required rerun window.

### Synthetic inventory

All synthetic fixtures contain only original test text and generated video.
They live in the disposable local probe folder outside git.

- `mkv-multi-text-01` is a ten-second Matroska fixture with four tracks:
  default English SubRip; ASS containing Filipino/Unicode text but intentionally
  tagged `fra`; an SDH SubRip track with no language tag; and a forced English
  SubRip track.
- `mkv-ass-unicode-01` is a ten-second Matroska fixture with one default ASS
  track tagged `tgl` and containing original Filipino/Unicode test text.
- `mp4-mov-text-01` is a ten-second MP4 fixture with one default `mov_text`
  track tagged `tgl`.
- `sidecar-srt-01` and `sidecar-vtt-01` contain the same original timed
  Filipino/Unicode test cues in their respective formats.
- `invalid-parser-01` is intentionally corrupt. FFprobe rejected it with exit
  status 1, and the probe emitted only the neutral label and status.
- `mkv-vobsub-01` is the public 32,768-byte FFmpeg codec-test fixture
  `matroska+h264+ac3+dvdsub+NoDuration.mkv`. Its downloaded MD5,
  `b8cd78cceffe328683a353065699f1d4`, matched FFmpeg's published manifest.
  The sanitized inventory found one default French `dvd_subtitle` track and
  classified it as image-based and unsupported for text extraction.

## Browser implementation under evaluation

The disposable implementation lives outside git and uses one fresh Web Worker
per operation. It never renders or persists filenames, paths, or cue text.
Refresh, close, and **Cancel** terminate the workers.

| Responsibility | Candidate | Finding |
| --- | --- | --- |
| Matroska EBML streaming | `@sarakusha/ebml@0.0.8` | Browser-native `TransformStream` and typed-array parser; passed the representative large-file, cancellation, recovery and cross-browser matrix. Production adoption still occurs in the upload implementation, not in this spike. |
| MP4 sample extraction | `mp4box@2.4.1` | Passed `tx3g`; empty samples are ignored, sample numbers are deduplicated, and released samples use the documented exclusive boundary. |
| Track enumeration | `mediainfo.js@0.3.7` | Passed text metadata plus VobSub detection. It may seek and stop after gathering sufficient metadata, so its `bytesRead` is not whole-file coverage. |
| Rejected Matroska candidate | `matroska-subtitles@3.3.2` | Browser bundle loaded, but constructing `SubtitleParser` hung inside a Web Worker before parsing began. Its Node-stream compatibility layer is not acceptable for this architecture. |

The spike accepts the three passing candidates for the future upload
implementation. They remain absent from production dependencies until that
phase begins; the rejected candidate must not be introduced.

## Windows Chrome results

Environment: Chrome 150.0.7871.182 on Windows. Durations below are browser
worker measurements, not FFprobe timings.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mkv-multi-text-01` | MediaInfo enumerated all four tracks and preserved default, forced, SDH, missing-language, and intentionally wrong-language distinctions. EBML extraction produced 10 cues / 742 WebVTT bytes in 8 ms with zero Unicode replacement characters. | Pass |
| `mkv-ass-unicode-01` | One `tgl` ASS track; 3 cues / 220 WebVTT bytes in 9 ms with zero Unicode replacement characters. | Pass |
| `mp4-mov-text-01` | One `tgl` `tx3g` track; MP4Box produced 3 non-empty cues / 222 WebVTT bytes in 9 ms with zero Unicode replacement characters. | Pass |
| `mkv-vobsub-01` | MediaInfo classified `S_VOBSUB` as image-based. EBML enumeration retained the track as unsupported and emitted no text cues. | Pass |
| `invalid-parser-01` | The worker returned the controlled error `The EBML parser rejected this input.` No filename, path, or malformed output was returned. | Pass |
| `mkv-streaming-49mb-01` | Disposable 48,760,475-byte synthetic stress fixture: 50,000 cues / 3,550,032 WebVTT bytes in 8,309 ms. Main-page reported heap rose 19,276 bytes. | Pass with memory-measurement limitation |
| `mkv-large-01` | Streamed all 8,455,213,426 bytes in 17,792 ms and produced 9,000 cues / 577,817 WebVTT bytes. The single default English UTF-8 track was preserved, with zero Unicode replacement characters. Page-reported heap rose from 2,884,159 to 5,501,026 bytes (+2,616,867). A separate run cancelled promptly and returned the fresh-worker confirmation while the page remained responsive. | Pass with memory-measurement limitation |
| `tus-concurrent-01` | The 938,773,287-byte baseline uploaded to the disposable Bunny TUS endpoint in 28,077 ms at 33,435,431 bytes/second with zero retries. A second upload of the same bytes completed while `mkv-large-01` extraction streamed 8,455,213,426 bytes in 11,925 ms, produced 9,000 cues with zero Unicode replacements, and uploaded at 34,385,662 bytes/second in 27,301 ms with zero retries. The measured throughput change was +2.84%, which indicates normal run-to-run variation rather than degradation. | Pass |
| `mkv-cancel-01` | Cancel terminated enumeration and extraction workers. A new ASS run then completed without refresh. | Pass |
| `mkv-refresh-01` | Refresh during extraction returned the page to an idle state with no retained result and no enabled cancel action. | Pass |
| `tus-refresh-01` | A concurrent 938,773,287-byte TUS upload and `mkv-large-01` extraction were active when the upload reached 18%. Refresh terminated the page work; reload asked the local server to delete its in-memory set of harness-created objects and reported one attempted deletion, one success, and zero failures. Bunny then returned zero exact matches for the neutral test object while the retained representative movie remained present. A local-server restart remains an explicit manual-cleanup limitation. | Pass |

Chrome's `performance.memory` is a non-standard page-level diagnostic and does
not prove total renderer/worker process memory. The 49 MB run demonstrates
streaming behavior and a stable controller heap. The 8 GB run also completed
with a bounded reported heap increase. The Chrome Task Manager observations
below supplement that diagnostic with measured tab-process values; neither
measurement is presented as an exact instantaneous process peak.

After the 8 GB run completed, Chrome Task Manager showed the Laya tab at
`47,500K` memory, `0.0` CPU, zero network activity, and process ID `4232`. No
Laya dedicated worker remained, which is expected because the controller
terminates both workers after collecting their results. Two visible
`manage.auth0.com` dedicated workers belonged to another tab and were excluded.
This is a post-run observation, not a baseline or peak measurement.

At the requested approximately eight-second observation point during a second
8 GB run, Chrome Task Manager showed the Laya tab at `140,692K` memory, `0.0`
CPU, zero network activity, and the same process ID `4232`. Chrome did not list
the Laya workers separately, so their memory appears to be accounted under the
tab process. This is a measured in-flight point, not a proven instantaneous
peak.

Cross-run extraction durations may be confounded by operating-system file
caching and other run-to-run effects. Cache residency was not measured or
controlled. The upload-throughput comparison is the controlled measurement in
that row; the 11,925 ms concurrent and 17,792 ms solo extraction durations are
not evidence of speedup or degradation on their own.

## Windows Edge results

Environment: Edge 150.0.4078.105 on Windows. Durations below are browser worker
measurements.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mkv-large-edge-01` | MediaInfo enumerated the single default English UTF-8 text track after reading 8,985,034 of 8,455,213,426 bytes in 103 ms. The EBML worker streamed all 8,455,213,426 bytes in 14,551 ms and produced 9,000 cues / 577,817 WebVTT bytes with zero invalid Unicode characters. The page-reported heap rose from 5,345,805 to 5,750,866 bytes (+405,061). | Pass with memory-measurement limitation |

The Edge result matches the Chrome result for track classification, cue count,
WebVTT byte count, and Unicode validity. This is evidence of deterministic
output across the two tested Windows Chromium browsers. The heap figure is a
page-level diagnostic rather than a renderer/worker process peak.

In a separate large-file recovery attempt, the operator clicked **Cancel**
approximately two seconds after starting. The controller returned `Cancelled.
Fresh workers will be created for the next run.` and remained responsive.

## Windows Firefox results

Small-fixture environment: Firefox 153.0.3 on Windows. The earlier large-file,
cancellation and process-sampling runs used Firefox 153.0.1 on Windows. Firefox
does not expose Chromium's non-standard `performance.memory` API, so result
JSON correctly reports null heap values. Durations below are browser worker
measurements.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `win-firefox-multi-01` | MediaInfo enumerated all four tracks and preserved default English, intentionally wrong French metadata, missing language plus hearing-impaired metadata, and forced English. EBML extraction produced 10 cues / 742 WebVTT bytes in 16 ms with zero Unicode replacement characters. | Pass |
| `win-firefox-ass-01` | One default Filipino ASS track; 3 cues / 220 WebVTT bytes in 11 ms with zero Unicode replacement characters. | Pass |
| `win-firefox-mp4-01` | One default Filipino `tx3g` track; MP4Box produced 3 non-empty cues / 222 WebVTT bytes in 5 ms with zero Unicode replacement characters. | Pass |
| `win-firefox-vobsub-01` | MediaInfo classified `S_VOBSUB` as image-based. EBML retained the track as unsupported and emitted zero cues / zero WebVTT bytes. | Pass |
| `win-firefox-invalid-01` | The worker returned the controlled error `The EBML parser rejected this input.` without a filename, path, malformed output or parser internals. | Pass |
| `win-firefox-parser-recovery-01` | Immediately after the controlled parser failure, without refreshing, a fresh-worker ASS run produced 3 cues / 220 WebVTT bytes in 7 ms with zero Unicode replacement characters. | Pass |
| `mkv-srt-firefox-01` | The real-world 938,773,287-byte MKV streamed completely in 2,656 ms and produced 1,000 cues / 64,209 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mkv-large-firefox-01` | MediaInfo enumerated the default English UTF-8 track after reading 8,985,034 of 8,455,213,426 bytes in 81 ms. EBML streamed the full 8,455,213,426 bytes in 28,687 ms and reproduced 9,000 cues / 577,817 WebVTT bytes with zero Unicode replacement characters. | Pass with memory-measurement limitation |
| `mkv-large-firefox-cancel-01` | Cancellation approximately two seconds after starting returned a sanitized `cancelled: true` result, terminated the workers, and left the page responsive for the subsequent complete run. | Pass |

The Firefox large-file output matches Chrome and Edge exactly for cue count,
WebVTT byte count, track classification and Unicode validity. Its 28,687 ms
duration was slower than the observed Chromium runs, but remained bounded and
kept the page usable. The comparison is descriptive: operating-system cache
residency and other run-to-run effects were not controlled.

For a separate Firefox 153.0.1 large-file run, a PowerShell sampler summed the
working set of every Firefox process at 500 ms intervals for 40 seconds. It
observed an approximately 1,033.1 MB browser-wide baseline, 1,222.1 MB maximum,
and 189.0 MB increase. This includes Firefox UI and unrelated browser-process
overhead and is not an isolated worker heap or a guaranteed instantaneous peak.
It is a bounded process-wide observation alongside the successful full-stream
and cancellation results.

## macOS Safari results

Environment: Safari 26.5 (build 21624.2.5.11.4) on macOS 26.5.1 (build
25F80). Durations below are browser worker measurements. The fixture bytes,
track metadata and aggregate output measurements are sanitized harness output;
no filename, local path or subtitle cue text was retained.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mac-safari-multi-01` | MediaInfo read all 11,665 bytes in 59 ms and enumerated four text tracks: default English UTF-8, intentionally mis-tagged French ASS, language-absent hearing-impaired UTF-8 and forced English UTF-8. EBML extraction read all bytes in 19 ms and produced the expected per-track split of 3/3/2/2 cues: 10 cues / 742 WebVTT bytes total with zero Unicode replacement characters. | Pass |
| `mac-safari-ass-01` | MediaInfo read all 10,670 bytes in 51 ms and found one default Filipino ASS track. EBML extraction read all bytes in 8 ms and produced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-safari-mp4-01` | MediaInfo read all 12,362 bytes in 49 ms and found one default Filipino `tx3g` timed-text track. MP4Box read all bytes in 6 ms and produced 3 non-empty cues / 222 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-safari-vobsub-01` | MediaInfo read all 32,768 bytes in 53 ms and classified the default French `S_VOBSUB` track as image-based. EBML enumeration read all bytes in 7 ms, retained the track as unsupported and emitted zero cues / zero WebVTT bytes. | Pass |
| `mac-safari-invalid-01` | The worker returned the controlled error `The EBML parser rejected this input.` The sanitized result contained no filename, path or malformed output. | Pass |
| `mac-safari-parser-recovery-01` | Immediately after the controlled parser failure, a fresh-worker run of the valid ASS fixture completed without a page reload. MediaInfo read all bytes in 46 ms; EBML extraction read all bytes in 11 ms and reproduced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |

Safari exposed no `performance.memory` values to the harness, so baseline,
peak and increase were all unavailable rather than measured as zero. These
small-fixture results therefore prove deterministic extraction, metadata
preservation, unsupported-image handling and parser-failure recovery in Safari.

## macOS Chrome results

Environment: Google Chrome 150.0.7871.187 (build 7871.187) on macOS 26.5.1
(build 25F80). Durations below are browser worker measurements. The fixture
bytes, track metadata and aggregate output measurements are sanitized harness
output; no filename, local path or subtitle cue text was retained.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mac-chrome-multi-01` | MediaInfo read all 11,665 bytes in 41 ms and enumerated four text tracks: default English UTF-8, intentionally mis-tagged French ASS, language-absent hearing-impaired UTF-8 and forced English UTF-8. EBML extraction read all bytes in 6 ms and produced the expected per-track split of 3/3/2/2 cues: 10 cues / 742 WebVTT bytes total with zero Unicode replacement characters. | Pass |
| `mac-chrome-ass-01` | MediaInfo read all 10,670 bytes in 36 ms and found one default Filipino ASS track. EBML extraction read all bytes in 5 ms and produced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-chrome-mp4-01` | MediaInfo read all 12,362 bytes in 39 ms and found one default Filipino `tx3g` timed-text track. MP4Box read all bytes in 5 ms and produced 3 non-empty cues / 222 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-chrome-vobsub-01` | MediaInfo read all 32,768 bytes in 43 ms and classified the default French `S_VOBSUB` track as image-based. EBML enumeration read all bytes in 2 ms, retained the track as unsupported and emitted zero cues / zero WebVTT bytes. | Pass |
| `mac-chrome-invalid-01` | The worker returned the controlled error `The EBML parser rejected this input.` The sanitized result contained no filename, path or malformed output. | Pass |
| `mac-chrome-parser-recovery-01` | Immediately after the controlled parser failure, a fresh-worker run of the valid ASS fixture completed without a page reload. MediaInfo read all bytes in 46 ms; EBML extraction read all bytes in 7 ms and reproduced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |

For the six rows above, Chrome's page-level `performance.memory` snapshot
reported baseline equal to peak: respectively 4,093,072; 4,106,412; 4,111,927;
4,075,401; 4,087,892; and 4,099,308 bytes. A zero sampled increase on these
operations, which completed in milliseconds, is not evidence that the worker
allocated no memory and does not measure total renderer/worker process memory.
Chrome's macOS result is consistent with the other tested browser engines; its
page-level memory limitation is carried into the accepted implementation.

## macOS Firefox results

Environment: Firefox 153.0.1 (build 15326.7.27) on macOS 26.5.1 (build 25F80).
Durations below are browser worker measurements. The fixture bytes, track
metadata and aggregate output measurements are sanitized harness output; no
filename, local path or subtitle cue text was retained.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mac-firefox-multi-01` | MediaInfo read all 11,665 bytes in 49 ms and enumerated four text tracks: default English UTF-8, intentionally mis-tagged French ASS, language-absent hearing-impaired UTF-8 and forced English UTF-8. EBML extraction read all bytes in 12 ms and produced the expected per-track split of 3/3/2/2 cues: 10 cues / 742 WebVTT bytes total with zero Unicode replacement characters. | Pass |
| `mac-firefox-ass-01` | MediaInfo read all 10,670 bytes in 43 ms and found one default Filipino ASS track. EBML extraction read all bytes in 6 ms and produced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-firefox-mp4-01` | MediaInfo read all 12,362 bytes in 45 ms and found one default Filipino `tx3g` timed-text track. MP4Box read all bytes in 5 ms and produced 3 non-empty cues / 222 WebVTT bytes with zero Unicode replacement characters. | Pass |
| `mac-firefox-vobsub-01` | MediaInfo read all 32,768 bytes in 46 ms and classified the default French `S_VOBSUB` track as image-based. EBML enumeration read all bytes in 6 ms, retained the track as unsupported and emitted zero cues / zero WebVTT bytes. | Pass |
| `mac-firefox-invalid-01` | The worker returned the controlled error `The EBML parser rejected this input.` The sanitized result contained no filename, path or malformed output. | Pass |
| `mac-firefox-parser-recovery-01` | Immediately after the controlled parser failure, a fresh-worker run of the valid ASS fixture completed without a page reload. MediaInfo read all bytes in 45 ms; EBML extraction read all bytes in 6 ms and reproduced 3 cues / 220 WebVTT bytes with zero Unicode replacement characters. | Pass |

Firefox exposed no `performance.memory` values to the harness, so baseline,
peak and increase were all unavailable rather than measured as zero. These
small-fixture results prove deterministic extraction, metadata preservation and
unsupported-image handling plus parser-failure recovery in Firefox. The macOS
large-file memory, cancellation, refresh and concurrent-upload gates remain
open.

### macOS small-fixture comparison

Safari, Chrome and Firefox produced identical track classifications, per-track
cue counts, aggregate WebVTT byte counts and Unicode-validity results for every
supported fixture. All three returned the same controlled parser error and then
completed a valid extraction without a page reload. No browser-specific
functional divergence appeared in this bounded matrix. Memory observations are
not comparable across browsers: Chrome exposed only a page-level snapshot,
while Safari and Firefox exposed no `performance.memory` values. Large-file and
upload-interaction conclusions rely on the separate Windows measurements above,
not on extrapolating these small-file durations.

## Browser matrix

The supported desktop matrix exercised:

- Chrome and Edge on Windows;
- Firefox on Windows;
- Safari, Chrome, and Firefox on macOS; and
- Edge on macOS: Not applicable. It is not an intentional MVP support target;
  macOS Chromium coverage comes from Chrome, and Edge is covered on Windows.

Unsupported browser/OS combinations are recorded as `Not applicable`, never
silently omitted.

## Measurement record

Copy one row per media/browser scenario.

| Field | Observation |
| --- | --- |
| Evidence label | |
| Browser/version and OS | |
| Media label and byte size | |
| Track count/types | |
| Source language metadata | |
| Extracted track count | |
| Detected unsupported image tracks | |
| Output format | |
| Timing/content validation | |
| Extraction duration | |
| Peak browser memory | |
| Baseline upload throughput | |
| Concurrent upload throughput | |
| Throughput change | |
| Cancellation behavior | |
| Refresh/reopen behavior | |
| Parser-failure behavior | |
| Corrupted or missing output | |
| Result | Pass / Fail / Blocked |
| Notes | |

## Mandatory negative and recovery cases

1. Cancel extraction during metadata enumeration.
2. Cancel while a text track is being converted.
3. Refresh the page while extraction and a disposable upload are active.
4. Feed a truncated/corrupt disposable copy to the parser.
5. Detect PGS/VobSub and return an explicit unsupported result without OCR or
   garbage text output.
6. Run extraction concurrently with a TUS upload and compare against the same
   upload without extraction.
7. Verify duplicate English, English SDH, and English forced tracks remain
   distinguishable before provider publication.

## Remaining operator inputs

None for the subtitle decision. Keep the disposable Mac and Windows harnesses
outside Git until Phase 0B closes so a review finding can be reproduced without
reconstructing the probes.
