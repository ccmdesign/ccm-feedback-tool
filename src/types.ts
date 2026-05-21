/** MVP data model — everything the widget stores or emits. */

/**
 * Comment lifecycle status.
 *
 * `review` = handled by an agent, pending human verification. The agent sets
 * `review` (never `done`); a human verifies the edit in the widget and flips
 * `review` → `done`. `done` is a human-only transition.
 */
export type FeedbackStatus = "todo" | "review" | "done" | "question";

export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = ["todo", "review", "done", "question"] as const;

/** Snapshot of a DOM element captured for agent context. */
export interface CapturedElement {
  tag: string;
  attributes: Record<string, string>;
  rect: { x: number; y: number; w: number; h: number };
}

/** What kind of anchor an annotation uses. */
export type AnnotationKind = "target" | "pin" | "area";

export interface AnchorData {
  cssSelector: string;
  xpath: string;
  textSnippet: string;
  elementTag: string;
  /** Empty string when the source element had no id. */
  elementId: string | undefined;
  textPrefix: string;
  textSuffix: string;
  fingerprint: string;
  neighborText: string;
}

export interface RectData {
  /** All four relative to the anchor element's bounding box (0..1). */
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

/** Persisted annotation record — what lives in `localStorage['ccm-feedback:<project>']`. */
export interface AnnotationRecord extends AnchorData, RectData {
  id: string;
  projectName: string;
  message: string;
  /** Reviewer name. Defaults to "Anonymous" when unknown. */
  authorName: string;
  url: string;
  /** Normalized `window.location.pathname`. Used to scope markers to a page. */
  path: string;
  viewport: string;
  userAgent: string;
  createdAt: string;
  /** Defaults to "todo" for legacy records. */
  status?: FeedbackStatus;
  /** "target" for element anchor, "pin" for coord, "area" for rectangle. Defaults to "target". */
  kind?: AnnotationKind;
  /** Viewport-relative pin coordinates (kind === "pin"). */
  pinX?: number;
  pinY?: number;
  /** Viewport-relative area rect (kind === "area"). */
  areaX?: number;
  areaY?: number;
  areaW?: number;
  areaH?: number;
  /** Captured DOM elements at point/inside area for agent context. */
  capturedElements?: CapturedElement[];
  /** Set on reply records — points at the parent comment's id. Undefined for top-level comments. */
  parentId?: string;
}

/** Public widget config — MVP surface area is deliberately small. */
export interface CcmFeedbackConfig {
  /** Project name — used as localStorage namespace key. */
  projectName: string;
  /** Hex accent color (#RGB, #RRGGBB, or #RRGGBBAA). Default: blue. */
  accentColor?: string;
  /** Light / dark / auto. Default: light. */
  theme?: "light" | "dark" | "auto";
  /** Debug logs to console. */
  debug?: boolean;
  /**
   * Supabase project URL. When set together with `supabaseKey`, the widget
   * persists annotations to the cloud (table `ccm_widget_annotations`) and
   * shares them across reviewers. Falls back to localStorage when omitted.
   */
  supabaseUrl?: string;
  /** Supabase anon / publishable key (browser-safe). */
  supabaseKey?: string;
}

export interface CcmFeedbackInstance {
  destroy: () => void;
  /** Current annotation count. */
  count: () => number;
  /** Export annotations as downloaded JSON file. */
  export: () => void;
}
