<script setup>
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'
import { computed } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streamingContent: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: false },
  error: { default: null },
  startTitle: { type: String, default: 'Добро пожаловать' },
  startHint: { type: String, default: '' },
  clientMode: { type: Boolean, default: false }
})

const emit = defineEmits(['approve-action', 'reject-action'])

/** Group messages by date for dividers */
const messageGroups = computed(() => {
  if (!props.messages.length) return []
  const groups = []
  let currentDate = ''
  for (const msg of props.messages) {
    const msgDate = msg.date || ''
    if (msgDate !== currentDate) {
      groups.push({ date: msgDate, messages: [] })
      currentDate = msgDate
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
})
</script>

<template>
  <div class="messages-area scrollbar-thin">
    <div v-if="error && !isConnected" class="error-banner">⚠️ {{ error.message || error }}</div>

    <div v-if="!isConnected && !error" class="connecting">
      <div class="connecting-spinner"></div>
      <p>Подключаюсь к серверу...</p>
    </div>

    <div v-if="messages.length === 0 && isConnected" class="chat-start">
      <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="start-logo" />
      <p class="start-title">{{ startTitle }}</p>
      <p class="start-hint" v-if="startHint">{{ startHint }}</p>
    </div>

    <div class="messages-container">
      <!-- Date groups with dividers -->
      <template v-for="(group, gi) in messageGroups" :key="gi">
        <div v-if="group.date" class="date-divider">
          <span class="date-divider-text">{{ group.date }}</span>
        </div>
        <MessageBubble
          v-for="msg in group.messages"
          :key="msg.id"
          :message="msg"
          @approve-action="(id) => emit('approve-action', id)"
          @reject-action="(id) => emit('reject-action', id)"
        />
      </template>
    </div>

    <div v-if="streamingContent" class="streaming-bubble animate-fade-in">
      <img
        src="/img/logo-aipilot-v2.png"
        alt=""
        class="streaming-avatar"
      />
      <div class="streaming-text">{{ streamingContent }}</div>
    </div>

    <TypingIndicator v-if="isLoading && !streamingContent" />
  </div>
</template>

<style scoped>
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-container {
  margin: 0 auto;
  width: 100%;
  max-width: 64rem;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-banner {
  padding: 10px 16px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border-radius: 8px;
  font-size: 12px;
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
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.connecting p {
  margin: 0;
  font-size: 14px;
}

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
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 20px;
}

.start-title {
  font-size: 20px;
  color: var(--text-primary);
  margin: 0 0 8px;
  font-weight: 600;
}

.start-hint {
  font-size: 14px;
  color: var(--text-tertiary);
  line-height: 1.6;
  margin: 0;
}

.streaming-bubble {
  display: flex;
  gap: 12px;
  align-self: flex-start;
  max-width: 85%;
  margin: 0 auto;
  margin-left: calc((100% - 64rem) / 2);
}

@media (max-width: 1024px) {
  .streaming-bubble {
    margin-left: 0;
  }
}

.streaming-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
}

.streaming-text {
  padding: 12px 16px;
  background: var(--chat-assistant-bg);
  border-radius: 16px;
  border-top-left-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  outline: 1px solid rgba(0, 0, 0, 0.05);
  color: var(--chat-assistant-color);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* Date divider */
.date-divider {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.date-divider::before,
.date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.date-divider-text {
  font-size: 12px;
  color: var(--text-quaternary);
  white-space: nowrap;
}

/* Mobile */
@media (max-width: 767px) {
  .messages-area {
    padding: 8px 12px 24px;
  }
  .messages-container {
    max-width: 100%;
  }
  .chat-start {
    padding: 24px 16px;
  }
  .start-logo {
    width: 56px;
    height: 56px;
  }
}
</style>
