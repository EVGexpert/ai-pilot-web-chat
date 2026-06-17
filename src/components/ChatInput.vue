<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const props = defineProps({
  isConnected: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Напишите сообщение...' }
})

const messageInput = ref('')
const textareaRef = ref(null)

function autoResize() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
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
  <footer class="shrink-0 px-4 py-3 border-t light:border-gray-200 border-slate-800 light:bg-white/80 bg-slate-950/80 backdrop-blur-sm max-md:px-3 max-md:py-2 max-md:pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
    <div
      class="flex items-end gap-2 light:bg-gray-50 bg-slate-900 border light:border-gray-200/60 border-slate-700/60 rounded-2xl px-4 py-3 transition-all duration-200 max-w-3xl mx-auto"
      :class="{
        'light:border-blue-400/40 border-blue-500/40 light:ring-blue-200 ring-1 ring-blue-500/20': messageInput.trim() && isConnected && !isLoading,
        'light:bg-gray-50/50 bg-slate-900/50 opacity-60 cursor-not-allowed': !isConnected,
        'light:border-amber-400/40 border-amber-500/40 light:ring-amber-200/50 ring-1 ring-amber-500/10': isLoading
      }"
    >
      <textarea
        v-model="messageInput"
        ref="textareaRef"
        rows="1"
        :placeholder="isConnected ? (isLoading ? 'Ожидайте ответа…' : placeholder) : 'Нет соединения с сервером...'"
        :disabled="!isConnected || isLoading"
        class="flex-1 bg-transparent text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 resize-none outline-none leading-relaxed max-h-32"
        @input="autoResize"
        @keydown="handleKeydown"
      ></textarea>

      <!-- Disabled: no text -->
      <button
        v-if="!messageInput.trim() && !isLoading"
        disabled
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl light:bg-gray-200 bg-slate-800 light:text-gray-400 text-slate-600 cursor-not-allowed transition-colors"
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
        class="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600/50 text-white/70 cursor-wait transition-colors"
      >
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </button>
    </div>
  </footer>
</template>
