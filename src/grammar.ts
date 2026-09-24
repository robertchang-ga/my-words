import type { Word } from "./data";

export const actions = [
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
] as const;
export type Subject = string;
export interface Message {
  subject: Subject;
  action: string;
  word: Pick<Word, "label" | "complements"> | null;
  text: string | null;
  negative: boolean;
}
export const emptyMessage = (): Message => ({
  subject: "",
  action: "",
  word: null,
  text: null,
  negative: false,
});
const thirdPerson: Record<string, string> = {
  want: "wants",
  need: "needs",
  feel: "feels",
  have: "has",
  go: "goes",
  eat: "eats",
  drink: "drinks",
  see: "sees",
  move: "moves",
  stop: "stops",
};

/** Deliberately small English templates. Unknown words remain literal. */
export function compose(message: Message): string {
  const { subject, action, word, text, negative } = message;
  if (text !== null) return negative && text ? `Not: ${text}` : text;
  const complement = word?.complements?.[action] ?? word?.label ?? "";
  const singularThird = !!subject && !["I", "You"].includes(subject);
  const verb =
    singularThird && !negative ? (thirdPerson[action] ?? action) : action;
  const negation =
    negative && action && subject ? (singularThird ? "doesn’t" : "don’t") : "";
  const parts = [subject, negation, verb, complement].filter(Boolean);
  if (!parts.length) return "";
  let result = parts.join(" ");
  if (negative && !negation) result = `Not ${result}`;
  if (!subject && action && !negative)
    result = result.charAt(0).toUpperCase() + result.slice(1);
  if (parts.length > 1 && !/[.!?]$/.test(result)) result += ".";
  return result;
}
