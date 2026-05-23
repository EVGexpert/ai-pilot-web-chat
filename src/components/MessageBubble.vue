<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Настройка marked
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown (таблицы, зачёркивание, ссылки)
  breaks: true,     // перенос строки → <br>
})

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

/** Рендерим содержимое сообщения как безопасный HTML из Markdown */
const renderedContent = computed(() => {
  const raw = props.message.content || ''
  if (!raw) return ''
  
  // Сообщения пользователя и системы — plain text (не парсим маркдаун от пользователя)
  if (isUser(props.message) || isSystem(props.message)) {
    return DOMPurify.sanitize(raw)
  }
  
  // Сообщения ассистента — парсим маркдаун
  const html = marked.parse(raw)
  return DOMPurify.sanitize(html)
})
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
    <div class="bubble-content" v-html="renderedContent"></div>
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

/* === Markdown styling (глубокие селекторы для v-html) === */
:deep(.bubble-content h1),
:deep(.bubble-content h2),
:deep(.bubble-content h3),
:deep(.bubble-content h4) {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
}

:deep(.bubble-content h1) { font-size: 1.3em; }
:deep(.bubble-content h2) { font-size: 1.15em; }
:deep(.bubble-content h3) { font-size: 1.05em; }

:deep(.bubble-content p) {
  margin: 0 0 8px;
}

:deep(.bubble-content p:last-child) {
  margin-bottom: 0;
}

:deep(.bubble-content ul),
:deep(.bubble-content ol) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

:deep(.bubble-content li) {
  margin-bottom: 3px;
}

:deep(.bubble-content li:last-child) {
  margin-bottom: 0;
}

:deep(.bubble-content blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
  color: var(--text-secondary);
}

:deep(.bubble-content code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-primary);
}

:deep(.bubble-content pre) {
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: var(--border-radius-md);
  background: var(--code-bg, #1e1e2e);
  overflow-x: auto;
  font-size: var(--typography-body-small);
  line-height: 1.5;
  border: 1px solid var(--border-color);
}

:deep(.bubble-content pre code) {
  padding: 0;
  background: none;
  color: inherit;
  font-size: inherit;
}

:deep(.bubble-content table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: var(--typography-body-small);
}

:deep(.bubble-content th),
:deep(.bubble-content td) {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
}

:deep(.bubble-content th) {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  font-weight: 600;
}

:deep(.bubble-content hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

:deep(.bubble-content a) {
  color: var(--color-primary);
  text-decoration: underline;
  word-break: break-all;
}

:deep(.bubble-content a:hover) {
  opacity: 0.8;
}

:deep(.bubble-content img) {
  max-width: 100%;
  border-radius: var(--border-radius-sm);
  margin: 8px 0;
}

:deep(.bubble-content strong) {
  font-weight: 700;
}

:deep(.bubble-content del) {
  text-decoration: line-through;
  opacity: 0.6;
}

:deep(.bubble-content input[type="checkbox"]) {
  margin-right: 6px;
}

/* Task list items */
:deep(.bubble-content li.task-list-item) {
  list-style: none;
  margin-left: -20px;
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
