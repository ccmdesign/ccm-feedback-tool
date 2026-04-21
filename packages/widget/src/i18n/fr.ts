import type { Translations } from "./types.js";

export const fr: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Panneau de feedback",
  "panel.feedbackList": "Liste des feedbacks",
  "panel.loading": "Chargement des feedbacks",
  "panel.close": "Fermer le panneau",
  "panel.deleteAll": "Tout supprimer",
  "panel.deleteAllConfirmTitle": "Tout supprimer",
  "panel.deleteAllConfirmMessage": "Supprimer tous les feedbacks de ce projet ? Cette action est irr\u00e9versible.",
  "panel.search": "Rechercher...",
  "panel.searchAria": "Rechercher dans les feedbacks",
  "panel.filterAll": "Tous",
  "panel.loadError": "Erreur de chargement",
  "panel.retry": "R\u00e9essayer",
  "panel.empty": "Aucun feedback pour le moment",
  "panel.showMore": "Voir plus",
  "panel.showLess": "Voir moins",
  "panel.resolve": "R\u00e9soudre",
  "panel.reopen": "Rouvrir",
  "panel.delete": "Supprimer",
  "panel.cancel": "Annuler",
  "panel.confirmDelete": "Supprimer",
  "panel.loadMore": "Voir plus ({remaining} restants)",
  "panel.apiLink": "Lien API",
  "panel.apiLinkCopied": "Copi\u00e9",

  // Status filter labels
  "panel.statusAll": "Tous",
  "panel.statusOpen": "Ouvert",
  "panel.statusResolved": "Résolu",

  // Feedback type labels
  "type.comment": "Commentaire",
  "type.question": "Question",
  "type.change": "Changement",
  "type.bug": "Bug",
  "type.other": "Autre",

  // FAB menu
  "fab.aria": "Menu feedback",
  "fab.messages": "Messages",
  "fab.annotate": "Annoter",
  "fab.annotations": "Annotations",
  // CCM-282
  "fab.editText": "\u00c9diter le texte",
  "fab.swapImage": "Changer l\u2019image",
  // CCM-291
  "fab.pin": "\u00c9pingler",

  // Annotator
  "annotator.instruction": "Tracez un rectangle sur la zone \u00e0 commenter",
  "annotator.cancel": "Annuler",

  // CCM-291 — Mode \u00e9pingle
  "pin.instruction": "Commenter un \u00e9l\u00e9ment",
  "pin.cancel": "Annuler",
  "pin.ariaLabel": "Mode \u00e9pingle",

  // CCM-282 — Mode \u00e9dition de texte
  "textEdit.instruction":
    "Cliquez sur un bloc de texte pour le modifier. Entr\u00e9e pour valider, \u00c9chap pour annuler.",
  "textEdit.cancel": "Annuler",
  "textEdit.ariaLabel": "Mode \u00e9dition de texte",

  // CCM-282 — Mode changement d\u2019image
  "imageSwap.instruction": "Cliquez sur une image pour proposer un remplacement.",
  "imageSwap.cancel": "Annuler",
  "imageSwap.ariaLabel": "Mode changement d\u2019image",
  "imageSwap.urlLabel": "URL de l\u2019image",
  "imageSwap.urlPlaceholder": "https://exemple.com/image.jpg",
  "imageSwap.fileLabel": "Ou importez un fichier",
  "imageSwap.altLabel": "Texte alternatif (optionnel)",
  "imageSwap.altPlaceholder": "D\u00e9crivez l\u2019image\u2026",
  "imageSwap.original": "Original",
  "imageSwap.proposed": "Propos\u00e9",
  "imageSwap.submit": "Valider le changement",
  "imageSwap.errorSize": "Le fichier d\u00e9passe la limite de 10\u202fMo.",
  "imageSwap.errorMime":
    "Format non pris en charge pour l\u2019import (jpg, png, webp, avif, gif). Collez une URL SVG \u00e0 la place.",
  "imageSwap.errorUrl": "URL invalide.",
  "imageSwap.errorMirror": "Impossible de r\u00e9cup\u00e9rer l\u2019image. R\u00e9essayez.",
  "imageSwap.errorUpload": "L\u2019envoi a \u00e9chou\u00e9. R\u00e9essayez.",

  // Popup
  "popup.ariaLabel": "Formulaire de feedback",
  "popup.placeholder": "D\u00e9crivez votre retour...",
  "popup.textareaAria": "Message de feedback",
  "popup.submitHintMac": "\u2318+Entr\u00e9e pour envoyer",
  "popup.submitHintOther": "Ctrl+Entr\u00e9e pour envoyer",
  "popup.cancel": "Annuler",
  "popup.submit": "Envoyer",
  "popup.typeLabel": "Type de retour",

  // Popup mic (CCM-284)
  "popup.mic.record": "Dicter un commentaire",
  "popup.mic.stop": "Arr\u00eater l'enregistrement",
  "popup.mic.recording": "Enregistrement\u2026",
  "popup.mic.transcribing": "Transcription\u2026",
  "popup.mic.error": "Impossible de transcrire l'audio",

  // Identity modal
  "identity.title": "Identifiez-vous",
  "identity.nameLabel": "Nom",
  "identity.namePlaceholder": "Votre nom",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "votre@email.com",
  "identity.cancel": "Annuler",
  "identity.submit": "Continuer",

  // Markers
  "marker.approximate": "Position approximative (confiance : {confidence}%)",
  "marker.aria": "Feedback n°{number} : {type} — {message}",

  // FAB badge
  "fab.badge": "{count} feedbacks non résolus",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback envoyé avec succès",
  "feedback.error.message": "Échec de l'envoi du feedback",
  "feedback.deleted.confirmation": "Feedback supprimé",

  // Badge
  "badge.count": "{count} feedbacks non résolus",

  // CCM-290 — Fil de discussion
  "detail.replies": "R\u00e9ponses",
  "detail.replyPlaceholder": "\u00c9crire une r\u00e9ponse\u2026",
  "detail.send": "Envoyer",
  "detail.source.user": "user",
  "detail.source.agent": "agent",
};
