<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { createGatewayClient } from '../api/gatewayClient'
import MessageBubble from './MessageBubble.vue'
import SiteSelector from './SiteSelector.vue'
import TypingIndicator from './TypingIndicator.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const messageInput = ref('')
const messagesContainer = ref(null)
const messages = ref([])
const isConnected = ref(false)
const isLoading = ref(false)
const streamingContent = ref('')
const error = ref(null)

// WebSocket всегда на pilotsite.ru (там Caddy проксирует на Gateway)
const gatewayWs = import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru'
// HTTP API — на текущем домене (чат.домен), Caddy прокинет /v1/* на Gateway
const chatBase = `${window.location.protocol}//${window.location.host}`
const httpBase = import.meta.env.VITE_GATEWAY_HTTP || chatBase

let client = null

function connect() {
  client = createGatewayClient({
    gateway: gatewayWs,
    httpBase: httpBase,
    token: authStore.token,
    onConnected: () => {
      isConnected.value = true
      error.value = null
    },
    onDisconnected: () => {
      isConnected.value = false
    },
    onMessage: (msg) => {
      messages.value = [...messages.value, { id: `msg-${Date.now()}`, ...msg }]
      isLoading.value = false
      streamingContent.value = ''
    },
    onStreamChunk: (chunk, type) => {
      if (type === 'start') {
        isLoading.value = true
        streamingContent.value = ''
      } else if (type === 'chunk') {
        streamingContent.value += chunk
      } else if (type === 'done') {
        isLoading.value = false
        streamingContent.value = ''
      }
    },
    onError: (err) => {
      error.value = err
      isConnected.value = false
    }
  })

  client.connect()
}

function disconnect() {
  client?.disconnect()
  client = null
}

function handleSend() {
  const text = messageInput.value.trim()
  if (!text || !client?.isConnected) return

  const userMsg = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: text
  }
  messages.value = [...messages.value, userMsg]
  messageInput.value = ''

  isLoading.value = true
  client.sendMessage(text).catch(err => {
    error.value = err
    isLoading.value = false
  })
}

function handleLogout() {
  disconnect()
  authStore.logout()
}

function handleReconnect() {
  error.value = null
  connect()
}

// Подключаемся при монтировании
connect()

// Отключаемся при размонтировании
onUnmounted(() => disconnect())

// Автоскролл
watch([messages, streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })
</script>

<template>
  <Card class="chat-card">
    <template #title>
      <div class="chat-header">
        <div class="chat-title-group">
          <span class="chat-icon">🎯</span>
          <span>AI Pilot</span>
          <span v-if="isConnected" class="status-badge connected">🟢</span>
          <span v-else class="status-badge disconnected">🔴</span>
        </div>
        <div class="chat-header-actions">
          <SiteSelector />
          <Button
            icon="pi pi-sign-out"
            severity="secondary"
            text
            @click="handleLogout"
            v-tooltip="'Выйти'"
          />
        </div>
      </div>
    </template>
    <template #content>
      <div class="messages-area" ref="messagesContainer">
        <div v-if="!isConnected && !error" class="connecting">
          Подключаюсь к серверу...
        </div>
        <div v-if="error" class="error-banner">
          ⚠️ {{ error.message }}
          <Button label="Повторить" icon="pi pi-refresh" severity="warning" size="small" @click="handleReconnect" class="retry-btn" />
        </div>
        <MessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />
        <div v-if="streamingContent" class="streaming">
          {{ streamingContent }}
        </div>
        <TypingIndicator v-if="isLoading && !streamingContent" />
      </div>
    </template>
    <template #footer>
      <div class="input-area">
        <InputText
          v-model="messageInput"
          placeholder="Напишите сообщение..."
          class="chat-input"
          @keyup.enter="handleSend"
          :disabled="!isConnected"
        />
        <Button
          icon="pi pi-send"
          @click="handleSend"
          :disabled="!isConnected || !messageInput.trim()"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.chat-card {
  width: 100%;
  max-width: 700px;
  height: 85vh;
  display: flex;
  flex-direction: column;
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chat-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.chat-icon {
  font-size: 1.3rem;
}
.status-badge {
  font-size: 0.8rem;
}
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.connecting {
  text-align: center;
  color: #999;
  padding: 2rem;
}
.error-banner {
  text-align: center;
  color: #d32f2f;
  padding: 0.5rem;
  background: #ffebee;
  border-radius: 8px;
  font-size: 0.85rem;
}
.streaming {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 12px;
  align-self: flex-start;
  max-width: 80%;
  word-wrap: break-word;
}
.input-area {
  display: flex;
  gap: 0.5rem;
}
.chat-input {
  flex: 1;
}
</style>
