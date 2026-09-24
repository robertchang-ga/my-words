import { beforeEach, describe, expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  defaultSettings,
  categories,
  getCategories,
  loadData,
  mergeData,
  parseBackup,
  saveData,
  serializeBackup,
  type PersonalData,
} from "./data";

const sample = (): PersonalData => ({
  words: [
    {
      id: "w1",
      label: "<script>hello</script>",
      category: "People",
      complements: { want: "my friend" },
      photo:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWJiYGBgAAAAAP//XRcpzQAAAAZJREFUAwAADwADJDd96QAAAABJRU5ErkJggg==",
    },
  ],
  favorites: [{ id: "f1", label: "Please wait." }],
  settings: { ...defaultSettings },
});
const backup = (data: unknown, version = 1) =>
  JSON.stringify({ format: "my-words-backup", version, data });

describe("validated backup", () => {
  it("rejects truncated raster streams and oversized decoded dimensions", () => {
    const huge = new Uint8Array(
      Buffer.from(sample().words[0].photo!.split(",")[1], "base64"),
    );
    new DataView(huge.buffer).setUint32(16, 50_000);
    for (const photo of [
      "data:image/jpeg;base64,/9j/2Q==",
      `data:image/png;base64,${Buffer.from(huge).toString("base64")}`,
      sample().words[0].photo!.slice(0, -16),
    ]) {
      const data = sample();
      data.words[0].photo = photo;
      expect(() => parseBackup(backup(data))).toThrow();
    }
  });
  it("round trips vocabulary, literal labels, settings and photos", () => {
    expect(parseBackup(serializeBackup(sample()))).toEqual(sample());
  });
  it("rejects malformed or unknown backups", () => {
    for (const text of [
      "bad json",
      "{}",
      backup(sample(), 3),
      backup({}),
      " ".repeat(20 * 1024 * 1024 + 1),
    ])
      expect(() => parseBackup(text)).toThrow();
  });
  it("rejects unsafe URLs, oversized text, duplicate IDs and invalid settings", () => {
    for (const photo of [
      "https://example.com/a.jpg",
      "data:image/svg+xml;base64,AAAA",
      "data:image/png;base64,AAAA",
      "data:image/jpeg;base64,!!!!",
    ]) {
      const data = sample();
      data.words[0].photo = photo;
      expect(() => parseBackup(backup(data))).toThrow();
    }
    const long = sample();
    long.words[0].label = "x".repeat(121);
    const duplicate = sample();
    duplicate.words.push(duplicate.words[0]);
    const rate = sample();
    rate.settings.rate = 99;
    const unknown = sample();
    (unknown.words[0] as unknown as Record<string, unknown>).unexpected = true;
    for (const data of [long, duplicate, rate, unknown])
      expect(() => parseBackup(backup(data))).toThrow();
  });
  it("merges unique imported entries while existing IDs and settings win", () => {
    const incoming = sample();
    incoming.words[0].label = "conflict";
    incoming.words.push({ id: "w2", label: "Home", category: "Places" });
    incoming.settings.rate = 1.3;
    const merged = mergeData(sample(), incoming);
    expect(merged.words.map((w) => w.label)).toEqual([
      "<script>hello</script>",
      "Home",
    ]);
    expect(merged.settings).toEqual(defaultSettings);
    expect(merged.favorites).toHaveLength(1);
  });
  it("rejects too many entries, unsafe complement keys and oversized photos", () => {
    const many = sample();
    many.words = Array.from({ length: 501 }, (_, i) => ({
      id: String(i),
      label: "Word",
      category: "Things",
    }));
    const unsafe = sample();
    unsafe.words[0].complements = JSON.parse('{"__proto__":"unsafe"}');
    const large = sample();
    large.words[0].photo = `data:image/jpeg;base64,${"A".repeat(700_000)}`;
    for (const data of [many, unsafe, large])
      expect(() => parseBackup(backup(data))).toThrow();
  });
  it("limits total UTF-8 backup bytes, including non-ASCII text", () => {
    // Non-ASCII text must hit the byte limit before validation/parsing work.
    const text = backup(sample()).replace(
      "<script>hello</script>",
      "é".repeat(11 * 1024 * 1024),
    );
    expect(() => parseBackup(text)).toThrow(/20 MiB/);
  });
});

describe("custom categories", () => {
  it("exports version 2 and accepts existing version 1 backups", () => {
    expect(JSON.parse(serializeBackup(sample())).version).toBe(2);
    expect(parseBackup(backup(sample(), 1))).toEqual(sample());
  });
  it("round trips custom categories, including empty categories", async () => {
    globalThis.indexedDB = new IDBFactory();
    const data = { ...sample(), customCategories: ["Music", "Garden"] };
    data.words.push({ id: "music", label: "Jazz", category: "Music" });
    expect(getCategories(data)).toEqual([...categories, "Music", "Garden"]);
    expect(parseBackup(serializeBackup(data))).toEqual(data);
    await saveData(data);
    expect(await loadData()).toEqual(data);
  });
  it("rejects invalid category names and unknown word references", () => {
    for (const customCategories of [
      [" "],
      ["x".repeat(61)],
      ["Music", "music"],
      ["people"],
      [" Music"],
      Array.from({ length: 51 }, (_, i) => `Category ${i}`),
    ]) {
      expect(() =>
        parseBackup(backup({ ...sample(), customCategories }, 2)),
      ).toThrow();
    }
    const unknown = sample();
    unknown.words[0].category = "Unknown";
    expect(() => parseBackup(backup(unknown, 2))).toThrow(/category/);
    expect(() =>
      parseBackup(backup({ ...sample(), customCategories: ["Music"] }, 1)),
    ).toThrow();
  });
  it("merges category names without case-only duplicates and remaps incoming words", () => {
    const existing = { ...sample(), customCategories: ["Music"] };
    const incoming = { ...sample(), customCategories: ["music", "Garden"] };
    incoming.words[0].label = "Changed";
    incoming.words.push({ id: "new", label: "Jazz", category: "music" });
    const merged = mergeData(existing, incoming);
    expect(merged.customCategories).toEqual(["Music", "Garden"]);
    expect(merged.words[1].category).toBe("Music");
    expect(merged.words[0]).toEqual(existing.words[0]);
    expect(merged.settings).toEqual(existing.settings);
  });
});

describe("atomic local persistence", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });
  it("returns null when new, then restores the complete record", async () => {
    expect(await loadData()).toBeNull();
    await saveData(sample());
    expect(await loadData()).toEqual(sample());
  });
  it("rejects invalid changes without replacing the saved record", async () => {
    await saveData(sample());
    const invalid = sample();
    invalid.settings.rate = NaN;
    await expect(saveData(invalid)).rejects.toThrow();
    expect(await loadData()).toEqual(sample());
  });
  it("reports unavailable storage so UI can retain and export unsaved changes", async () => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    await expect(loadData()).rejects.toThrow(/unavailable/);
    await expect(saveData(sample())).rejects.toThrow(/backup/);
  });
});
