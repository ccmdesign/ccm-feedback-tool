import type { CcmFeedbackConfig, CcmFeedbackInstance } from "@ccm-feedback/core";
import { launch } from "./launcher.js";

export type {
  AnchorData,
  AnnotationPayload,
  AnnotationResponse,
  CcmFeedbackConfig,
  CcmFeedbackInstance,
  CcmFeedbackPublicEvents,
  CcmFeedbackStore,
  FeedbackPayload,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackType,
  RectData,
} from "@ccm-feedback/core";

export type { Identity } from "./identity.js";

/**
 * Initialize the CCM Feedback widget.
 *
 * @example
 * ```ts
 * import { initCcmFeedback } from '@ccm-feedback/widget'
 *
 * const { destroy } = initCcmFeedback({
 *   endpoint: '/api/feedback',
 *   projectName: 'my-project',
 * })
 * ```
 */
export function initCcmFeedback(config: CcmFeedbackConfig): CcmFeedbackInstance {
  return launch(config);
}
