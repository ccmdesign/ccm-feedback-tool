// @vitest-environment jsdom

/**
 * CCM-291 P2 — launcher-pinmode-integration-coverage
 *
 * Closes the gap called out by the todo: `launcher-integration.test.ts` mocks
 * both `Annotator` and `openCommentPopupForElement`, so nothing there exercises
 * the real wiring in `launcher.ts` that constructs `PinMode` with a wrapper
 * closing over the Annotator's popup + projectName + bus.
 *
 * This file mocks ONLY `popup.js` so every other piece in the chain is real:
 *
 *   launch() → real Annotator (real getPopup) → real PinMode
 *      → emit pin:start → click on overlay → real openCommentPopupForElement
 *      → real annotation:complete → real submitAnnotation → sendFeedback
 *
 * If anybody later changes `launcher.ts:openPopupForPinnedElement` to drop
 * `projectName` or swap arguments, `popup.show` receives the wrong context
 * and the assertions below fail.
 */

import type { CcmFeedbackConfig, FeedbackResponse } from "@ccm-feedback/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../helpers.js";

mockMatchMedia(false);

// ---------------------------------------------------------------------------
// Shared captures — popup.show is how we observe the helper contract, the
// bus capture lets us drive `pin:start` directly because `instance.open`
// does not take a mode argument.
// ---------------------------------------------------------------------------

const popupShow = vi.fn<
  [DOMRect, { selector: string; surroundingText: string; projectName: string }?],
  Promise<{ type: "bug" | "change" | "question" | "other"; message: string; audioUrl?: string } | null>
>();

interface BusLike {
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => () => void;
}

let capturedBus: BusLike | null = null;

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockSendFeedback = vi.fn<[], Promise<FeedbackResponse>>();
const mockGetFeedbacks = vi.fn().mockResolvedValue({ feedbacks: [], total: 0 });

vi.mock(new URL("../../src/api-client.js", import.meta.url).pathname, () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    sendFeedback: mockSendFeedback,
    getFeedbacks: mockGetFeedbacks,
    resolveFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  })),
  flushRetryQueue: vi.fn().mockResolvedValue(undefined),
}));

// Mock Popup only — the real Annotator constructs `new Popup(...)`, so we stub
// the class. `show` returns whatever `popupShow` is configured with per-test.
vi.mock(new URL("../../src/popup.js", import.meta.url).pathname, () => ({
  Popup: vi.fn().mockImplementation(() => ({
    show: popupShow,
    destroy: vi.fn(),
  })),
}));

// Mock Fab — the real FAB is what emits `pin:start` when its pin item is
// clicked. For this test we skip the radial-menu interaction and instead
// capture the bus the launcher hands the FAB so we can drive `pin:start`
// directly. This is the same trick `launcher-integration.test.ts` uses to
// drive `annotation:complete`.
vi.mock(new URL("../../src/fab.js", import.meta.url).pathname, () => ({
  Fab: vi.fn().mockImplementation((_shadow: unknown, _config: unknown, bus: BusLike) => {
    capturedBus = bus;
    return { destroy: vi.fn() };
  }),
}));

// Panel is unrelated to pin mode — stub to avoid pulling in the full widget UI.
vi.mock(new URL("../../src/panel.js", import.meta.url).pathname, () => ({
  Panel: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    close: vi.fn(),
    refresh: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock(new URL("../../src/markers.js", import.meta.url).pathname, () => ({
  MarkerManager: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    highlight: vi.fn(),
    pinHighlight: vi.fn(),
    addFeedback: vi.fn(),
    destroy: vi.fn(),
    count: 0,
  })),
}));

