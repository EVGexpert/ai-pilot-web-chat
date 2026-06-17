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
  <div v-if="!clientMode" class="h-full flex flex-col bg-gray-50 w-full">
    <header class="shrink-0 px-6 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center gap-3">
      <h2 class="text-sm font-semibold text-gray-900">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
      <p class="text-xs text-gray-400 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
      <button v-if="error" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" @click="handleReconnect">🔁</button>
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
  <div v-else class="flex flex-1 w-full min-h-0">
    <div v-if="csSidebarOpen" class="fixed inset-0 bg-black/50 z-[99]" @click="closeCsSidebar"></div>

    <aside class="client-sidebar w-72 border-r border-gray-200 bg-white flex flex-col shrink-0 hidden md:flex" :class="{ 'cs-sidebar--open': csSidebarOpen }">
      <div class="flex items-center justify-between px-4 pt-6 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-[22px] leading-none">🎯</span>
          <span class="text-base font-bold text-gray-900 tracking-tight">AI Pilot</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="cs-close-btn w-8 h-8 bg-transparent rounded-lg cursor-pointer flex items-center justify-center text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500" @click="closeCsSidebar" title="Закрыть">✕</button>
        </div>
      </div>

      <div v-if="sitesStore.currentSite" class="px-4 py-1 text-xs text-gray-400 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
        {{ sitesStore.currentSite.name }}
      </div>

      <div class="mx-4 my-2 border-t border-gray-200"></div>

      <button class="w-full border border-dashed border-gray-300 bg-transparent text-gray-500 rounded-xl px-3 py-2 text-sm text-left hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors" @click="startNewChat">✏️ Новый чат</button>

      <div class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1.5">История</div>
      <div class="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        <div v-if="sessionsList.length === 0" class="text-xs text-gray-400 text-center py-6 px-4">Нет обращений</div>
        <div v-for="s in sessionsList" :key="s.id"
          class="px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          :class="s.id === currentSessionId
            ? 'bg-blue-50 border border-blue-200'
            : 'hover:bg-gray-100'"
          @click="selectSession(s.id)">
          <div class="flex items-baseline justify-between gap-2 mb-0.5">
            <span class="text-[13px] font-semibold truncate"
              :class="s.id === currentSessionId ? 'text-blue-600' : 'text-gray-900'">
              {{ s.title || 'Чат' }}
            </span>
            <span v-if="s.date" class="text-[10px] text-gray-400 shrink-0">{{ s.date }}</span>
          </div>
          <p class="text-[11px] truncate"
            :class="s.id === currentSessionId ? 'text-blue-400/60' : 'text-gray-400'">
            {{ s.preview || s.messageCount + ' сообщений' }}
          </p>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-gray-200">
        <button class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors" @click="handleLogout">← Выйти</button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
      <button class="cs-mobile-burger fixed top-3 left-3 z-20 w-10 h-10 rounded-lg bg-white border border-gray-200 shadow-md flex-col items-center justify-center gap-[5px] cursor-pointer transition-colors hover:bg-gray-100" @click="toggleCsSidebar">
        <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
        <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
        <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
      </button>

      <header class="shrink-0 px-6 py-3 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center gap-3">
        <h2 class="text-sm font-semibold text-gray-900">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
        <p class="text-xs text-gray-400 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
        <button v-if="error" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" @click="handleReconnect">🔁</button>
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
.cs-close-btn { display: none; }

@media (max-width: 767px) {
  .cs-close-btn { display: flex; }
  .client-sidebar {
    position: fixed !important;
    display: flex !important;
    left: -100%;
    top: 0;
    bottom: 0;
    width: min(85vw, 320px) !important;
    z-index: 100;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.08);
  }
  .client-sidebar.cs-sidebar--open { left: 0; }
  .cs-mobile-burger { display: flex !important; }
}
</style>