import { inspectImage } from "./imageValidation";
export const categories = [
  "People",
  "Things",
  "Places",
  "Body",
  "Feelings",
  "Activities",
  "Topics",
] as const;
export type Category = string;
export interface Word {
  id: string;
  label: string;
  category: Category;
  photo?: string;
  complements?: Partial<Record<string, string>>;
}
export interface Favorite {
  id: string;
  label: string;
}
export interface Settings {
  voiceURI: string;
  language: string;
  rate: number;
  tapToHear: boolean;
  encourageSpeech: boolean;
}
export interface PersonalData {
  customCategories?: string[];
  words: Word[];
  favorites: Favorite[];
  settings: Settings;
}
export function getCategories(data: PersonalData): string[] {
  return [...categories, ...(data.customCategories ?? [])];
}
export const defaultSettings: Settings = {
  voiceURI: "",
  language: "en-US",
  rate: 0.9,
  tapToHear: false,
  encourageSpeech: false,
};
export const MAX_BACKUP_SIZE = 20 * 1024 * 1024;
function checkSize(text: string): void {
  if (
    text.length > MAX_BACKUP_SIZE ||
    new TextEncoder().encode(text).byteLength > MAX_BACKUP_SIZE
  )
    fail("backup exceeds 20 MiB.");
}

