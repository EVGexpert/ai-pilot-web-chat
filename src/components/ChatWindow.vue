<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { useChatApi } from '../composables/useChatApi'
import { useGatewayClient } from '../composables/useGatewayClient'
import ChatLayout from './chat-ui/ChatLayout.vue'

const props = defineProps({ clientMode: { type: Boolean, default: false } })

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const chatApi = useChatApi(authStore, sitesStore)
const { currentSessionId, sessionsList, messages, isLoading, error, streamingContent } = chatApi

const theme = ref(authStore.theme)

// Watch authStore.theme changes
watch(() => authStore.theme, (val) => {
  theme.value = val
}, { immediate: true })

// Real date-based history grouping
const historyGroups = computed(() => {
  const today = new Date()
  const todayStr = today.toDateString()

  const groups = {
    today: { title: 'Сегодня', items: [] },
    week: { title: 'На этой неделе', items: [] },
    month: { title: 'В этом месяце', items: [] }
  }

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const session of sessionsList.value) {
    // Приоритет: updatedAt → createdAt → lastMessage.created_at → date
    const dateStr =
      session.updatedAt ||
      session.createdAt ||
      session.lastMessage?.created_at ||
      session.date ||
      null
    const sessionDate = dateStr ? new Date(dateStr) : null

    const item = {
      id: session.id,
      title: session.title || session.name || 'Новый чат',
      date: dateStr || ''
    }

    if (!sessionDate) {
      groups.month.items.push(item)
      continue
    }

    const sessionDateStr = sessionDate.toDateString()

    if (sessionDateStr === todayStr) {
      groups.today.items.push(item)
    } else if (sessionDate >= sevenDaysAgo) {
      groups.week.items.push(item)
    } else if (sessionDate >= thirtyDaysAgo) {
      groups.month.items.push(item)
    } else {
      groups.month.items.push(item)
    }
  }

  const result = []
  if (groups.today.items.length > 0) result.push(groups.today)
  if (groups.week.items.length > 0) result.push(groups.week)
  if (groups.month.items.length > 0) result.push(groups.month)

  // Если ничего не попала в группы — все равно показываем (fallback)
  if (result.length === 0 && sessionsList.value.length > 0) {
    result.push({ title: 'В этом месяце', items: sessionsList.value.map(s => ({
      id: s.id,
      title: s.title || s.name || 'Новый чат',
      date: s.updatedAt || s.createdAt || s.date || ''
    }))})
  }

  return result
})

const userData = computed(() => ({
  name: authStore.user?.name || 'AI Pilot',
  email: authStore.user?.email || '',
  avatar: authStore.user?.avatar || ''
}))

// --- WebSocket ---
const gatewayUrl = import.meta.env.VITE_GATEWAY_WS_URL || `wss://chat.pilotsite.ru/ws/`
const ws = useGatewayClient(gatewayUrl, {
  token: authStore.token,
  maxReconnectAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  ackTimeout: 10000
})

ws.onMessage((data) => {
  if (data.type === 'assistant_message' && data.content) {
    const newMsg = { id: `ws-${Date.now()}`, role: 'assistant', content: data.content }
    if (data.actions) newMsg.actions = data.actions
    messages.value = [...messages.value, newMsg]
  }
})

// --- Handlers ---
function handleSend(text) {
  const hasSite = !!(authStore.siteUrl || sitesStore.currentSite?.url)
  if (!hasSite) {
    error.value = 'Выберите сайт в боковой панели'
    return
  }
  chatApi.sendMessage(text)
}

function handleNewChat() { chatApi.startNewChat() }

function handleSelectChat(event) {
  chatApi.selectSession(event.id || event)
}

function handleApproveAction(id) { chatApi.approveAction(id) }

function handleRejectAction(id) { chatApi.rejectAction(id) }

function handleThemeUpdate(val) {
  authStore.setTheme(val)
}

function handleLogout() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  ws.disconnect()
  authStore.logout()
}

// --- Client init ---
if (props.clientMode) {
  onMounted(async () => {
    try {
      if (!authStore.siteUrl && authStore.token) {
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': '***' + authStore.token }
        })
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.sites && meData.sites.length > 0) {
            authStore.siteUrl = meData.sites[0].url
            localStorage.setItem('aipilot_site_url', authStore.siteUrl)
          }
        }
      }
      if (!authStore.siteUrl) return
      await chatApi.loadSessions()
      if (sessionsList.value.length > 0) {
        const last = sessionsList.value[0]
        await chatApi.selectSession(last.id)
      }
      if (sessionsList.value.length === 0) {
        const sendSiteUrl = authStore.siteUrl
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': '***' + authStore.token },
          body: JSON.stringify({ message: '/start', siteUrl: sendSiteUrl })
        })
        if (res.ok) {
          const data = await res.json()
          currentSessionId.value = data.sessionId
          messages.value = [{ id: 'greeting', role: 'assistant', content: data.message }]
          await chatApi.loadSessions()
        }
      }
    } catch (e) { console.warn('Init failed:', e) }
  })
}

onMounted(() => { ws.connect() })
onUnmounted(() => { ws.disconnect() })
</script>

<template>
  <div class="h-full w-full">
    <ChatLayout
      :historyGroups="historyGroups"
      :activeChatId="currentSessionId"
      :user="userData"
      :logoSrc="'/img/logo-aipilot-v3.png'"
      :messages="messages"
      :streamingContent="streamingContent"
      :isLoading="isLoading"
      :isConnected="true"
      :error="error"
      :theme="theme"
      :assistantAvatar="'/img/logo-aipilot-v2.png'"
      :clientMode="clientMode"
      @new-chat="handleNewChat"
      @select-chat="handleSelectChat"
      @update:theme="handleThemeUpdate"
      @profile-settings="handleLogout"
      @send-message="handleSend"
      @approve-action="handleApproveAction"
      @reject-action="handleRejectAction"
    />
  </div>
</template>