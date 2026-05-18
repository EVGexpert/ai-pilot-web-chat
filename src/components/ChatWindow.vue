<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { createGatewayClient } from '../api/gatewayClient'
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'

const props = defineProps({
  clientMode: {
    type: Boolean,
    default: false
  }
})

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const messageInput = ref('')
const textareaRef = ref(null)
const messagesContainer = ref(null)
const messages = ref([])
const isConnected = ref(false)
const isLoading = ref(false)
const streamingContent = ref('')
const error = ref(null)

const gatewayWs = import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru'
const chatBase = `${window.location.protocol}//${window.location.host}`
const httpBase = import.meta.env.VITE_GATEWAY_HTTP || chatBase

let client = null

function connect() {
  client = createGatewayClient({
    gateway: gatewayWs,
    httpBase,
    token: authStore.gatewayToken,
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

function handleReconnect() {
  error.value = null
  connect()
}

const currentSiteLabel = computed(() =>
  sitesStore.currentSite?.name || 'Не выбран'
)

// Авто-подбор высоты textarea
function autoResize() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }
}

connect()

onUnmounted(() => disconnect())

watch([messages, streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })
</script>

<template>
  <div class="chat-window">
    <!-- Шапка чата (админ) -->
    <template v-if="!clientMode">
      <div class="chat-header">
        <div class="chat-header-left">
          <h2 class="chat-title">Мой чат</h2>
          <div class="connection-status">
            <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
            <span class="status-text">{{ isConnected ? 'Подключено' : 'Нет соединения' }}</span>
          </div>
        </div>
        <div class="chat-header-right">
          <div class="current-site-badge" v-if="sitesStore.currentSite">
            🟢 <span>{{ sitesStore.currentSite.name }}</span>
          </div>
          <button v-if="error" class="reconnect-btn" @click="handleReconnect">
            🔄 Переподключиться
          </button>
        </div>
      </div>
    </template>

    <!-- Шапка чата (клиент) -->
    <template v-else>
      <div class="chat-header client-header">
        <div class="chat-header-left">
          <span class="chat-logo">🎯</span>
          <h2 class="chat-title">AI Pilot</h2>
          <div class="connection-status">
            <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
          </div>
        </div>
        <div class="chat-header-right">
          <button v-if="error" class="reconnect-btn" @click="handleReconnect">
            🔄 Переподключиться
          </button>
        </div>
      </div>
    </template>

    <!-- Сообщения -->
    <div class="messages-area" ref="messagesContainer">
      <div v-if="error && !isConnected" class="error-banner">
        ⚠️ {{ error.message || error }}
      </div>

      <div v-if="!isConnected && !error" class="connecting">
        <div class="connecting-spinner"></div>
        <p>Подключаюсь к серверу...</p>
      </div>

      <!-- Приветствие для незалогиненного (обычно не покажется, но на всякий) -->
      <div v-if="messages.length === 0 && isConnected && clientMode" class="chat-start">
        <div class="start-logo">🎯</div>
        <p class="start-title">Чем могу помочь?</p>
        <p class="start-hint">
          Я AI-ассистент вашего сайта.<br/>
          <span class="start-examples">Могу обновить контент, добавить страницы, настроить плагины и многое другое.</span>
        </p>
      </div>

      <div v-if="messages.length === 0 && isConnected && !clientMode" class="chat-start">
        <div class="start-logo">🎯</div>
        <p class="start-title">Добро пожаловать в AI Pilot</p>
        <p class="start-hint">
          Напишите, что нужно сделать с сайтом<br/>
          <span class="start-examples">Например: «обнови заголовок на главной» или «добавь страницу контактов»</span>
        </p>
      </div>

      <MessageBubble
        v-for="msg in messages"
        :key="msg.id"
        :message="msg"
      />

      <div v-if="streamingContent" class="streaming-bubble">
        <div class="bubble-avatar">🤖</div>
        <div class="streaming-text">{{ streamingContent }}</div>
      </div>

      <TypingIndicator v-if="isLoading && !streamingContent" />
    </div>

    <!-- Поле ввода -->
    <div class="chat-footer">
      <div class="input-wrapper">
        <textarea
          v-model="messageInput"
          class="chat-input"
          :placeholder="isConnected ? 'Напишите сообщение...' : 'Нет соединения с сервером...'"
          @keydown.enter.prevent="handleSend"
          :disabled="!isConnected"
          rows="1"
          ref="textareaRef"
          @input="autoResize"
        ></textarea>
        <button
          class="send-btn"
          :class="{ 'send-btn--active': messageInput.trim() && isConnected }"
          :disabled="!isConnected || !messageInput.trim()"
          @click="handleSend"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-window {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
  width: 100%;
}

/* Header (admin) */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-primary);
}

.client-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.chat-logo {
  font-size: 24px;
  line-height: 1;
}

.chat-title {
  font-size: var(--typography-h3-size);
  font-weight: var(--typography-h3-weight);
  color: var(--text-primary);
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-error);
  transition: background 0.3s ease;
}

.status-dot--online {
  background: var(--color-success);
  box-shadow: 0 0 4px color-mix(in srgb, var(--color-success) 50%, transparent);
}

.status-text {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
}

.chat-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-site-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--typography-body-small);
  color: var(--text-secondary);
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 16px;
  font-weight: 500;
}

.reconnect-btn {
  border: none;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-size: var(--typography-body-small);
  font-family: var(--font-family);
  transition: background 0.12s;
}

.reconnect-btn:hover {
  background: var(--bg-hover);
}

/* Messages area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.error-banner {
  padding: 10px 16px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border-radius: var(--border-radius-sm);
  font-size: var(--typography-body-small);
  line-height: 1.4;
}

.connecting {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-tertiary);
}

.connecting-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.connecting p {
  margin: 0;
  font-size: var(--typography-body-size);
}

/* Start state */
.chat-start {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
}

.start-logo {
  font-size: 56px;
  margin-bottom: 20px;
  line-height: 1;
}

.start-title {
  font-size: var(--typography-h3-size);
  color: var(--text-primary);
  margin: 0 0 8px;
}

.start-hint {
  font-size: var(--typography-body-size);
  color: var(--text-tertiary);
  line-height: 1.6;
  margin: 0;
}

.start-examples {
  color: var(--text-quaternary);
  font-size: var(--typography-body-small);
}

/* Streaming */
.streaming-bubble {
  display: flex;
  gap: 8px;
  align-self: flex-start;
  max-width: 85%;
}

.streaming-text {
  padding: 10px 14px;
  background: var(--chat-assistant-bg);
  border: 1px solid var(--chat-assistant-border);
  border-radius: var(--border-radius-md);
  border-bottom-left-radius: 4px;
  color: var(--chat-assistant-color);
  font-size: var(--typography-body-size);
  line-height: 1.6;
  white-space: pre-wrap;
}

.bubble-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Footer / Input */
.chat-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-primary);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--chat-input-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 4px 4px 4px 16px;
  transition: border-color 0.15s;
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.chat-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  line-height: 1.5;
  padding: 8px 0;
  resize: none;
  outline: none;
  max-height: 120px;
}

.chat-input::placeholder {
  color: var(--text-quaternary);
}

.send-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: var(--bg-tertiary);
  color: var(--text-quaternary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.send-btn--active {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.send-btn--active:hover {
  background: var(--color-primary-hover);
}

.send-btn:disabled {
  cursor: not-allowed;
}
</style>
