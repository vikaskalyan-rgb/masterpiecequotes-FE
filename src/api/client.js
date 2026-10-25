import { currentAuthHeader, signOut } from '../lib/auth'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, { status = 0, fields = null, body = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.body = body
  }

  get isConflict() {
    return this.status === 409
  }

  get isOffline() {
    return this.status === 0
  }
}

async function request(path, { method = 'GET', body, auth = true, headers = {}, signal } = {}) {
  const init = { method, headers: { ...headers }, signal }
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  if (auth) {
    const header = currentAuthHeader()
    if (header) init.headers.Authorization = header
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, init)
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError("Can't reach the server. Check your internet connection and try again.")
  }

  if (res.status === 401 && auth) {
    signOut()
    throw new ApiError('Please sign in again.', { status: 401 })
  }

  if (!res.ok) {
    let data = null
    try {
      data = await res.json()
    } catch {
      // not JSON
    }
    const message =
      data?.message ||
      (res.status === 429 ? 'Too many attempts. Wait a few minutes and try again.' : `Request failed (${res.status})`)
    throw new ApiError(message, { status: res.status, fields: data?.fields || null, body: data })
  }

  if (res.status === 204 || res.status === 202) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const qs = (params) => {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, v)
  })
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  checkPassword: (authHeader) =>
    request('/api/auth/check', { auth: false, headers: { Authorization: authHeader } }),

  listQuotes: ({ status, search } = {}) => request(`/api/quotes${qs({ status, search })}`),
  listDeletedQuotes: () => request('/api/quotes?deleted=true'),
  getQuote: (id) => request(`/api/quotes/${id}`),
  createQuote: (payload) => request('/api/quotes', { method: 'POST', body: payload }),
  updateQuote: (id, payload) => request(`/api/quotes/${id}`, { method: 'PUT', body: payload }),
  updateStatus: (id, status) => request(`/api/quotes/${id}/status`, { method: 'PATCH', body: { status } }),
  shareQuote: (id) => request(`/api/quotes/${id}/share`, { method: 'POST' }),
  listSnapshots: (id) => request(`/api/quotes/${id}/snapshots`),
  getSnapshot: (id, snapshotId) => request(`/api/quotes/${id}/snapshots/${snapshotId}`),
  deleteQuote: (id) => request(`/api/quotes/${id}`, { method: 'DELETE' }),
  restoreQuote: (id) => request(`/api/quotes/${id}/restore`, { method: 'POST' }),

  suggestItems: (q, signal) => request(`/api/items/suggestions${qs({ q })}`, { signal }),
  suggestCustomers: (q, signal) => request(`/api/customers/suggestions${qs({ q })}`, { signal }),

  getDefaults: () => request('/api/settings/defaults'),
  updateDefaults: (payload) => request('/api/settings/defaults', { method: 'PUT', body: payload }),
  getBusiness: () => request('/api/settings/business'),
  updateBusiness: (payload) => request('/api/settings/business', { method: 'PUT', body: payload }),

  getAnalytics: () => request('/api/analytics'),
  exportBackup: () => request('/api/backup'),
  restoreBackup: (backup, includeSettings) =>
    request(`/api/backup/restore${qs({ includeSettings })}`, { method: 'POST', body: backup }),

  reportClientError: (report) => request('/api/client-errors', { method: 'POST', body: report }),
}
