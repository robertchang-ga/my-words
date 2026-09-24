import { describe, expect, it, vi } from "vitest";
import { applyLocalSetup } from "./localSetup";
import { initialData } from "./vocabulary";
import { serializeBackup } from "./data";

function setup() {
  const data = initialData();
  const incoming = {
    ...initialData(),
    words: [{ id: "local-test", label: "Alex", category: "People" as const }],
    favorites: [],
  };
  return {
    data,
    options: {
      hostname: "localhost",
      read: vi.fn(async () =>
        JSON.stringify({
          version: 1,
          backup: JSON.parse(serializeBackup(incoming)),
          removeWordIds: [],
        }),
      ),
      remembered: vi.fn(() => false),
      remember: vi.fn(),
      save: vi.fn(async () => {}),
    },
  };
}
describe("private local personalization", () => {
  it("does not request personal data on a published hostname", async () => {
    const { data, options } = setup();
    options.hostname = "example.github.io";
    expect(await applyLocalSetup(data, options)).toEqual(data);
    expect(options.read).not.toHaveBeenCalled();
  });
  it("adds people locally and remembers the import only after saving", async () => {
    const { data, options } = setup();
    const next = await applyLocalSetup(data, options);
    expect(next.words[0].label).toBe("Alex");
    expect(next.settings).toEqual(data.settings);
    expect(options.save).toHaveBeenCalledWith(next);
    expect(options.remember).toHaveBeenCalledOnce();
  });
  it("does not re-add deleted people after the setup has already been used", async () => {
    const { data, options } = setup();
    options.remembered.mockReturnValue(true);
    expect(await applyLocalSetup(data, options)).toEqual(data);
    expect(options.save).not.toHaveBeenCalled();
  });
  it("leaves the setup pending when saving fails", async () => {
    const { data, options } = setup();
    options.save.mockRejectedValue(new Error("quota"));
    await expect(applyLocalSetup(data, options)).rejects.toThrow("quota");
    expect(options.remember).not.toHaveBeenCalled();
  });
});
