/** All translatable string keys used by the widget. */
export interface Translations {
  // Panel
  "panel.title": string;
  "panel.ariaLabel": string;
  "panel.feedbackList": string;
  "panel.loading": string;
  "panel.close": string;
  "panel.deleteAll": string;
  "panel.deleteAllConfirmTitle": string;
  "panel.deleteAllConfirmMessage": string;
  "panel.search": string;
  "panel.searchAria": string;
  "panel.filterAll": string;
  "panel.loadError": string;
  "panel.retry": string;
  "panel.empty": string;
  "panel.showMore": string;
  "panel.showLess": string;
  "panel.resolve": string;
  "panel.reopen": string;
  "panel.delete": string;
  "panel.cancel": string;
  "panel.confirmDelete": string;
  "panel.loadMore": string;
  /** CCM-290 — "API link" pill shown when agentApiUrl is configured. */
  "panel.apiLink": string;
  /** CCM-290 — transient toast shown after the API link is copied. */
  "panel.apiLinkCopied": string;

  // Status filter labels
  "panel.statusAll": string;
  "panel.statusOpen": string;
  "panel.statusResolved": string;

  // Feedback type labels (UI display only)
  /** CCM-290 — new "comment" type (composer default). */
  "type.comment": string;
  "type.question": string;
  "type.change": string;
  "type.bug": string;
  "type.other": string;

  // FAB menu
  "fab.aria": string;
  "fab.messages": string;
  "fab.annotate": string;
  "fab.annotations": string;
  // CCM-282 — new intent modes.
  "fab.editText": string;
  "fab.swapImage": string;
  // CCM-291 — pin mode.
  "fab.pin": string;

  // Annotator
  "annotator.instruction": string;
  "annotator.cancel": string;

  // CCM-291 — Pin mode
  "pin.instruction": string;
  "pin.cancel": string;
  "pin.ariaLabel": string;

  // CCM-282 — Text edit mode
  "textEdit.instruction": string;
  "textEdit.cancel": string;
  "textEdit.ariaLabel": string;

  // CCM-282 — Image swap mode
  "imageSwap.instruction": string;
  "imageSwap.cancel": string;
  "imageSwap.ariaLabel": string;
  "imageSwap.urlLabel": string;
  "imageSwap.urlPlaceholder": string;
  "imageSwap.fileLabel": string;
  "imageSwap.altLabel": string;
  "imageSwap.altPlaceholder": string;
  "imageSwap.original": string;
  "imageSwap.proposed": string;
  "imageSwap.submit": string;
  "imageSwap.errorSize": string;
  "imageSwap.errorMime": string;
  "imageSwap.errorUrl": string;
  "imageSwap.errorMirror": string;
  "imageSwap.errorUpload": string;

  // Popup (annotation form)
  "popup.placeholder": string;
  "popup.textareaAria": string;
  "popup.submitHintMac": string;
  "popup.submitHintOther": string;
  "popup.ariaLabel": string;
  "popup.cancel": string;
  "popup.submit": string;
  /** CCM-290 — aria-label on the new <select> that replaces the button grid. */
  "popup.typeLabel": string;

  // Popup mic (CCM-284 voice comments)
  "popup.mic.record": string;
  "popup.mic.stop": string;
  "popup.mic.recording": string;
  "popup.mic.transcribing": string;
  "popup.mic.error": string;

  // Identity modal
  "identity.title": string;
  "identity.nameLabel": string;
  "identity.namePlaceholder": string;
  "identity.emailLabel": string;
  "identity.emailPlaceholder": string;
  "identity.cancel": string;
  "identity.submit": string;

  // Markers
  "marker.approximate": string;
  "marker.aria": string;

  // FAB badge
  "fab.badge": string;

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": string;
  "feedback.error.message": string;
  "feedback.deleted.confirmation": string;

  // Badge
  "badge.count": string;

  // CCM-290 — detail-view reply thread
  "detail.replies": string;
  "detail.replyPlaceholder": string;
  "detail.send": string;
  "detail.source.user": string;
  "detail.source.agent": string;
}

/** A translate function that returns the string for a given key. */
export type TFunction = (key: keyof Translations) => string;
