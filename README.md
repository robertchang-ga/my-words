# My Words

A private, iPhone-first web app for everyday communication. Choose a word, build a thought, or use personal photos and familiar phrases. It does not diagnose a condition or provide speech therapy. Speaking yourself is always optional.

## Run locally

Use Node.js 22.12+ and npm. No API keys or accounts are needed.

```sh
npm ci
npm run dev
```

For the production app, including offline caching:

```sh
npm run build
npm run preview
```

Open the localhost address printed by Vite. Service workers require HTTPS or localhost. Opening an HTML file directly from Files is unsupported. A phone visiting a computer's plain HTTP LAN address will not have production PWA behavior; use an HTTPS deployment for device acceptance tests.

## Build and speak a message

Build a thought has separate pages for Who, Action, and What/where. Choosing a subject or action opens the next page. Choosing a completion opens the Message page, where Speak and Repeat say the exact visible message. Stop speaking cancels speech. Starting another spoken message cancels the previous one.

On Who, choose I/me, You, It/that, or Other. Other opens your People choices and Someone else for a person who is not listed. Add people in Edit & settings.

Every step is optional. Use Skip or the numbered step buttons to move between pages. Single words and short phrases work too. The message strip stays visible as you choose words. Not is on the Who page; you can turn it on before choosing any words. It changes the sentence silently.

Yes, No, and Quick words stay at the bottom on every screen, including settings. Yes and No display and speak immediately. Quick words opens Wrong / “That’s not what I meant,” Help, Pain, Done, “I want to tell you something,” and “I have a question.” Each speaks when tapped. Wrong shows its full spoken phrase. No says “No”; Not negates your sentence.

On the Message page, Undo restores the preceding composition step (up to 50). Clear keeps one recoverable message until another clear or the app closes. Restore message brings it back.

Browse People, Things, Places, Body, Feelings, Activities, or Topics for more choices. Choose “That” while pointing to an object, or “Something else.” Favorites selects a saved complete phrase and waits for Speak.

Subject and action buttons stay in the same order. The app never ranks words by usage. The starting vocabulary is editable and carries no clinical or frequency-based recommendation.

## Sentence rules

Small, deterministic English templates live in `src/grammar.ts`; per-word complements live in `src/vocabulary.ts` and are editable in **Optional sentence wording**.

| Selected choices | Visible and spoken result |
| --- | --- |
| I + want + phone | I want my phone. |
| I + feel + tired | I feel tired. |
| I + go + home | I go home. |
| It + feel + cold | It feels cold. |
| I + want + that + Not | I don’t want that. |

The app only uses selected intentions; choosing “go” never adds “want.” Skipped steps can produce fragments, which are valid messages. Custom words are joined as entered, so some sentences need manual wording. Saved complete phrases stay as entered; Not adds the visible prefix `Not: <original text>`. Changing a word label clears old per-action wording. Changing speech language affects pronunciation. Sentence templates stay in English.

## Voices and optional features

Edit & settings → Voice & listening lists voices returned by the device and updates when more become available. Choose a language, voice, and rate (0.5 to 1.5×). Device default remains available when no voices are listed. If a saved voice is missing, the app uses the device default and shows a notice.

Tap-to-hear words and a reminder that you can try speaking are optional and off initially. No microphone access, recognition, scoring, or speech prerequisite is implemented. Speech errors leave the message visible. Some browser/device voices use a network service: this app cannot guarantee offline speech or how the operating system processes voice data. Test the selected voice on the real iPhone.

The speech controller follows the browser's [cancellation API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/cancel) and [voice-loading event](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event).

## Personalization and backup

Use **Edit & settings** to add/edit/remove words and favorites, set word categories, and add photos. Daily communication uses word and phrase buttons. Text entry is available only in Edit & settings for a helper to maintain words and phrases. One personalization change can be undone while the editor remains open. Settings changes save when selected; word and phrase edits save with their Save buttons.

Data lives in IndexedDB in this browser/origin. There are no accounts, analytics, ads, remote AI, paid APIs, or app-controlled data uploads. The conversation itself is kept only in memory and is lost on reload/close. Personalization saving is queued and atomic; a visible error warns if saving fails, while communication remains usable. Changes in two simultaneously open app tabs are not synchronized; use one app window when editing.

**Clearing website data, browser storage eviction, changing the URL/origin, or losing the device can erase personalization.** Safari and the Home Screen copy may not share data in every iOS version/context. Back up before switching and verify the target copy.

1. Finish any word/phrase edits with **Save**.
2. Tap **Download backup**, then save the JSON file to a private location in Files. Verify that the download exists.
3. To restore, select **Import backup file**. The app validates the file before offering a preview.
4. **Merge backup** appends new IDs, keeping current words/photos/favorites/settings for conflicting IDs. Labels with different IDs are retained separately.
5. **Replace with backup** requires acknowledging that the current personalization will be replaced. It restores the backup settings too. You can undo the import while the editor remains open.

