// Unsaved builder work, kept on this device so a closed app, a dropped connection or a locked
// phone never loses a quote in progress. Cleared the moment a save succeeds.
//
// Keys are per builder session, so a new quote and an edit in another tab never clobber:
//   quote-draft:new | quote-draft:duplicate:<fromId> | quote-draft:edit:<id> | quote-draft:import:<importId>
// An import starts as { importPatch, importInfo } (what was read from the file) and becomes an
// ordinary draft ({ form, ... }) the first time the builder opens it.
// Each draft records the server version it started from (baseVersion): if the quote has been
// saved elsewhere since, restoring it is a conflict the user resolves, never a silent overwrite.

const PREFIX = 'quote-draft:'

export function draftKeyFor({ id, duplicateFromId, importId }) {
  if (id) return `${PREFIX}edit:${id}`
  if (duplicateFromId) return `${PREFIX}duplicate:${duplicateFromId}`
  if (importId) return `${PREFIX}import:${importId}`
  return `${PREFIX}new`
}

export function parseDraftKey(key) {
  const rest = key.slice(PREFIX.length)
  if (rest === 'new') return { type: 'new' }
  if (rest.startsWith('edit:')) return { type: 'edit', id: rest.slice(5) }
  if (rest.startsWith('duplicate:')) return { type: 'duplicate', fromId: rest.slice(10) }
  if (rest.startsWith('import:')) return { type: 'import', importId: rest.slice(7) }
  return { type: 'unknown' }
}

function storage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function saveDraft(key, data) {
  try {
    storage()?.setItem(key, JSON.stringify({ ...data, savedAt: Date.now() }))
  } catch {
    // Quota exceeded or storage disabled: drafts are a safety net, never block typing.
  }
}

export function loadDraft(key) {
  try {
    const raw = storage()?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDraft(key) {
  try {
    storage()?.removeItem(key)
  } catch {
    // ignore
  }
}

export function listDrafts() {
  const s = storage()
  if (!s) return []
  const out = []
  try {
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i)
      if (!key || !key.startsWith(PREFIX)) continue
      const data = loadDraft(key)
      if (data) out.push({ key, ...parseDraftKey(key), data })
    }
  } catch {
    return []
  }
  return out.sort((a, b) => (b.data.savedAt || 0) - (a.data.savedAt || 0))
}

// 'none' (no draft), 'clean' (draft is based on the current server version) or
// 'conflict' (the quote was saved elsewhere after this draft started).
export function draftStatus(draft, serverVersion) {
  if (!draft) return 'none'
  if (serverVersion == null || draft.baseVersion == null) return 'clean'
  return draft.baseVersion === serverVersion ? 'clean' : 'conflict'
}

// Name shown for an unsaved quote on the home screen (drafts store the whole builder form).
export function draftCustomerName(draft) {
  const data = draft?.data
  return (data?.form?.customerName ?? data?.importPatch?.customerName ?? '').trim()
}
