<script setup>
/**
 * MessageBubble.vue — light theme from chat-layout.html
 */
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ActionProposalCard from '../ActionProposalCard.vue'

marked.setOptions({ gfm: true, breaks: true })

const props = defineProps({
  message: { type: Object, required: true }
})

/**
 * SVG аватар ассистента — стилизованное перо как в дизайне
 */
const assistantAvatar = `
<svg class="size-9 shrink-0 rounded-full object-cover" viewBox="0 0 64 64" fill="none">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
  <path d="M18 46V38L38 18L46 26L26 46H18Z" fill="#3b82f6" stroke="#2563eb" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M38 18L46 26" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M18 46L16 52L22 50L26 46" fill="#3b82f6" stroke="#2563eb" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="22" cy="42" r="2" fill="white" opacity="0.6"/>
</svg>`

/**
 * SVG аватар пользователя — круглая иконка человека
 */
const userAvatar = `
<svg class="size-9 shrink-0 rounded-full object-cover" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="30" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
  <circle cx="32" cy="24" r="10" fill="#3b82f6" opacity="0.8"/>
  <path d="M14 50c0-8 8-14 18-14s18 6 18 14" fill="#3b82f6" opacity="0.8" stroke="#2563eb" stroke-width="1"/>
</svg>`

function isUser(msg) { return msg.role === 'user' }
function isSystem(msg) { return msg.role === 'system' }
function isAction(msg) { return msg.actions && msg.actions.length > 0 }

const emit = defineEmits(['approve-action', 'reject-action'])

const renderedContent = computed(() => {
  const raw = props.message.content || ''
  if (!raw) return ''
  if (isUser(props.message) || isSystem(props.message)) {
    return DOMPurify.sanitize(raw)
  }
  const html = marked.parse(raw)
  return DOMPurify.sanitize(html)
})
</script>

<template>
  <!-- Date separator -->
  <div v-if="isSystem(message)" class="flex justify-center animate-fade-in">
    <span class="text-xs text-gray-500 bg-gray-200 rounded-full px-4 py-1">
      {{ message.content }}
    </span>
  </div>

  <!-- User bubble -->
  <div v-else-if="isUser(message)" class="flex items-start justify-end gap-3 animate-slide-in">
    <div class="max-w-[420px] order-1">
      <div class="rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-accent/20">
        <div v-html="renderedContent" class="msg-content"></div>
        <div class="flex items-center justify-end gap-1 mt-2">
          <span v-if="message.time" class="text-[10px] text-white/60">{{ message.time }}</span>
        </div>
      </div>
    </div>
    <div v-html="userAvatar" class="order-2 shrink-0"></div>
  </div>

  <!-- Assistant with action proposal -->
  <div v-else-if="isAction(message)" class="flex items-start gap-3 animate-fade-in">
    <div v-html="assistantAvatar" class="shrink-0"></div>
    <div class="max-w-[500px]">
      <div class="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5">
        <div class="flex items-center gap-2 mb-2 text-gray-600">
          <span class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs font-bold">!</span>
          <span class="font-medium">Предлагаю действие</span>
        </div>
        <div v-html="renderedContent" class="msg-content"></div>
        <div v-if="message.actions && message.actions.length" class="mt-3 space-y-2">
          <ActionProposalCard
            v-for="action in message.actions"
            :key="action.id"
            :action="action"
            @approve="(id) => emit('approve-action', id)"
            @reject="(id) => emit('reject-action', id)"
          />
        </div>
        <div class="flex items-center justify-end gap-1 mt-2">
          <span v-if="message.time" class="text-xs text-gray-400">{{ message.time }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Assistant bubble (regular) -->
  <div v-else class="flex items-start gap-3 animate-fade-in">
    <div v-html="assistantAvatar" class="shrink-0"></div>
    <div class="max-w-[560px]">
      <div class="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5">
        <div v-html="renderedContent" class="msg-content"></div>
        <div class="flex items-center justify-end gap-1 mt-2">
          <span v-if="message.time" class="text-xs text-gray-400">{{ message.time }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.msg-content h1),
:deep(.msg-content h2),
:deep(.msg-content h3),
:deep(.msg-content h4),
:deep(.msg-content h5),
:deep(.msg-content h6) {
  color: #1f2937;
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
}
:deep(.msg-content h1) { font-size: 1.3em; }
:deep(.msg-content h2) { font-size: 1.15em; }
:deep(.msg-content h3) { font-size: 1.05em; }

:deep(.msg-content p) { margin: 0 0 8px; }
:deep(.msg-content p:last-child) { margin-bottom: 0; }

:deep(.msg-content ul),
:deep(.msg-content ol) {
  padding-left: 1.5rem;
  margin: 4px 0 8px;
}
:deep(.msg-content li) { margin-bottom: 0.25rem; }
:deep(.msg-content li:last-child) { margin-bottom: 0; }

:deep(.msg-content blockquote) {
  border-left: 3px solid rgba(37, 99, 235, 0.3);
  padding-left: 1rem;
  background: rgba(37, 99, 235, 0.04);
  margin: 8px 0;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #4b5563;
}

:deep(.msg-content code) {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.75rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.06);
  color: #1f2937;
}

:deep(.msg-content pre) {
  background: rgba(0, 0, 0, 0.05) !important;
  border-radius: 0.75rem;
  padding: 0.75rem;
  overflow-x: auto;
  margin: 8px 0;
  line-height: 1.5;
  border: 1px solid #e5e7eb;
}
:deep(.msg-content pre code) {
  padding: 0;
  background: none;
  color: inherit;
  font-size: inherit;
  border-radius: 0;
}

:deep(.msg-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 0.75rem;
}
:deep(.msg-content th) {
  background: rgba(0, 0, 0, 0.05);
  color: #2563eb;
  font-weight: 600;
}
:deep(.msg-content td),
:deep(.msg-content th) {
  padding: 0.5rem;
  border: 1px solid #e5e7eb;
  text-align: left;
}

:deep(.msg-content a) {
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}
:deep(.msg-content a:hover) { color: #1d4ed8; }

:deep(.msg-content hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}

:deep(.msg-content img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 8px 0;
}

:deep(.msg-content strong) { font-weight: 700; }

:deep(.msg-content del) {
  text-decoration: line-through;
  opacity: 0.6;
}

:deep(.msg-content li.task-list-item) {
  list-style: none;
  margin-left: -1.5rem;
}
:deep(.msg-content input[type="checkbox"]) {
  margin-right: 6px;
}
</style>
