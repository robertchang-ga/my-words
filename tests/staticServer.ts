import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** An isolated real origin, allowing offline tests to actually stop the server. */
export async function staticServer() {
  const base = process.env.BASE_PATH || "/";
  let revision = 0;
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url!, "http://localhost").pathname;
    if (!pathname.startsWith(base)) {
      res.writeHead(404).end();
      return;
    }
    const relative = pathname.slice(base.length) || "index.html";
    if (relative.includes("..")) {
      res.writeHead(400).end();
      return;
    }
    try {
      let content = await readFile(resolve("dist", relative));
      if (relative === "sw.js" && revision)
        content = Buffer.from(
          content
            .toString()
            .replace(
              /const CACHE = "([^"]+)";/,
              `const CACHE = "$1-revision-${revision}";`,
            ),
        );
      const extension = relative.split(".").at(-1)!;
      const mime: Record<string, string> = {
        html: "text/html",
        js: "text/javascript",
        css: "text/css",
        png: "image/png",
        webmanifest: "application/manifest+json",
      };
      res.writeHead(200, {
        "Content-Type": mime[extension] || "application/octet-stream",
        "Cache-Control": "no-store",
        Vary: "Origin",
      });
      res.end(content);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address() as { port: number };
  let stopped = false;
  return {
    url: `http://127.0.0.1:${address.port}${base}`,
    revise: () => {
      revision++;
    },
    stop: async () => {
      if (stopped) return;
      stopped = true;
      server.closeAllConnections();
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
    },
  };
}
