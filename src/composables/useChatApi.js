/**
 * Composable для взаимодействия с API чата.
 * Сохраняет текущий production flow и возвращает сырой payload ответа,
 * чтобы ChatWindow мог зарегистрировать Agent UI Cards.
 */
import { ref } from 'vue'

export function useChatApi(authStore, sitesStore) {
  const messages = ref([])
  const isLoading = ref(false)
  const streamingContent = ref('')
  const error = ref(null)
  const currentSessionId = ref(null)
  const sessionsList = ref([])

  function authHeader() {
    return { Authorization: 'Bearer ' + authStore.token }
  }

  function getSiteUrl() {
    return authStore.siteUrl || sitesStore.currentSite?.url || ''
  }

  function normalizeAssistantMessage(data) {
    const newMsg = {
      id: data.messageId ? `msg-${data.messageId}` : `msg-${Date.now()}`,
      role: 'assistant',
      content: data.message ?? data.answer ?? data.assistantResponse ?? ''
    }

    if (Array.isArray(data.actions) && data.actions.length > 0) {
      newMsg.actions = data.actions
    }

    return newMsg
  }

  async function sendMessage(text) {
    messages.value = [...messages.value, { id: `user-${Date.now()}`, role: 'user', content: text }]
    isLoading.value = true
    error.value = null

    const sendSiteUrl = getSiteUrl()
    if (!sendSiteUrl) {
      error.value = 'Не выбран сайт. Выберите сайт в боковой панели.'
      isLoading.value = false
      return null
    }

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ message: text, siteUrl: sendSiteUrl, sessionId: currentSessionId.value })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        error.value = err.error || err.message || 'Ошибка отправки'
        return null
      }

      const data = await res.json()
      currentSessionId.value = data.sessionId || currentSessionId.value
      messages.value = [...messages.value, normalizeAssistantMessage(data)]
      await loadSessions()
      return data
    } catch (e) {
      error.value = 'Сетевая ошибка: ' + e.message
      return null
    } finally {
      isLoading.value = false
      streamingContent.value = ''
    }
  }

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
            content: m.content,
            actions: m.actions || undefined,
            card: m.card || undefined
          }))
        } else {
          messages.value = []
        }
      }
    } catch (e) {
      console.warn('History load failed:', e)
    }
  }

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
        return data
      }
    } catch (e) {
      console.warn('New chat failed:', e)
    }
    return null
  }

  // Guard set for in-flight action IDs (prevents double-submit)
  const processingActions = new Set()

  async function approveAction(actionId) {
    if (processingActions.has(actionId)) return null
    const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
    if (!msg) return null
    const action = msg.actions.find(a => a.id === actionId)
    if (action.status !== 'pending' && action.status !== 'failed') return null

    processingActions.add(actionId)
    action.status = 'processing'

    const actionPayload = action?.raw || {
      type: action?.type || 'other',
      target: action?.target || {},
      patch: action?.patch || {}
    }

    try {
      const res = await fetch('/api/chat/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          actionId,
          sessionId: currentSessionId.value,
          siteUrl: getSiteUrl(),
          action: actionPayload
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Ошибка при подтверждении (${res.status})`)
      }
      action.status = 'completed'
      if (data.postId) action.postId = data.postId
      return data
    } catch (e) {
      action.status = 'failed'
      action.error = e.message
      error.value = e.message
      console.warn('Approve API call failed:', e)
      return null
    } finally {
      processingActions.delete(actionId)
    }
  }

  async function rejectAction(actionId) {
    if (processingActions.has(actionId)) return null
    const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
    if (!msg) return null
    const action = msg.actions.find(a => a.id === actionId)
    if (action.status !== 'pending' && action.status !== 'failed') return null

    processingActions.add(actionId)
    action.status = 'processing'

    try {
      const res = await fetch('/api/chat/actions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ actionId, sessionId: currentSessionId.value })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Ошибка при отклонении (${res.status})`)
      }
      action.status = 'rejected'
      return data
    } catch (e) {
      action.status = 'failed'
      action.error = e.message
      error.value = e.message
      console.warn('Reject API call failed:', e)
      return null
    } finally {
      processingActions.delete(actionId)
    }
  }

  async function selectSession(sessionId) {
    currentSessionId.value = sessionId
    await loadSessionHistory(sessionId)
  }

  return {
    currentSessionId,
    sessionsList,
    messages,
    isLoading,
    error,
    streamingContent,
    sendMessage,
    loadSessions,
    loadSessionHistory,
    startNewChat,
    approveAction,
    rejectAction,
    selectSession
  }
}
