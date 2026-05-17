<script setup>
import { ref, watch, nextTick } from 'vue'
import { useOpenClawChat } from 'openclaw-webchat-vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import MessageBubble from './MessageBubble.vue'
import SiteSelector from './SiteSelector.vue'
import TypingIndicator from './TypingIndicator.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const messageInput = ref('')
const messagesContainer = ref(null)

// useOpenClawChat — должен работать ВНУТРИ компонента (жизненный цикл Vue)
const {
  messages,
  isConnected,
  isLoading,
  streamingContent,
  error,
  send: chatSend
} = useOpenClawChat({
  gateway: import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru',
  token: authStore.token,
  autoConnect: true
})

// Автоскролл вниз
watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}, { deep: true })

function handleSend() {
  const text = messageInput.value.trim()
  if (!text || !isConnected.value) return
  chatSend(text)
  messageInput.value = ''
}

function handleLogout() {
  authStore.logout()
}
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
        <div v-if="!isConnected" class="connecting">
          Подключаюсь к серверу...
        </div>
        <div v-if="error" class="error-banner">
          ⚠️ {{ error.message }}
        </div>
        <MessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
        />
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
.input-area {
  display: flex;
  gap: 0.5rem;
}
.chat-input {
  flex: 1;
}
</style>
