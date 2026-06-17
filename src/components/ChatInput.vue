<script setup>
/**
 * ChatInput.vue — light theme from chat-layout.html
 */
import { ref, computed } from 'vue'

const emit = defineEmits(['send'])
const props = defineProps({
  isConnected: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Напишите сообщение…' }
})

const messageInput = ref('')
const textareaRef = ref(null)

function autoResize() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 144) + 'px'
  }
}

function handleSend() {
  const text = messageInput.value.trim()
  if (!text || !props.isConnected) return
  emit('send', text)
  messageInput.value = ''
  autoResize()
}

function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

defineExpose({ messageInput })
</script>

<template>
  <footer class="shrink-0 px-4 py-3 border-t border-slate-800 /80 backdrop-blur-sm">
    <div
      class="flex items-end gap-2 bg-slate-950 border border-slate-700/60 rounded-2xl px-4 py-3 transition-colors max-w-3xl mx-auto"
      :class="{
        'border-blue-500/40 ring-1 ring-blue-500/20': messageInput.trim() && isConnected && !isLoading,
        'opacity-60 cursor-not-allowed': !isConnected
      }"
    >
      <textarea
        v-model="messageInput"
        ref="textareaRef"
        rows="1"
        :placeholder="isConnected ? (isLoading ? 'Ожидайте ответа…' : placeholder) : 'Нет соединения…'"
        :disabled="!isConnected || isLoading"
        class="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none leading-relaxed max-h-32"
        @input="autoResize"
        @keydown="handleKeydown"
      ></textarea>

      <!-- Disabled: no text -->
      <button
        v-if="!messageInput.trim() && !isLoading"
        disabled
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-700 text-slate-600 cursor-not-allowed transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- Active: has text -->
      <button
        v-else-if="messageInput.trim() && !isLoading"
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
        @click="handleSend"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </button>

      <!-- Loading: spinner -->
      <button
        v-else
        disabled
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600/50 text-white/70 cursor-wait"
      >
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </button>
    </div>
  </footer>
</template>
