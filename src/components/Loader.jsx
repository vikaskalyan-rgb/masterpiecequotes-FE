import { useEffect, useState } from 'react'
import css from './Loader.module.css'

// The loading screen: the logo's four rooms fold into place in 3D one after another while the
// house slowly turns, then fold away and start again. Cut from the logo image itself, so it
// always matches the brand. With "reduce motion" switched on it only breathes gently.
const W = 164
const H = 168
const TILES = [
  { key: 'tl', x: 0, y: 0, w: 82, h: 103 }, // wardrobe, under the roof
  { key: 'tr', x: 82, y: 0, w: 82, h: 103 }, // lamps
  { key: 'bl', x: 0, y: 103, w: 82, h: 65 }, // table
  { key: 'br', x: 82, y: 103, w: 82, h: 65 }, // chair
]

export default function Loader({ label = 'Loading', inline = false, size = 84 }) {
  // A word of reassurance only when it is actually slow.
  const [slow, setSlow] = useState(0)
  useEffect(() => {
    const a = setTimeout(() => setSlow(1), 4000)
    const b = setTimeout(() => setSlow(2), 15000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  const k = size / W
  const px = (n) => `${Math.round(n * k * 100) / 100}px`

  return (
    <div className={`${css.wrap} ${inline ? css.inline : ''}`} role="status" aria-live="polite">
      <div className={css.stage} style={{ width: px(W), height: px(H) }} aria-hidden="true">
        <div className={css.house}>
          {TILES.map((t) => (
            <span
              key={t.key}
              className={`${css.tile} ${css[t.key]}`}
              style={{
                left: px(t.x),
                top: px(t.y),
                width: px(t.w),
                height: px(t.h),
                backgroundSize: `${px(W)} ${px(H)}`,
                backgroundPosition: `-${px(t.x)} -${px(t.y)}`,
              }}
            />
          ))}
        </div>
        <span className={css.shadow} />
      </div>
      <p className={`${css.note} ${slow ? css.noteShown : ''}`}>
        {slow === 2 ? 'Still working. After a quiet spell the first load takes a little longer.' : 'Getting things ready…'}
      </p>
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
