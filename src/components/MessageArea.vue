<script setup>
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'

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
</script>

<template>
  <div class="messages-area" ref="container">
    <div v-if="error && !isConnected" class="error-banner">⚠️ {{ error.message || error }}</div>

    <div v-if="!isConnected && !error" class="connecting">
      <div class="connecting-spinner"></div>
      <p>Подключаюсь к серверу...</p>
    </div>

    <div v-if="messages.length === 0 && isConnected" class="chat-start">
      <div class="start-logo">🎯</div>
      <p class="start-title">{{ startTitle }}</p>
      <p class="start-hint" v-if="startHint">{{ startHint }}</p>
    </div>

    <MessageBubble
      v-for="msg in messages" :key="msg.id"
      :message="msg"
      @approve-action="(id) => emit('approve-action', id)"
      @reject-action="(id) => emit('reject-action', id)"
    />

    <div v-if="streamingContent" class="streaming-bubble">
      <div class="bubble-avatar">🤖</div>
      <div class="streaming-text">{{ streamingContent }}</div>
    </div>

    <TypingIndicator v-if="isLoading && !streamingContent" />
  </div>
</template>

<style scoped>
.messages-area {
  flex: 1; overflow-y: auto; padding: 20px 24px;
  display: flex; flex-direction: column; gap: 16px;
}
.error-banner {
  padding: 10px 16px; background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error); border-radius: var(--border-radius-sm);
  font-size: var(--typography-body-small); line-height: 1.4;
}
.connecting {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; color: var(--text-tertiary);
}
.connecting-spinner {
  width: 24px; height: 24px; border: 2px solid var(--border-color);
  border-top-color: var(--color-primary); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.connecting p { margin: 0; font-size: var(--typography-body-size); }
.chat-start {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; padding: 40px 24px;
}
.start-logo { font-size: 56px; margin-bottom: 20px; line-height: 1; }
.start-title { font-size: var(--typography-h3-size); color: var(--text-primary); margin: 0 0 8px; }
.start-hint { font-size: var(--typography-body-size); color: var(--text-tertiary); line-height: 1.6; margin: 0; }
.streaming-bubble { display: flex; gap: 8px; align-self: flex-start; max-width: 85%; }
.streaming-text {
  padding: 10px 14px; background: var(--chat-assistant-bg);
  border: 1px solid var(--chat-assistant-border);
  border-radius: var(--border-radius-md); border-bottom-left-radius: 4px;
  color: var(--chat-assistant-color); font-size: var(--typography-body-size);
  line-height: 1.6; white-space: pre-wrap;
}
.bubble-avatar {
  width: 28px; height: 28px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; background: var(--bg-tertiary);
  font-size: 14px; flex-shrink: 0; margin-top: 2px;
}
</style>
