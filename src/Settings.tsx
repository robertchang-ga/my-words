import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  categories,
  MAX_BACKUP_SIZE,
  mergeData,
  parseBackup,
  serializeBackup,
  type Category,
  type PersonalData,
  type Word,
} from "./data";
import { resizePhoto } from "./photos";
import { actions } from "./grammar";

interface Props {
  data: PersonalData;
  update: (data: PersonalData) => void;
  voices: SpeechSynthesisVoice[];
  saveStatus: string;
}
const newWord = (): Word => ({ id: "", label: "", category: "Things" });
export function SettingsPanel({ data, update, voices, saveStatus }: Props) {
  const [word, setWord] = useState<Word>(newWord);
  const [favorite, setFavorite] = useState({ id: "", label: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<PersonalData | null>(null);
  const [undoData, setUndoData] = useState<PersonalData | null>(null);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const languages = Array.from(
    new Set(["en-US", data.settings.language, ...voices.map((v) => v.lang)]),
  ).sort();
  const matchingVoices = voices.filter(
    (v) => v.lang === data.settings.language,
  );
  const selectedAvailable = voices.some(
    (v) =>
      v.voiceURI === data.settings.voiceURI &&
      v.lang === data.settings.language,
  );
  const changeData = (next: PersonalData, message: string) => {
    try {
      serializeBackup(next);
      setUndoData(data);
      update(next);
      setError("");
      setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const saveWord = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const saved = { ...word, id: word.id || crypto.randomUUID() };
    const words = word.id
      ? data.words.map((w) => (w.id === word.id ? saved : w))
      : [...data.words, saved];
    if (changeData({ ...data, words }, "Word saved.")) setWord(newWord());
  };
  const photoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const photo = await resizePhoto(file);
      setWord((old) => ({ ...old, photo }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    try {
      const blob = new Blob([serializeBackup(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `my-words-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice(
        "Backup download requested. Check Downloads or save it to Files.",
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIncoming(null);
    setReplaceConfirmed(false);
    setError("");
    try {
      if (file.size > MAX_BACKUP_SIZE)
        throw new Error("Choose a backup smaller than 20 MiB.");
      setIncoming(parseBackup(await file.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const applyImport = (merge: boolean) => {
    if (!incoming) return;
    try {
      const next = merge ? mergeData(data, incoming) : incoming;
      if (changeData(next, "Backup imported.")) {
        setIncoming(null);
        setWord(newWord());
        setFavorite({ id: "", label: "" });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="settings">
      <div className="section-heading">
        <h2>Edit & settings</h2>
        <span className="small-note">Personalize your words</span>
      </div>
      <p>Use Back to talking to return to your message.</p>
      <p
        role="status"
        className={saveStatus.startsWith("Not saved") ? "error" : "save-status"}
      >
        {saveStatus}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p role="status">{notice}</p>
      {undoData && (
        <button
          onClick={() => {
            update(undoData);
            setUndoData(null);
            setWord(newWord());
            setFavorite({ id: "", label: "" });
            setNotice("Previous personalization restored.");
          }}
        >
          Undo last personalization change
        </button>
      )}
      <section className="settings-card" aria-labelledby="voice-title">
        <h3 id="voice-title">Voice & listening</h3>
        <label htmlFor="language">Speech language</label>
        <select
          id="language"
          value={data.settings.language}
          onChange={(e) =>
            update({
              ...data,
              settings: {
                ...data.settings,
                language: e.target.value,
                voiceURI: "",
              },
            })
          }
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <p className="small-note">
          Language changes pronunciation. Sentence templates stay in English.
        </p>
        <label htmlFor="voice">Device voice</label>
        <select
          id="voice"
          value={selectedAvailable ? data.settings.voiceURI : ""}
          onChange={(e) =>
            update({
              ...data,
              settings: { ...data.settings, voiceURI: e.target.value },
            })
          }
        >
          <option value="">Device default</option>
          {matchingVoices.map((voice, i) => (
            <option key={`${voice.voiceURI}-${i}`} value={voice.voiceURI}>
              {voice.name} · {voice.lang}
              {voice.localService ? " · device" : " · may need internet"}
            </option>
          ))}
        </select>
        {!voices.length && (
          <p>
            No voices are listed yet. The device default may still work. Voices
            can appear after a moment; try Speak on this device.
          </p>
        )}
        {data.settings.voiceURI && !selectedAvailable && (
          <p>
            The saved voice is not available here. Using the device default
            until you choose another voice.
          </p>
        )}
        <label htmlFor="rate">Speaking rate</label>
        <select
          id="rate"
          value={data.settings.rate}
          onChange={(e) =>
            update({
              ...data,
              settings: { ...data.settings, rate: Number(e.target.value) },
            })
          }
        >
          {Array.from(new Set([0.5, 0.7, 0.9, 1, 1.2, 1.5, data.settings.rate]))
            .sort((a, b) => a - b)
            .map((rate) => (
              <option key={rate} value={rate}>
                {rate}×{rate === 1 ? " · Standard" : ""}
              </option>
            ))}
        </select>
        <label className="check-label">
          <input
            type="checkbox"
            checked={data.settings.tapToHear}
            onChange={(e) =>
              update({
                ...data,
                settings: { ...data.settings, tapToHear: e.target.checked },
              })
            }
          />
          <span>
            Hear a word when I choose it{" "}
            <small>The word appears below your message before it speaks.</small>
          </span>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={data.settings.encourageSpeech}
            onChange={(e) =>
              update({
                ...data,
                settings: {
                  ...data.settings,
                  encourageSpeech: e.target.checked,
                },
              })
            }
          />
          <span>
            Show a reminder that I can try speaking{" "}
            <small>You can skip speaking and keep using the app.</small>
          </span>
        </label>
        <p className="small-note">
          Speech depends on your device and voice. Test on your iPhone,
          including airplane mode. The visible message works even if speech does
          not.
        </p>
      </section>
      <section className="settings-card" aria-labelledby="word-title">
        <h3 id="word-title">Words & personal photos</h3>
        <p>Add, change, or remove words to suit you.</p>
        <label htmlFor="edit-word">Choose a word to edit</label>
        <select
          id="edit-word"
          value={word.id}
          disabled={busy}
          onChange={(e) =>
            setWord(
              data.words.find((w) => w.id === e.target.value) ?? newWord(),
            )
          }
        >
          <option value="">＋ Add a new word</option>
          {data.words.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label} · {w.category}
            </option>
          ))}
        </select>
        <form onSubmit={saveWord}>
          <label htmlFor="word-label">Word label</label>
          <input
            id="word-label"
            required
            maxLength={120}
            value={word.label}
            disabled={busy}
            onChange={(e) =>
              setWord({
                ...word,
                label: e.target.value,
                complements: undefined,
              })
            }
          />
          <label htmlFor="word-category">Word category</label>
          <select
            id="word-category"
            value={word.category}
            disabled={busy}
            onChange={(e) =>
              setWord({ ...word, category: e.target.value as Category })
            }
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label htmlFor="photo">Personal photo (optional)</label>
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={photoUpload}
            disabled={busy}
          />
          <p className="small-note">
            JPEG, PNG or WebP, up to 12 MiB. Photos are resized and saved here,
            on this device. Export HEIC as JPEG first.
          </p>
          {busy && <p role="status">Preparing photo…</p>}
          {word.photo && (
            <div className="photo-preview">
              <img src={word.photo} alt="Selected personal photo" />
              <button
                type="button"
                onClick={() => setWord({ ...word, photo: undefined })}
              >
                Remove photo
              </button>
            </div>
          )}
          <details>
            <summary>Optional sentence wording</summary>
            <p>
              By default, a word is used as entered. You can set exact wording
              after each action, such as “my phone” after “want”. Changing the
              label clears these overrides.
            </p>
            {actions.map((action) => (
              <div key={action}>
                <label htmlFor={`form-${action}`}>After “{action}”</label>
                <input
                  id={`form-${action}`}
                  value={word.complements?.[action] ?? ""}
                  maxLength={160}
                  onChange={(e) => {
                    const complements = { ...word.complements };
                    if (e.target.value) complements[action] = e.target.value;
                    else delete complements[action];
                    setWord({ ...word, complements });
                  }}
                />
              </div>
            ))}
          </details>
          <button
            className="primary wide"
            type="submit"
            disabled={busy || !word.label.trim()}
          >
            Save word
          </button>
          {word.id && (
            <button
              className="wide"
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  changeData(
                    {
                      ...data,
                      words: data.words.filter((w) => w.id !== word.id),
                    },
                    "Word removed. You can undo this change.",
                  )
                )
                  setWord(newWord());
              }}
            >
              Remove word
            </button>
          )}
        </form>
      </section>
      <section className="settings-card" aria-labelledby="favorites-title">
        <h3 id="favorites-title">Favorite phrases</h3>
        <label htmlFor="edit-favorite">Choose a favorite to edit</label>
        <select
          id="edit-favorite"
          value={favorite.id}
          onChange={(e) =>
            setFavorite(
              data.favorites.find((f) => f.id === e.target.value) ?? {
                id: "",
                label: "",
              },
            )
          }
        >
          <option value="">＋ Add a new favorite</option>
          {data.favorites.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const saved = {
              ...favorite,
              id: favorite.id || crypto.randomUUID(),
            };
            if (
              changeData(
                {
                  ...data,
                  favorites: favorite.id
                    ? data.favorites.map((f) =>
                        f.id === favorite.id ? saved : f,
                      )
                    : [...data.favorites, saved],
                },
                "Favorite saved.",
              )
            )
              setFavorite({ id: "", label: "" });
          }}
        >
          <label htmlFor="favorite-label">Complete phrase</label>
          <textarea
            id="favorite-label"
            required
            maxLength={500}
            value={favorite.label}
            onChange={(e) =>
              setFavorite({ ...favorite, label: e.target.value })
            }
          />
          <button className="primary wide" disabled={!favorite.label.trim()}>
            Save favorite
          </button>
          {favorite.id && (
            <button
              type="button"
              className="wide"
              onClick={() => {
                changeData(
                  {
                    ...data,
                    favorites: data.favorites.filter(
                      (f) => f.id !== favorite.id,
                    ),
                  },
                  "Favorite removed. You can undo this change.",
                );
                setFavorite({ id: "", label: "" });
              }}
            >
              Remove favorite
            </button>
          )}
        </form>
      </section>
      <section className="settings-card" aria-labelledby="backup-title">
        <h3 id="backup-title">Backup & restore</h3>
        <p>
          Your words, settings, and photos are saved in this browser. Clearing
          website data or the browser removing stored data can erase them. Save
          a backup regularly, and before switching devices or installing a new
          copy.
        </p>
        <button className="primary wide" onClick={download}>
          Download backup
        </button>
        <p className="small-note">
          The backup contains your personal words and photos. Keep it somewhere
          private. Conversations are not saved.
        </p>
        <label htmlFor="import">Import backup file</label>
        <input
          id="import"
          type="file"
          accept=".json,application/json"
          onChange={importFile}
        />
        {incoming && (
          <div className="import-preview">
            <h4>Backup ready to review</h4>
            <p>
              {incoming.words.length} words · {incoming.favorites.length}{" "}
              favorite phrases · {incoming.words.filter((w) => w.photo).length}{" "}
              photos
            </p>
            <p>
              {
                incoming.words.filter((w) =>
                  data.words.some((old) => old.id === w.id),
                ).length
              }{" "}
              words and{" "}
              {
                incoming.favorites.filter((f) =>
                  data.favorites.some((old) => old.id === f.id),
                ).length
              }{" "}
              favorites match entries already saved here.
            </p>
            <p>
              Merge adds new entries at the end. For matching entries, it keeps
              your current words, photos, and favorites. It also keeps your
              current settings. Separate entries with the same label are kept.
            </p>
            <button className="wide" onClick={() => applyImport(true)}>
              Merge backup
            </button>
            <p>
              Replace removes the current words, photos, favorites, and settings
              and uses this backup instead.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={replaceConfirmed}
                onChange={(e) => setReplaceConfirmed(e.target.checked)}
              />
              <span>I want to replace my current personalization.</span>
            </label>
            <button
              className="wide"
              disabled={!replaceConfirmed}
              onClick={() => applyImport(false)}
            >
              Replace with backup
            </button>
            <button className="wide" onClick={() => setIncoming(null)}>
              Cancel import
            </button>
          </div>
        )}
      </section>
      <section className="settings-card" aria-labelledby="install-title">
        <h3 id="install-title">Keep My Words on your iPhone</h3>
        <ol>
          <li>Open the hosted app’s address in Safari.</li>
          <li>Tap Share, then Add to Home Screen.</li>
          <li>
            Open My Words from the Home Screen while connected. Wait for “Ready
            for offline use”.
          </li>
          <li>Try airplane mode to check loading and your chosen voice.</li>
        </ol>
        <p>
          A downloaded HTML file opened from Files is not a supported
          installation. This app is for communication; it is not a diagnosis or
          speech therapy.
        </p>
      </section>
    </div>
  );
}
