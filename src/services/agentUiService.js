const API_BASE = import.meta.env.VITE_API_BASE || ''

function authHeaders() {
  const token = localStorage.getItem('aipilot_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function createCard(cardData) {
  const res = await fetch(`${API_BASE}/api/chat/ui-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(cardData)
  })
  if (!res.ok) throw new Error(`createCard failed: ${res.status}`)
  return res.json()
}

export async function getActiveCards(siteId, sessionId) {
  const params = new URLSearchParams({ siteId, sessionId })
  const res = await fetch(`${API_BASE}/api/chat/ui-active?${params}`, {
    headers: { ...authHeaders() }
  })
  if (!res.ok) throw new Error(`getActiveCards failed: ${res.status}`)
  return res.json()
}

export async function respondCard(id, { optionId }) {
  const res = await fetch(`${API_BASE}/api/chat/ui-respond/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ optionId })
  })
  if (!res.ok) throw new Error(`respondCard failed: ${res.status}`)
  return res.json()
}
