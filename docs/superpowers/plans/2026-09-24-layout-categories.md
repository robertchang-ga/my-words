# Keep choices and navigation within reach

Use the user's requested layout: Yes, No, OK, Quick words at the bottom; silent Not centered above Who choices; centered Skip or New thought immediately above the bottom bar. Remove daily Undo and Clear. New thought keeps one recoverable message. Core choices retain a stable order. Additional choices use the available width and height, with paging and scrolling for enlarged text.

Custom categories belong in helper settings. Add, rename, and remove empty custom categories; keep built-in categories stable. Words reference category names. Version-2 backups include custom categories, accept version-1 backups, validate references and bounds, and merge category names without case-only duplicates.

React/TypeScript components keep local state; IndexedDB and export/import remain local. No new service or dependency is needed.

- [x] Add failing storage tests for categories, version migration, merge conflicts, and validation. Implement in `src/data.ts` and settings category editor. Verify with Vitest.
- [x] Add browser expectations for immediate OK speech, navigation position, silent centered Not, New thought recovery, and adaptive choices. Implement in `App.tsx`, `Builder.tsx`, `WordChoices.tsx`, and `styles.css`.
- [x] Update existing tests for the removed daily controls. Exercise category creation, rename, persistence, backup, and word selection through the UI.
- [x] Run build, unit tests, root/subpath Chromium and WebKit flows, layout and accessibility checks. Review the changes and document remaining physical iPhone checks.
- [x] Publish the tested update through the existing manual Pages workflow and verify the live site.

