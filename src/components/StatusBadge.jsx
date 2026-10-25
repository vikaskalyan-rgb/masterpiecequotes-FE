import { STATUS } from '../lib/status'
import css from './StatusBadge.module.css'

export default function StatusBadge({ status }) {
  const meta = STATUS[status] || STATUS.DRAFT
  return (
    <span className={`${css.badge} ${css[status?.toLowerCase()] || ''}`}>
      <span className={css.dot} aria-hidden="true" />
      {meta.label}
    </span>
  )
}