function fail(reason: string): never {
  throw new Error(`Invalid backup: ${reason}`);
}
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("expected an object.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key)))
    fail("unexpected field.");
  return record;
}
function string(value: unknown, max: number, empty = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!empty && !value.trim())
  )
    fail("text is missing or too long.");
  return value;
}
function entries<T>(
  value: unknown,
  max: number,
  validate: (entry: unknown) => T & { id: string },
): T[] {
  if (!Array.isArray(value) || value.length > max)
    fail("too many entries or missing list.");
  const seen = new Set<string>();
  return value.map((entry) => {
    const result = validate(entry);
    if (seen.has(result.id)) fail("duplicate entry ID.");
    seen.add(result.id);
    return result;
  });
}
function photo(value: unknown): string {
  const url = string(value, 700_000);
  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
  if (!match || match[2].length % 4)
    fail("photo must be a JPEG, PNG or WebP data URL.");
  let bytes: string;
  try {
    bytes = atob(match[2]);
  } catch {
    return fail("photo encoding.");
  }
  inspectImage(
    Uint8Array.from(bytes, (char) => char.charCodeAt(0)),
    `image/${match[1]}`,
  );
  return url;
}
function validateData(value: unknown, version = 2): PersonalData {
  const data = object(value, [
    "words",
    "favorites",
    "settings",
    ...(version === 2 ? ["customCategories"] : []),
  ]);
  let customCategories: string[] | undefined;
  if (data.customCategories !== undefined) {
    if (
      !Array.isArray(data.customCategories) ||
      data.customCategories.length > 50
    )
      fail("use at most 50 custom categories.");
    const seen = new Set<string>(categories.map((name) => name.toLowerCase()));
    customCategories = data.customCategories.map((value) => {
      const name = string(value, 60);
      if (name !== name.trim())
        fail("category names cannot start or end with spaces.");
      if (seen.has(name.toLowerCase())) fail("category names must be unique.");
      seen.add(name.toLowerCase());
      return name;
    });
  }
  const allowedCategories: string[] = [
    ...categories,
    ...(customCategories ?? []),
  ];
  const settings = object(data.settings, [
    "voiceURI",
    "language",
    "rate",
    "tapToHear",
    "encourageSpeech",
  ]);
  if (
    typeof settings.rate !== "number" ||
    !Number.isFinite(settings.rate) ||
    settings.rate < 0.5 ||
    settings.rate > 1.5
  )
    fail("speech rate must be between 0.5 and 1.5.");
  if (
    typeof settings.tapToHear !== "boolean" ||
    typeof settings.encourageSpeech !== "boolean"
  )
    fail("invalid settings.");
  return {
    ...(customCategories !== undefined ? { customCategories } : {}),
    words: entries(data.words, 500, (value) => {
      const word = object(value, [
        "id",
        "label",
        "category",
        "photo",
        "complements",
      ]);
      if (!allowedCategories.includes(word.category as Category))
        fail("unknown category.");
      const result: Word = {
        id: string(word.id, 100),
        label: string(word.label, 120),
        category: word.category as Category,
      };
      if (word.photo !== undefined) result.photo = photo(word.photo);
      if (word.complements !== undefined) {
        const complements = object(word.complements, [
          "want",
          "need",
          "feel",
          "have",
          "go",
          "eat",
          "drink",
          "see",
          "move",
          "stop",
        ]);
        result.complements = Object.fromEntries(
          Object.entries(complements).map(([key, val]) => [
            key,
            string(val, 160),
          ]),
        );
      }
      return result;
    }),
    favorites: entries(data.favorites, 100, (value) => {
      const favorite = object(value, ["id", "label"]);
      return {
        id: string(favorite.id, 100),
        label: string(favorite.label, 500),
      };
    }),
    settings: {
      voiceURI: string(settings.voiceURI, 500, true),
      language: string(settings.language, 80),
      rate: settings.rate,
      tapToHear: settings.tapToHear,
      encourageSpeech: settings.encourageSpeech,
    },
  };
}
export function serializeBackup(data: PersonalData): string {
  const result = JSON.stringify(
    { format: "my-words-backup", version: 2, data: validateData(data) },
    null,
    2,
  );
  checkSize(result);
  return result;
}
export function parseBackup(text: string): PersonalData {
  checkSize(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return fail("not valid JSON.");
  }
  const envelope = object(value, ["format", "version", "data"]);
  if (
    envelope.format !== "my-words-backup" ||
    (envelope.version !== 1 && envelope.version !== 2)
  )
    fail("unsupported format or version.");
  return validateData(envelope.data, envelope.version as number);
}
export function mergeData(
  existing: PersonalData,
  incoming: PersonalData,
): PersonalData {
  const oldData = validateData(existing),
    newData = validateData(incoming);
  const customCategories = [...(oldData.customCategories ?? [])];
  const names = new Map(
    getCategories(oldData).map((name) => [name.toLowerCase(), name]),
  );
  for (const name of newData.customCategories ?? []) {
    if (!names.has(name.toLowerCase())) {
      names.set(name.toLowerCase(), name);
      customCategories.push(name);
    }
  }
  const append = <T extends { id: string }>(a: T[], b: T[]) => [
    ...a,
    ...b.filter((entry) => !a.some((old) => old.id === entry.id)),
  ];
  return parseBackup(
    serializeBackup({
      ...(oldData.customCategories !== undefined ||
      newData.customCategories !== undefined
        ? { customCategories }
        : {}),
      words: append(
        oldData.words,
        newData.words.map((word) => ({
          ...word,
          category: names.get(word.category.toLowerCase())!,
        })),
      ),
      favorites: append(oldData.favorites, newData.favorites),
      settings: oldData.settings,
    }),
  );
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new Error(
          "Local storage is unavailable. Export a backup to keep your changes.",
        ),
      );
      return;
    }
    const request = indexedDB.open("my-words", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("personal");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local storage."));
    request.onblocked = () =>
      reject(
        new Error(
          "Local storage is blocked. Close other app tabs and try again.",
        ),
      );
  });
}
export async function loadData(): Promise<PersonalData | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("personal", "readonly");
    const request = tx.objectStore("personal").get("current");
    tx.oncomplete = () => {
      db.close();
      try {
        resolve(
          request.result === undefined ? null : parseBackup(request.result),
        );
      } catch (error) {
        reject(error);
      }
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Could not read local data."));
    };
  });
}
export async function saveData(data: PersonalData): Promise<void> {
  const validated = serializeBackup(data);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("personal", "readwrite");
    tx.objectStore("personal").put(validated, "current");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        tx.error ??
          new Error("Could not save. Export a backup to keep your changes."),
      );
    };
  });
}
