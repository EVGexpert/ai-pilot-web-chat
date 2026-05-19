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
    const envToken = process.env.GATEWAY_TOKEN || process.env.VITE_GATEWAY_TOKEN || ''
    // Если токен из env — заглушка, используем настоящий
    const gatewayToken = envToken === 'dev-gateway-token' ? 'f8186e8d77460feeb735a8dbc48e659c9b05c7f10b114fd554d6fd7a8f8e76e3' : envToken

    try {
      // Пробуем отправить к Gateway агенту сайта (если зарегистрирован)
      const systemPrompt = `Ты AI-помощник для сайта ${site.name || siteUrl}.
Твой API доступ: ${siteUrl}/wp-json/aipilot/v1
API токен: ${site.api_token}

При каждом обращении:
1. Загрузи контекст сайта через GET /agent/context (если не загружал в этой сессии)
2. После ответа клиенту запиши в историю через POST /agent/memory
3. Отвечай ТОЛЬКО про этот сайт. Ничего не знай про инфраструктуру AI Pilot.`

      let model = `openclaw/${agentId}`
      let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]

      const body = JSON.stringify({ model, messages, user: siteUrl, max_tokens: 4096, stream: false })

      let resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
        body
      })

      // Если агента нет — фолбек к main с пометкой для Zero
      if (!resp.ok) {
        const txt = await resp.text()
        if (resp.status === 404 || txt.includes('not found') || txt.includes('unknown model')) {
          console.log(`[Chat] Agent ${agentId} not found, fallback to main with [client:${siteUrl}]`)
          model = 'openclaw'
          messages = [{ role: 'user', content: `[client:${siteUrl}] ${message}` }]
          const fbBody = JSON.stringify({ model, messages, user: siteUrl, max_tokens: 4096, stream: false })
          resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
            body: fbBody
          })
        }
      }

      if (!resp.ok) {
        const text = await resp.text()
        return reply.status(resp.status).send({
          error: 'Gateway request failed',
          detail: text.slice(0, 500)
        })
      }

      const data = await resp.json()
      const content = data.choices?.[0]?.message?.content || ''

      // Записываем в историю (POST /agent/memory)
      try {
        const memoryUrl = `${siteUrl.replace(/\/+$/, '')}/wp-json/aipilot/v1/agent/memory`
        const memoryBody = {
          action: 'client_message',
          summary: message.slice(0, 200),
          details: { response: content.slice(0, 500), agentId },
          agent: 'client'
        }
        fetch(memoryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AI-Pilot-Token': site.api_token
          },
          body: JSON.stringify(memoryBody)
        }).catch(() => {})
      } catch (e) {
        console.warn('[Memory] Failed to save:', e.message)
      }

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
