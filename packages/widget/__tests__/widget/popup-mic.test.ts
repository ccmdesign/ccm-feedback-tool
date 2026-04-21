// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createT } from "../../src/i18n/index.js";
import { Popup, type PopupContext, type PopupTranscribe } from "../../src/popup.js";
import { buildThemeColors } from "../../src/styles/theme.js";

// jsdom doesn't implement matchMedia — stub with a plain function so
// `vi.restoreAllMocks()` in afterEach doesn't strip it between tests.
function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
installMatchMedia();

// ---------------------------------------------------------------------------
// MediaRecorder + getUserMedia stubs — toggled per test via these globals.
// ---------------------------------------------------------------------------

type StubMediaRecorderState = {
  /** Whether the MediaRecorder ctor should throw. */
  shouldThrow?: boolean;
  /** Whether MediaRecorder.isTypeSupported returns true for at least one preferred mime. */
  supported: boolean;
  /** Track the last-created instance so tests can assert release. */
  lastInstance?: StubMediaRecorder;
};

const recorderState: StubMediaRecorderState = { supported: true };

class StubMediaRecorder {
  static isTypeSupported(_mime: string): boolean {
    return recorderState.supported;
  }
  mimeType: string;
  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((ev: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  private listeners = new Map<string, Array<(ev: Event) => void>>();
  stream: MediaStream;

  constructor(stream: MediaStream, options?: { mimeType?: string }) {
    if (recorderState.shouldThrow) throw new Error("unsupported");
    this.stream = stream;
    this.mimeType = options?.mimeType ?? "audio/webm";
    recorderState.lastInstance = this;
  }
  addEventListener(event: string, cb: (ev: Event) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(cb);
  }
  start(): void {
    this.state = "recording";
  }
  stop(): void {
    this.state = "inactive";
    // Simulate MediaRecorder emitting dataavailable + stop synchronously.
    const data = new Blob(["stub-audio"], { type: this.mimeType });
    for (const cb of this.listeners.get("dataavailable") ?? []) {
      cb(new BlobEvent("dataavailable", { data }));
    }
    for (const cb of this.listeners.get("stop") ?? []) {
      cb(new Event("stop"));
    }
  }
}

// Polyfill BlobEvent for jsdom.
class PolyfillBlobEvent extends Event {
  data: Blob;
  constructor(type: string, init: { data: Blob }) {
    super(type);
    this.data = init.data;
  }
}
(globalThis as unknown as { BlobEvent: typeof Event }).BlobEvent = PolyfillBlobEvent as never;

// Track stops so tests can assert the stream was released.
const trackStops: Array<() => void> = [];
function makeFakeStream(): MediaStream {
  const stopFn = vi.fn();
  trackStops.push(stopFn);
  return {
    getTracks: () => [{ stop: stopFn } as unknown as MediaStreamTrack],
  } as unknown as MediaStream;
}

// getUserMedia mock — replaceable per test.
let getUserMediaMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  installMatchMedia();
  recorderState.supported = true;
  recorderState.shouldThrow = false;
  recorderState.lastInstance = undefined;
  trackStops.length = 0;
  (globalThis as unknown as { MediaRecorder: typeof StubMediaRecorder }).MediaRecorder = StubMediaRecorder;

  getUserMediaMock = vi.fn().mockResolvedValue(makeFakeStream());
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: getUserMediaMock },
  });
  // No Permissions API by default; individual tests override.
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const colors = buildThemeColors();
const t = createT("en");

const CONTEXT: PopupContext = {
  selector: "button.submit",
  surroundingText: "Submit review",
  projectName: "demo",
};

function makeBounds(): DOMRect {
  return { x: 100, y: 100, width: 200, height: 50, top: 100, right: 300, bottom: 150, left: 100, toJSON: () => {} } as DOMRect;
}

function micButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('button[aria-label*="ictate" i], button[aria-label*="top" i]');
}

/** Await microtasks so queryMicrophonePermission + transcription resolve. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Popup — CCM-284 mic button", () => {
  it("does not render a mic button when no transcribe client is supplied", () => {
    const popup = new Popup(colors, t);
    popup.show(makeBounds(), CONTEXT);
    expect(micButton()).toBeNull();
    popup.destroy();
  });

  it("does not render a mic button when MediaRecorder is unsupported", () => {
    (globalThis as unknown as { MediaRecorder: undefined }).MediaRecorder = undefined as never;
    const transcribe: PopupTranscribe = vi.fn();
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    expect(micButton()).toBeNull();
    popup.destroy();
  });

  it("renders a mic button when transcribe is supplied and context is provided", async () => {
    const transcribe: PopupTranscribe = vi.fn();
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton();
    expect(btn).not.toBeNull();
    expect(btn!.style.display).toBe("inline-flex");
    popup.destroy();
  });

  it("hides the mic button when Permissions API reports 'denied'", async () => {
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: "denied" }),
      },
    });
    const transcribe: PopupTranscribe = vi.fn();
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton();
    expect(btn).not.toBeNull();
    expect(btn!.style.display).toBe("none");
    popup.destroy();
  });

  it("clicking mic twice records then sets textarea from cleaned_text", async () => {
    const transcribe: PopupTranscribe = vi.fn().mockResolvedValue({
      cleaned_text: "The button doesn't work.",
      raw_text: "um the button doesn't work",
    });
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton()!;

    // First click — start recording
    btn.click();
    await flush();
    expect(getUserMediaMock).toHaveBeenCalledOnce();
    expect(recorderState.lastInstance?.state).toBe("recording");

    // Second click — stop + transcribe
    btn.click();
    await flush();

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    expect(textarea.value).toBe("The button doesn't work.");
    expect(transcribe).toHaveBeenCalledOnce();
    // Stream tracks released on stop.
    expect(trackStops[0]).toHaveBeenCalled();
    popup.destroy();
  });

  it("appends cleaned text when user typed during recording", async () => {
    const transcribe: PopupTranscribe = vi.fn().mockResolvedValue({
      cleaned_text: "The button is broken.",
      raw_text: "the button is broken",
    });
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton()!;
    btn.click();
    await flush();

    // Simulate the user typing while recording.
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Pre-existing note.";

    btn.click();
    await flush();
    expect(textarea.value).toBe("Pre-existing note. The button is broken.");
    popup.destroy();
  });

  it("removes the mic button when getUserMedia rejects with NotAllowedError", async () => {
    const err = Object.assign(new Error("denied"), { name: "NotAllowedError" });
    getUserMediaMock.mockRejectedValueOnce(err);
    const transcribe: PopupTranscribe = vi.fn();
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton()!;
    btn.click();
    await flush();
    // After denial, the button is hidden and typed comments still work.
    expect(btn.style.display).toBe("none");
    // Textarea remains usable.
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "typed note";
    expect(textarea.value).toBe("typed note");
    popup.destroy();
  });

  it("cancelling the popup releases the MediaStream tracks", async () => {
    const transcribe: PopupTranscribe = vi.fn();
    const popup = new Popup(colors, t, transcribe);
    popup.show(makeBounds(), CONTEXT);
    await flush();
    const btn = micButton()!;
    btn.click();
    await flush();
    // Cancel popup mid-recording.
    const cancelBtn = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
      (b) => b.textContent?.toLowerCase().includes("cancel"),
    )!;
    cancelBtn.click();
    await flush();
    expect(trackStops[0]).toHaveBeenCalled();
    popup.destroy();
  });
});