vi.mock(new URL("../../src/tooltip.js", import.meta.url).pathname, () => ({
  Tooltip: vi.fn().mockImplementation(() => ({
    tooltipId: "sp-tooltip",
    show: vi.fn(),
    scheduleHide: vi.fn(),
    contains: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock(new URL("../../src/styles/base.js", import.meta.url).pathname, () => ({
  buildStyles: vi.fn().mockReturnValue("/* styles */"),
}));

vi.mock(new URL("../../src/identity.js", import.meta.url).pathname, () => ({
  getIdentity: vi.fn().mockReturnValue({ name: "Test User", email: "test@example.com" }),
  saveIdentity: vi.fn(),
}));

import { launch } from "../../src/launcher.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultConfig(overrides: Partial<CcmFeedbackConfig> = {}): CcmFeedbackConfig {
  return {
    endpoint: "/api/feedback",
    projectName: "pinmode-project",
    forceShow: true,
    ...overrides,
  };
}

function makeFeedbackResponse(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-pinmode-1",
    projectName: "pinmode-project",
    type: "bug",
    message: "Pinned comment",
    status: "open",
    url: "http://localhost/",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [],
    ...overrides,
  };
}

function findPinOverlay(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>('[data-ccm-pin-overlay="true"]');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("launcher — pin mode real integration (CCM-291 P2)", () => {
  afterEach(() => {
    for (const el of document.querySelectorAll("ccm-feedback-widget")) el.remove();
    for (const el of document.querySelectorAll('[role="status"]')) el.remove();
    for (const el of document.body.querySelectorAll('[data-ccm-pin-overlay="true"]')) el.remove();
    for (const el of document.body.querySelectorAll('[aria-label="pin.ariaLabel"]')) el.remove();
    document.body.style.overflow = "";
    popupShow.mockReset();
    mockSendFeedback.mockReset();
    capturedBus = null;
  });

  it("pin:start then click → openCommentPopupForElement → sendFeedback with expected payload", async () => {
    // Put a pin-able target in the document with a known bounds.
    const target = document.createElement("button");
    target.textContent = "Pin me";
    document.body.appendChild(target);
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 120, 80, 40));

    // popup.show resolves as if the reviewer submitted a bug with message "Pinned".
    popupShow.mockResolvedValue({ type: "bug", message: "Pinned" });
    mockSendFeedback.mockResolvedValue(makeFeedbackResponse({ message: "Pinned" }));

    const instance = launch(defaultConfig());
    expect(capturedBus).not.toBeNull();

    // Drive `pin:start` on the internal bus that the launcher handed to the
    // FAB — this is exactly what Fab.handleItemClick("pin") does in
    // production. Real PinMode (subscribed to the same bus in its
    // constructor) will mount the overlay in response.
    capturedBus!.emit("pin:start");

    const overlay = findPinOverlay();
    expect(overlay).not.toBeNull();

    // elementFromPoint must resolve to our target when pin-mode's click
    // handler re-queries it.
    const origFromPoint = document.elementFromPoint;
    document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;

    // Click on the overlay — PinMode.onOverlayClick → handleSelect →
    // openPopupForElement (the launcher wrapper) → openCommentPopupForElement
    // → popup.show → bus.emit("annotation:complete") → submitAnnotation →
    // client.sendFeedback.
    overlay!.dispatchEvent(new MouseEvent("click", { clientX: 110, clientY: 130, bubbles: true }));

    // popup.show should have been called with the anchor context including
    // projectName = "pinmode-project" (the wrapper-contract this test protects).
    await vi.waitFor(() => {
      expect(popupShow).toHaveBeenCalledOnce();
    });
    const showArgs = popupShow.mock.calls[0];
    const showContext = showArgs[1]!;
    expect(showContext.projectName).toBe("pinmode-project");
    expect(typeof showContext.selector).toBe("string");
    expect(showContext.selector.length).toBeGreaterThan(0);

    // sendFeedback gets the full-bounds rect + no annotation.type (pin parity
    // with area mode).
    await vi.waitFor(() => {
      expect(mockSendFeedback).toHaveBeenCalledOnce();
    });
    const payload = mockSendFeedback.mock.calls[0][0];
    expect(payload).toMatchObject({
      projectName: "pinmode-project",
      type: "bug",
      message: "Pinned",
    });
    expect(payload.annotations).toHaveLength(1);
    expect(payload.annotations[0].rect).toEqual({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
    expect(payload.annotations[0].type).toBeUndefined();

    document.elementFromPoint = origFromPoint;
    instance.destroy();
    target.remove();
  });
});
