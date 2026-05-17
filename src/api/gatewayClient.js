// Прямой WebSocket клиент к OpenClaw Gateway
// Использует Gateway Protocol (challenge -> connect -> chat.send)

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

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
      onError?.(new Error('WebSocket ошибка — не удалось соединиться'))
    }

    ws.onclose = (event) => {
      isConnected = false
      isAuthenticating = false
      if (event.code !== 1000) {
        console.error('[WS] Closed:', event.code, event.reason)
        onError?.(new Error('Соединение разорвано: ' + (event.reason || 'код ' + event.code)))
      }
      onDisconnected?.()
    }
  }

  function handleFrame(frame) {
    // Challenge от Gateway (первый приходит до connect)
    if (frame.type === 'event' && frame.event === 'connect.challenge') {
      console.log('[WS] Challenge received, sending connect...')
      sendConnect(frame.payload?.nonce)
      return
    }

    // Успешный connect
    if (frame.type === 'res' && frame.ok && frame.payload?.type === 'hello-ok') {
      isAuthenticating = false
      isConnected = true
      sessionKey = frame.payload.snapshot?.sessionDefaults?.mainSessionKey || null
      console.log('[WS] Connected! Session key:', sessionKey)
      onConnected?.()
      return
    }

    // Ошибка connect
    if (frame.type === 'res' && !frame.ok) {
      isAuthenticating = false
      isConnected = false
      const errMsg = frame.error?.message || 'Ошибка подключения'
      console.error('[WS] Connection rejected:', errMsg)
      onError?.(new Error(errMsg))
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
      case 'agent':
      case 'tick':
      case 'heartbeat':
      case 'health':
        break
      default:
        console.debug('[WS] Unknown event:', frame.event)
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
          id: 'ai-pilot-webchat',
          version: '0.1.0',
          platform: 'browser',
          mode: 'cli'
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        caps: [],
        commands: [],
        permissions: {},
        auth: { token },
        locale: 'ru-RU',
        userAgent: 'ai-pilot-webchat/0.1.0'
      }
    })
  }

  async function sendMessage(content) {
    if (!isConnected || !sessionKey) {
      throw new Error('Not connected')
    }

    const msgId = nextId()

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
