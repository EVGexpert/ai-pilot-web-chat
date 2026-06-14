/**
 * Gateway Client (deprecated)
 *
 * Прямых вызовов Gateway из фронта больше нет.
 * Все запросы к Gateway идут через Auth API (/api/chat/*).
 *
 * @deprecated Удалить в следующей мажорной версии, когда все зависимости будут убраны.
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
