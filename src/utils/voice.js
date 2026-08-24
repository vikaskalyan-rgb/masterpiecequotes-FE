// Web Speech API's SpeechRecognition - well supported on Chrome/Android, NOT supported on iOS
// Safari (and specifically disabled there once a site is installed as a standalone PWA). Every
// caller must feature-detect via isVoiceSupported() before showing any mic button - on
// unsupported browsers the button should simply not render, never show a broken control.
export function isVoiceSupported() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Android (and most browsers) only allow ONE SpeechRecognition session to be active at a time,
// system-wide. Screens like the room builder have many VoiceButtons mounted simultaneously
// (name, description, dimensions, rate, etc.) - if a user taps a second mic before the first
// one's session has fully torn down (there's real latency between audio stopping and `onend`
// firing), starting the new one throws immediately. This singleton guard makes sure any prior
// session is force-stopped before a new one starts, so overlapping taps can never collide.
let activeRecognition = null

export function stopActiveRecognition() {
  if (activeRecognition) {
    try {
      activeRecognition.abort()
    } catch (_) {
      // already stopped/stopping - safe to ignore
    }
    activeRecognition = null
  }
}

export function createRecognizer() {
  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionImpl) return null

  // Always clear out any previous session before handing back a new one.
  stopActiveRecognition()

  const recognition = new SpeechRecognitionImpl()
  recognition.lang = 'en-IN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  activeRecognition = recognition
  return recognition
}

// Called by VoiceButton once a session ends (successfully or via error) so the singleton
// doesn't keep pointing at a dead recognition object.
export function clearActiveRecognition(recognition) {
  if (activeRecognition === recognition) {
    activeRecognition = null
  }
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