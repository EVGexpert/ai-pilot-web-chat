<script setup>
const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

function isUser(msg) {
  return msg.role === 'user'
}

function isSystem(msg) {
  return msg.role === 'system'
}
</script>

<template>
  <div
    class="bubble"
    :class="{
      'bubble-user': isUser(message),
      'bubble-assistant': !isUser(message) && !isSystem(message),
      'bubble-system': isSystem(message)
    }"
  >
    <div class="bubble-header">
      <span class="bubble-avatar" :class="{ 'avatar-user': isUser(message) }">
        {{ isUser(message) ? 'Вы' : '🤖' }}
      </span>
      <span class="bubble-name">
        {{ isUser(message) ? 'Вы' : isSystem(message) ? 'Система' : 'AI Pilot' }}
      </span>
      <span v-if="message.time" class="bubble-time">{{ message.time }}</span>
    </div>
    <div class="bubble-content" v-html="message.content"></div>
    <!-- Action preview внутри сообщения ассистента -->
    <div v-if="message.actions && message.actions.length" class="bubble-actions">
      <div
        v-for="action in message.actions"
        :key="action.id"
        class="action-chip"
        :class="`action-${action.status || 'pending'}`"
      >
        <span class="action-icon">{{ action.icon || '⚡' }}</span>
        <span class="action-text">{{ action.label }}</span>
        <span v-if="action.status === 'completed'" class="action-done">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bubble {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  word-wrap: break-word;
  position: relative;
}

.bubble-user {
  align-self: flex-end;
}

.bubble-assistant {
  align-self: flex-start;
}

.bubble-system {
  align-self: center;
  max-width: 70%;
  opacity: 0.7;
}

/* Header */
.bubble-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bubble-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  flex-shrink: 0;
}

.avatar-user {
  background: var(--color-primary);
  color: var(--text-inverse);
}

.bubble-name {
  font-size: var(--typography-body-small);
  font-weight: 600;
  color: var(--text-secondary);
}

.bubble-time {
  font-size: 11px;
  color: var(--text-quaternary);
  margin-left: auto;
}

/* Content */
.bubble-content {
  padding: 10px 14px;
  border-radius: var(--border-radius-md);
  font-size: var(--typography-body-size);
  line-height: 1.6;
  position: relative;
}

.bubble-user .bubble-content {
  background: var(--chat-user-bg);
  color: var(--chat-user-color);
  border-bottom-right-radius: 4px;
}

.bubble-assistant .bubble-content {
  background: var(--chat-assistant-bg);
  color: var(--chat-assistant-color);
  border: 1px solid var(--chat-assistant-border);
  border-bottom-left-radius: 4px;
}

.bubble-system .bubble-content {
  background: transparent;
  color: var(--text-tertiary);
  text-align: center;
  padding: 4px 8px;
  font-size: var(--typography-body-small);
}

/* Actions */
.bubble-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 4px;
}

.action-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: var(--typography-body-small);
  font-weight: 500;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  cursor: default;
}

.action-pending {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-completed {
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  border-color: var(--color-success);
  color: var(--color-success);
}

.action-icon {
  font-size: 12px;
}

.action-done {
  font-weight: 700;
  font-size: 12px;
}
</style>
