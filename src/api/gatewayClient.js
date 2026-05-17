// Прямой WebSocket клиент к OpenClaw Gateway
// Использует Gateway Protocol (challenge → connect → chat.send)

const PROTOCOL_MIN = 3
const PROTOCOL_MAX = 4

export function createGatewayClient(options) {
  const { gateway, token, onMessage, onStreamChunk, onError, onConnected, onDisconnected } = options

  let ws = null
  let messageId = 0
  let sessionKey = null
  let isAuthenticating = false
  let isConnected = false

  function nextId() {
    return String(++messageId)
  }

  function sendFrame(frame) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame))
    }
  }

  function connect() {
    if (ws) disconnect()

    ws = new WebSocket(gateway)
    isAuthenticating = true

    ws.onopen = () => {
      // Ждём challenge
    }

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data)
        handleFrame(frame)
      } catch (e) {
        console.error('Failed to parse frame:', e)
      }
    }

    ws.onerror = (err) => {
      onError?.(new Error('WebSocket error'))
    }

    ws.onclose = () => {
      isConnected = false
      onDisconnected?.()
    }
  }

  function handleFrame(frame) {
    // Challenge от Gateway (первый приходит до connect)
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      sendConnect(frame.payload?.nonce)
      return
    }

    // Ответ на connect
    if (frame.type === 'res' && frame.ok && frame.payload?.type === 'hello-ok') {
      isAuthenticating = false
      isConnected = true
      sessionKey = frame.payload.snapshot?.sessionDefaults?.mainSessionKey || null
      onConnected?.()
      return
    }

    // Ответ на запросы
    if (frame.type === 'res') {
      if (frame.payload?.type === 'events' || frame.event === 'agent') {
        // Игнорируем служебные события
        return
      }
      return
    }

    // События
    if (frame.type === 'event') {
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
        if (frame.payload?.done) {
          onStreamChunk?.('', 'done')
        }
        break
      case 'chat':
        break
      case 'agent':
        break
      case 'tick':
      case 'heartbeat':
      case 'health':
        break
      default:
        console.debug('Unknown event:', frame.event)
    }
  }

  function sendConnect(nonce) {
    sendFrame({
      type: 'req',
      id: nextId(),
      method: 'connect',
      params: {
        minProtocol: PROTOCOL_MIN,
        maxProtocol: PROTOCOL_MAX,
        client: {
          id: 'webchat',
          version: '0.1.0',
          platform: 'browser',
          mode: 'operator'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token },
        locale: 'ru-RU',
        userAgent: 'ai-pilot-webchat/0.1.0',
        device: {
          id: `web_${Date.now()}`,
          nonce
        }
      }
    })
  }

  async function sendMessage(content) {
    if (!isConnected || !sessionKey) {
      throw new Error('Not connected')
    }

    return new Promise((resolve, reject) => {
      const msgId = nextId()
      let fullContent = ''
      let timeout = setTimeout(() => reject(new Error('Response timeout')), 30000)

      const cleanup = () => {
        clearTimeout(timeout)
        if (ws) {
          // Не удаляем обработчики, они глобальные
        }
      }

      // Временный обработчик для этого сообщения
      const origOnMessage = onMessage
      const origOnStreamChunk = onStreamChunk

      const tempHandler = (event) => {
        try {
          const frame = JSON.parse(event.data)

          // Ответ на наше сообщение
          if (frame.type === 'res' && frame.id === msgId) {
            cleanup()
            resolve(frame.payload)
            return
          }

          // Стриминг
          if (frame.type === 'event') {
            if (frame.event === 'stream.chunk' && frame.payload?.chunk) {
              fullContent += frame.payload.chunk
              onStreamChunk?.(frame.payload.chunk, 'chunk')
              if (frame.payload?.done) {
                onMessage?.({ role: 'assistant', content: fullContent })
                onStreamChunk?.('', 'done')
              }
            }
            if (frame.event === 'message' && frame.payload?.message) {
              const msg = frame.payload.message
              if (msg.role === 'assistant') {
                origOnMessage?.(msg)
              }
            }
          }
        } catch (e) {
          console.error('Parse error:', e)
        }
      }

      ws.addEventListener('message', tempHandler)

      sendFrame({
        type: 'req',
        id: msgId,
        method: 'chat.send',
        params: {
          sessionKey,
          message: content,
          idempotencyKey: `${Date.now()}-${Math.random().toString(36).slice(2)}`
        }
      })
    })
  }

  function disconnect() {
    isConnected = false
    isAuthenticating = false
    sessionKey = null
    ws?.close()
    ws = null
  }

  return {
    connect,
    sendMessage,
    disconnect,
    get isConnected() { return isConnected },
    get sessionKey() { return sessionKey }
  }
}
