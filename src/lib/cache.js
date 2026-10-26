// What the screens last saw, so they open instantly and refresh quietly behind.
//
// - Quotes (customer details) live in this tab's memory only, never in storage.
// - The business profile has no customer data and changes rarely: it is also kept in
//   localStorage so even the first screen after opening the app has it.
// - Loads are shared: tapping a quote starts fetching it (prefetchQuote), and the quote
//   screen picks up that same request instead of starting another.
import { api } from '../api/client'
import { onAuthChange } from './auth'

const BUSINESS_KEY = 'mpq-business'

const quotes = new Map() // id -> { quote, at }
let quoteList = null // last list shown on the home screen (no search)
const inFlight = new Map() // id -> Promise<quote>
let business = readStoredBusiness()
let businessRequest = null

function readStoredBusiness() {
  try {
    const raw = window.localStorage.getItem(BUSINESS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// maxAgeMs: only a copy at least this fresh (the editor wants an up-to-date version number).
export function cachedQuote(id, maxAgeMs = Infinity) {
  const hit = quotes.get(String(id))
  return hit && Date.now() - hit.at <= maxAgeMs ? hit.quote : null
}

export function rememberQuote(quote) {
  if (quote?.id != null) quotes.set(String(quote.id), { quote, at: Date.now() })
  return quote
}

export function cachedQuoteList() {
  return quoteList
}

export function rememberQuoteList(list) {
  quoteList = list
  return list
}

export function forgetQuote(id) {
  quotes.delete(String(id))
}

// Fetches a quote, sharing one request between everyone who asks while it is running.
export function loadQuote(id) {
  const key = String(id)
  if (!inFlight.has(key)) {
    const request = api
      .getQuote(key)
      .then(rememberQuote)
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
  }
  return inFlight.get(key)
}

// Started on touch, ~100-300 ms before the tap completes and the next screen mounts.
export function prefetchQuote(id) {
  loadQuote(id).catch(() => {})
}

export function cachedBusiness() {
  return business
}

export function rememberBusiness(b) {
  business = b
  try {
    window.localStorage.setItem(BUSINESS_KEY, JSON.stringify(b))
  } catch {
    // storage full or disabled: the in-memory copy still works
  }
  return b
}

export function loadBusiness() {
  if (!businessRequest) {
    businessRequest = api
      .getBusiness()
      .then(rememberBusiness)
      .finally(() => (businessRequest = null))
  }
  return businessRequest
}

// On sign-out: nothing from this session stays behind.
export function clearCache() {
  quotes.clear()
  inFlight.clear()
  quoteList = null
  business = null
  try {
    window.localStorage.removeItem(BUSINESS_KEY)
  } catch {
    // ignore
  }
}

onAuthChange((signedIn) => {
  if (!signedIn) clearCache()
})
