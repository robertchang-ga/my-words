import { describe, expect, it } from "vitest";
import { compose, emptyMessage, type Message } from "./grammar";

const message = (changes: Partial<Message>) => ({
  ...emptyMessage(),
  ...changes,
});
describe("transparent composition", () => {
  it("uses a selected person as a subject", () => {
    expect(
      compose(
        message({ subject: "Alex", action: "feel", word: { label: "tired" } }),
      ),
    ).toBe("Alex feels tired.");
    expect(
      compose(
        message({
          subject: "Alex",
          action: "want",
          word: { label: "that" },
          negative: true,
        }),
      ),
    ).toBe("Alex doesn’t want that.");
    expect(
      compose(
        message({
          subject: "Someone else",
          action: "go",
          word: { label: "home" },
        }),
      ),
    ).toBe("Someone else goes home.");
  });
  it.each([
    ["I", "want", "glasses", "I want my glasses."],
    ["I", "feel", "tired", "I feel tired."],
    ["I", "go", "home", "I go home."],
    ["It", "feel", "cold", "It feels cold."],
    ["You", "have", "time", "You have time."],
    ["It", "have", "time", "It has time."],
  ])("%s + %s + %s", (subject, action, label, result) => {
    expect(
      compose(
        message({
          subject: subject as Message["subject"],
          action,
          word: {
            label,
            ...(label === "glasses"
              ? { complements: { want: "my glasses", need: "my glasses" } }
              : {}),
          },
        }),
      ),
    ).toBe(result);
  });
  it("negates without replacing the intention", () => {
    expect(
      compose(
        message({
          subject: "I",
          action: "want",
          word: { label: "that" },
          negative: true,
        }),
      ),
    ).toBe("I don’t want that.");
    expect(
      compose(
        message({
          subject: "It",
          action: "feel",
          word: { label: "cold" },
          negative: true,
        }),
      ),
    ).toBe("It doesn’t feel cold.");
    expect(
      compose(
        message({
          subject: "I",
          action: "go",
          word: { label: "home" },
          negative: true,
        }),
      ),
    ).toBe("I don’t go home.");
  });
  it("supports omitted steps and single words", () => {
    expect(compose(emptyMessage())).toBe("");
    expect(compose(message({ subject: "I" }))).toBe("I");
    expect(compose(message({ action: "drink" }))).toBe("Drink");
    expect(compose(message({ word: { label: "that" } }))).toBe("that");
    expect(compose(message({ action: "want", word: { label: "that" } }))).toBe(
      "Want that.",
    );
    expect(compose(message({ subject: "I", word: { label: "home" } }))).toBe(
      "I home.",
    );
  });
  it("preserves typed text verbatim and uses an explicit fallback for negation", () => {
    const literal = "  café & <hello>!\nMy OWN words";
    expect(compose(message({ text: literal }))).toBe(literal);
    expect(compose(message({ text: literal, negative: true }))).toBe(
      `Not: ${literal}`,
    );
  });
  it("does not invent articles or inflections for custom vocabulary", () => {
    expect(
      compose(
        message({
          subject: "I",
          action: "want",
          word: { label: "Alex’s blue mug" },
        }),
      ),
    ).toBe("I want Alex’s blue mug.");
    expect(
      compose(
        message({
          subject: "It",
          action: "custom verb",
          word: { label: "Zed" },
        }),
      ),
    ).toBe("It custom verb Zed.");
    expect(compose(message({ word: { label: "No" } }))).toBe("No");
  });
});
