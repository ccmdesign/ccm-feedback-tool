/** MVP data model — everything the widget stores or emits. */

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
  url: string;
  /** Normalized `window.location.pathname`. Used to scope markers to a page. */
  path: string;
  viewport: string;
  userAgent: string;
  createdAt: string;
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
}

export interface CcmFeedbackInstance {
  destroy: () => void;
  /** Current annotation count. */
  count: () => number;
  /** Export annotations as downloaded JSON file. */
  export: () => void;
}
