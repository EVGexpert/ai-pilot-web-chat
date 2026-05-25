// Прямой WebSocket клиент к OpenClaw Gateway
// Использует Gateway Protocol (challenge -> connect -> chat.send)
// WebSocket — только для поддержания соединения
// Отправка сообщений — через OpenAI HTTP API (полные scopes)

const PROTOCOL_MIN = 3
const PROTOCOL_MAX = 4

export function createGatewayClient(options) {
  const { gateway, httpBase, token, onMessage, onStreamChunk, onError, onConnected, onDisconnected } = options

  let ws = null
  let messageId = 0
  let sessionKey = null
  let isConnected = false

  // HTTP base — тот же хост, что и WebSocket, но для REST
  const httpUrl = httpBase || gateway.replace('wss://', 'https://').replace('ws://', 'http://')

  function logFrame(label, frame) {
    console.log('[WS]', label, 'type:', frame.type, 'event:', frame.event || '-', 'method:', frame.method || '-', 'ok:', frame.ok)
  }

  function nextId() {
    return String(++messageId)
  }

  function sendFrame(frame) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame))
    }
  }

  function connect() {
    // HTTP доступен всегда при наличии токена — не ждём WebSocket
    onConnected?.()

    if (ws) disconnect()

    ws = new WebSocket(gateway)

    ws.onopen = () => {
      console.log('[WS] Connection opened, waiting for challenge...')
    }

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data)
        handleFrame(frame)
      } catch (e) {
        console.error('[WS] Failed to parse frame:', e)
      }
    }

    ws.onerror = () => {
      console.warn('[WS] Error (non-fatal, HTTP still works)')
    }

    ws.onclose = (event) => {
      isConnected = false
      if (event.code !== 1000) {
        console.warn('[WS] Closed:', event.code, event.reason)
      }
    }
  }

  function handleFrame(frame) {
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      logFrame('CHALLENGE', frame)
      sendConnect(frame.payload?.nonce)
      return
    }

    if (frame.type === 'res' && frame.ok && frame.payload?.type === 'hello-ok') {
      isConnected = true
      sessionKey = frame.payload.snapshot?.sessionDefaults?.mainSessionKey || null
      logFrame('CONNECTED', frame)
      console.log('[WS] Session key:', sessionKey)
      onConnected?.()
      return
    }

    // Нефатальные ошибки (например, scope check после connect)
    if (frame.type === 'res' && !frame.ok) {
      const errMsg = frame.error?.message || 'Ошибка'
      logFrame('WARN', frame)
      console.warn('[WS] Non-fatal:', errMsg)
      return
    }

    if (frame.type === 'event') {
      logFrame('EVENT', frame)
      handleEvent(frame)
    }
  }

  function handleEvent(frame) {
    switch (frame.event) {
      case 'message':
        onMessage?.(frame.payload?.message)
        break
      case 'stream.start':
        onStreamChunk?.('', 'start')
        break
      case 'stream.chunk':
        onStreamChunk?.(frame.payload?.chunk, 'chunk')
        if (frame.payload?.done) onStreamChunk?.('', 'done')
        break
      case 'chat':
      case 'agent':
      case 'tick':
      case 'heartbeat':
      case 'health':
        break
    }
  }

  function sendConnect(nonce) {
    sendFrame({
      type: 'req', id: nextId(), method: 'connect',
      params: {
        minProtocol: PROTOCOL_MIN, maxProtocol: PROTOCOL_MAX,
        client: { id: 'cli', version: '0.1.0', platform: 'browser', mode: 'cli' },
        role: 'operator', scopes: ['operator.read'],
        caps: [], commands: [], permissions: {},
        auth: { token }, locale: 'ru-RU', userAgent: 'ai-pilot-webchat/0.1.0'
      }
    })
  }

  // === Отправка через HTTP OpenAI API (даёт полные scopes) ===
  async function sendMessage(content) {
    console.log('[HTTP] Sending message via OpenAI API...')

    const resp = await fetch(`${httpUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{ role: 'user', content }],
        stream: true,
        max_tokens: 4096
      })
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${resp.status}: ${errText}`)
    }

    // Читаем стрим
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    onStreamChunk?.('', 'start')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]')

      for (const line of lines) {
        try {
          const json = JSON.parse(line.slice(6))
          const delta = json.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            onStreamChunk?.(delta, 'chunk')
          }
        } catch (e) {
          // parse error, skip
        }
      }
    }

    // Детектируем намерение действия в ответе модели
    function detectActionIntent(content, userMsg) {
      const actionKeywords = [/созда(ть|м|й|ю|ём|ла|н)/i,/опублик(овать|уй|ую)/i,/обнов(ить|и|им)/i,/добав(ить|им|лю)/i,/удали(ть|м|ю)/i,/измен(ить|им|яю)/i,/редактир(овать|уй)/i,/напиш(и|ем|у)/i,/загру(зить|жу|зим)/i,/настро(ить|й|им)/i]
      const agreePhrases = [/предлагаю/i,/могу/i,/давай/i,/сделаю/i,/можно/i,/готов/i,/создам/i,/опубликую/i,/обновлю/i,/добавлю/i]
      const userWantsAction = actionKeywords.some(r => r.test(userMsg))
      const modelAgrees = agreePhrases.some(r => r.test(content))
      if (!userWantsAction || !modelAgrees) return null
      let title = 'Выполнить'
      if (/созда(ть|м|й)/i.test(userMsg)) title = 'Создать'
      if (/опублик(овать|уй)/i.test(userMsg)) title = 'Опубликовать'
      if (/обнов(ить|и)/i.test(userMsg)) title = 'Обновить'
      if (/добав(ить|лю)/i.test(userMsg)) title = 'Добавить'
      if (/удали(ть|м)/i.test(userMsg)) title = 'Удалить'
      const objMatch = userMsg.match(/(?:пост|страниц[уа]|раздел|рубрик[уа]|категори[юя]|меню|плагин|тем[уа]|настройк[иуа]|пользовател[ья]|комментари[йя])/i)
      if (objMatch) title += ' ' + objMatch[0].toLowerCase()
      const topicMatch = userMsg.match(/[«"]([^»"]+)[»"]|про\s+(.+?)(?:\s|$|,|\.)/i)
      if (topicMatch) { const t = topicMatch[1]||topicMatch[2]; title += ': ' + (t.length>40 ? t.slice(0,40)+'...' : t) }
      const diff = []
      for (const line of content.split('\n').filter(l => l.trim())) {
        const clean = line.replace(/^[-\s*•·]+/, '').trim()
        if (clean.length > 3 && clean.length < 120) {
          diff.push((/^[-–—]/.test(line.trim()) ? '- ' : '+ ') + clean)
        }
        if (diff.length >= 6) break
      }
      if (diff.length === 0) return null
      return [{ id: 'ap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6), title: title.slice(0,60), description: content.slice(0,200).replace(/\n/g,' '), diff, status: 'pending' }]
    }

    const actions = detectActionIntent(fullContent, content)
    const msg = { role: 'assistant', content: fullContent }
    if (actions) {
      msg.actions = actions
    }

    onStreamChunk?.('', 'done')
    onMessage?.(msg)
    return fullContent
  }

  function disconnect() {
    isConnected = false
    sessionKey = null
    ws?.close()
    ws = null
  }

  return {
    connect,
    sendMessage,
    disconnect,
    get isConnected() { return true },
    get sessionKey() { return sessionKey }
  }
}
