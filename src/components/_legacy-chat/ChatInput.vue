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
  <footer class="shrink-0 px-4 py-3 bg-chat-bg">
    <form
      class="flex min-h-28 items-start gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 max-w-3xl mx-auto"
      @submit.prevent="handleSend"
    >
      <!-- Attach file -->
      <button
        type="button"
        class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-accent"
        aria-label="Attach file"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      </button>

      <!-- Textarea -->
      <textarea
        v-model="messageInput"
        ref="textareaRef"
        rows="1"
        placeholder="Спросите AIPilot"
        :disabled="!isConnected || isLoading"
        class="max-h-36 min-h-12 flex-1 resize-none bg-transparent pt-3 text-sm text-gray-800 placeholder-gray-500 outline-none"
        @input="autoResize"
        @keydown="handleKeydown"
      ></textarea>

      <!-- Action buttons -->
      <div class="flex shrink-0 items-center gap-3 self-end">
        <!-- Emoji -->
        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent/40 hover:text-accent"
          aria-label="Emoji"
        >
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <path d="M9 9h.01"/>
            <path d="M15 9h.01"/>
          </svg>
        </button>

        <!-- Voice -->
        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent/40 hover:text-accent"
          aria-label="Voice message"
        >
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <path d="M12 19v3"/>
          </svg>
        </button>

        <!-- Send -->
        <button
          type="submit"
          :disabled="!messageInput.trim() || !isConnected || isLoading"
          class="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Send</span>
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m22 2-7 20-4-9-9-4Z"/>
            <path d="M22 2 11 13"/>
          </svg>
        </button>
      </div>
    </form>
  </footer>
</template>
