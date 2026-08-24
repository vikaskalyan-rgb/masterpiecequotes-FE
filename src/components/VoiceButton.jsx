import { useState } from 'react'
import { isVoiceSupported, createRecognizer } from '../utils/voice'

export default function VoiceButton({ onResult, label = 'Voice input' }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)

  if (!isVoiceSupported()) return null

  function handleClick() {
    if (listening) return
    setError(null)
    const recognition = createRecognizer()
    if (!recognition) return

    recognition.onstart = () => setListening(true)
    recognition.onerror = (e) => {
      setListening(false)
      setError(e.error === 'no-speech' ? "Didn't catch that" : 'Voice input failed')
      setTimeout(() => setError(null), 2500)
    }
    recognition.onend = () => setListening(false)
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    recognition.start()
  }

  return (
    <span className="voice-btn-wrap">
      <button
        type="button"
        className={`voice-btn ${listening ? 'voice-btn-active' : ''}`}
        onClick={handleClick}
        aria-label={label}
        title={label}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="6" y="1.5" width="4" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M3.3 7.5a4.7 4.7 0 009.4 0M8 12.2v2.3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {error && <span className="voice-btn-error">{error}</span>}

      <style>{`
        .voice-btn-wrap {
          position: relative;
          display: inline-flex;
          flex-shrink: 0;
        }
        .voice-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          border: none;
          background: var(--bg);
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .voice-btn-active {
          background: var(--brick);
          color: var(--paper);
          animation: voice-pulse 0.9s ease-in-out infinite;
        }
        @keyframes voice-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .voice-btn-error {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          font-size: 10.5px;
          font-weight: 500;
          color: var(--brick);
          white-space: nowrap;
          background: var(--paper);
          padding: 4px 8px;
          border-radius: 7px;
          box-shadow: 0 3px 10px rgba(35, 33, 38, 0.16);
          z-index: 30;
        }
      `}</style>
    </span>
  )
}