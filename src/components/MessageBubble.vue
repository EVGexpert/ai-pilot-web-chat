<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import ActionProposalCard from './ActionProposalCard.vue'

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

function isAction(msg) {
  return msg.actions && msg.actions.length > 0
}

defineEmits(['approve-action', 'reject-action'])

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
  <!-- System message → date separator / pill -->
  <div v-if="isSystem(message)" class="flex justify-center py-2 animate-fade-in">
    <span class="text-xs light:text-gray-500 text-slate-500 light:bg-gray-100/80 bg-slate-800/50 rounded-full px-4 py-1">
      {{ message.content }}
    </span>
  </div>

  <!-- User bubble -->
  <div v-else-if="isUser(message)" class="flex justify-end animate-fade-in">
    <div class="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed shadow-lg">
      <div v-html="renderedContent" class="msg-content"></div>
      <span v-if="message.time" class="block text-[10px] text-blue-200 mt-1 text-right">{{ message.time }}</span>
    </div>
  </div>

  <!-- Assistant bubble with action proposal -->
  <div v-else-if="isAction(message)" class="flex justify-start animate-fade-in">
    <div class="max-w-[85%] light:bg-gray-100 bg-slate-800/80 border light:border-gray-200/60 border-slate-700/60 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed shadow-lg">
      <div class="flex items-center gap-2 mb-2 light:text-gray-600 text-slate-300">
        <span class="flex items-center justify-center w-6 h-6 rounded-full light:bg-amber-50 bg-amber-500/20 light:text-amber-600 text-amber-400 text-xs font-bold">!</span>
        <span class="font-medium">Предлагаю действие</span>
      </div>
      <div v-html="renderedContent" class="msg-content light:text-gray-600 text-slate-300"></div>
      <div v-if="message.actions && message.actions.length" class="mt-3 space-y-2">
        <ActionProposalCard
          v-for="action in message.actions"
          :key="action.id"
          :action="action"
          @approve="(id) => $emit('approve-action', id)"
          @reject="(id) => $emit('reject-action', id)"
        />
      </div>
      <span v-if="message.time" class="block text-[10px] light:text-gray-400 text-slate-600 mt-2">{{ message.time }}</span>
    </div>
  </div>

  <!-- Assistant bubble (regular) -->
  <div v-else class="flex justify-start animate-fade-in">
    <div class="max-w-[75%] light:bg-gray-100 bg-slate-800 light:text-gray-900 text-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed shadow-lg">
      <div v-html="renderedContent" class="msg-content"></div>
      <span v-if="message.time" class="block text-[10px] light:text-gray-500 text-slate-500 mt-1">{{ message.time }}</span>
    </div>
  </div>
</template>

<style scoped>
/* === Markdown deep-styles for dark bubbles === */

/* Headings */
:deep(.msg-content h1),
:deep(.msg-content h2),
:deep(.msg-content h3),
:deep(.msg-content h4),
:deep(.msg-content h5),
:deep(.msg-content h6) {
  color: #f1f5f9;
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
}
:deep(.msg-content h1) { font-size: 1.3em; }
:deep(.msg-content h2) { font-size: 1.15em; }
:deep(.msg-content h3) { font-size: 1.05em; }

/* Paragraphs */
:deep(.msg-content p) {
  margin: 0 0 8px;
}
:deep(.msg-content p:last-child) {
  margin-bottom: 0;
}

/* Lists */
:deep(.msg-content ul),
:deep(.msg-content ol) {
  padding-left: 1.5rem;
  margin: 4px 0 8px;
}
:deep(.msg-content li) {
  margin-bottom: 0.25rem;
}
:deep(.msg-content li:last-child) {
  margin-bottom: 0;
}

/* Blockquote */
:deep(.msg-content blockquote) {
  border-left: 3px solid rgba(59, 130, 246, 0.4);
  padding-left: 1rem;
  background: rgba(59, 130, 246, 0.05);
  margin: 8px 0;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #cbd5e1;
}

/* Inline code */
:deep(.msg-content code) {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.75rem;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.6);
  color: #e2e8f0;
}

/* Code blocks */
:deep(.msg-content pre) {
  background: rgba(15, 23, 42, 0.8) !important;
  border-radius: 0.75rem;
  padding: 0.75rem;
  overflow-x: auto;
  margin: 8px 0;
  line-height: 1.5;
}
:deep(.msg-content pre code) {
  padding: 0;
  background: none;
  color: inherit;
  font-size: inherit;
  border-radius: 0;
}

/* Tables */
:deep(.msg-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 0.75rem;
}
:deep(.msg-content th) {
  background: rgba(15, 23, 42, 0.6);
  color: #60a5fa;
  font-weight: 600;
}
:deep(.msg-content td),
:deep(.msg-content th) {
  padding: 0.5rem;
  border: 1px solid rgba(51, 65, 85, 0.5);
  text-align: left;
}

/* Links */
:deep(.msg-content a) {
  color: #60a5fa;
  text-decoration: underline;
  word-break: break-all;
}
:deep(.msg-content a:hover) {
  color: #93c5fd;
}

/* HR */
:deep(.msg-content hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid rgba(51, 65, 85, 0.5);
}

/* Images */
:deep(.msg-content img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 8px 0;
}

/* Strong */
:deep(.msg-content strong) {
  font-weight: 700;
}

/* Strikethrough */
:deep(.msg-content del) {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Task list */
:deep(.msg-content li.task-list-item) {
  list-style: none;
  margin-left: -1.5rem;
}
:deep(.msg-content input[type="checkbox"]) {
  margin-right: 6px;
}
</style>
