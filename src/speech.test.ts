import { describe, expect, it, vi } from "vitest";
import {
  SpeechController,
  type SpeechPort,
  type UtterancePort,
} from "./speech";

function setup() {
  const utterances: UtterancePort[] = [];
  const port: SpeechPort = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => []),
  };
  const status = vi.fn();
  const speech = new SpeechController(
    port,
    (text) => {
      const u = {
        text,
        lang: "",
        rate: 1,
        voice: null,
        onend: null,
        onerror: null,
      } as UtterancePort;
      utterances.push(u);
      return u;
    },
    status,
  );
  return { speech, port, status, utterances };
}
describe("speech lifecycle", () => {
  it("does not speak during construction; replaces the queue on each explicit speak", () => {
    const { speech, port, utterances } = setup();
    expect(port.speak).not.toHaveBeenCalled();
    speech.speak("Yes", { language: "en-US", rate: 0.9, voiceURI: "" });
    speech.speak("No", { language: "en-US", rate: 1, voiceURI: "" });
    expect(port.cancel).toHaveBeenCalledTimes(2);
    expect(port.speak).toHaveBeenCalledTimes(2);
    expect(utterances[1].text).toBe("No");
    expect(utterances[0].rate).toBe(0.9);
  });
  it("stops and ignores stale callbacks", () => {
    const { speech, port, status, utterances } = setup();
    speech.speak("hello", { language: "en-US", rate: 1, voiceURI: "" });
    speech.stop();
    utterances[0].onerror?.({ error: "interrupted" });
    expect(port.cancel).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenLastCalledWith(
      "Stopped. Your message is still here.",
    );
  });
  it("handles missing and delayed voices without blocking the visible message", () => {
    const { speech, port, utterances } = setup();
    speech.speak("Hello", { language: "en-US", rate: 1, voiceURI: "later" });
    expect(utterances[0].voice).toBeNull();
    const voice = {
      voiceURI: "later",
      lang: "en-US",
      name: "Device voice",
    } as SpeechSynthesisVoice;
    vi.mocked(port.getVoices).mockReturnValue([voice]);
    speech.speak("Again", { language: "en-US", rate: 1, voiceURI: "later" });
    expect(utterances[1].voice).toBe(voice);
  });
  it("reports errors and unsupported browsers", () => {
    const { speech, status, utterances } = setup();
    speech.speak("Hello", { language: "en-US", rate: 1, voiceURI: "" });
    utterances[0].onerror?.({ error: "network" });
    expect(status).toHaveBeenLastCalledWith(
      expect.stringContaining("could not"),
    );
    const unsupported = new SpeechController(null, null, status);
    unsupported.speak("Hello", { language: "en-US", rate: 1, voiceURI: "" });
    expect(status).toHaveBeenLastCalledWith(
      expect.stringContaining("unavailable"),
    );
  });
  it("handles thrown platform errors and empty messages", () => {
    const { speech, port, status } = setup();
    speech.speak(" ", { language: "en-US", rate: 1, voiceURI: "" });
    expect(port.speak).not.toHaveBeenCalled();
    vi.mocked(port.speak).mockImplementation(() => {
      throw new Error("device failure");
    });
    speech.speak("Hello", { language: "en-US", rate: 1, voiceURI: "" });
    expect(status).toHaveBeenLastCalledWith(
      expect.stringContaining("could not"),
    );
  });
});
