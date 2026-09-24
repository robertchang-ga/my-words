import { expect, it } from "vitest";
import { contextualWords, initialData } from "./vocabulary";
it("offers personalized people for see", () => {
  const words = [
    { id: "person-test", label: "Alex", category: "People" as const },
    ...initialData().words,
  ];
  expect(contextualWords(words, "see")[0].label).toBe("Alex");
});
