import { useEffect, useState } from "react";
import type { PersonalData } from "./data";

interface Props {
  data: PersonalData;
  change: (next: PersonalData, message: string) => boolean;
  disabled: boolean;
  renamed: (previous: string, next: string) => void;
}

export function CategoryEditor({ data, change, disabled, renamed }: Props) {
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const custom = data.customCategories ?? [];
  const count = data.words.filter((word) => word.category === selected).length;
  useEffect(() => {
    if (!data.customCategories?.includes(selected)) {
      setSelected("");
      setName("");
    }
  }, [data.customCategories, selected]);
  return (
    <section className="settings-card" aria-labelledby="categories-title">
      <h3 id="categories-title">Categories</h3>
      <p>Add up to 50 categories. The starting categories stay in place.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) return;
          if (
            change(
              { ...data, customCategories: [...custom, newName.trim()] },
              "Category added.",
            )
          )
            setNewName("");
        }}
      >
        <label htmlFor="new-category">New category name</label>
        <input
          id="new-category"
          value={newName}
          maxLength={60}
          required
          disabled={disabled}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button
          className="wide"
          disabled={disabled || !newName.trim() || custom.length >= 50}
        >
          Add category
        </button>
      </form>
      {custom.length > 0 && (
        <>
          <label htmlFor="edit-category">Choose a category to edit</label>
          <select
            id="edit-category"
            value={selected}
            disabled={disabled}
            onChange={(event) => {
              setSelected(event.target.value);
              setName(event.target.value);
            }}
          >
            <option value="">Choose a category</option>
            {custom.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          {selected && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (disabled) return;
                const nextName = name.trim();
                if (
                  change(
                    {
                      ...data,
                      customCategories: custom.map((category) =>
                        category === selected ? nextName : category,
                      ),
                      words: data.words.map((word) =>
                        word.category === selected
                          ? { ...word, category: nextName }
                          : word,
                      ),
                    },
                    "Category renamed.",
                  )
                ) {
                  renamed(selected, nextName);
                  setSelected(nextName);
                  setName(nextName);
                }
              }}
            >
              <label htmlFor="category-name">Category name</label>
              <input
                id="category-name"
                required
                maxLength={60}
                value={name}
                disabled={disabled}
                onChange={(event) => setName(event.target.value)}
              />
              <button
                className="wide"
                disabled={disabled || !name.trim() || name.trim() === selected}
              >
                Rename category
              </button>
              <p>
                {count
                  ? `${count} words use this category. Move or remove them before removing the category.`
                  : "This category has no words. You can remove it."}
              </p>
              <button
                type="button"
                className="wide"
                disabled={disabled || count > 0}
                onClick={() => {
                  if (
                    change(
                      {
                        ...data,
                        customCategories: custom.filter(
                          (category) => category !== selected,
                        ),
                      },
                      "Category removed. You can undo this change.",
                    )
                  ) {
                    setSelected("");
                    setName("");
                  }
                }}
              >
                Remove category
              </button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
