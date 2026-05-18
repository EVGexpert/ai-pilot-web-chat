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

    return reply.status(201).send({ id: site.id, url, name: siteName, wpVersion, verified: !!wpVersion })
  })

  // Список сайтов
  app.get('/', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    let siteList
    if (isAdmin(request.user)) {
      // Админ видит ВСЕ сайты
      siteList = (Store.sites || []).map(s => ({
        id: s.id, url: s.url, name: s.name, wp_version: s.wp_version, verified: s.verified, created_at: s.created_at,
        userId: s.user_id
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
