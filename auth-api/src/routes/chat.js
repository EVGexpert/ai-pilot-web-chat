import { findSitesByUser, findSiteByUserAndUrl } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

function authGuard(request, reply) {
  const auth = request.headers.authorization
  if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Missing token' })
  const payload = verifyToken(auth.slice(7))
  if (!payload) return reply.status(401).send({ error: 'Invalid token' })
  request.user = payload
  return null
}

function getAgentId(url) {
  // Из URL генерируем agentId
  const hostname = url.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  return `site-${hostname}`
}

export default async function chatRoutes(app) {

  // Отправить сообщение от клиента к агенту сайта
  app.post('/send', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const { message, siteUrl } = request.body || {}
    if (!message || !siteUrl) {
      return reply.status(400).send({ error: 'message и siteUrl обязательны' })
    }

    // Проверяем, что сайт принадлежит пользователю
    const site = findSiteByUserAndUrl(request.user.sub, siteUrl)
    if (!site) {
      return reply.status(403).send({ error: 'Сайт не привязан к вашему аккаунту' })
    }

    // Проверяем наличие API токена
    if (!site.api_token || site.api_token === 'pending') {
      return reply.status(400).send({
        error: 'API токен не найден. Сгенерируйте токен в AI Pilot → Настройки на вашем сайте'
      })
    }

    // Определяем agentId по URL сайта
    const agentId = getAgentId(siteUrl)

    // Gateway URL
    const gatewayUrl = process.env.GATEWAY_URL || 'http://host.docker.internal:18789'
    const gatewayToken = process.env.GATEWAY_TOKEN || process.env.VITE_GATEWAY_TOKEN || ''

    try {
      const body = JSON.stringify({
        model: `openclaw/${agentId}`,
        messages: [{ role: 'user', content: message }],
        user: siteUrl,
        max_tokens: 4096,
        stream: false
      })

      const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${gatewayToken}`
        },
        body
      })

      if (!resp.ok) {
        const text = await resp.text()
        return reply.status(resp.status).send({
          error: 'Gateway request failed',
          detail: text.slice(0, 500)
        })
      }

      const data = await resp.json()
      const content = data.choices?.[0]?.message?.content || ''

      return reply.send({
        message: content,
        agentId,
        siteUrl
      })
    } catch (e) {
      return reply.status(502).send({ error: `Chat proxy failed: ${e.message}` })
    }
  })
}
