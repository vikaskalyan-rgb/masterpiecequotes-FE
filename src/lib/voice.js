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
    } catch {
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
//
// Before matching, the transcript is normalized to absorb real-world speech-to-text quirks
// discovered from actual failed dimension inputs (e.g. "7 by 2.8" not filling anything):
//   - "by" is frequently mis-transcribed as "buy" (homophone)
//   - decimals are sometimes transcribed as spoken words ("2 point 8") instead of digits ("2.8"),
//     even though whole numbers reliably come through as digits - this is why the bug only
//     showed up on decimal measurements, not clean whole-number ones
//   - "cross" is a common Indian-English way of saying dimensions ("7 cross 3")
//   - confirmed via console logging in real use: the speech engine sometimes renders a spoken
//     "by" as a literal "/" character instead of transcribing it as text at all (e.g. "7 by 2.5"
//     comes back as "7 / 2.5") - this isn't a homophone mis-hearing, it's symbolic notation
export function parseDimensions(text) {
  const normalized = text
    .toLowerCase()
    .replace(/(\d+)\s*point\s*(\d+)/g, '$1.$2')
    .replace(/\bbuy\b/g, 'by')

  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(?:by|x|into|cross|\/|×|\*)\s*(\d+(?:\.\d+)?)/i)
  if (!match) {
    console.error('parseDimensions: no match for transcript ->', text)
    return null
  }
  return { length: match[1], width: match[2] }
}

// Extracts the first number found in a spoken phrase, e.g. "nine fifty rupees" -> won't match
// (browsers usually transcribe spoken numbers as digits already, e.g. "950"), but "950" or
// "950 rupees" both match cleanly.
export function parseNumber(text) {
  const match = text.match(/(\d+(?:\.\d+)?)/)
  return match ? match[1] : null
}