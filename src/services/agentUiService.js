const API_BASE = import.meta.env.VITE_API_BASE || ''

function authHeaders() {
  const token = localStorage.getItem('aipilot_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readJsonResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.error || data?.message || `${fallbackMessage}: ${res.status}`
    const error = new Error(message)
    error.status = res.status
    error.payload = data
    throw error
  }
  return data || {}
}

export async function createCard(cardData) {
  const res = await fetch(`${API_BASE}/api/chat/ui-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(cardData)
  })
  return readJsonResponse(res, 'createCard failed')
}

export async function getActiveCards(siteUrl, sessionId) {
  const params = new URLSearchParams({ site_url: siteUrl, session_id: sessionId })
  const res = await fetch(`${API_BASE}/api/chat/ui-active?${params}`, {
    headers: { ...authHeaders() }
  })
  return readJsonResponse(res, 'getActiveCards failed')
}

export async function respondCard(id, selectedOptionIds = []) {
  const ids = Array.isArray(selectedOptionIds)
    ? selectedOptionIds.filter(Boolean)
    : [selectedOptionIds].filter(Boolean)

  const body = ids.length > 1
    ? { option_ids: ids }
    : { option_id: ids[0] || null }

  const res = await fetch(`${API_BASE}/api/chat/ui-respond/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  })
  return readJsonResponse(res, 'respondCard failed')
}
