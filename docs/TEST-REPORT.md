# Validation report

Tested locally on Windows on September 24, 2026, with Node 22.18.0. Published to GitHub Pages on September 24, 2026. Physical iPhone testing is pending.

| Check | Result |
| --- | --- |
| TypeScript + Vite production build | Passed |
| Vitest | 46 tests passed in 7 files |
| Root-hosted browser suite | 34 passed: 17 Chromium + 17 WebKit |
| `/my-words/` subpath browser suite | 34 passed: 17 Chromium + 17 WebKit |
| axe WCAG 2 A/AA and 2.1 AA checks | No violations on tested communication and settings screens |
| Dependency audit during installation | No known vulnerabilities reported |

Automated coverage includes:

- Required grammar examples; deterministic negation; skipped subjects/actions/objects; single words; custom words; literal user text and explicit `Not:` fallback.
- Speech mocks verify explicit initiation, replacing queued speech, cancellation, stale callbacks, missing/delayed voices, unsupported browsers, platform exceptions and utterance errors. Browser mocks verify immediate Yes/No/OK/Wrong and favorite speech, silent Not, Speak/Repeat and Stop status. Actual audio output is not verified.
- IndexedDB save/load, atomic rejection of invalid data, missing storage, versioned backup/photo round trips, duplicate IDs, merge conflicts, file/count/text/rate bounds and unsafe URLs/keys. Raster structural tests cover truncated images, PNG CRC/chunks, JPEG framing, WebP dimensions and pre-decode upload dimension limits. Structural validation is not a full compressed-pixel decoder.
- Browser flows cover sentence composition, New thought/recovery, categories and back, topics, separate builder pages, silent Not before selection, Other and saved people, favorites, custom word persistence after reload, backup download/import preview, local photo resizing, safe text rendering and invalid-import rejection.
- 390×844 and 320×568 builder pages without scrolling at normal text size; 844×390 overflow checks; minimum 56px button boxes; 200% text; actual keyboard focus hit-testing; landscape shortcut reachability. Portrait and landscape screenshots were visually inspected during development.
- Both engines load the app after the real origin server is shut down. Chromium additionally uses offline emulation. Tests repair a partially missing asset cache while connected, then confirm offline navigation, manifest scope and communication. Stopping the real server avoids WebKit's `setOffline` navigation issue.
- A changed real service worker waits while a message is composed. Update is disabled until the message is cleared, then an explicit action activates/reopens. Initial installation does not incorrectly show an update prompt.
- Local setup tests verify localhost-only loading, validated persistence, once-only application, and save failure recovery. Private setup was also checked in Chromium and WebKit; personal names stay out of the production bundle. Daily typing and alphabet controls are absent; helper editing remains available in settings.
- Custom categories are tested through add, rename, removal of empty categories, persistence, duplicate rejection, word-reference updates, backup download and merge. Version-1 imports remain supported; version-2 backups include empty categories. Adaptive choices show more rows and columns when space allows, preserve access through paging, and fit a selected-action page at 320×568.
- All browser flows run again at `/my-words/`; asset paths, manifest and worker scope are verified. The subpath runner restores the root production build afterward.

The [latest GitHub Actions deployment](https://github.com/robertchang-ga/my-words/actions/runs/36062159820) passed all 46 unit tests and both 34-test browser suites on Linux. Narrow-screen spacing was adjusted for platform font wrapping while preserving 56px minimum button sizes. The public HTTPS app, OK button, category editor, and selected-action layout at 320×568 were verified with Chromium and WebKit. Chromium also passed a live-site offline reload. Future publication requires selecting the manual publish input.

Still required: [physical iPhone checklist](IPHONE-CHECKLIST.md), including Safari and Home Screen launch, left-hand comfort, actual VoiceOver and enlarged text, device voices/cancellation, airplane-mode speech, storage persistence, real photo formats, Files backup restoration and update behavior. Desktop WebKit and iPhone-sized emulation do not prove iPhone speech reliability or native accessibility usability.
