<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { createGatewayClient } from '../api/gatewayClient'
import MessageArea from './MessageArea.vue'
import ChatInput from './ChatInput.vue'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps({ clientMode: { type: Boolean, default: false } })

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const messagesContainer = ref(null)

const messages = ref([])
const isConnected = ref(false)
const isLoading = ref(false)
const streamingContent = ref('')
const error = ref(null)

const showClientHistory = ref(false)
const currentSiteConversations = computed(() => sitesStore.currentSiteConversations)

const gatewayWs = import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru'
const chatBase = `${window.location.protocol}//${window.location.host}`
const httpBase = import.meta.env.VITE_GATEWAY_HTTP || chatBase

let client = null

function connect() {
  // Клиенты подключаются через auth-api proxy, не через Gateway напрямую
  if (props.clientMode) {
    isConnected.value = true
    return
  }
  
  client = createGatewayClient({
    gateway: gatewayWs, httpBase, token: authStore.gatewayToken,
    onConnected: () => { isConnected.value = true; error.value = null },
    onDisconnected: () => { isConnected.value = false },
    onMessage: (msg) => { messages.value = [...messages.value, { id: `msg-${Date.now()}`, ...msg }]; isLoading.value = false; streamingContent.value = '' },
    onStreamChunk: (chunk, type) => {
      if (type === 'start') { isLoading.value = true; streamingContent.value = '' }
      else if (type === 'chunk') { streamingContent.value += chunk }
      else if (type === 'done') { isLoading.value = false; streamingContent.value = '' }
    },
    onError: (err) => { error.value = err; isConnected.value = false }
  })
  client.connect()
}

function disconnect() { client?.disconnect(); client = null }

async function handleSend(text) {
  messages.value = [...messages.value, { id: `user-${Date.now()}`, role: 'user', content: text }]
  isLoading.value = true
  error.value = null

  if (props.clientMode && authStore.siteUrl) {
    // Клиент: отправляем через auth-api proxy
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + authStore.token
        },
        body: JSON.stringify({
          message: text,
          siteUrl: authStore.siteUrl
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        messages.value = [...messages.value, { id: `msg-${Date.now()}`, role: 'assistant', content: data.message }]
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
    return
  }

  // Админ: отправляем через Gateway как обычно
  if (!client?.isConnected) return
  client.sendMessage(text).catch(err => { error.value = err; isLoading.value = false })
}
function handleReconnect() { error.value = null; connect() }
function handleLogout() { 
  // Очищаем флаги приветствия при выходе
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  disconnect(); authStore.logout() 
}

connect()
onUnmounted(() => disconnect())

// Если клиент — сразу готов к работе, загружаем приветствие
if (props.clientMode) {
  nextTick(async () => {
    isConnected.value = true
    
    // Приветствие — только первый раз
    if (authStore.siteUrl) {
      const greeted = localStorage.getItem('aipilot_greeted_' + authStore.siteUrl)
      if (!greeted) {
        try {
          const res = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + authStore.token
            },
            body: JSON.stringify({
              message: '/start',
              siteUrl: authStore.siteUrl
            })
          })
          if (res.ok) {
            const data = await res.json()
            messages.value = [{ id: 'greeting', role: 'assistant', content: data.message }]
            localStorage.setItem('aipilot_greeted_' + authStore.siteUrl, '1')
          }
        } catch (e) {
          console.warn('Greeting failed:', e)
        }
      }
    }
  })
}

watch([messages, streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}, { deep: true })
</script>

<template>
  <!-- АДМИН: хедер + сообщения + ввод -->
  <div v-if="!clientMode" class="chat-window">
    <div class="chat-header">
      <div class="chat-header-left">
        <h2 class="chat-title">Мой чат</h2>
        <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
        <span class="status-text">{{ isConnected ? 'Подключено' : 'Нет соединения' }}</span>
      </div>
      <div class="chat-header-right">
        <span v-if="sitesStore.currentSite" class="badge">🟢 {{ sitesStore.currentSite.name }}</span>
        <button v-if="error" class="btn-reconnect" @click="handleReconnect">🔁</button>
      </div>
    </div>
    <MessageArea ref="messagesContainer"
      :messages="messages" :streamingContent :isLoading :isConnected :error
      startTitle="Добро пожаловать в AI Pilot"
      startHint="Напишите, что нужно сделать с сайтом" />
    <ChatInput :isConnected @send="handleSend" />
  </div>

  <!-- КЛИЕНТ: сайдбар + хедер + сообщения + ввод -->
  <div v-else class="client-layout">
    <aside class="client-sidebar">
      <div class="cs-header">
        <div class="cs-brand"><span class="cs-logo">🎯</span><span class="cs-title">AI Pilot</span></div>
        <button class="cs-theme-btn" @click="authStore.setTheme(authStore.theme === 'dark' ? 'light' : 'dark')" :title="authStore.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
          <svg v-if="authStore.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
      <div v-if="sitesStore.currentSite" class="cs-site">🟢 {{ sitesStore.currentSite.name }}</div>
      <div class="cs-divider"></div>
      <div class="cs-section-title">История</div>
      <div class="cs-history">
        <div v-if="currentSiteConversations.length === 0" class="cs-empty">Нет обращений</div>
        <div v-for="conv in currentSiteConversations" :key="conv.id" class="cs-conv">
          <div class="cs-conv-title">{{ conv.title }}</div>
          <div class="cs-conv-preview">{{ conv.preview }}</div>
        </div>
      </div>
      <div class="cs-footer">
        <ThemeToggle />
        <button class="cs-logout-btn" @click="handleLogout">← Выйти</button>
      </div>
    </aside>
    <div class="client-main">
      <div class="chat-header">
        <div class="connection-status">
          <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
          <span class="status-text">{{ isConnected ? 'Подключено' : 'Нет соединения' }}</span>
        </div>
        <button v-if="error" class="btn-reconnect" @click="handleReconnect">🔁</button>
      </div>
      <MessageArea ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        clientMode startTitle="Чем могу помочь?"
        startHint="Я AI-ассистент вашего сайта." />
      <ChatInput :isConnected @send="handleSend" />
    </div>
  </div>
