// The app has one owner and one password. It is kept on this device (it's the owner's own phone)
// and sent with every request as HTTP Basic over HTTPS.
const KEY = 'mpq-auth'
const USERNAME = 'owner'
const listeners = new Set()
let memoryHeader = null

export function encodeCredentials(password) {
  const bytes = new TextEncoder().encode(`${USERNAME}:${password}`)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return `Basic ${btoa(binary)}`
}

export function getAuthHeader() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setAuthHeader(header) {
  try {
    localStorage.setItem(KEY, header)
  } catch {
    // Storage unavailable (private mode): the session works until the tab closes.
  }
  memoryHeader = header
  listeners.forEach((l) => l(true))
}

export function currentAuthHeader() {
  return getAuthHeader() || memoryHeader
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  memoryHeader = null
  listeners.forEach((l) => l(false))
}

export function onAuthChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
