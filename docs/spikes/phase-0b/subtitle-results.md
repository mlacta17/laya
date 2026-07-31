# Browser subtitle-extraction spike

Status: **Browser spike in progress — Windows Chrome and Edge large-file
extraction plus concurrent TUS upload and refresh recovery pass; Firefox and
macOS browser runs remain**

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

The conclusion is not chosen until every required row has a supported result.

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
| Matroska EBML streaming | `@sarakusha/ebml@0.0.8` | Browser-native `TransformStream` and typed-array parser; passed the current Chrome fixtures. It is new and remains provisional pending the large and cross-browser runs. |
| MP4 sample extraction | `mp4box@2.4.1` | Passed `tx3g`; empty samples are ignored, sample numbers are deduplicated, and released samples use the documented exclusive boundary. |
| Track enumeration | `mediainfo.js@0.3.7` | Passed text metadata plus VobSub detection. It may seek and stop after gathering sufficient metadata, so its `bytesRead` is not whole-file coverage. |
| Rejected Matroska candidate | `matroska-subtitles@3.3.2` | Browser bundle loaded, but constructing `SubtitleParser` hung inside a Web Worker before parsing began. Its Node-stream compatibility layer is not acceptable for this architecture. |

No dependency is approved for production by this spike yet. Selecting one is a
decision-shaped change and requires the architecture/ADR update prescribed by
the repository rules after the full evidence matrix is complete.

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
| `mkv-large-01` | Streamed all 8,455,213,426 bytes in 17,792 ms and produced 9,000 cues / 577,817 WebVTT bytes. The single default English UTF-8 track was preserved, with zero Unicode replacement characters. Page-reported heap rose from 2,884,159 to 5,501,026 bytes (+2,616,867). A separate run cancelled promptly and returned the fresh-worker confirmation while the page remained responsive. | Pass |
| `tus-concurrent-01` | The 938,773,287-byte baseline uploaded to the disposable Bunny TUS endpoint in 28,077 ms at 33,435,431 bytes/second with zero retries. A second upload of the same bytes completed while `mkv-large-01` extraction streamed 8,455,213,426 bytes in 11,925 ms, produced 9,000 cues with zero Unicode replacements, and uploaded at 34,385,662 bytes/second in 27,301 ms with zero retries. The measured throughput change was +2.84%, which indicates normal run-to-run variation rather than degradation. | Pass |
| `mkv-cancel-01` | Cancel terminated enumeration and extraction workers. A new ASS run then completed without refresh. | Pass |
| `mkv-refresh-01` | Refresh during extraction returned the page to an idle state with no retained result and no enabled cancel action. | Pass |
| `tus-refresh-01` | A concurrent 938,773,287-byte TUS upload and `mkv-large-01` extraction were active when the upload reached 18%. Refresh terminated the page work; reload asked the local server to delete its in-memory set of harness-created objects and reported one attempted deletion, one success, and zero failures. Bunny then returned zero exact matches for the neutral test object while the retained representative movie remained present. A local-server restart remains an explicit manual-cleanup limitation. | Pass |

Chrome's `performance.memory` is a non-standard page-level diagnostic and does
not prove total renderer/worker process memory. The 49 MB run demonstrates
streaming behavior and a stable controller heap. The 8 GB run also completed
with a bounded reported heap increase, but its Chrome Task Manager
tab/dedicated-worker memory and CPU observations must be added before the
process-memory gate can be closed.

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

## Windows Edge results

Environment: Edge 150.0.4078.105 on Windows. Durations below are browser worker
measurements.

| Evidence label | Observation | Result |
| --- | --- | --- |
| `mkv-large-edge-01` | MediaInfo enumerated the single default English UTF-8 text track after reading 8,985,034 of 8,455,213,426 bytes in 103 ms. The EBML worker streamed all 8,455,213,426 bytes in 14,551 ms and produced 9,000 cues / 577,817 WebVTT bytes with zero invalid Unicode characters. The page-reported heap rose from 5,345,805 to 5,750,866 bytes (+405,061). | Pass |

The Edge result matches the Chrome result for track classification, cue count,
WebVTT byte count, and Unicode validity. This is evidence of deterministic
output across the two tested Windows Chromium browsers. The heap figure is a
page-level diagnostic rather than a renderer/worker process peak.

In a separate large-file recovery attempt, the operator clicked **Cancel**
approximately two seconds after starting. The controller returned `Cancelled.
Fresh workers will be created for the next run.` and remained responsive.

## Browser matrix

Run each applicable media label in:

- Chrome and Edge on Windows;
- Firefox on Windows;
- Safari, Chrome, and Firefox on macOS; and
- Edge on macOS only if it remains an intentionally supported development
  target.

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

- Access to the Windows and macOS browsers listed above.
