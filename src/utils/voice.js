// Web Speech API's SpeechRecognition - well supported on Chrome/Android, NOT supported on iOS
// Safari (and specifically disabled there once a site is installed as a standalone PWA). Every
// caller must feature-detect via isVoiceSupported() before showing any mic button - on
// unsupported browsers the button should simply not render, never show a broken control.
export function isVoiceSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function createRecognizer() {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionImpl) return null
  const recognition = new SpeechRecognitionImpl()
  recognition.lang = 'en-IN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  return recognition
}

// Parses spoken dimension phrases like "24 by 54", "7 x 3", "7 into 3.5" into { length, width }.
// Returns null if it can't find two numbers - the caller should show a gentle retry hint rather
// than silently filling in something wrong.
export function parseDimensions(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:by|x|into|×|\*)\s*(\d+(?:\.\d+)?)/i)
  if (!match) return null
  return { length: match[1], width: match[2] }
}

// Extracts the first number found in a spoken phrase, e.g. "nine fifty rupees" -> won't match
// (browsers usually transcribe spoken numbers as digits already, e.g. "950"), but "950" or
// "950 rupees" both match cleanly.
export function parseNumber(text) {
  const match = text.match(/(\d+(?:\.\d+)?)/)
  return match ? match[1] : null
}