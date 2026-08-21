import { useNavigate } from 'react-router-dom'

export default function ComingSoon({ label }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{label}</p>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>This screen isn't built yet — coming next.</p>
      <button
        onClick={() => navigate('/')}
        style={{ border: '1px solid var(--ink)', background: 'transparent', padding: '10px 20px', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
      >
        Back to Quotes
      </button>
    </div>
  )
}