The version-1 backup contains settings, vocabulary, favorites and embedded photos. Conversations are excluded. Limits: 20 MiB UTF-8 JSON, 500 words, 100 favorites, 120-character word labels and 500-character favorite phrases. Unknown versions, unexpected fields, duplicate IDs, invalid settings, unsafe photo URLs and malformed image headers are rejected. Imported text is rendered as text, never HTML. Photos are rasterized locally to JPEG, at most 640px on the longest side, with metadata removed. Upload JPEG/PNG/WebP up to 12 MiB; export HEIC to JPEG first. Imports require bounded raster photos. Large/unsupported photos fail with an explanation.

For local setup, the app applies the ignored `personal/startup.json` once on localhost. This file is excluded from `dist`. A private portable backup is stored outside the workspace. On a public installation, use Import backup file to load it. Source files contain no personal names.

Never add personal backups or photos to this repository. The ignore file excludes common backup names and personal directories, but always review files before committing. The bundled PNG files are generic app icons.

## Install and use offline on iPhone

1. After an authorized HTTPS deployment, open its exact URL in **Safari**.
2. Use **Share → Add to Home Screen** and confirm the name.
3. Launch the Home Screen app while connected. Wait for **Ready for offline use** in the header.
4. Close/reopen in airplane mode and test both the app and speech separately.

The service worker caches the app shell, icons, and bundled vocabulary after a successful load. Photos and personalized words live separately in IndexedDB. “Preparing,” “ready,” failure and connectivity states are visible. Offline readiness verifies cached shell entries; it does not certify speech voices or prevent later storage eviction.

New versions wait. **Update & reopen** is enabled only from the talking screen with an empty message. Nothing automatically reloads during composition. Closing all app windows may let a waiting version activate on the next opening. Save a backup before major updates. Do not use a downloaded HTML file opened in Files to install this app.

## GitHub Pages deployment

The app is live at [My Words](https://robertchang-ga.github.io/my-words/). The workflow has **no push trigger**. A manual workflow run defaults to checks only, with publication unchecked.

For a new deployment or another repository:

1. Create/select a GitHub repository and push only source, lockfile, docs and generic app icons.
2. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**. Ensure Actions are enabled. Review the `github-pages` environment's allowed branches and any required reviewers.
3. Open **Actions → Check and optionally publish My Words → Run workflow** on the intended branch. Select **Publish the tested app to GitHub Pages** only when ready to publish.
4. The workflow runs unit tests, root and repository-subpath browser tests, then builds for the actual Pages base path and deploys `dist`. Use the deployment's reported URL and run the physical iPhone checklist.

The build job has `contents: read`; only the deployment job gets `pages: write` and `id-token: write`, following [GitHub's Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Environment approval rules can add another publication gate.

For another static host, serve `dist` over HTTPS. `BASE_PATH` must be `/` or a path with leading/trailing slashes:

```powershell
$env:BASE_PATH = '/repository-name/'
npm run build
Remove-Item Env:BASE_PATH
```

```sh
BASE_PATH=/repository-name/ npm run build
```

The generated asset URLs, manifest start URL/scope and worker registration/cache all use the same base. Root hosting uses `/`. No client-side URL routes are used, so refresh does not need route rewrites. Do not manually edit generated `dist` files. Do not use a shared origin for unrelated copies expecting separate IndexedDB data; personalization is origin-local, while service-worker caches are scoped by base path.

## Verification

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run test:subpath
```

Close any existing port-4173 preview before subpath testing. `test:subpath` builds and tests `/my-words/`, then restores the root build. Tests include sentence grammar, speech mocks, storage/backup validation, browser photo handling, phone flows, axe checks, enlarged keyboard focus, offline loading with a stopped server, and deferred updates. WebKit's offline-emulation mode has a [known service-worker navigation issue](https://github.com/microsoft/playwright/issues/42775); both engines instead receive a real unavailable origin in the offline test, with Chromium also using offline emulation.

See [test report](docs/TEST-REPORT.md) and [physical iPhone checklist](docs/IPHONE-CHECKLIST.md). Desktop emulation and desktop WebKit are not proof of iPhone speech reliability or VoiceOver usability.

Source structure: `App.tsx` communication; `Settings.tsx` personalization; `grammar.ts` templates; `speech.ts` platform lifecycle; `data.ts` persistence/backup; `photos.ts` and `imageValidation.ts` raster handling; `pwa.ts` worker status; `vite.config.ts` manifest/precache generation. Icons can be regenerated on Windows with `scripts/generate-icons.ps1`.


