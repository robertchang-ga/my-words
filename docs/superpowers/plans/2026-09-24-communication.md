# Build and verify My Words

Deliver the accessible communication app and deployment documentation without publishing.

Use React with pure grammar functions, a cancellable speech controller, validated IndexedDB data, and an app-shell service worker generated during builds. Keep navigation in page state.

Build with React, TypeScript, and Vite. Test with Vitest, Playwright, and axe-core.

## Implement grammar, speech, and storage

- [x] Scaffold package/config and add meaningful failing tests (`src/grammar.test.ts`, `src/speech.test.ts`, `src/data.test.ts`). Run `npm test` to establish red.
- [x] Implement shared types in `src/data.ts`, `src/grammar.ts`, `src/speech.ts`, `src/data.ts` and local photo processing. Run targeted tests to green.
- [x] Review data and speech failure behavior, unknown vocabulary, skipped steps and negative sentences.

## Build communication and editing screens

- [x] Add browser flow expectations in `tests/app.spec.ts` before implementing the UI.
- [x] Build `src/App.tsx`, `src/Settings.tsx`, `src/styles.css`: message controls, stable shortcuts, flexible steps, contextual and category choices, favorites, separate settings, labeled photos, validated backup preview and conflict policy.
- [x] Check keyboard, accessibility, small portrait, landscape and enlarged text. Correct actual failures.

## Add offline support and check deployment

- [x] Implement base-aware build plugin, icons and service-worker lifecycle (`vite.config.ts`, `src/pwa.ts`). Add offline/subpath/update browser tests.
- [x] Add manual-only `.github/workflows/pages.yml` with minimal job permissions.
- [x] Write README, physical-iPhone checklist and test report. Run unit tests, production builds and Chromium/WebKit browser checks. Review against every user requirement and fix issues before delivery.


## Split the builder into pages

- [x] Add flow tests for Who, Action, What/where, and Message pages, skipped steps, direct page controls, and silent Not before word selection.
- [x] Keep a visible message strip and a bottom bar for Yes, No, and Quick words on every screen, including settings.
- [x] Put speech, undo, clear, and restore controls on Message. Advance after subject, action, and completion choices.
- [x] Remove daily typing and the alphabet board. Keep helper editing inputs in settings. Add Other on Who with saved People choices and Someone else. Keep personal setup and backups outside the public bundle and repository.
- [x] Apply plain prose to app wording and documentation. Keep existing control meanings and backup limits.
- [x] Run unit and browser tests, a production build, and phone-sized layout checks. Record the physical iPhone checks still needed.

