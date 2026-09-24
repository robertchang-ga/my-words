# My Words communication app design

My Words is a private, adult communication PWA for everyday conversation. Use React, TypeScript, and Vite. The user has authorized autonomous design and implementation without publication. The app makes no diagnosis or therapy claims and never requires a speech attempt. It has no remote AI or accounts.

A compact message strip shows the exact speech text throughout the app. The builder has separate Who, Action, What/where, and Message pages. Choosing a subject or action advances to the next page; choosing a completion opens Message. Skip and numbered page controls allow omitted steps and direct movement. Message contains Speak, Repeat for the current visible message, Stop speaking, Undo, Clear, and Restore message.

Not belongs on the Who page and can be selected before any words. It toggles negation silently. A persistent bottom bar contains Yes, No, and Quick words, including on the settings screen. Yes and No display and speak immediately. Quick words opens Wrong / “That’s not what I meant,” Help, Pain, Done, “I want to tell you something,” and “I have a question.” Each speaks on tap. Ordinary vocabulary and favorites wait for Speak unless optional word preview is enabled.

Who offers I/me, You, It/that, and Other. Other opens saved People choices and Someone else. The selected person becomes the subject. Subject and action choices stay in a fixed order. Contextual completions have a separate area. Categories and favorites provide other ways to compose. That supports pointing to an object. Daily communication has no typing or alphabet board. Editing inputs stay in settings for a helper to maintain words and phrases.

Use warm neutral surfaces, deep teal, controls at least 56px tall, safe areas, semantic controls, visible focus, and layouts that fit a small phone. Minimize scrolling without hiding controls at larger text sizes. Portrait takes priority; landscape must remain usable. Never rank vocabulary by usage.

Separate deterministic grammar, speech lifecycle, validated IndexedDB persistence, photo processing, UI, and PWA lifecycle. Custom word labels and saved phrases stay as entered. Unknown vocabulary uses literal concatenation; unknown negation adds a visible Not prefix. The starting vocabulary is editable and carries no clinical or frequency-based recommendation.

Versioned JSON backups contain settings, vocabulary, favorites, and size-limited JPEG/PNG/WebP data URLs. Validate imports before changing state. Merge keeps current entries for matching IDs and current settings; replace loads the full backup. Save atomically. Conversation history stays in memory. Storage failures leave the app usable with a visible unsaved notice, and export remains available. Resize and rasterize uploaded photos locally. Keep personal names, photos, and backups out of the public bundle and repository.

Generate the manifest and service worker at build time using the configured base path. Cache the app shell and bundled vocabulary. Personal data stays in IndexedDB. New workers wait for an explicit update action with no forced reload. Show readiness only after successful caching. Offline speech requires device testing. Use a manual-only Pages workflow.

Test grammar, speech, storage, and imports with unit tests. Browser tests cover phone-sized interaction, accessibility, persistence, offline reload, and repository subpaths. Test Safari, VoiceOver, and speech on a physical iPhone before relying on them.
