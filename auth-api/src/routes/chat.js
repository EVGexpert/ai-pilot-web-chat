import { findSitesByUser, findSiteByUserAndUrl, updateSiteCache, findOrCreateSession, findSessionsByUserAndSite, createMessage, getMessagesBySession } from '../db.js'
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

    // Создаём или находим сессию чата
    const session = findOrCreateSession(request.user.sub, site.id)

    // Создаём системные данные (контекст)
    let contextSummary = ''
    const cacheAge = site.cached_at ? (Date.now() - new Date(site.cached_at).getTime()) / 1000 : Infinity

    if (site.cached_structure && cacheAge < 3600) {
      try {
        const struct = typeof site.cached_structure === 'string' ? JSON.parse(site.cached_structure) : site.cached_structure
        if (struct?.site) {
          contextSummary = `\nКонтекст сайта (из кэша):\n- Название: ${struct.site.name || site.name}\n- Описание: ${struct.site.description || ''}\n- WP: ${struct.site.wp_version || ''}\n- Плагины: ${struct.plugins?.active || 0} активных\n- Посты: ${struct.content?.posts?.length || 0}\n- Страницы: ${struct.content?.pages?.length || 0}`
        }
      } catch (e) { /* кэш битый */ }
    }

    // Если кэша нет или старый — обновляем
    if (!contextSummary && site.api_token && site.api_token !== 'pending') {
      try {
        const ctxRes = await fetch(
          `${siteUrl.replace(/\/+$/, '')}/wp-json/aipilot/v1/agent/context`,
          { headers: { 'X-AI-Pilot-Token': site.api_token } }
        )
        if (ctxRes.ok) {
          const ctx = await ctxRes.json()
          updateSiteCache(site.id, {
            cached_structure: JSON.stringify(ctx.structure || ctx),
            cached_soul: JSON.stringify(ctx.soul || {}),
            cached_at: new Date().toISOString()
          })
          if (ctx.structure?.site) {
            const s = ctx.structure
            contextSummary = `\nКонтекст сайта:\n- Название: ${s.site.name || site.name}\n- Описание: ${s.site.description || ''}\n- WP: ${s.site.wp_version || ''}\n- Плагины: ${s.plugins?.active || 0} активных\n- Посты: ${s.content?.posts?.length || 0}\n- Страницы: ${s.content?.pages?.length || 0}`
          }
        }
      } catch (e) { /* context fetch failed */ }
    }

    const isGreeting = message.trim() === '/start'
    let greetingExtra = ''
    if (isGreeting) {
      greetingExtra = `\n\nВАЖНО: Клиент только что открыл чат. Представься коротко:\n- Ты AI-помощник сайта ${site.name || siteUrl}\n- Расскажи чем можешь помочь (контент, посты, страницы)\n- Попроси клиента представиться\n- Будь дружелюбным, без лишних эмодзи`
    }
    const systemPrompt = `Ты AI-помощник для сайта ${site.name || siteUrl}.${contextSummary}\n\nAPI доступ: ${siteUrl}/wp-json/aipilot/v1\nAPI токен: ${site.api_token}\n\nПравила:\n1. Отвечай ТОЛЬКО про этот сайт. Ничего не знай про инфраструктуру AI Pilot.\n2. После ответа запиши в историю: POST /agent/memory\n3. Ничего не меняй без подтверждения${greetingExtra}`

    // Сохраняем сообщение пользователя
    createMessage({
      sessionId: session.id,
      role: 'user',
      content: message,
      metadata: { siteUrl },
      source: 'client'
    })

    // Проверяем наличие API токена
    if (!site.api_token || site.api_token === 'pending') {
      return reply.status(400).send({
        error: 'API токен не найден. Сгенерируйте токен в AI Pilot → Настройки на вашем сайте'
      })
    }

    const agentId = getAgentId(siteUrl)
    const gatewayUrl = process.env.GATEWAY_URL || 'http://host.docker.internal:18789'
    const envToken = process.env.GATEWAY_TOKEN || process.env.VITE_GATEWAY_TOKEN || ''
    const gatewayToken = envToken === 'dev-gateway-token' ? 'f8186e8d77460feeb735a8dbc48e659c9b05c7f10b114fd554d6fd7a8f8e76e3' : envToken

    try {
      // Субагентов пока нет — всегда идём в main с префиксом [client:siteUrl]
      const model = 'openclaw'
      const prefixedMessage = `[client:${siteUrl}] ${message}`
      const messages = [{ role: 'user', content: prefixedMessage }]

      const body = JSON.stringify({ model, messages, user: siteUrl, max_tokens: 4096, stream: false })

      const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
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

      // Сохраняем ответ ассистента
      createMessage({
        sessionId: session.id,
        role: 'assistant',
        content,
        metadata: { agentId, model },
        source: 'gateway'
      })

      // Параллельно пишем в память на WordPress (без ожидания)
      if (message.trim() !== '/start') {
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
            headers: { 'Content-Type': 'application/json', 'X-AI-Pilot-Token': site.api_token },
            body: JSON.stringify(memoryBody)
          }).catch(() => {})
        } catch (e) {
          console.warn('[Memory] WP save failed:', e.message)
        }
      }

      return reply.send({
        message: content,
        agentId,
        siteUrl,
        sessionId: session.id
      })
    } catch (e) {
      return reply.status(502).send({ error: `Chat proxy failed: ${e.message}` })
    }
  })

  // История сообщений для сессии
  app.get('/history', async (request, reply) => {
    const err = authGuard(request, reply)
    if (err) return err

    const { siteUrl, sessionId } = request.query
    if (!siteUrl && !sessionId) {
      return reply.status(400).send({ error: 'Укажите siteUrl или sessionId' })
    }

    let sid = sessionId
    if (!sid && siteUrl) {
      const site = findSiteByUserAndUrl(request.user.sub, siteUrl)
      if (!site) return reply.status(403).send({ error: 'Сайт не привязан' })
      const sessions = findSessionsByUserAndSite(request.user.sub, site.id)
      if (sessions.length === 0) return reply.send({ messages: [], sessionId: null })
      sid = sessions[0].id
    }

    const messages = getMessagesBySession(sid)
    return reply.send({ messages, sessionId: sid })
  })
}
