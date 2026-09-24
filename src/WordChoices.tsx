import { useEffect, useRef, useState } from "react";
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
  const area = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(0);
  const [layout, setLayout] = useState({ columns: 2, capacity: 4 });
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const font = parseFloat(getComputedStyle(element).fontSize);
      const columns = Math.max(
        1,
        Math.floor((width + 6) / (Math.max(130, font * 7) + 6)),
      );
      const rowHeight = Math.max(72, font * 4);
      const allRows = Math.max(1, Math.floor((height + 6) / (rowHeight + 6)));
      const fits = allRows * columns >= words.length;
      const rows = fits
        ? allRows
        : Math.max(1, Math.floor((height - 62 + 6) / (rowHeight + 6)));
      const capacity = Math.min(24, columns * rows);
      setLayout((old) =>
        old.columns === columns && old.capacity === capacity
          ? old
          : { columns, capacity },
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [words.length]);
  const pages = Math.max(1, Math.ceil(words.length / layout.capacity));
  const current = Math.min(Math.floor(start / layout.capacity), pages - 1);
  const offset = current * layout.capacity;
  return (
    <div className="word-choices" ref={area}>
      <div
        className="word-grid"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
        }}
      >
        {words.slice(offset, offset + layout.capacity).map((word) => (
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
          <button
            disabled={current === 0}
            onClick={() => setStart(Math.max(0, offset - layout.capacity))}
          >
            Previous
          </button>
          <span role="status">
            {current + 1} / {pages}
          </span>
          <button
            disabled={current === pages - 1}
            onClick={() => setStart(offset + layout.capacity)}
          >
            More words
          </button>
        </nav>
      )}
    </div>
  );
}
