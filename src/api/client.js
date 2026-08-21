const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    let body = null
    try {
      body = await res.json()
    } catch {
      // response wasn't JSON, ignore
    }
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status, body)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // ---- Quotes ----
  listQuotes: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    const query = qs.toString()
    return request(`/api/quotes${query ? `?${query}` : ''}`)
  },
  getQuote: (id) => request(`/api/quotes/${id}`),
  createQuote: (payload) => request('/api/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  updateQuote: (id, payload) => request(`/api/quotes/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateQuoteStatus: (id, status) =>
    request(`/api/quotes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteQuote: (id) => request(`/api/quotes/${id}`, { method: 'DELETE' }),

  // ---- Item description autocomplete ----
  suggestItems: (q) => request(`/api/items/suggestions?q=${encodeURIComponent(q)}`),

  // ---- Default templates (Material Spec + Terms) ----
  getDefaults: () => request('/api/settings/defaults'),
  updateDefaults: (payload) => request('/api/settings/defaults', { method: 'PUT', body: JSON.stringify(payload) }),
}

export { ApiError }
