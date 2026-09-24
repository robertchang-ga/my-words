import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { compose, emptyMessage, type Message } from "./grammar";
import {
  loadData,
  saveData,
  getCategories,
  type PersonalData,
  type Category,
  type Word,
} from "./data";
import { initialData } from "./vocabulary";
import { browserSpeech } from "./speech";
import { useOffline } from "./pwa";
import { SettingsPanel } from "./Settings";
import { Builder, steps, type Step } from "./Builder";
import { WordChoices } from "./WordChoices";
import { applyLocalSetup } from "./localSetup";

type Mode = "Build" | "Categories" | "Favorites";
const quickPhrases = [
  "That’s not what I meant.",
  "Help",
  "Pain",
  "Done",
  "I want to tell you something.",
  "I have a question.",
];

export default function App() {
  const [data, setData] = useState<PersonalData>(initialData);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading your words…");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<Message>(emptyMessage);
  const [cleared, setCleared] = useState<Message | null>(null);
  const [mode, setMode] = useState<Mode>("Build");
  const [step, setStep] = useState<Step>(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [speechStatus, setSpeechStatus] = useState("");
  const [heardWord, setHeardWord] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speech] = useState(() => browserSpeech(setSpeechStatus));
  const [showQuick, setShowQuick] = useState(false);
  const quickRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const latestData = useRef(data);
  const saveQueue = useRef(Promise.resolve());
  const pwa = useOffline();
  const spoken = compose(message);

  useEffect(() => {
    if (category && !getCategories(data).includes(category)) setCategory(null);
  }, [data.customCategories, category]);

  useEffect(() => {
    let alive = true;
    let setupFailed = false;
    loadData()
      .then(async (saved) =>
        applyLocalSetup(saved ?? initialData(), {
          hostname: location.hostname,
          read: async () => {
            const response = await fetch(
              `${import.meta.env.BASE_URL}local-setup.json`,
              { cache: "no-store" },
            );
            return response.ok ? response.text() : null;
          },
          remembered: (id) => {
            try {
              return !!saved && localStorage.getItem("my-words-setup") === id;
            } catch {
              return false;
            }
          },
          remember: (id) => {
            try {
              localStorage.setItem("my-words-setup", id);
            } catch {
              /* Imported data is already saved in IndexedDB. */
            }
          },
          save: saveData,
        }).catch(() => {
          setupFailed = true;
          return saved ?? initialData();
        }),
      )
      .then((saved) => {
        if (!alive) return;
        if (saved) {
          setData(saved);
          latestData.current = saved;
        }
        setSaveStatus(
          setupFailed
            ? "Local setup could not be added. Your saved words are available."
            : "Saved on this device.",
        );
      })
      .catch(() => {
        if (alive)
          setSaveStatus(
            "Local data could not be loaded. Download a backup before closing.",
          );
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const update = () => {
      try {
        setVoices(window.speechSynthesis.getVoices());
      } catch {
        setVoices([]);
      }
    };
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    window.addEventListener("focus", update);
    const timer = window.setTimeout(update, 1200);
    return () => {
      clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", update);
      window.removeEventListener("focus", update);
    };
  }, []);
  useEffect(() => {
    const stop = () => speech.stop();
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      speech.stop();
    };
  }, [speech]);
  useEffect(() => {
    if (showQuick) quickRef.current?.showModal();
    else quickRef.current?.close();
  }, [showQuick]);

  const updateData = (next: PersonalData) => {
    latestData.current = next;
    setData(next);
    setSaveStatus("Saving…");
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await saveData(next);
          if (latestData.current === next)
            setSaveStatus("Saved on this device.");
        } catch {
          if (latestData.current === next)
            setSaveStatus(
              "Not saved on this device. Download a backup to keep your changes.",
            );
        }
      });
  };
  const focusPage = () =>
    requestAnimationFrame(() => {
      mainRef.current?.scrollTo(0, 0);
      contentRef.current?.focus({ preventScroll: true });
    });
  const go = (next: Step) => {
    setStep(next);
    setMode("Build");
    focusPage();
  };
  const change = (next: Message) => {
    speech.stop();
    setHeardWord("");
    setSpeechStatus("");
    setMessage(next);
  };
  const literal = (text: string) => change({ ...emptyMessage(), text });
  const sayShortcut = (text: string) => {
    flushSync(() => literal(text));
    speech.speak(text, data.settings);
  };
  const chooseWord = (word: Word) => {
    flushSync(() => {
      change({ ...message, text: null, word });
      go(3);
      if (data.settings.tapToHear) setHeardWord(word.label);
    });
    if (data.settings.tapToHear) speech.speak(word.label, data.settings);
  };
  const chooseMode = (next: Mode) => {
    setMode(next);
    focusPage();
  };
  const speak = () => {
    setHeardWord("");
    speech.speak(spoken, data.settings);
  };
  const stop = () => {
    speech.stop();
    setHeardWord("");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#choices">
        Skip to choices
      </a>
      <header className="app-header">
        <div>
          <h1>My Words</h1>
          <p className="connection-status">{pwa.status}</p>
        </div>
        <button
          className="quiet-button"
          disabled={!loaded}
          onClick={() => {
            speech.stop();
            setSpeechStatus("");
            setHeardWord("");
            setEditing(!editing);
            focusPage();
          }}
        >
          {editing ? "Back to talking" : "Edit & settings"}
        </button>
      </header>
      <section className="message-panel" aria-label="Your message">
        <div
          className="message-text"
          data-testid="message"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={0}
        >
          {spoken || "Choose your words."}
        </div>
        {(speechStatus || heardWord) && (
          <p className="speech-status" role="status">
            {heardWord ? `Word preview: “${heardWord}”. ` : ""}
            {speechStatus}
          </p>
        )}
        {cleared && !spoken && (
          <button
            className="restore-message"
            onClick={() => {
              change(cleared);
              setCleared(null);
              go(3);
            }}
          >
            Restore message
          </button>
        )}
      </section>
      <main
        ref={mainRef}
        id="choices"
        className={editing ? "editing" : "communication"}
      >
        {editing ? (
          <>
            <SettingsPanel
              data={data}
              update={updateData}
              voices={voices}
              saveStatus={saveStatus}
            />
            <OfflineStatus />
          </>
        ) : (
          <>
            <nav className="mode-tabs" aria-label="Ways to find words">
              {(["Build", "Categories", "Favorites"] as Mode[]).map((item) => (
                <button
                  key={item}
                  aria-pressed={mode === item}
                  onClick={() => chooseMode(item)}
                >
                  {item}
                </button>
              ))}
            </nav>
            <nav className="step-tabs" aria-label="Sentence steps">
              {steps.map((label, index) => (
                <button
                  key={label}
                  aria-current={
                    mode === "Build" && step === index ? "step" : undefined
                  }
                  onClick={() => go(index as Step)}
                >
                  {label}
                </button>
              ))}
            </nav>
            {mode === "Build" && step < 3 && (
              <Builder
                step={step}
                message={message}
                words={data.words}
                change={change}
                go={go}
                choose={chooseWord}
                heading={contentRef}
              />
            )}
            {mode === "Build" && step === 3 && (
              <section className="review-page">
                <div className="page-heading">
                  <h2 ref={contentRef} tabIndex={-1}>
                    Message
                  </h2>
                </div>
                <div className="speech-buttons">
                  <button
                    className="primary"
                    disabled={!spoken.trim()}
                    onClick={speak}
                  >
                    Speak
                  </button>
                  <button onClick={stop}>Stop speaking</button>
                </div>
                <div className="message-tools">
                  <button disabled={!spoken.trim()} onClick={speak}>
                    Repeat
                  </button>
                </div>
                {data.settings.encourageSpeech && (
                  <p className="gentle-note">
                    You can try saying it too, if you want.
                  </p>
                )}
              </section>
            )}
            {mode === "Categories" && (
              <section className="choice-page">
                <div className="page-heading">
                  <h2 ref={contentRef} tabIndex={-1}>
                    {category ?? "Categories"}
                  </h2>
                  {category && (
                    <button
                      onClick={() => {
                        setCategory(null);
                        focusPage();
                      }}
                    >
                      Back to categories
                    </button>
                  )}
                </div>
                {category ? (
                  <>
                    <WordChoices
                      key={category}
                      words={data.words.filter((w) => w.category === category)}
                      choose={chooseWord}
                      selected={message.word?.label}
                    />
                    {!data.words.some((w) => w.category === category) && (
                      <p>Add words here in Edit & settings.</p>
                    )}
                  </>
                ) : (
                  <WordChoices
                    words={getCategories(data).map((c) => ({
                      id: c,
                      label: c,
                      category: c,
                    }))}
                    choose={(word) => {
                      setCategory(word.category);
                      focusPage();
                    }}
                  />
                )}
              </section>
            )}
            {mode === "Favorites" && (
              <section>
                <div className="page-heading">
                  <h2 ref={contentRef} tabIndex={-1}>
                    Favorites
                  </h2>
                </div>
                <div className="phrase-list">
                  {data.favorites.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        sayShortcut(f.label);
                        go(3);
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {!data.favorites.length && (
                  <p>Add phrases in Edit & settings.</p>
                )}
              </section>
            )}
            {pwa.waiting && <OfflineStatus />}
          </>
        )}
      </main>
      <footer className="communication-footer">
        {!editing && (
          <div className="page-actions">
            {mode === "Build" && step < 3 ? (
              <button
                onClick={() => {
                  change({
                    ...message,
                    text: null,
                    ...(step === 0
                      ? { subject: "" }
                      : step === 1
                        ? { action: "" }
                        : { word: null }),
                  });
                  go((step + 1) as Step);
                }}
              >
                {["Skip who", "Skip action", "Skip what / where"][step]}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (spoken || message.negative) setCleared(message);
                  change(emptyMessage());
                  setCategory(null);
                  go(0);
                }}
              >
                New thought
              </button>
            )}
          </div>
        )}
        <nav className="quick-bar" aria-label="Quick communication">
          <button
            onClick={() => sayShortcut("Yes")}
            aria-description="Speaks immediately"
          >
            Yes
          </button>
          <button
            onClick={() => sayShortcut("No")}
            aria-description="Speaks immediately"
          >
            No
          </button>
          <button
            onClick={() => sayShortcut("OK")}
            aria-description="Speaks immediately"
          >
            OK
          </button>
          <button onClick={() => setShowQuick(true)} aria-haspopup="dialog">
            Quick words
          </button>
        </nav>
      </footer>
      <dialog
        ref={quickRef}
        className="quick-dialog"
        aria-labelledby="quick-heading"
        onCancel={() => setShowQuick(false)}
        onClose={() => setShowQuick(false)}
      >
        <div className="page-heading">
          <h2 id="quick-heading">Quick words</h2>
          <button autoFocus onClick={() => setShowQuick(false)}>
            Close
          </button>
        </div>
        <p>Tap a phrase to say it.</p>
        <div className="quick-grid">
          {quickPhrases.map((text, index) => (
            <button
              key={text}
              onClick={() => {
                flushSync(() => setShowQuick(false));
                sayShortcut(text);
              }}
            >
              {index === 0 ? (
                <>
                  <strong>Wrong</strong>
                  <small>{text}</small>
                </>
              ) : (
                text
              )}
            </button>
          ))}
        </div>
        <button className="wide" onClick={stop}>
          Stop speaking
        </button>
      </dialog>
    </div>
  );

  function OfflineStatus() {
    return (
      <aside className="offline-status" aria-label="Offline and updates">
        {!pwa.online && <p>Offline</p>}
        {pwa.waiting && (
          <div className="update-notice">
            <p>Update available.</p>
            <button disabled={!!spoken || editing} onClick={pwa.applyUpdate}>
              Update & reopen
            </button>
            {(!!spoken || editing) && (
              <p>Finish your message, then choose New thought to update.</p>
            )}
          </div>
        )}
      </aside>
    );
  }
}
