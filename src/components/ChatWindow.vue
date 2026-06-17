<script setup>
/**
 * ChatWindow.vue
 * Основное окно чата. Работает в двух режимах:
 *   - admin: чат область (header + messages + input) — sidebar управляется MainContent
 *   - client: сайдбар сессий + чат область
 *
 * Дизайн из chat-layout.html. Все функциональные части сохранены.
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

// API слой через composable (REST)
const chatApi = useChatApi(authStore, sitesStore)
const { currentSessionId, sessionsList, messages, isLoading, error, streamingContent } = chatApi

// WebSocket клиент с автореконнектом
const gatewayUrl = import.meta.env.VITE_GATEWAY_WS_URL || `wss://pilotsite.ru/`
const ws = useGatewayClient(gatewayUrl, {
  token: authStore.token,
  maxReconnectAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  ackTimeout: 10000
})

// Реактивный статус подключения
const isConnected = computed(() => true) // REST всегда доступен
const wsStatus = computed(() => {
  if (ws.connected.value) return 'connected'
  if (ws.reconnecting.value) return 'reconnecting'
  return 'disconnected'
})
const wsStatusText = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return 'WS подключен'
    case 'reconnecting': return `WS переподключение (${ws.reconnectAttempt.value})...`
    case 'disconnected': return 'WS отключен'
  }
})

// Слушаем входящие WS сообщения и добавляем в чат
ws.onMessage((data) => {
  if (data.type === 'assistant_message' && data.content) {
    const newMsg = { id: `ws-${Date.now()}`, role: 'assistant', content: data.content }
    if (data.actions) newMsg.actions = data.actions
    messages.value = [...messages.value, newMsg]
  }
})

// Автоподключение WS при монтировании
onMounted(() => {
  ws.connect()
})

const messagesContainer = ref(null)
const csSidebarOpen = ref(false)

function toggleCsSidebar() { csSidebarOpen.value = !csSidebarOpen.value }
function closeCsSidebar() { csSidebarOpen.value = false }

function disconnect() {
  ws.disconnect()
}

function handleReconnect() {
  error.value = null
  ws.connect()
}

/** Очистить флаги приветствия при выходе */
function handleLogout() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  disconnect()
  authStore.logout()
}

onUnmounted(() => disconnect())

// Авто-скролл вниз при новых сообщениях
watch([messages, streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })

/**
 * Инициализация для клиентского режима:
 *   - загружаем siteUrl из /api/auth/me
 *   - загружаем сессии
 *   - если нет сессий — создаём приветствие
 */
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + authStore.token
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
</script>

