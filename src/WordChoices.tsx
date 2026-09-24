import { useState } from "react";
import type { Word } from "./data";

export function WordChoices({
  words,
  choose,
  selected,
}: {
  words: Word[];
  choose: (word: Word) => void;
  selected?: string;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(words.length / 4));
  const current = Math.min(page, pages - 1);
  return (
    <>
      <div className="word-grid">
        {words.slice(current * 4, current * 4 + 4).map((word) => (
          <button
            key={word.id}
            aria-label={word.label}
            onClick={() => choose(word)}
            aria-pressed={selected === word.label}
          >
            {word.photo && <img src={word.photo} alt="" />}
            <span>
              {word.label}
              {word.id === "that" && <small>Point to it</small>}
            </span>
          </button>
        ))}
      </div>
      {pages > 1 && (
        <nav className="word-pages" aria-label="More word choices">
          <button disabled={current === 0} onClick={() => setPage(current - 1)}>
            Previous
          </button>
          <span role="status">
            {current + 1} / {pages}
          </span>
          <button
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            More words
          </button>
        </nav>
      )}
    </>
  );
}
