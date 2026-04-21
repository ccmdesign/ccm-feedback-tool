import type { Translations } from "./types.js";

export const en: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Feedback panel",
  "panel.feedbackList": "Feedback list",
  "panel.loading": "Loading feedbacks",
  "panel.close": "Close panel",
  "panel.deleteAll": "Delete all",
  "panel.deleteAllConfirmTitle": "Delete all",
  "panel.deleteAllConfirmMessage": "Delete all feedbacks for this project? This action cannot be undone.",
  "panel.search": "Search...",
  "panel.searchAria": "Search feedbacks",
  "panel.filterAll": "All",
  "panel.loadError": "Failed to load",
  "panel.retry": "Retry",
  "panel.empty": "No feedback yet",
  "panel.showMore": "Show more",
  "panel.showLess": "Show less",
  "panel.resolve": "Resolve",
  "panel.reopen": "Reopen",
  "panel.delete": "Delete",
  "panel.cancel": "Cancel",
  "panel.confirmDelete": "Delete",
  "panel.loadMore": "Load more ({remaining} remaining)",
  "panel.apiLink": "API link",
  "panel.apiLinkCopied": "Copied",

  // Status filter labels
  "panel.statusAll": "All",
  "panel.statusOpen": "Open",
  "panel.statusResolved": "Resolved",

  // Feedback type labels
  "type.comment": "Comment",
  "type.question": "Question",
  "type.change": "Change",
  "type.bug": "Bug",
  "type.other": "Other",

  // FAB menu
  "fab.aria": "Feedback menu",
  "fab.messages": "Messages",
  "fab.annotate": "Annotate",
  "fab.annotations": "Annotations",
  // CCM-282
  "fab.editText": "Edit text",
  "fab.swapImage": "Swap image",
  // CCM-291
  "fab.pin": "Pin",

  // Annotator
  "annotator.instruction": "Draw a rectangle on the area to comment",
  "annotator.cancel": "Cancel",

  // CCM-291 — Pin mode
  "pin.instruction": "Comment on element",
  "pin.cancel": "Cancel",
  "pin.ariaLabel": "Pin mode",

  // CCM-282 — Text edit mode
  "textEdit.instruction": "Click any text block to edit it. Press Enter to save, Escape to cancel.",
  "textEdit.cancel": "Cancel",
  "textEdit.ariaLabel": "Edit text mode",

  // CCM-282 — Image swap mode
  "imageSwap.instruction": "Click an image to propose a replacement.",
  "imageSwap.cancel": "Cancel",
  "imageSwap.ariaLabel": "Swap image mode",
  "imageSwap.urlLabel": "Image URL",
  "imageSwap.urlPlaceholder": "https://example.com/image.jpg",
  "imageSwap.fileLabel": "Or upload a file",
  "imageSwap.altLabel": "Alt text (optional)",
  "imageSwap.altPlaceholder": "Describe the image…",
  "imageSwap.original": "Original",
  "imageSwap.proposed": "Proposed",
  "imageSwap.submit": "Submit swap",
  "imageSwap.errorSize": "File exceeds 10 MB limit.",
  "imageSwap.errorMime": "Format not supported for upload (jpg, png, webp, avif, gif). Paste an SVG URL instead.",
  "imageSwap.errorUrl": "Invalid URL.",
  "imageSwap.errorMirror": "Could not fetch image. Please try again.",
  "imageSwap.errorUpload": "Upload failed. Please try again.",

  // Popup
  "popup.ariaLabel": "Feedback form",
  "popup.placeholder": "Describe your feedback...",
  "popup.textareaAria": "Feedback message",
  "popup.submitHintMac": "\u2318+Enter to send",
  "popup.submitHintOther": "Ctrl+Enter to send",
  "popup.cancel": "Cancel",
  "popup.submit": "Send",
  "popup.typeLabel": "Feedback type",

  // Popup mic (CCM-284)
  "popup.mic.record": "Dictate comment",
  "popup.mic.stop": "Stop recording",
  "popup.mic.recording": "Recording…",
  "popup.mic.transcribing": "Transcribing…",
  "popup.mic.error": "Could not transcribe audio",

  // Identity modal
  "identity.title": "Identify yourself",
  "identity.nameLabel": "Name",
  "identity.namePlaceholder": "Your name",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "your@email.com",
  "identity.cancel": "Cancel",
  "identity.submit": "Continue",

  // Markers
  "marker.approximate": "Approximate position (confidence: {confidence}%)",
  "marker.aria": "Feedback #{number}: {type} — {message}",

  // FAB badge
  "fab.badge": "{count} unresolved feedbacks",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback sent successfully",
  "feedback.error.message": "Failed to send feedback",
  "feedback.deleted.confirmation": "Feedback deleted",

  // Badge
  "badge.count": "{count} unresolved feedbacks",

  // CCM-290 — reply thread
  "detail.replies": "Replies",
  "detail.replyPlaceholder": "Write a reply…",
  "detail.send": "Send",
  "detail.source.user": "user",
  "detail.source.agent": "agent",
};