<template>
  <!-- АДМИН: chat section only (sidebar is in MainContent) -->
  <div v-if="!clientMode" class="chat-window">
    <section class="chat-section">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-header-left">
          <h2 class="chat-title">Мой чат</h2>
          <span class="status-dot" :class="{
            'status-dot--online': wsStatus === 'connected',
            'status-dot--reconnecting': wsStatus === 'reconnecting'
          }"></span>
          <span class="status-text">{{ wsStatusText }}</span>
          <span v-if="ws.queueSize.value > 0" class="queue-badge" :title="'Сообщений в очереди: ' + ws.queueSize.value">⏳ {{ ws.queueSize.value }}</span>
        </div>
        <div class="chat-header-right">
          <span v-if="sitesStore.currentSite" class="site-badge">
            <span class="site-badge-dot"></span>
            {{ sitesStore.currentSite.name }}
          </span>
          <button v-if="error" class="btn-reconnect" @click="handleReconnect" title="Переподключиться">
            <svg class="reconnect-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <MessageArea
        ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        startTitle="Добро пожаловать в AI Pilot"
        startHint="Напишите, что нужно сделать с сайтом"
        @approve-action="chatApi.approveAction"
        @reject-action="chatApi.rejectAction"
      />

      <!-- Composer -->
      <ChatInput :isConnected @send="chatApi.sendMessage" />
    </section>
  </div>

  <!-- КЛИЕНТ: сайдбар + хедер + сообщения + ввод -->
  <div v-else class="client-layout">
    <!-- Мобильный оверлей для клиента -->
    <div v-if="csSidebarOpen" class="cs-overlay" @click="closeCsSidebar"></div>

    <ClientSidebar
      :sessionsList="sessionsList"
      :currentSessionId="currentSessionId"
      :siteName="sitesStore.currentSite?.name || ''"
      :csSidebarOpen="csSidebarOpen"
      @close="closeCsSidebar"
      @select-session="chatApi.selectSession"
      @new-chat="chatApi.startNewChat"
      @logout="handleLogout"
      @toggle-theme="authStore.setTheme(authStore.theme === 'dark' ? 'light' : 'dark')"
    />

    <div class="client-main">
      <!-- Мобильная кнопка для открытия сайдбара у клиента -->
      <button class="cs-mobile-burger" @click="toggleCsSidebar">
        <span class="burger-line"></span>
        <span class="burger-line"></span>
        <span class="burger-line"></span>
      </button>

      <div class="chat-header">
        <div class="connection-status">
          <span class="status-dot" :class="{
            'status-dot--online': wsStatus === 'connected',
            'status-dot--reconnecting': wsStatus === 'reconnecting'
          }"></span>
          <span class="status-text">{{ wsStatusText }}</span>
          <span v-if="ws.queueSize.value > 0" class="queue-badge" :title="'Сообщений в очереди: ' + ws.queueSize.value">⏳ {{ ws.queueSize.value }}</span>
        </div>
        <button v-if="error" class="btn-reconnect" @click="handleReconnect" title="Переподключиться">
          <svg class="reconnect-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>
      <MessageArea
        ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        clientMode
        startTitle="Чем могу помочь?"
        startHint="Я AI-ассистент вашего сайта."
        @approve-action="chatApi.approveAction"
        @reject-action="chatApi.rejectAction"
      />
      <ChatInput :isConnected @send="chatApi.sendMessage" />
    </div>
  </div>
</template>

<style scoped>
/* === Admin Chat Window === */
.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.chat-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 16px;
  background: var(--bg-chat);
}

/* === Chat Header === */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-primary);
}

.chat-header-left, .chat-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-title {
  font-size: var(--typography-h3-size);
  color: var(--text-primary);
  margin: 0;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  transition: background 0.3s, box-shadow 0.3s;
}

.status-dot--online {
  background: var(--color-success);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-success) 60%, transparent);
}

.status-dot--reconnecting {
  background: var(--color-warning, #f59e0b);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.queue-badge {
  font-size: 11px;
  color: var(--color-warning, #f59e0b);
  background: color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.status-text {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
}

.site-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--typography-body-small);
  color: var(--text-secondary);
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 16px;
  font-weight: 500;
}

.site-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}

.btn-reconnect {
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 6px 10px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-reconnect:hover {
  background: var(--bg-hover);
}

.reconnect-icon {
  width: 16px;
  height: 16px;
}

/* === Client Layout === */
.client-layout {
  flex: 1;
  display: flex;
  width: 100%;
  min-height: 0;
}

.client-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  position: relative;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Mobile burger for client mode */
.cs-mobile-burger {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 20;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s;
}

.cs-mobile-burger:hover {
  background: var(--bg-hover);
}

.cs-mobile-burger .burger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
}

.cs-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  animation: fadeIn 0.2s ease;
}

/* === Mobile === */
@media (max-width: 767px) {
  .chat-header {
    padding: 12px 16px;
  }

  .chat-window .chat-header {
    padding: 12px 16px 12px 56px;
  }

  .client-layout {
    flex-direction: column;
    height: 100%;
  }

  .client-main {
    height: 100%;
    overflow: hidden;
  }

  .cs-mobile-burger {
    display: flex !important;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
</style>
