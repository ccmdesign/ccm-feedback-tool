/**
 * Row + record shapes for the ccm-feedback MCP server.
 *
 * `CloudRow` and `rowToRecord` (in postgrest.ts) are a hand-maintained mirror of
 * `netlify/functions/feedback.mts` (which in turn mirrors `src/cloud-store.ts`).
 * The widget source is browser/IIFE and not cleanly importable into a Node MCP
 * server, so the snake_case → camelCase mapping is duplicated here and kept in
 * sync by hand. Keep this file aligned with that function when columns change.
 */

/** A raw PostgREST row from `ccm_widget_annotations`. */
export interface CloudRow {
  id: string;
  project_name: string;
  message: string;
  author_name: string;
  url: string;
  path: string;
  viewport: string;
  user_agent: string;
  css_selector: string;
  xpath: string;
  text_snippet: string;
  element_tag: string;
  element_id: string | null;
  text_prefix: string;
  text_suffix: string;
  fingerprint: string;
  neighbor_text: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  created_at: string;
  status?: string | null;
  kind?: string | null;
  pin_x?: number | null;
  pin_y?: number | null;
  area_x?: number | null;
  area_y?: number | null;
  area_w?: number | null;
  area_h?: number | null;
  captured_elements?: unknown[] | null;
  parent_id?: string | null;
  sequence_number?: number | null;
}

/** The camelCase record shape the widget's exportAsJson() emits. */
export type AnnotationRecord = Record<string, unknown>;

/**
 * The subset of parent fields a reply inherits to satisfy the DB NOT NULL
 * constraints on `project_name` / `url` (and to keep `path` / `viewport` /
 * `user_agent` meaningful). Selected via PostgREST `?select=`.
 */
export interface ParentInheritedFields {
  project_name: string;
  url: string;
  path: string;
  viewport: string;
  user_agent: string;
}

/**
 * Comment lifecycle status. Mirrors `FeedbackStatus` in `src/types.ts`.
 *
 * Agents set `review` (handled, pending human verification) via `close`; they
 * never set `done` — `done` is a human-only transition in the widget.
 */
export const FEEDBACK_STATUSES = ["todo", "review", "done", "question"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