</template>

<style scoped>
/* === Admin Chat === */
.chat-window {
  height: 100%; display: flex; flex-direction: column;
  background: var(--bg-primary); width: 100%;
}
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; background: var(--bg-primary);
}
.chat-header-left, .chat-header-right { display: flex; align-items: center; gap: 10px; }
.chat-title { font-size: var(--typography-h3-size); color: var(--text-primary); margin: 0; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--color-error);
  transition: background 0.3s;
}
.status-dot--online { background: var(--color-success); box-shadow: 0 0 4px color-mix(in srgb, var(--color-success) 50%, transparent); }
.status-text { font-size: var(--typography-body-small); color: var(--text-quaternary); }
.badge {
  font-size: var(--typography-body-small); color: var(--text-secondary);
  padding: 4px 12px; background: var(--bg-tertiary); border-radius: 16px; font-weight: 500;
}
.btn-reconnect {
  border: none; background: var(--bg-tertiary); color: var(--text-secondary);
  padding: 6px 12px; border-radius: var(--border-radius-sm); cursor: pointer;
  font-size: 14px; transition: background 0.12s;
}
.btn-reconnect:hover { background: var(--bg-hover); }

/* === Client Layout === */
.client-layout { height: 100%; display: flex; width: 100%; }
.client-sidebar {
  width: 220px; flex-shrink: 0; background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color); display: flex; flex-direction: column;
}
.cs-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 12px 12px 16px; }
.cs-brand { display: flex; align-items: center; gap: 8px; }
.cs-logo { font-size: 22px; }
.cs-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.cs-theme-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: var(--border-radius-sm); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-primary); transition: all 0.15s;
}
.cs-theme-btn:hover { background: color-mix(in srgb, var(--color-primary) 12%, transparent); }
.cs-theme-btn svg { display: block; }
.cs-site { padding: 8px 16px; font-size: var(--typography-body-small); color: var(--text-secondary); }
.cs-divider { height: 1px; background: var(--border-color); margin: 8px 12px; }
.cs-section-title {
  font-size: var(--typography-caps-size); font-weight: var(--typography-caps-weight);
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-quaternary);
  padding: 4px 16px 8px;
}
.cs-history { flex: 1; overflow-y: auto; padding: 0 8px; }
.cs-empty { font-size: var(--typography-body-small); color: var(--text-quaternary); text-align: center; padding: 20px; }
.cs-conv { padding: 10px 8px; border-radius: var(--border-radius-sm); cursor: pointer; transition: background 0.12s; }
.cs-conv:hover { background: var(--bg-hover); }
.cs-conv-title { font-size: var(--typography-body-small); font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-conv-preview { font-size: 11px; color: var(--text-quaternary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
.cs-footer { padding: 12px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; }
.cs-theme-btn { width: 32px; height: 32px; border: none; background: transparent; border-radius: var(--border-radius-sm); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.cs-theme-btn:hover { background: var(--bg-hover); }
.cs-logout-btn { border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: var(--typography-body-small); padding: 6px 10px; border-radius: var(--border-radius-sm); transition: 0.12s; }
.cs-logout-btn:hover { background: var(--bg-hover); color: var(--color-error); }
.client-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

/* ============ Mobile ============ */
@media (max-width: 767px) {
  .chat-header {
    padding: 12px 16px 12px 56px; /* room for burger */
  }

  .client-layout {
    flex-direction: column;
  }

  .client-sidebar {
    display: none;
  }

  .chat-messages {
    padding: 12px;
  }

  .bubble {
    max-width: 90%;
  }

  .chat-input-wrapper {
    padding: 8px 12px;
  }

  .chat-input {
    font-size: var(--typography-button-size);
  }
}
</style>
