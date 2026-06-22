<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

const theme = ref('light')
const composerText = ref('')

const isSending = computed(() => isLoading.value)
const isAssistantTyping = computed(() => streamingContent.value.length > 0)

const userProfile = computed(() => ({
  name: authStore.user?.name || authStore.user?.email || 'Пользователь',
  email: authStore.user?.email || '',
  avatar: null
}))

// Нормализуем сообщения для нового формата
const uiMessages = computed(() => {
  const msgs = messages.value.map(msg => ({
    id: msg.id || `msg-${Date.now()}-${Math.random()}`,
    role: msg.role,
    content: msg.content,
    actions: msg.actions || [],
    time: msg.time || new Date().toISOString()
  }))
  if (streamingContent.value) {
    msgs.push({ id: 'streaming', role: 'assistant', content: streamingContent.value, actions: [], time: new Date().toISOString() })
  }
  return msgs
})

// Группируем сессии по времени
const historyGroups = computed(() => {
  const list = sessionsList.value || []
  const now = Date.now()
  const day = 86400000
  const groups = {
    today: { label: 'Сегодня', items: [] },
    week: { label: 'Эта неделя', items: [] },
    month: { label: 'Этот месяц', items: [] },
    older: { label: 'Ранее', items: [] }
  }
  list.forEach(session => {
    const time = new Date(session.createdAt || session.updatedAt || Date.now()).getTime()
    const diff = now - time
    const item = { id: session.id, title: session.title || `Чат от ${new Date(time).toLocaleDateString('ru-RU')}`, time: new Date(time) }
    if (diff < day) groups.today.items.push(item)
    else if (diff < 7 * day) groups.week.items.push(item)
    else if (diff < 30 * day) groups.month.items.push(item)
    else groups.older.items.push(item)
  })
  return Object.values(groups).filter(g => g.items.length > 0)
})

// WebSocket (сохранить логику)
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

function handleSend(text) {
  const hasSite = !!(authStore.siteUrl || sitesStore.currentSite?.url)
  if (!hasSite) {
    error.value = 'Выберите сайт в боковой панели'
    return
  }
  chatApi.sendMessage(text)
}

function handleNewChat() { chatApi.startNewChat() }

function handleSelectChat(id) { chatApi.selectSession(id) }

function handleApproveAction(id) { chatApi.approveAction(id) }

function handleRejectAction(id) { chatApi.rejectAction(id) }

// Client mode init (сохранить)
if (props.clientMode) {
  onMounted(async () => {
    try {
      if (!authStore.siteUrl && authStore.token) {
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + authStore.token }
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
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authStore.token },
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
  <ChatLayout
    v-model="composerText"
    v-model:theme="theme"
    :embedded="true"
    :show-sidebar="clientMode"
    :history-groups="historyGroups"
    :messages="uiMessages"
    :active-chat-id="currentSessionId"
    :user="userProfile"
    :is-sending="isSending"
    :is-assistant-typing="isAssistantTyping"
    @send-message="handleSend"
    @new-chat="handleNewChat"
    @select-chat="handleSelectChat"
    @approve-action="handleApproveAction"
    @reject-action="handleRejectAction"
    @profile-settings="() => {}"
    @copy="(id) => console.log('copy', id)"
    @like="(id) => console.log('like', id)"
    @dislike="(id) => console.log('dislike', id)"
  />
</template>
