import {
  MAX_BACKUP_SIZE,
  mergeData,
  parseBackup,
  type PersonalData,
} from "./data";

type Options = {
  hostname: string;
  read: () => Promise<string | null>;
  remembered: (id: string) => boolean;
  remember: (id: string) => void;
  save: (data: PersonalData) => Promise<void>;
};

/** A private setup file is served by the local preview only, never by the build. */
export async function applyLocalSetup(
  current: PersonalData,
  options: Options,
): Promise<PersonalData> {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(options.hostname))
    return current;
  const text = await options.read();
  if (!text) return current;
  if (new TextEncoder().encode(text).length > MAX_BACKUP_SIZE)
    throw new Error("Local setup exceeds 20 MiB.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  const id = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  if (options.remembered(id)) return current;
  const setup = JSON.parse(text) as Record<string, unknown>;
  if (
    !setup ||
    setup.version !== 1 ||
    Object.keys(setup).some(
      (key) => !["version", "backup", "removeWordIds"].includes(key),
    ) ||
    !Array.isArray(setup.removeWordIds) ||
    setup.removeWordIds.length > 500 ||
    setup.removeWordIds.some(
      (value) => typeof value !== "string" || value.length > 100,
    )
  )
    throw new Error("Invalid local setup.");
  const incoming = parseBackup(JSON.stringify(setup.backup));
  const merged = mergeData(current, incoming);
  const incomingIds = new Set(incoming.words.map((word) => word.id));
  const removedIds = setup.removeWordIds as string[];
  const words = merged.words.filter((word) => !removedIds.includes(word.id));
  const next = {
    ...merged,
    words: [
      ...words.filter((word) => incomingIds.has(word.id)),
      ...words.filter((word) => !incomingIds.has(word.id)),
    ],
  };
  await options.save(next);
  options.remember(id);
  return next;
}
