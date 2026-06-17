<script setup>
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

/** User initials from name */
const userInitials = computed(() => {
  const name = props.message.userName || ''
  if (!name) return 'В'
  return name.charAt(0).toUpperCase()
})

/** Format time */
const formattedTime = computed(() => {
  return props.message.time || ''
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
    <!-- Assistant message: avatar left, content right -->
    <template v-if="!isUser(message) && !isSystem(message)">
      <img
        src="/img/logo-aipilot-v2.png"
        alt="AI Pilot"
        class="bubble-avatar-img"
      />
      <div class="bubble-body">
        <div class="bubble-content">
          <div v-html="renderedContent"></div>
          <div v-if="formattedTime" class="bubble-time">{{ formattedTime }}</div>
        </div>
        <!-- Action buttons for assistant messages -->
        <div class="bubble-actions">
          <button class="action-btn" aria-label="Listen" title="Прослушать">
            <svg viewBox="0 0 24 24" class="action-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
              <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
            </svg>
          </button>
          <button class="action-btn" aria-label="Copy" title="Копировать" @click="navigator.clipboard?.writeText(message.content)">
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
    </template>

    <!-- User message: content left, avatar right -->
    <template v-else-if="isUser(message)">
      <div class="bubble-body bubble-body--user">
        <div class="bubble-content">
          <div v-html="renderedContent"></div>
          <div v-if="formattedTime" class="bubble-time">{{ formattedTime }}</div>
        </div>
      </div>
      <div class="bubble-avatar-circle">
        {{ userInitials }}
      </div>
    </template>

    <!-- System message -->
    <template v-else>
      <div class="bubble-content bubble-content--system">
        <div v-html="renderedContent"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bubble {
  display: flex;
  gap: 12px;
  max-width: 85%;
  word-wrap: break-word;
  position: relative;
}

/* Assistant: left-aligned with fade-in */
.bubble-assistant {
  align-self: flex-start;
  animation: fadeIn 0.2s ease-out;
}

/* User: right-aligned with slide-in */
.bubble-user {
  align-self: flex-end;
  animation: slideInRight 0.25s ease-out;
}

/* System: centered */
.bubble-system {
  align-self: center;
  max-width: 70%;
  opacity: 0.7;
}

/* Avatar images */
.bubble-avatar-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 2px;
}

/* User avatar circle with initials */
.bubble-avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}

/* Bubble body container */
.bubble-body {
  max-width: 560px;
  min-width: 0;
}

.bubble-body--user {
  margin-left: auto;
  max-width: 420px;
}

/* Content bubble */
.bubble-content {
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

/* Assistant content: white bg, rounded-2xl rounded-tl-md */
.bubble-assistant .bubble-content {
  background: var(--chat-assistant-bg);
  color: var(--chat-assistant-color);
  border-radius: 16px;
  border-top-left-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  outline: 1px solid rgba(0, 0, 0, 0.05);
}

/* User content: accent bg, rounded-2xl rounded-tr-md */
.bubble-user .bubble-content {
  background: var(--chat-user-bg);
  color: var(--chat-user-color);
  border-radius: 16px;
  border-top-right-radius: 6px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

/* System content */
.bubble-content--system {
  background: transparent;
  color: var(--text-tertiary);
  text-align: center;
  padding: 4px 8px;
  font-size: 12px;
}

/* Time */
.bubble-time {
  font-size: 12px;
  color: var(--text-quaternary);
  text-align: right;
  margin-top: 4px;
}

.bubble-user .bubble-time {
  color: rgba(255, 255, 255, 0.6);
}

/* Action buttons */
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

/* Proposals */
.bubble-proposals {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

/* === Animations === */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
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

/* === Mobile === */
@media (max-width: 767px) {
  .bubble {
    max-width: 95%;
  }
  .bubble-body {
    max-width: 100%;
  }
  .bubble-body--user {
    max-width: 100%;
  }
}
</style>
