import { useEffect, useRef, useState } from 'react'
import { clearActiveRecognition, createRecognizer, isVoiceSupported } from '../lib/voice'
import Icon from './Icon'
import css from './VoiceButton.module.css'

// Speech input for Android/Chrome. On browsers without speech recognition (iOS Safari, which
// also disables it in installed apps) the button doesn't render at all.
export default function VoiceButton({ onResult, label }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const errorTimer = useRef(null)

  useEffect(() => () => clearTimeout(errorTimer.current), [])

  if (!isVoiceSupported()) return null

  function fail(message) {
    setListening(false)
    setError(message)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 2500)
  }

  function start() {
    if (listening) return
    setError(null)
    const recognition = createRecognizer()
    if (!recognition) return
    recognition.onstart = () => setListening(true)
    recognition.onerror = (e) => {
      clearActiveRecognition(recognition)
      fail(e.error === 'no-speech' ? "Didn't catch that" : e.error === 'not-allowed' ? 'Microphone blocked' : 'Voice input failed')
    }
    recognition.onend = () => {
      setListening(false)
      clearActiveRecognition(recognition)
    }
    recognition.onresult = (e) => onResult(e.results[0][0].transcript)
    try {
      recognition.start()
    } catch {
      clearActiveRecognition(recognition)
      fail('Voice input failed')
    }
  }

  return (
    <span className={css.wrap}>
      <button
        type="button"
        className={`${css.button} ${listening ? css.listening : ''}`}
        onClick={start}
        aria-label={label}
        aria-pressed={listening}
        title={label}
      >
        <Icon name="mic" size={18} />
      </button>
      {error && (
        <span className={css.error} role="status">
          {error}
        </span>
      )}
    </span>
  )
}
