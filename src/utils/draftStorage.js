// Local-only draft autosave for the quote builder. This is separate from the backend's
// QuoteStatus (DRAFT/SENT/ACCEPTED/REJECTED) enum - that field was deliberately removed from
// the UI (see project notes) and stays untouched here. "Draft" in this file means something
// different: an in-progress, not-yet-saved snapshot of the builder form itself, kept in
// localStorage so it survives an accidental app close, a dropped connection, or a phone lock
// mid-quote. It never touches the server and is cleared the moment a real save succeeds.
//
// Keys are scoped per builder session so editing quote #12 and starting a brand new quote at
// the same time (e.g. across two tabs) don't clobber each other:
//   quote-draft:new                - an unsaved brand-new quote
//   quote-draft:duplicate:<fromId> - an unsaved "Duplicate Quote" in progress
//   quote-draft:edit:<id>          - unsaved local changes to an existing saved quote

const PREFIX = 'quote-draft:'

export function draftKeyFor({ isEdit, id, duplicateFromId }) {
  if (isEdit && id) return `${PREFIX}edit:${id}`
  if (duplicateFromId) return `${PREFIX}duplicate:${duplicateFromId}`
  return `${PREFIX}new`
}

// Splits a draft key back into its parts - used by the home screen to know how to render and
// where tapping a draft card should navigate.
export function parseDraftKey(key) {
  const rest = key.slice(PREFIX.length)
  if (rest === 'new') return { type: 'new' }
  if (rest.startsWith('edit:')) return { type: 'edit', id: rest.slice('edit:'.length) }
  if (rest.startsWith('duplicate:')) return { type: 'duplicate', fromId: rest.slice('duplicate:'.length) }
  return { type: 'unknown' }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch {
    // localStorage can throw (quota exceeded, private browsing, disabled) - autosave is a
    // convenience, not critical, so fail silently rather than interrupt the person typing.
  }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// Scans all draft keys currently in localStorage - used by the home screen to show a Draft
// card (for new/duplicate) or a Draft badge on an existing card (for edit).
export function listDrafts() {
  const results = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(PREFIX)) continue
      const data = loadDraft(key)
      if (!data) continue
      results.push({ key, ...parseDraftKey(key), data })
    }
  } catch {
    // localStorage unavailable - just show no drafts rather than erroring the home screen
  }
  return results
}