import { findSitesByUser, findSiteByUserAndUrl, updateSiteCache, findOrCreateSession, findSessionsByUserAndSite, createMessage, updateMessageStatus, getMessagesBySession, createJob, createAuditEvent, registerJobHandler } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

// Регистрируем обработчики для фоновых задач
registerJobHandler('refresh_context', async (job) => {
  const { siteUrl, apiToken } = JSON.parse(job.payload_json)
  if (!apiToken || apiToken === 'pending') return
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  const ctxRes = await fetch(
    siteUrl.replace(/\/+$/, '') + '/wp-json/aipilot/v1/agent/context',
    { headers: { 'X-AI-Pilot-Token': apiToken }, signal: controller.signal }
  )
  clearTimeout(timeout)
  if (ctxRes.ok) {
    const ctx = await ctxRes.json()
    const site = findSiteByUserAndUrl(job.user_id, siteUrl)
    if (site) {
      updateSiteCache(site.id, {
        cached_structure: JSON.stringify(ctx.structure || ctx),
        cached_soul: JSON.stringify(ctx.soul || {}),
        cached_at: new Date().toISOString()
      })
    }
  }
})

registerJobHandler('sync_wp_memory', async (job) => {
  const { siteUrl, apiToken, message, response, agentId } = JSON.parse(job.payload_json)
  if (!apiToken || apiToken === 'pending') return
  const memoryUrl = siteUrl.replace(/\/+$/, '') + '/wp-json/aipilot/v1/agent/memory'
  const resp = await fetch(memoryUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AI-Pilot-Token': apiToken },
    body: JSON.stringify({
      action: 'client_message', summary: message.slice(0, 200),
      details: { response: (response || '').slice(0, 500), agentId }, agent: 'client'
    })
  })
  if (!resp.ok) throw new Error('WP memory sync: ' + resp.status)
})

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

function buildSystemPrompt(site, siteUrl, message, contextSummary) {
  const isGreeting = message.trim() === '/start'
  let greetingExtra = ''
  if (isGreeting) {
    greetingExtra = `\n\nВАЖНО: Клиент только что открыл чат. Представься коротко:\n- Ты AI-помощник сайта ${site.name || siteUrl}\n- Расскажи чем можешь помочь (контент, посты, страницы)\n- Попроси клиента представиться\n- Будь дружелюбным, без лишних эмодзи`
  }
  return `Ты AI-помощник для сайта ${site.name || siteUrl}.${contextSummary}\n\nAPI доступ: ${siteUrl}/wp-json/aipilot/v1\nAPI токен: ${site.api_token}\n\nПравила:\n1. Отвечай ТОЛЬКО про этот сайт. Ничего не знай про инфраструктуру AI Pilot.\n2. После ответа запиши в историю: POST /agent/memory\n3. Ничего не меняй без подтверждения${greetingExtra}`
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

    // Проверяем API токен ДО любых запросов к WP
    if (!site.api_token || site.api_token === 'pending') {
      return reply.status(400).send({
        error: 'API токен не найден. Сгенерируйте токен в AI Pilot → Настройки на вашем сайте'
      })
    }

    // Создаём или находим сессию чата
    const session = findOrCreateSession(request.user.sub, site.id)

    // Контекст сайта — из кэша (без ожидания WP)
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

    // Фоновое обновление кэша — через очередь
    if (!contextSummary) {
      createJob({
        type: 'refresh_context',
        siteId: site.id,
        userId: request.user.sub,
        payload: { siteUrl, apiToken: site.api_token },
        maxAttempts: 1
      })
    }

    // Собираем промпт
    const systemPrompt = buildSystemPrompt(site, siteUrl, message, contextSummary)

    // Сохраняем сообщение пользователя со статусом 'pending'
    const userMsg = createMessage({
      sessionId: session.id,
      role: 'user',
      content: message,
      metadata: { siteUrl },
      source: 'client',
      status: 'received'
    })

    const agentId = getAgentId(siteUrl)
    const gatewayUrl = process.env.GATEWAY_URL || 'http://host.docker.internal:18789'
    const envToken = process.env.GATEWAY_TOKEN || process.env.VITE_GATEWAY_TOKEN || ''
    const gatewayToken = envToken === 'dev-gateway-token' ? 'f8186e8d77460feeb735a8dbc48e659c9b05c7f10b114fd554d6fd7a8f8e76e3' : envToken

    try {
      // Субагентов пока нет — всегда идём в main
      const model = 'openclaw'
      const prefixedMessage = `[client:${siteUrl}] ${message}`
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prefixedMessage }
      ]

      const body = JSON.stringify({ model, messages, user: siteUrl, max_tokens: 4096, stream: false })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000)
      const resp = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gatewayToken}` },
        signal: controller.signal,
        body
      })
      clearTimeout(timeout)

      if (!resp.ok) {
        const text = await resp.text()
        updateMessageStatus(userMsg.id, 'failed')
        return reply.status(resp.status).send({
          error: 'Gateway request failed',
          detail: text.slice(0, 500)
        })
      }

      const data = await resp.json()
      const content = data.choices?.[0]?.message?.content || ''

      // Обновляем статус сообщения пользователя
      updateMessageStatus(userMsg.id, 'sent')

      // Сохраняем ответ ассистента
      const assistantMsg = createMessage({
        sessionId: session.id,
        role: 'assistant',
        content,
        metadata: { agentId, model },
        source: 'gateway',
        status: 'sent'
      })

      // Пишем в память WordPress через очередь
      if (message.trim() !== '/start') {
        createJob({
          type: 'sync_wp_memory',
          siteId: site.id,
          userId: request.user.sub,
          sessionId: session.id,
          payload: {
            siteUrl, apiToken: site.api_token,
            message, response: content, agentId
          },
          maxAttempts: 3
        })
      }

      return reply.send({
        message: content,
        agentId,
        siteUrl,
        sessionId: session.id,
        messageId: userMsg.id
      })
    } catch (e) {
      if (userMsg) updateMessageStatus(userMsg.id, 'failed')
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
