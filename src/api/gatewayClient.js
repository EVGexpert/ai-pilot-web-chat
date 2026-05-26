/**
 * Gateway Client — теперь только через Auth API.
 * Прямых вызовов Gateway из фронта больше нет.
 * Все запросы идут через /api/chat/* в Auth API.
 */

export function createGatewayClient() {
  return {
    connect() {},
    sendMessage() {
      throw new Error('Прямой вызов Gateway запрещён. Используйте /api/chat/send')
    },
    disconnect() {},
    isConnected: false,
    sessionKey: null
  }
}
