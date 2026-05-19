import { findSitesByUser, findSiteByUserAndUrl, findSiteById, findUserById, createSite, deleteSite, Store } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

function authGuard(request, reply) {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Missing token' })
  const payload = verifyToken(auth.slice(7))
  if (!payload) return reply.status(401).send({ error: 'Invalid token' })
  request.user = payload
  return null
}

function isAdmin(payload) {
  return payload?.role === 'admin'
}

// Уведомить Gateway о новом сайте (чтобы Zero создал субагента)
async function notifyGateway(url, apiToken, userId) {
  const gatewayUrl = process.env.GATEWAY_URL || 'http://host.docker.internal:18789'
  const envToken = process.env.GATEWAY_TOKEN || process.env.VITE_GATEWAY_TOKEN || ''
  const gatewayToken = envToken === 'dev-gateway-token' ? 'f8186e8d77460feeb735a8dbc48e659c9b05c7f10b114fd554d6fd7a8f8e76e3' : envToken

  try {
    const body = JSON.stringify({
      model: 'openclaw',
      messages: [{
        role: 'user',
        content: `[system:new-site] url=${url}, userId=${userId}`
      }],
      max_tokens: 100
    })

    const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`
      },
      body
    })

    if (resp.ok) {
      console.log('[Gateway] Site notification sent for:', url)
    } else {
      const text = await resp.text()
      console.warn('[Gateway] Notification failed:', resp.status, text.slice(0, 200))
    }
  } catch (err) {
    console.warn('[Gateway] Notification error:', err.message)
  }
}

export default async function sitesRoutes(app) {

  // Подключить сайт
  app.post('/connect', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const { url, apiToken, name } = request.body || {}
    if (!url || !apiToken) return reply.status(400).send({ error: 'URL сайта и API токен обязательны' })

    if (findSiteByUserAndUrl(request.user.sub, url)) {
      return reply.status(409).send({ error: 'Сайт уже привязан к вашему аккаунту' })
    }

    let siteName = name || url
    let wpVersion = null
    try {
      const resp = await fetch(`${url}/wp-json/aipilot/v1/site`, {
        headers: { 'X-AI-Pilot-Token': apiToken }
      })
      if (resp.ok) {
        const data = await resp.json()
        siteName = data.name || siteName
        wpVersion = data.wp_version
      }
    } catch (err) {
      console.error('Site verification failed:', err.message)
    }

    const site = createSite({
      userId: request.user.sub, url, name: siteName, apiToken,
      wpVersion, verified: wpVersion ? 1 : 0
    })

    // Уведомляем Gateway о новом сайте (если есть реальный токен)
    if (apiToken && apiToken !== 'pending') {
      notifyGateway(url, apiToken, request.user.sub).catch(() => {})
    }

    return reply.status(201).send({ id: site.id, url, name: siteName, wpVersion, verified: !!wpVersion })
  })

  // Список сайтов
  app.get('/', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    let siteList
    if (isAdmin(request.user)) {
      // Админ видит ВСЕ сайты — уникальные по URL
      const seen = new Set()
      siteList = (Store.sites || []).filter(s => {
        if (seen.has(s.url)) return false
        seen.add(s.url)
        return true
      }).map(s => ({
        id: s.id, url: s.url, name: s.name, wp_version: s.wp_version, verified: s.verified, created_at: s.created_at
      }))
    } else {
      siteList = findSitesByUser(request.user.sub).map(s => ({
        id: s.id, url: s.url, name: s.name, wp_version: s.wp_version, verified: s.verified, created_at: s.created_at
      }))
    }
    return reply.send({ sites: siteList })
  })

  // Информация о сайте
  app.get('/:id', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err
    const site = findSiteById(request.params.id)
    if (!site || site.user_id !== request.user.sub) return reply.status(404).send({ error: 'Site not found' })
    return reply.send({ site })
  })

  // Сканировать сайт (прокси на WP REST API)
  app.post('/scan', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const { url, apiToken } = request.body || {}
    if (!url) return reply.status(400).send({ error: 'URL сайта обязателен' })

    // Если токен не передан, ищем сохранённый
    let token = apiToken
    if (!token || token === 'pending') {
      const site = findSiteByUserAndUrl(request.user.sub, url)
      if (site && site.api_token && site.api_token !== 'pending') {
        token = site.api_token
      }
    }

    if (!token || token === 'pending') {
      return reply.status(400).send({ error: 'API токен не найден. Сгенерируйте токен в AI Pilot → Настройки' })
    }

    try {
      const scanUrl = `${url.replace(/\/+$/, '')}/wp-json/aipilot/v1/agent/scan`
      const resp = await fetch(scanUrl, {
        method: 'GET',
        headers: { 'X-AI-Pilot-Token': token }
      })

      if (!resp.ok) {
        const text = await resp.text()
        return reply.status(resp.status).send({ error: 'Scan failed', detail: text.slice(0, 500) })
      }

      const data = await resp.json()

      // Обновляем apiToken если было 'pending'
      if (apiToken && apiToken !== 'pending') {
        const site = findSiteByUserAndUrl(request.user.sub, url)
        if (site && (!site.api_token || site.api_token === 'pending')) {
          site.api_token = apiToken
          // Только что получили реальный токен → уведомляем Gateway
          notifyGateway(url, apiToken, request.user.sub).catch(() => {})
        }
      }

      return reply.send({ scanned: true, scanned_at: data.scanned_at, structure: data.structure })
    } catch (e) {
      return reply.status(502).send({ error: `Scan request failed: ${e.message}` })
    }
  })

  // История обращений (GET /agent/memory с сайта)
  app.get('/:id/memory', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const site = findSiteById(request.params.id)
    if (!site) return reply.status(404).send({ error: 'Site not found' })

    // Админ видит все сайты, клиент — только свои
    if (!isAdmin(request.user) && site.user_id !== request.user.sub) {
      return reply.status(403).send({ error: 'Access denied' })
    }

    if (!site.api_token || site.api_token === 'pending') {
      return reply.send({ memory: [], total: 0, scanned_at: null })
    }

    try {
      const url = site.url.replace(/\/+$/, '')
      const resp = await fetch(`${url}/wp-json/aipilot/v1/agent/memory`, {
        headers: { 'X-AI-Pilot-Token': site.api_token }
      })
      if (resp.ok) {
        return reply.send(await resp.json())
      }
      return reply.send({ memory: [], total: 0 })
    } catch (e) {
      return reply.send({ memory: [], total: 0, error: e.message })
    }
  })

  // Удалить сайт
  app.delete('/:id', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err
    const site = findSiteById(request.params.id)
    if (!site || site.user_id !== request.user.sub) return reply.status(404).send({ error: 'Site not found' })
    deleteSite(request.params.id)
    return reply.send({ message: 'Сайт удалён' })
  })
}
