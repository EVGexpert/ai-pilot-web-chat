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

// --- State ---
const chatDraft = ref('')

// --- Computed adapters ---

const normalizedMessages = computed(() => {
  return messages.value.map((message) => ({
    id: message.id || `${message.role}-${Date.now()}-${Math.random()}`,
    role: message.role,
    type: message.type || 'text',
    content: message.content || '',
    time: message.time || '',
    actions: message.actions || []
  }))
})

const historyGroups = computed(() => {
  return [
    {
      id: 'recent',
      title: 'История',
      items: sessionsList.value.map((session) => ({
        id: session.id,
        title: session.title || session.name || 'Новый чат',
        date: session.updatedAt || session.createdAt || ''
      }))
    }
  ]
})

const currentUser = computed(() => ({
  name: authStore.user?.name || 'AI Pilot',
  email: authStore.user?.email || '',
  avatar: '/img/user-img.png'
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
  <ChatLayout
    v-if="!clientMode"
    v-model="chatDraft"
    :history-groups="historyGroups"
    :messages="normalizedMessages"
    :active-chat-id="currentSessionId"
    :user="currentUser"
    :is-sending="isLoading"
    :is-assistant-typing="isLoading || !!streamingContent"
    :show-sidebar="false"
    :embedded="true"
    logo-src="/img/logo-aipilot-v3.png"
    assistant-avatar="/img/logo-aipilot-v2.png"
    @send-message="handleSend"
    @new-chat="handleNewChat"
    @select-chat="handleSelectChat"
    @approve-action="handleApproveAction"
    @reject-action="handleRejectAction"
  />
  <ChatLayout
    v-else
    v-model="chatDraft"
    :history-groups="historyGroups"
    :messages="normalizedMessages"
    :active-chat-id="currentSessionId"
    :user="currentUser"
    :is-sending="isLoading"
    :is-assistant-typing="isLoading || !!streamingContent"
    :show-sidebar="true"
    :embedded="false"
    logo-src="/img/logo-aipilot-v3.png"
    assistant-avatar="/img/logo-aipilot-v2.png"
    @send-message="handleSend"
    @new-chat="handleNewChat"
    @select-chat="handleSelectChat"
    @approve-action="handleApproveAction"
    @reject-action="handleRejectAction"
    @profile-settings="handleLogout"
  />
</template>
