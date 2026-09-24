import {
  defaultSettings,
  type PersonalData,
  type Word,
  type Category,
} from "./data";

function word(
  id: string,
  label: string,
  category: Category,
  complements?: Word["complements"],
): Word {
  return { id, label, category, ...(complements ? { complements } : {}) };
}
export const initialData = (): PersonalData => ({
  settings: { ...defaultSettings },
  words: [
    word("that", "that", "Things"),
    word("else", "something else", "Things"),
    word("phone", "phone", "Things", {
      want: "my phone",
      need: "my phone",
      have: "my phone",
      see: "my phone",
    }),
    word("water", "water", "Things"),
    word("tea", "tea", "Things"),
    word("coffee", "coffee", "Things"),
    word("food", "food", "Things"),
    word("soup", "soup", "Things"),
    word("music", "music", "Things", { want: "music", need: "music" }),
    word("help", "help", "Activities", { want: "help", need: "help" }),
    word("rest", "rest", "Activities", { want: "to rest", need: "to rest" }),
    word("walk", "a walk", "Activities", {
      want: "a walk",
      need: "a walk",
      go: "for a walk",
    }),
    word("talk", "a conversation", "Activities", {
      want: "to talk",
      need: "to talk",
    }),
    word("tv", "watch a show", "Activities", { want: "to watch a show" }),
    word("home", "home", "Places"),
    word("outside", "outside", "Places"),
    word("garden", "garden", "Places", { go: "to the garden" }),
    word("bathroom", "bathroom", "Places", { go: "to the bathroom" }),
    word("kitchen", "kitchen", "Places", { go: "to the kitchen" }),
    word("family", "family", "People", {
      see: "my family",
      want: "my family",
      need: "my family",
    }),
    word("friend", "a friend", "People"),
    word("partner", "partner", "People", {
      see: "my partner",
      want: "my partner",
      need: "my partner",
    }),
    word("tired", "tired", "Feelings"),
    word("happy", "happy", "Feelings"),
    word("sad", "sad", "Feelings"),
    word("worried", "worried", "Feelings"),
    word("frustrated", "frustrated", "Feelings"),
    word("cold", "cold", "Feelings"),
    word("warm", "warm", "Feelings"),
    word("comfortable", "comfortable", "Feelings"),
    word("pain", "pain", "Body", { feel: "pain", have: "pain" }),
    word("head", "head", "Body"),
    word("arm", "arm", "Body"),
    word("leg", "leg", "Body"),
    word("back", "back", "Body"),
    word("recovery", "recovery", "Topics"),
    word("surgery", "surgery", "Topics"),
    word("plans", "plans", "Topics"),
    word("happened", "something that happened", "Topics"),
    word("time", "time", "Things"),
    word("space", "space", "Things"),
    word("closer", "closer", "Activities"),
    word("away", "away", "Activities"),
    word("here", "here", "Places"),
    word("talking", "talking", "Activities"),
    word("now", "now", "Activities"),
  ],
  favorites: [
    { id: "take-time", label: "Please give me a moment." },
    { id: "listen", label: "Please listen. I have more to say." },
    { id: "understand", label: "I understand what you are saying." },
    { id: "choose", label: "Please ask me one question at a time." },
    { id: "love", label: "I love you." },
    { id: "thanks", label: "Thank you." },
  ],
});

const suggested: Record<string, string[]> = {
  want: ["that", "phone", "water", "rest", "walk", "talk", "family"],
  need: ["that", "help", "water", "rest", "space", "phone", "family"],
  feel: [
    "tired",
    "happy",
    "sad",
    "worried",
    "frustrated",
    "cold",
    "warm",
    "pain",
  ],
  have: ["time", "phone", "pain", "food", "water"],
  go: ["home", "outside", "garden", "bathroom", "kitchen", "walk"],
  eat: ["food", "soup", "that", "else"],
  drink: ["water", "tea", "coffee", "that"],
  see: ["family", "friend", "partner", "that", "phone"],
  move: ["closer", "away", "here", "that"],
  stop: ["now", "here", "talking", "that"],
};
export function contextualWords(words: Word[], action: string) {
  if (action === "see")
    return [
      ...words.filter((word) => word.category === "People"),
      ...words.filter((word) => ["that", "phone"].includes(word.id)),
    ];
  const ids = suggested[action] ?? [
    "that",
    "else",
    "family",
    "home",
    "happy",
    "water",
  ];
  return ids.flatMap((id) => words.find((w) => w.id === id) ?? []);
}
