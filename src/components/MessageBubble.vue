<script setup>
/**
 * MessageBubble.vue
 * Бабл сообщения по дизайну chat-layout.html:
 *   - Ассистент: avatar слева + content + время + actions
 *   - Пользователь: content + avatar справа
 *   - Системное сообщение по центру
 *   - Markdown рендеринг через marked + DOMPurify
 *   - Action proposal card
 */
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ActionProposalCard from './ActionProposalCard.vue'

marked.setOptions({
  gfm: true,
  breaks: true,
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

defineEmits(['approve-action', 'reject-action'])

const renderedContent = computed(() => {
  const raw = props.message.content || ''
  if (!raw) return ''
  if (isUser(props.message) || isSystem(props.message)) {
    return DOMPurify.sanitize(raw)
  }
  const html = marked.parse(raw)
  return DOMPurify.sanitize(html)
})

function formatTime(msg) {
  if (!msg.time) return ''
  return msg.time
}

/** Copy message content to clipboard */
function copyContent() {
  navigator.clipboard?.writeText(props.message.content || '')
}
</script>

<template>
  <!-- System message -->
  <div v-if="isSystem(message)" class="bubble-system animate-fade-in">
    <div class="system-divider">{{ message.content }}</div>
  </div>

  <!-- Assistant message -->
  <div v-else-if="!isUser(message)" class="bubble-assistant animate-fade-in">
    <img
      src="/img/logo-aipilot-v2.png"
      alt="AI Pilot"
      class="bubble-avatar"
    />
    <div class="bubble-body">
      <div class="bubble-content bubble-content--assistant">
        <div v-html="renderedContent"></div>
        <div v-if="message.time" class="bubble-time-inline">{{ formatTime(message) }}</div>
      </div>
      <!-- Action buttons -->
      <div class="bubble-actions">
        <button class="action-btn" aria-label="Listen" title="Прослушать">
          <svg viewBox="0 0 24 24" class="action-icon" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
          </svg>
        </button>
        <button class="action-btn" aria-label="Copy" title="Копировать" @click="copyContent">
          <svg viewBox="0 0 24 24" class="action-icon" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="8" y="8" width="12" height="12" rx="2"></rect>
            <path d="M4 16V6a2 2 0 0 1 2-2h10"></path>
          </svg>
        </button>
        <button class="action-btn" aria-label="Regenerate" title="Перегенерировать">
          <svg viewBox="0 0 24 24" class="action-icon" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 0 1-15.5 6.3"></path>
            <path d="M3 12A9 9 0 0 1 18.5 5.7"></path>
            <path d="M18 3v4h4"></path>
            <path d="M6 21v-4H2"></path>
          </svg>
        </button>
        <button class="action-btn" aria-label="Dislike" title="Дизлайк">
          <svg viewBox="0 0 24 24" class="action-icon" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 14V2"></path>
            <path d="M9 18.1 10 14H4.8a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6.2 3H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3.4a2 2 0 0 0-1.7 1l-3 5a2 2 0 0 1-3.6-1.9Z"></path>
          </svg>
        </button>
      </div>
      <!-- Action Proposal Cards -->
      <div v-if="message.actions && message.actions.length" class="bubble-proposals">
        <ActionProposalCard
          v-for="action in message.actions"
          :key="action.id"
          :action="action"
          @approve="(id) => $emit('approve-action', id)"
          @reject="(id) => $emit('reject-action', id)"
        />
      </div>
    </div>
  </div>

  <!-- User message -->
  <div v-else class="bubble-user animate-slide-in">
    <div class="bubble-body">
      <div class="bubble-content bubble-content--user">
        <div v-html="renderedContent"></div>
      </div>
      <div v-if="message.time" class="bubble-time-user">{{ formatTime(message) }}</div>
    </div>
    <img
      src="/img/user-img.png"
      alt=""
      class="bubble-avatar"
    />
  </div>
</template>

<style scoped>
/* === Layout === */
.bubble-assistant,
.bubble-user,
.bubble-system {
  display: flex;
  gap: 12px;
  max-width: 85%;
  word-wrap: break-word;
  position: relative;
}

.bubble-assistant {
  align-self: flex-start;
}

.bubble-user {
  align-self: flex-end;
}

.bubble-system {
  align-self: center;
  max-width: 70%;
}

/* === Avatar === */
.bubble-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
}

/* === System === */
.system-divider {
  text-align: center;
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  background: color-mix(in srgb, var(--bg-tertiary) 80%, transparent);
  border-radius: 20px;
  padding: 4px 16px;
  display: inline-block;
}

/* === Body === */
.bubble-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 560px;
  min-width: 0;
}

.bubble-user .bubble-body {
  align-items: flex-end;
  max-width: 420px;
}

/* === Content bubbles === */
.bubble-content {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
}

/* Assistant: white bg, rounded-2xl rounded-tl-md */
.bubble-content--assistant {
  background: var(--chat-assistant-bg);
  color: var(--chat-assistant-color);
  border-radius: 16px;
  border-top-left-radius: 6px;
  box-shadow: var(--shadow-sm);
  outline: 1px solid var(--chat-assistant-border);
}

/* User: accent bg, rounded-2xl rounded-tr-md */
.bubble-content--user {
  background: var(--chat-user-bg);
  color: var(--chat-user-color);
  border-radius: 16px;
  border-top-right-radius: 6px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

/* === Time === */
.bubble-time-inline {
  font-size: 12px;
  color: var(--text-quaternary);
  text-align: right;
  margin-top: 4px;
}

.bubble-time-user {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

/* === Action buttons === */
.bubble-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 4px 0;
  color: var(--text-quaternary);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
  padding: 2px;
  transition: color 0.15s;
}

.action-btn:hover {
  color: var(--color-accent);
}

.action-icon {
  width: 20px;
  height: 20px;
}

/* === Proposals === */
.bubble-proposals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

/* === Markdown styling (deep selectors for v-html) === */
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
  border-left: 3px solid var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-radius: 0 8px 8px 0;
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

.bubble-user :deep(.bubble-content code) {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

:deep(.bubble-content pre) {
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--code-bg, #f1f1f4);
  overflow-x: auto;
  font-size: 12px;
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
  font-size: 12px;
}

:deep(.bubble-content th),
:deep(.bubble-content td) {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
}

:deep(.bubble-content th) {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  font-weight: 600;
}

:deep(.bubble-content hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}

:deep(.bubble-content a) {
  color: var(--color-accent);
  text-decoration: underline;
  word-break: break-all;
}

:deep(.bubble-content a:hover) {
  opacity: 0.8;
}

:deep(.bubble-content img) {
  max-width: 100%;
  border-radius: 8px;
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

:deep(.bubble-content li.task-list-item) {
  list-style: none;
  margin-left: -20px;
}

@media (max-width: 767px) {
  .bubble-assistant,
  .bubble-user {
    max-width: 95%;
  }
  .bubble-body {
    max-width: 100%;
  }
  .bubble-user .bubble-body {
    max-width: 100%;
  }
}
</style>
