<script setup>
import { onMounted, ref, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chatStore'
import { useSitesStore } from '../stores/sitesStore'
import { useAuthStore } from '../stores/authStore'
import MessageBubble from './MessageBubble.vue'
import SiteSelector from './SiteSelector.vue'
import TypingIndicator from './TypingIndicator.vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const chatStore = useChatStore()
const sitesStore = useSitesStore()
const authStore = useAuthStore()
const messageInput = ref('')
const messagesContainer = ref(null)

onMounted(() => {
  chatStore.connect()
  sitesStore.fetchSites()
})

watch(() => chatStore.messages.length, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

function handleSend() {
  const text = messageInput.value.trim()
  if (!text) return
  chatStore.send(text)
  messageInput.value = ''
}

function handleLogout() {
  chatStore.disconnect()
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
        <div v-if="!chatStore.isConnected" class="connecting">
          Подключение к серверу...
        </div>
        <MessageBubble
          v-for="(msg, i) in chatStore.messages"
          :key="i"
          :message="msg"
        />
        <div v-if="chatStore.streamingContent" class="streaming">
          {{ chatStore.streamingContent }}
        </div>
        <TypingIndicator v-if="chatStore.isLoading && !chatStore.streamingContent" />
      </div>
    </template>
    <template #footer>
      <div class="input-area">
        <InputText
          v-model="messageInput"
          placeholder="Напишите сообщение..."
          class="chat-input"
          @keyup.enter="handleSend"
          :disabled="!chatStore.isConnected"
        />
        <Button
          icon="pi pi-send"
          @click="handleSend"
          :disabled="!chatStore.isConnected || !messageInput.trim()"
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
