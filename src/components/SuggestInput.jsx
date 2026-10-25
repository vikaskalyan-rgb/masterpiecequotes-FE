import { useEffect, useId, useRef, useState } from 'react'
import css from './SuggestInput.module.css'

// Text input with a suggestion list (ARIA combobox): arrow keys move, Enter picks, Escape closes.
// fetchSuggestions(query, signal) returns items; renderItem/itemKey describe them; onPick fills in.
export default function SuggestInput({
  value,
  onChange,
  fetchSuggestions,
  renderItem,
  itemKey,
  onPick,
  minChars = 2,
  className = 'input',
  ...inputProps
}) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const listId = useId()
  const typed = useRef(false)

  useEffect(() => {
    const q = (value || '').trim()
    if (!typed.current || q.length < minChars) {
      setItems([])
      return undefined
    }
    const controller = new AbortController()
    const t = setTimeout(() => {
      fetchSuggestions(q, controller.signal)
        .then((result) => {
          setItems(result || [])
          setActive(-1)
        })
        .catch(() => setItems([]))
    }, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [value, minChars, fetchSuggestions])

  const visible = open && items.length > 0

  function pick(item) {
    typed.current = false
    setItems([])
    setOpen(false)
    onPick(item)
  }

  function onKeyDown(e) {
    if (!visible) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={css.wrap}>
      <input
        {...inputProps}
        className={className}
        value={value}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        onChange={(e) => {
          typed.current = true
          setOpen(true)
          onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {visible && (
        <ul className={css.list} id={listId} role="listbox">
          {items.map((item, i) => (
            <li
              key={itemKey(item)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`${css.option} ${i === active ? css.active : ''}`}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(item)
              }}
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
