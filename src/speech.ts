export interface UtterancePort {
  text: string;
  lang: string;
  rate: number;
  voice: SpeechSynthesisVoice | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
export interface SpeechPort {
  getVoices(): SpeechSynthesisVoice[];
  cancel(): void;
  speak(utterance: UtterancePort): void;
}
type Options = { language: string; rate: number; voiceURI: string };
const failed = "Speech could not play. Try another voice or show your message.";

export class SpeechController {
  private generation = 0;
  private current: UtterancePort | null = null;
  constructor(
    private port: SpeechPort | null,
    private create: ((text: string) => UtterancePort) | null,
    private report: (status: string) => void,
  ) {}
  speak(text: string, options: Options) {
    if (!text.trim()) return;
    if (!this.port || !this.create) {
      this.report(
        "Speech is unavailable in this browser. You can still show your message.",
      );
      return;
    }
    const generation = ++this.generation;
    try {
      this.port.cancel();
      const utterance = this.create(text);
      this.current = utterance; // Keep alive on engines that otherwise drop callbacks.
      utterance.lang = options.language;
      utterance.rate = options.rate;
      utterance.voice =
        this.port
          .getVoices()
          .find(
            (v) =>
              v.voiceURI === options.voiceURI && v.lang === options.language,
          ) ?? null;
      utterance.onend = () => {
        if (generation === this.generation) {
          this.current = null;
          this.report("Finished speaking.");
        }
      };
      utterance.onerror = () => {
        if (generation === this.generation) {
          this.current = null;
          this.report(failed);
        }
      };
      this.report("Speaking…");
      this.port.speak(utterance);
    } catch {
      this.current = null;
      this.report(failed);
    }
  }
  stop() {
    ++this.generation;
    this.current = null;
    try {
      this.port?.cancel();
    } catch {
      /* A broken speech engine must not block communication. */
    }
    this.report("Stopped. Your message is still here.");
  }
}

export function browserSpeech(report: (status: string) => void) {
  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
  return new SpeechController(
    supported ? (window.speechSynthesis as unknown as SpeechPort) : null,
    supported
      ? (text) => new SpeechSynthesisUtterance(text) as unknown as UtterancePort
      : null,
    report,
  );
}
