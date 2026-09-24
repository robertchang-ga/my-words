import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** All paths are explicit so the same source works at / or /repository/. */
function appShell(): Plugin {
  let base = "/";
  return {
    name: "my-words-offline-shell",
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_, bundle) {
      const shell = [
        base,
        ...Object.keys(bundle).map((file) => base + file),
        base + "manifest.webmanifest",
        base + "icons/icon-192.png",
        base + "icons/icon-512.png",
        base + "icons/apple-touch-icon.png",
      ];
      const versionHash = createHash("sha256")
        .update(JSON.stringify(bundle))
        .update(readFileSync("index.html"));
      for (const icon of [
        "icon-192.png",
        "icon-512.png",
        "apple-touch-icon.png",
      ])
        versionHash.update(readFileSync(`public/icons/${icon}`));
      const version = versionHash.digest("hex").slice(0, 16);
      const prefix = `my-words:${base}:`;
      this.emitFile({
        type: "asset",
        fileName: "manifest.webmanifest",
        source: JSON.stringify({
          id: base,
          name: "My Words",
          short_name: "My Words",
          description: "Choose words and phrases for everyday conversation.",
          start_url: base,
          scope: base,
          display: "standalone",
          background_color: "#f7f5f0",
          theme_color: "#164e49",
          lang: "en",
          icons: [
            {
              src: base + "icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: base + "icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        }),
      });
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `
const CACHE = ${JSON.stringify(prefix + version)};
const PREFIX = ${JSON.stringify(prefix)};
const SHELL = ${JSON.stringify(shell)};
const HOME = ${JSON.stringify(base)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data === 'APPLY_UPDATE') self.skipWaiting();
  if (event.data === 'CHECK_READY') event.waitUntil(caches.open(CACHE).then(async cache => {
    const missing = [];
    for (const url of SHELL) if (!(await cache.match(url))) missing.push(url);
    // Restore immutable missing assets when connected. Do not put a newer
    // index document into an older shell: it may reference a different build.
    if (missing.length && !missing.includes(HOME)) {
      try { await cache.addAll(missing); } catch { /* Report incomplete below. */ }
    }
    const ready = (await Promise.all(SHELL.map(url => cache.match(url)))).every(Boolean);
    event.ports[0]?.postMessage(ready);
  }));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && url.pathname.startsWith(${JSON.stringify(base)})) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(HOME)) || fetch(event.request)));
  } else if (SHELL.includes(url.pathname)) {
    // Shell files are same-origin and immutable within a build. Normalize the
    // request so a server's Vary: Origin does not defeat offline module loading.
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(event.request)));
  }
});
`,
      });
    },
  };
}

function privateLocalSetup(): Plugin {
  let base = "/";
  const attach = (server: {
    middlewares: {
      use: (
        handler: (
          request: import("node:http").IncomingMessage,
          response: import("node:http").ServerResponse,
          next: () => void,
        ) => void,
      ) => void;
    };
  }) => {
    server.middlewares.use((request, response, next) => {
      if (request.url?.split("?")[0] !== `${base}local-setup.json`) {
        next();
        return;
      }
      if (process.env.DISABLE_PRIVATE_SETUP === "1") {
        response.writeHead(404).end();
        return;
      }
      if (
        !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
          request.socket.remoteAddress ?? "",
        )
      ) {
        response.writeHead(403).end();
        return;
      }
      try {
        const content = readFileSync("personal/startup.json");
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        response.end(content);
      } catch {
        response.writeHead(404).end();
      }
    });
  };
  return {
    name: "private-local-setup",
    configResolved(config) {
      base = config.base;
    },
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

const requestedBase = process.env.BASE_PATH || "/";
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(requestedBase))
  throw new Error(
    "BASE_PATH must be / or an absolute path with a trailing slash, e.g. /my-words/.",
  );
export default defineConfig({
  base: requestedBase,
  plugins: [react(), appShell(), privateLocalSetup()],
  build: { outDir: process.env.BUILD_DIR || "dist" },
  test: { include: ["src/**/*.test.ts"] },
});
