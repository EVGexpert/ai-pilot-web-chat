/**
 * useChatApi.js
 * Composable для взаимодействия с API чата.
 * Инкапсулирует send, loadSessions, loadSessionHistory, startNewChat, approveAction, rejectAction.
 *
 * Используется в ChatWindow.vue (админ и клиент).
 *
 * @param {import('pinia').StoreGeneric} authStore — экземпляр useAuthStore
 * @param {import('pinia').StoreGeneric} sitesStore — экземпляр useSitesStore
 * @returns {{
 *   currentSessionId: import('vue').Ref<string|null>,
 *   sessionsList: import('vue').Ref<Array>,
 *   messages: import('vue').Ref<Array>,
 *   isLoading: import('vue').Ref<boolean>,
 *   error: import('vue').Ref<string|null>,
 *   streamingContent: import('vue').Ref<string>,
 *   sendMessage: (text: string) => Promise<void>,
 *   loadSessions: () => Promise<void>,
 *   loadSessionHistory: (sessionId: string) => Promise<void>,
 *   startNewChat: () => Promise<void>,
 *   approveAction: (actionId: string) => Promise<void>,
 *   rejectAction: (actionId: string) => Promise<void>,
 *   selectSession: (sessionId: string) => Promise<void>,
 * }}
 */
import { ref } from 'vue'

export function useChatApi(authStore, sitesStore) {
  const messages = ref([])
  const isLoading = ref(false)
  const streamingContent = ref('')
  const error = ref(null)
  const currentSessionId = ref(null)
  const sessionsList = ref([])

  /** Получить заголовок Authorization для API-запросов */
  function authHeader() {
    return { Authorization: 'Bearer ' + authStore.token }
  }

  /** Получить URL сайта для запросов */
  function getSiteUrl() {
    return authStore.siteUrl || sitesStore.currentSite?.url || ''
  }

  /**
   * Отправить сообщение в чат.
   * @param {string} text — текст сообщения
   */
  async function sendMessage(text) {
    messages.value = [...messages.value, { id: `user-${Date.now()}`, role: 'user', content: text }]
    isLoading.value = true
    error.value = null

    const sendSiteUrl = getSiteUrl()
    if (!sendSiteUrl) {
      error.value = 'Не выбран сайт. Выберите сайт в боковой панели.'
      isLoading.value = false
      return
    }

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ message: text, siteUrl: sendSiteUrl, sessionId: currentSessionId.value })
      })
      if (res.ok) {
        const data = await res.json()
        currentSessionId.value = data.sessionId || currentSessionId.value
        const newMsg = { id: `msg-${Date.now()}`, role: 'assistant', content: data.message }
        if (data.actions && data.actions.length > 0) {
          newMsg.actions = data.actions
        }
        messages.value = [...messages.value, newMsg]
        await loadSessions()
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        error.value = err.error || 'Ошибка отправки'
      }
    } catch (e) {
      error.value = 'Сетевая ошибка: ' + e.message
    } finally {
      isLoading.value = false
      streamingContent.value = ''
    }
  }

  /** Загрузить список сессий */
  async function loadSessions() {
    try {
      const siteUrl = getSiteUrl()
      if (!siteUrl) return
      const res = await fetch('/api/chat/sessions?siteUrl=' + encodeURIComponent(siteUrl), {
        headers: { ...authHeader() }
      })
      if (res.ok) {
        const data = await res.json()
        sessionsList.value = data.sessions || []
      }
    } catch (e) {
      console.warn('Sessions load failed:', e)
    }
  }

  /** Загрузить историю конкретной сессии */
  async function loadSessionHistory(sessionId) {
    try {
      const res = await fetch('/api/chat/history?sessionId=' + encodeURIComponent(sessionId), {
        headers: { ...authHeader() }
      })
      if (res.ok) {
        const hist = await res.json()
        if (hist.messages && hist.messages.length > 0) {
          messages.value = hist.messages.map(m => ({
            id: 'msg-' + m.id,
            role: m.role,
            content: m.content
          }))
        }
      }
    } catch (e) {
      console.warn('History load failed:', e)
    }
  }

  /** Создать новый чат */
  async function startNewChat() {
    try {
      const siteUrl = getSiteUrl()
      const res = await fetch('/api/chat/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ siteUrl })
      })
      if (res.ok) {
        const data = await res.json()
        currentSessionId.value = data.sessionId
        messages.value = []
        streamingContent.value = ''
        isLoading.value = false
        error.value = null
        await loadSessions()
      }
    } catch (e) {
      console.warn('New chat failed:', e)
    }
  }

  /** Подтвердить действие */
  async function approveAction(actionId) {
    const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
    if (!msg) return
    const action = msg.actions.find(a => a.id === actionId)
    if (action) action.status = 'approved'

    const actionPayload = action?.raw || {
      type: action?.type || 'other',
      target: action?.target || {},
      patch: action?.patch || {}
    }

    try {
      await fetch('/api/chat/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          actionId,
          sessionId: currentSessionId.value,
          siteUrl: getSiteUrl(),
          action: actionPayload
        })
      })
    } catch (e) {
      console.warn('Approve API call failed:', e)
    }
  }

  /** Отклонить действие */
  async function rejectAction(actionId) {
    const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
    if (!msg) return
    const action = msg.actions.find(a => a.id === actionId)
    if (action) action.status = 'rejected'
    try {
      await fetch('/api/chat/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ actionId, sessionId: currentSessionId.value })
      })
    } catch (e) {
      console.warn('Reject API call failed:', e)
    }
  }

  /** Выбрать сессию из списка */
  async function selectSession(sessionId) {
    currentSessionId.value = sessionId
    await loadSessionHistory(sessionId)
  }

  return {
    currentSessionId, sessionsList, messages, isLoading, error, streamingContent,
    sendMessage, loadSessions, loadSessionHistory, startNewChat,
    approveAction, rejectAction, selectSession
  }
}
