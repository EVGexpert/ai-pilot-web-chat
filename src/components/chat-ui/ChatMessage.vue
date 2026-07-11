<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import MessageActions from './MessageActions.vue'
import ActionProposalCard from '../ActionProposalCard.vue'

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true,
})

const props = defineProps({
  message: { type: Object, default: () => ({}) },
  assistantAvatar: { type: String, default: '/img/logo-aipilot-v2.png' },
  userAvatar: { type: String, default: '' },
  showAssistantActions: { type: Boolean, default: true },
  theme: { type: String, default: 'light' }
})

const emit = defineEmits(['listen', 'copy', 'like', 'dislike', 'approve-action', 'reject-action'])

/** Render markdown content as safe HTML */
const renderedContent = computed(() => {
  const raw = props.message.content || ''
  if (!raw) return ''

  // User messages — plain text
  if (props.message.role === 'user') {
    return DOMPurify.sanitize(raw)
  }

  // Assistant/system messages — parse markdown
  const html = marked.parse(raw)
  return DOMPurify.sanitize(html)
})

function isAssistant(msg) {
  return msg.role === 'assistant' || msg.role === 'system'
}

function isUser(msg) {
  return msg.role === 'user'
}
</script>

<template>
  <!-- ========== ASSISTANT Message ========== -->
  <div v-if="message.type === 'loading' || (isAssistant(message) && message.type !== 'loading')" class="flex items-start gap-3 animate-fade-in">
    <img
      v-if="message.type !== 'loading'"
      :src="assistantAvatar"
      alt=""
      class="size-9 shrink-0 rounded-full object-cover"
    />
    <div v-else class="size-9 shrink-0 rounded-full flex items-center justify-center bg-gray-200">
      <svg class="size-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
      </svg>
    </div>

    <div class="max-w-[500px]">
      <!-- Loading dots (typing indicator) -->
      <div v-if="message.type === 'loading'" class="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
        <div class="flex gap-1">
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot" style="animation-delay: -0.32s;"></span>
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot" style="animation-delay: -0.16s;"></span>
          <span class="w-2 h-2 rounded-full bg-gray-400 animate-pulse-dot"></span>
        </div>
      </div>

      <!-- Normal content -->
      <div v-else class="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5">
        <div v-html="renderedContent" class="prose-content"></div>
        <div v-if="message.time" class="mt-2 flex items-center justify-end gap-1 text-xs text-gray-400">{{ message.time }}</div>
      </div>

      <!-- Action buttons -->
      <MessageActions
        v-if="showAssistantActions && message.type !== 'loading' && isAssistant(message)"
        :messageId="message.id"
        :theme="theme"
        @listen="emit('listen', $event)"
        @copy="emit('copy', $event)"
        @like="emit('like', $event)"
        @dislike="emit('dislike', $event)"
      />

      <!-- Action Proposal Cards -->
      <div v-if="message.actions && message.actions.length" class="mt-2">
        <ActionProposalCard
          v-for="action in message.actions"
          :key="action.id"
          :action="action"
          @approve="(id) => emit('approve-action', id)"
          @reject="(id) => emit('reject-action', id)"
        />
      </div>
    </div>
  </div>

  <!-- ========== USER Message ========== -->
  <div v-else-if="isUser(message)" class="flex items-start justify-end gap-3 animate-slide-in">
    <!-- Link card -->
    <template v-if="message.type === 'link'">
      <div class="w-full max-w-[420px]">
        <div class="overflow-hidden rounded-2xl rounded-tr-md bg-accent text-white shadow-lg shadow-accent/20">
          <div class="flex items-start justify-between gap-4 bg-black/10 px-4 py-3">
            <div>
              <p class="text-sm font-semibold">{{ message.link?.title || 'External Link Title' }}</p>
              <p class="mt-1 text-xs text-white/60">{{ message.link?.description || 'External link description' }}</p>
            </div>
            <svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span class="truncate">{{ message.link?.url || 'https://www.externallink.com' }}</span>
            <span class="flex shrink-0 items-center gap-1 text-xs text-white/60">{{ message.time || '' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Voice message -->
    <template v-else-if="message.type === 'voice'">
      <div class="max-w-[420px]">
        <div class="flex items-center gap-3 rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-white shadow-lg shadow-accent/20">
          <button type="button" class="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-accent" aria-label="Play voice message">
            <svg viewBox="0 0 24 24" class="size-4 fill-current">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
          <div class="flex h-8 flex-1 items-center gap-0.5">
            <span class="h-3 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/80"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-7 w-0.5 rounded-full bg-white"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-8 w-0.5 rounded-full bg-white"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-7 w-0.5 rounded-full bg-white"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/80"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-8 w-0.5 rounded-full bg-white"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1 text-xs">
            <span>{{ message.voice?.duration || message.duration || '02:12' }}</span>
            <span class="inline-flex items-center gap-1 text-white/60">{{ message.time || '' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Text message -->
    <template v-else>
      <div class="max-w-[420px]">
        <div class="rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-accent/20">
          <p>{{ message.content }}</p>
          <span v-if="message.time" class="ml-2 whitespace-nowrap text-xs text-white/60">{{ message.time }}</span>
        </div>
      </div>
    </template>

    <img
      :src="userAvatar || '/img/user-img.png'"
      alt=""
      class="size-9 shrink-0 rounded-full object-cover"
    />
  </div>
</template>

<style scoped>
/* Prose content styling for markdown */
.prose-content :deep(h1),
.prose-content :deep(h2),
.prose-content :deep(h3),
.prose-content :deep(h4) {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.3;
}
.prose-content :deep(h1) { font-size: 1.3em; }
.prose-content :deep(h2) { font-size: 1.15em; }
.prose-content :deep(h3) { font-size: 1.05em; }
.prose-content :deep(p) { margin: 0 0 8px; }
.prose-content :deep(p:last-child) { margin-bottom: 0; }
.prose-content :deep(ul),
.prose-content :deep(ol) { margin: 4px 0 8px; padding-left: 20px; }
.prose-content :deep(li) { margin-bottom: 3px; }
.prose-content :deep(li:last-child) { margin-bottom: 0; }
.prose-content :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-radius: 0 0.375rem 0.375rem 0;
  color: var(--text-secondary);
}
.prose-content :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  padding: 1px 5px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--text-primary) 10%, transparent);
  color: var(--text-primary);
}
.prose-content :deep(pre) {
  margin: 8px 0;
  padding: 12px 14px;
  border-radius: 0.5rem;
  background: var(--code-bg, #1e1e2e);
  overflow-x: auto;
  font-size: var(--typography-body-small);
  line-height: 1.5;
  border: 1px solid var(--border-color);
}
.prose-content :deep(pre code) {
  padding: 0;
  background: none;
  color: inherit;
  font-size: inherit;
}
.prose-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: var(--typography-body-small);
}
.prose-content :deep(th),
.prose-content :deep(td) {
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  text-align: left;
}
.prose-content :deep(th) {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  font-weight: 600;
}
.prose-content :deep(hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid var(--border-color);
}
.prose-content :deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  word-break: break-all;
}
.prose-content :deep(a:hover) { opacity: 0.8; }
.prose-content :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 8px 0;
}
.prose-content :deep(strong) { font-weight: 700; }
.prose-content :deep(del) { text-decoration: line-through; opacity: 0.6; }
.prose-content :deep(input[type="checkbox"]) { margin-right: 6px; }
.prose-content :deep(li.task-list-item) { list-style: none; margin-left: -20px; }

/* Pulse dot animation for loading */
@keyframes pulse-dot {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
.animate-pulse-dot {
  animation: pulse-dot 1.4s infinite ease-in-out both;
}
</style>