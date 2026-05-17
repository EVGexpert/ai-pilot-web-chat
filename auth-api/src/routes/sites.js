import { nanoid } from 'nanoid'
import db from '../db.js'
import { verifyToken } from '../middleware/auth.js'

function authGuard(request, reply) {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing token' })
  }
  const payload = verifyToken(auth.slice(7))
  if (!payload) return reply.status(401).send({ error: 'Invalid token' })
  request.user = payload
  return null
}

export default async function sitesRoutes(app) {
  // Подключить сайт (через API — из плагина или вручную)
  app.post('/connect', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const { url, apiToken, name } = request.body || {}

    if (!url || !apiToken) {
      return reply.status(400).send({ error: 'URL сайта и API токен обязательны' })
    }

    // Проверяем что сайт ещё не привязан
    const existing = db.prepare(
      'SELECT id FROM sites WHERE user_id = ? AND url = ?'
    ).get(request.user.sub, url)

    if (existing) {
      return reply.status(409).send({ error: 'Сайт уже привязан к вашему аккаунту' })
    }

    // Проверяем плагин через ping
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
      // Не фатально — сохраняем как непроверенный
    }

    const id = nanoid()
    db.prepare(
      'INSERT INTO sites (id, user_id, url, name, api_token, wp_version, verified) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, request.user.sub, url, siteName, apiToken, wpVersion, wpVersion ? 1 : 0)

    return reply.status(201).send({
      id,
      url,
      name: siteName,
      wpVersion,
      verified: !!wpVersion
    })
  })

  // Подключить сайт через callback (из плагина — без JWT)
  app.post('/connect/callback', async (request, reply) => {
    const { siteUrl, apiToken, tempToken } = request.body || {}

    // tempToken — временный токен, который плагин получает при редиректе
    // В MVP используем gateway token для проверки
    if (tempToken !== process.env.GATEWAY_TOKEN) {
      return reply.status(403).send({ error: 'Invalid temp token' })
    }

    // Создаём временного пользователя, если ещё нет
    // (в полноценной версии — редирект на страницу логина)
    return reply.send({
      redirect: `${process.env.APP_URL || 'https://pilotsite.ru'}/auth/connect?site=${encodeURIComponent(siteUrl)}&token=${apiToken}`
    })
  })

  // Список сайтов пользователя
  app.get('/', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const sites = db.prepare(
      'SELECT id, url, name, wp_version, verified, created_at FROM sites WHERE user_id = ? ORDER BY created_at DESC'
    ).all(request.user.sub)

    return reply.send({ sites })
  })

  // Информация о сайте
  app.get('/:id', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const site = db.prepare(
      'SELECT id, url, name, wp_version, verified, created_at FROM sites WHERE id = ? AND user_id = ?'
    ).get(request.params.id, request.user.sub)

    if (!site) return reply.status(404).send({ error: 'Site not found' })

    return reply.send({ site })
  })

  // Удалить сайт
  app.delete('/:id', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const result = db.prepare(
      'DELETE FROM sites WHERE id = ? AND user_id = ?'
    ).run(request.params.id, request.user.sub)

    if (result.changes === 0) {
      return reply.status(404).send({ error: 'Site not found' })
    }

    return reply.send({ message: 'Сайт удалён' })
  })
}
