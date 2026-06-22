<script setup>
/**
 * ChatWindow.vue — light theme from chat-layout.html
 */
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { useChatApi } from '../composables/useChatApi'
import { useGatewayClient } from '../composables/useGatewayClient'
import MessageArea from './MessageArea.vue'
import ChatInput from './ChatInput.vue'
import ClientSidebar from './ClientSidebar.vue'

const props = defineProps({ clientMode: { type: Boolean, default: false } })

const authStore = useAuthStore()
const sitesStore = useSitesStore()

const chatApi = useChatApi(authStore, sitesStore)
const { currentSessionId, sessionsList, messages, isLoading, error, streamingContent } = chatApi

const gatewayUrl = import.meta.env.VITE_GATEWAY_WS_URL || `wss://chat.pilotsite.ru/ws/`
const ws = useGatewayClient(gatewayUrl, {
  token: authStore.token,
  maxReconnectAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  ackTimeout: 10000
})

const isConnected = computed(() => true)

const hasSite = computed(() => !!(authStore.siteUrl || sitesStore.currentSite?.url))

function handleSend(text) {
  if (!hasSite.value) {
    error.value = 'Выберите сайт в боковой панели'
    return
  }
  chatApi.sendMessage(text)
}

ws.onMessage((data) => {
  if (data.type === 'assistant_message' && data.content) {
    const newMsg = { id: `ws-${Date.now()}`, role: 'assistant', content: data.content }
    if (data.actions) newMsg.actions = data.actions
    messages.value = [...messages.value, newMsg]
  }
})

onMounted(() => {
  ws.connect()
  nextTick(() => {
    const el = messagesContainer.value?.$el || messagesContainer.value
    if (el) el.addEventListener('scroll', handleScroll)
  })
})

const messagesContainer = ref(null)
const userScrolledUp = ref(false)

function handleScroll() {
  const el = messagesContainer.value?.$el || messagesContainer.value
  if (!el) return
  const threshold = 100
  userScrolledUp.value = el.scrollHeight - el.scrollTop - el.clientHeight > threshold
}

const csSidebarOpen = ref(false)

function toggleCsSidebar() { csSidebarOpen.value = !csSidebarOpen.value }
function closeCsSidebar() { csSidebarOpen.value = false }

function disconnect() { ws.disconnect() }

function handleReconnect() {
  error.value = null
  ws.connect()
}

function handleLogout() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  disconnect()
  authStore.logout()
}

onUnmounted(() => {
  const el = messagesContainer.value?.$el || messagesContainer.value
  if (el) el.removeEventListener('scroll', handleScroll)
  disconnect()
})

watch([messages, streamingContent], async () => {
  await nextTick()
  if (!userScrolledUp.value && messagesContainer.value) {
    const el = messagesContainer.value.$el || messagesContainer.value
    if (el?.scrollTo) {
      el.scrollTo(0, el.scrollHeight)
    } else {
      el.scrollTop = el.scrollHeight
    }
  }
}, { deep: true })

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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': '***' + authStore.token
          },
          body: JSON.stringify({ message: '/start', siteUrl: sendSiteUrl })
        })
        if (res.ok) {
          const data = await res.json()
          currentSessionId.value = data.sessionId
          messages.value = [{ id: 'greeting', role: 'assistant', content: data.message }]
          await chatApi.loadSessions()
        }
      }
    } catch (e) {
      console.warn('Init failed:', e)
    }
  })
}

function handleApproveAction(id) { chatApi.approveAction(id) }
function handleRejectAction(id) { chatApi.rejectAction(id) }
function startNewChat() { chatApi.startNewChat() }
function selectSession(id) { chatApi.selectSession(id) }
</script>

<template>
  <!-- АДМИН -->
  <div v-if="!clientMode" class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-chat-bg">
    <header class="shrink-0 px-6 py-3 border-b border-gray-200 bg-chat-bg flex items-center gap-3">
      <h2 class="text-sm font-semibold text-gray-700">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
      <p class="text-xs text-gray-400 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
      <button v-if="error" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" @click="handleReconnect">🔁</button>
    </header>
    <MessageArea ref="messagesContainer"
      :messages="messages" :streamingContent :isLoading :isConnected :error
      startTitle="Добро пожаловать в AI Pilot"
      startHint="Напишите, что нужно сделать с сайтом"
      @approve-action="handleApproveAction"
      @reject-action="handleRejectAction" />
    <ChatInput :isConnected :isLoading @send="handleSend" />
  </div>

  <!-- КЛИЕНТ -->
  <div v-else class="flex flex-1 w-full min-h-0 relative">
    <!-- Mobile overlay -->
    <div v-if="csSidebarOpen" class="fixed inset-0 bg-black/30 z-[99]" @click="closeCsSidebar"></div>

    <!-- Client sidebar -->
    <ClientSidebar
      :sessionsList="sessionsList"
      :currentSessionId="currentSessionId"
      :siteName="sitesStore.currentSite?.name || ''"
      :csSidebarOpen="csSidebarOpen"
      @close="closeCsSidebar"
      @select-session="selectSession"
      @new-chat="startNewChat"
      @logout="handleLogout"
    />

    <!-- Chat area -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
      <!-- Mobile hamburger for client sidebar -->
      <button
        class="fixed top-3 left-3 z-20 w-10 h-10 rounded-lg bg-white shadow-sm ring-1 ring-black/5 flex-col items-center justify-center gap-[5px] cursor-pointer md:hidden flex"
        @click="toggleCsSidebar"
      >
        <span class="block w-5 h-0.5 bg-gray-600 rounded-sm"></span>
        <span class="block w-5 h-0.5 bg-gray-600 rounded-sm"></span>
        <span class="block w-5 h-0.5 bg-gray-600 rounded-sm"></span>
      </button>

      <header class="shrink-0 px-6 py-3 border-b border-gray-200 bg-chat-bg flex items-center gap-3">
        <h2 class="text-sm font-semibold text-gray-700">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
        <p class="text-xs text-gray-400 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
        <button v-if="error" class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" @click="handleReconnect">🔁</button>
      </header>
      <MessageArea ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        clientMode startTitle="Чем могу помочь?"
        startHint="Я AI-ассистент вашего сайта."
        @approve-action="handleApproveAction"
        @reject-action="handleRejectAction" />
      <ChatInput :isConnected :isLoading @send="handleSend" />
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 767px) {
  .cs-close-btn { display: flex; }
}
</style>
