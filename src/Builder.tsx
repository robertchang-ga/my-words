import { useState, type RefObject } from "react";
import { actions, type Message, type Subject } from "./grammar";
import { contextualWords } from "./vocabulary";
import type { Word } from "./data";
import { WordChoices } from "./WordChoices";

export type Step = 0 | 1 | 2 | 3;
export const steps = [
  "1 Who",
  "2 Action",
  "3 What / where",
  "Message",
] as const;
export function Builder({
  step,
  message,
  words,
  change,
  go,
  choose,
  heading,
}: {
  step: Step;
  message: Message;
  words: Word[];
  change: (message: Message) => void;
  go: (step: Step) => void;
  choose: (word: Word) => void;
  heading: RefObject<HTMLHeadingElement | null>;
}) {
  const [other, setOther] = useState(false);
  const choices = contextualWords(words, message.action);
  const available = [...choices];
  if (!available.some((w) => w.id === "that"))
    available.push({ id: "that", label: "that", category: "Things" });
  if (!available.some((w) => w.id === "else"))
    available.push({ id: "else", label: "something else", category: "Things" });
  if (step === 0 && other)
    return (
      <section className="builder-page">
        <div className="page-heading">
          <h2 ref={heading} tabIndex={-1}>
            Who
          </h2>
          <button onClick={() => setOther(false)}>Back to who</button>
        </div>
        <WordChoices
          words={[
            ...words.filter((w) => w.category === "People"),
            { id: "someone-else", label: "Someone else", category: "People" },
          ]}
          choose={(person) => {
            change({ ...message, text: null, subject: person.label });
            setOther(false);
            go(1);
          }}
          selected={message.subject}
        />
      </section>
    );
  return (
    <section className="builder-page">
      <div className="page-heading">
        <h2 ref={heading} tabIndex={-1}>
          {["Who", "Action", "What / where"][step]}
        </h2>
      </div>
      {step === 0 && (
        <>
          <div className="negation-choice">
            <button
              aria-pressed={message.negative}
              aria-describedby="negation-help"
              onClick={() =>
                change({ ...message, negative: !message.negative })
              }
            >
              Not
            </button>
            <span id="negation-help" className="sr-only">
              Make this a negative sentence.
            </span>
          </div>
          <div className="subject-grid">
            {(
              [
                ["I", "I / me"],
                ["You", "You"],
                ["It", "It / that"],
              ] as [Subject, string][]
            ).map(([subject, label]) => (
              <button
                key={subject}
                aria-pressed={
                  message.subject === subject && message.text === null
                }
                onClick={() => {
                  change({ ...message, text: null, subject });
                  go(1);
                }}
              >
                {label}
              </button>
            ))}
            <button
              aria-pressed={
                !!message.subject &&
                !["I", "You", "It"].includes(message.subject)
              }
              onClick={() => {
                setOther(true);
                requestAnimationFrame(() => heading.current?.focus());
              }}
            >
              Other
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="action-grid">
          {actions.map((action) => (
            <button
              key={action}
              aria-pressed={message.action === action && message.text === null}
              onClick={() => {
                change({ ...message, text: null, action });
                go(2);
              }}
            >
              {action[0].toUpperCase() + action.slice(1)}
            </button>
          ))}
        </div>
      )}
      {step === 2 && (
        <WordChoices
          key={message.action}
          words={available}
          choose={choose}
          selected={message.word?.label}
        />
      )}
    </section>
  );
}
