/**
 * GatewayClient — WebSocket клиент с автоматическим реконнектом и очередью сообщений.
 *
 * Возможности:
 *   - Exponential backoff reconnect (baseDelay=1s, maxDelay=30s, maxAttempts=10)
 *   - Message queue: при offline → сообщение в очередь
 *   - Flush queue: после reconnect → отправка накопленного
 *   - Ack mechanism: messageId + pendingAcks Map, timeout 10s → возврат в очередь
 *   - Event emitter: on/emit pattern (message, fatal, open, close, error, reconnecting)
 *
 * Gateway уже умеет обрабатывать messageId — серверная часть не требует изменений.
 */

export class GatewayClient {
  /**
   * @param {string} url — WebSocket URL (wss://... или ws://...)
   * @param {object} [options]
   * @param {number} [options.maxReconnectAttempts=10]
   * @param {number} [options.baseDelay=1000]  — начальная задержка реконнекта (мс)
   * @param {number} [options.maxDelay=30000]  — максимальная задержка реконнекта (мс)
   * @param {number} [options.ackTimeout=10000] — таймаут ожидания подтверждения (мс)
   * @param {string} [options.token]           — авторизационный токен
   */
  constructor(url, options = {}) {
    this.url = url
    this.ws = null
    this.connected = false

    // Reconnect settings
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
    this.baseDelay = options.baseDelay ?? 1000
    this.maxDelay = options.maxDelay ?? 30000
    this.reconnectTimer = null

    // Message queue & ack
    this.messageQueue = []
    this.pendingAcks = new Map()
    this.ackTimeout = options.ackTimeout ?? 10000

    // Auth
    this.token = options.token || ''

    // Event emitter
    this.listeners = new Map()

    // State flag — intentional disconnect
    this._intentionalClose = false
  }

  // ─── Connection ─────────────────────────────────────────────

  /** Установить WebSocket соединение */
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this._intentionalClose = false

    try {
      this.ws = new WebSocket(this.url)
    } catch (err) {
      this.emit('error', err)
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this.connected = true
      this.reconnectAttempts = 0
      this.emit('open')

      // Отправить auth если есть токен
      if (this.token) {
        this._sendRaw({ type: 'auth', token: this.token })
      }

      // Flush очередь накопленных сообщений
      this.flushQueue()
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this._handleMessage(data)
      } catch {
        // Не-JSON сообщение — пробросить как есть
        this.emit('message', event.data)
      }
    }

    this.ws.onclose = (event) => {
      this.connected = false
      this.emit('close', { code: event.code, reason: event.reason })

      if (!this._intentionalClose) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (event) => {
      this.emit('error', event)
    }
  }

  /** Запланировать реконнект с exponential backoff */
  scheduleReconnect() {
    if (this._intentionalClose) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('fatal', { reason: 'max_reconnect_attempts', attempts: this.reconnectAttempts })
      return
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    )
    this.reconnectAttempts++
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay })

    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /** Закрыть соединение (без реконнекта) */
  disconnect() {
    this._intentionalClose = true
    clearTimeout(this.reconnectTimer)

    // Отменить все pending ack таймеры
    for (const [, entry] of this.pendingAcks) {
      clearTimeout(entry.timer)
    }
    this.pendingAcks.clear()

    if (this.ws) {
      this.ws.onclose = null  // Предотвратить автреконнект
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.connected = false
  }

  // ─── Sending ────────────────────────────────────────────────

  /**
   * Отправить сообщение. Если offline → в очередь.
   * @param {object} message — любой JSON-сериализуемый объект
   * @returns {string} messageId — для отслеживания ack
   */
  send(message) {
    const messageId = this.generateId()
    const envelope = { ...message, messageId }

    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Offline → очередь
      this.messageQueue.push(envelope)
      this.emit('queued', { messageId, queueSize: this.messageQueue.length })
      return messageId
    }

    this._sendWithAck(envelope)
    return messageId
  }

  /** Отправить envelope с ожиданием ack */
  _sendWithAck(envelope) {
    this._sendRaw(envelope)

    // Установить ack timeout
    const timer = setTimeout(() => {
      this.pendingAcks.delete(envelope.messageId)
      // Возврат в очередь при отсутствии ack
      this.messageQueue.push(envelope)
      this.emit('ack_timeout', { messageId: envelope.messageId, queueSize: this.messageQueue.length })
    }, this.ackTimeout)

    this.pendingAcks.set(envelope.messageId, { envelope, timer })
  }

  /** Низкоуровневая отправка JSON через WebSocket */
  _sendRaw(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  /** Отправить все накопленные сообщения из очереди */
  flushQueue() {
    while (this.messageQueue.length > 0) {
      const envelope = this.messageQueue.shift()
      this._sendWithAck(envelope)
    }
  }

  // ─── Incoming messages ──────────────────────────────────────

  /** Обработать входящее сообщение */
  _handleMessage(data) {
    // Ack от сервера — подтвердить доставку
    if (data.type === 'ack' && data.messageId) {
      const pending = this.pendingAcks.get(data.messageId)
      if (pending) {
        clearTimeout(pending.timer)
        this.pendingAcks.delete(data.messageId)
        this.emit('ack', { messageId: data.messageId })
      }
      return
    }

    // Pong — внутренний, не эмитить наружу
    if (data.type === 'pong') return

    // Все остальные — пробросить потребителям
    this.emit('message', data)
  }

  // ─── Event emitter ──────────────────────────────────────────

  /**
   * Подписаться на событие.
   * @param {string} event — open|close|message|error|fatal|reconnecting|queued|ack|ack_timeout
   * @param {function} handler
   * @returns {function} unsubscribe
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(handler)

    // Возвращаем функцию отписки
    return () => {
      const handlers = this.listeners.get(event)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) this.listeners.delete(event)
      }
    }
  }

  /** Отписаться от события */
  off(event, handler) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) this.listeners.delete(event)
    }
  }

  /** Эмитить событие */
  emit(event, data) {
    const handlers = this.listeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data)
        } catch (err) {
          console.error(`[GatewayClient] Error in handler for "${event}":`, err)
        }
      }
    }
  }

  /** Подписаться на событие один раз */
  once(event, handler) {
    const wrapped = (data) => {
      this.off(event, wrapped)
      handler(data)
    }
    this.on(event, wrapped)
  }

  // ─── Utilities ──────────────────────────────────────────────

  /** Сгенерировать уникальный ID сообщения */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  /** Текущий размер очереди */
  get queueSize() {
    return this.messageQueue.length
  }

  /** Количество сообщений ожидающих ack */
  get pendingAckCount() {
    return this.pendingAcks.size
  }
}
