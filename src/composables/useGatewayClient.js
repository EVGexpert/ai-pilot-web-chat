/**
 * useGatewayClient.js
 * Vue composable для GatewayClient — WebSocket с автореконнектом и очередью.
 *
 * Используется вместе с useChatApi (REST) или вместо него, если нужен
 * реалтайм-стриминг через WebSocket.
 *
 * @param {string} url — WebSocket URL (wss://...)
 * @param {object} [options] — опции GatewayClient
 * @returns {{
 *   client: GatewayClient,
 *   connected: import('vue').Ref<boolean>,
 *   reconnecting: import('vue').Ref<boolean>,
 *   reconnectAttempt: import('vue').Ref<number>,
 *   queueSize: import('vue').Ref<number>,
 *   lastError: import('vue').Ref<string|null>,
 *   connect: () => void,
 *   disconnect: () => void,
 *   send: (message: object) => string,
 *   onMessage: (handler: function) => function,
 * }}
 */
import { ref, onUnmounted, readonly } from 'vue'
import { GatewayClient } from '../api/gatewayClient'

export function useGatewayClient(url, options = {}) {
  const client = new GatewayClient(url, options)

  const connected = ref(false)
  const reconnecting = ref(false)
  const reconnectAttempt = ref(0)
  const queueSize = ref(0)
  const lastError = ref(null)

  // Подписка на события клиента → реактивные refs
  const unsubs = []

  unsubs.push(client.on('open', () => {
    connected.value = true
    reconnecting.value = false
    reconnectAttempt.value = 0
    lastError.value = null
  }))

  unsubs.push(client.on('close', () => {
    connected.value = false
  }))

  unsubs.push(client.on('reconnecting', ({ attempt, delay }) => {
    reconnecting.value = true
    reconnectAttempt.value = attempt
  }))

  unsubs.push(client.on('fatal', ({ reason }) => {
    reconnecting.value = false
    lastError.value = reason === 'max_reconnect_attempts'
      ? 'Не удалось подключиться к серверу. Попробуйте позже.'
      : `Фатальная ошибка: ${reason}`
  }))

  unsubs.push(client.on('error', () => {
    lastError.value = 'Ошибка соединения'
  }))

  unsubs.push(client.on('queued', ({ queueSize: qs }) => {
    queueSize.value = qs
  }))

  unsubs.push(client.on('ack_timeout', ({ queueSize: qs }) => {
    queueSize.value = qs
  }))

  // Cleanup при демонтировании компонента
  onUnmounted(() => {
    unsubs.forEach(fn => fn())
    client.disconnect()
  })

  /** Подписаться на входящие сообщения */
  function onMessage(handler) {
    return client.on('message', handler)
  }

  return {
    client,
    connected: readonly(connected),
    reconnecting: readonly(reconnecting),
    reconnectAttempt: readonly(reconnectAttempt),
    queueSize: readonly(queueSize),
    lastError: readonly(lastError),
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    send: (message) => client.send(message),
    onMessage
  }
}
