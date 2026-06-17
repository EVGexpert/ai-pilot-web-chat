<script setup>
/**
 * ChatInput.vue
 * Компонент ввода сообщения по дизайну chat-layout.html.
 * Attach + textarea + emoji + voice + send
 * Форма: flex, min-h-112px, gap-12px, bg-white, rounded-2xl, shadow-sm, ring-1 ring-black/5
 */
import { ref, computed } from 'vue'

const emit = defineEmits(['send'])
const props = defineProps({
  isConnected: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Спросите AIPilot' },
  /** Padding wrapper — admin mode adds px/py padding around the form */
  padded: { type: Boolean, default: true }
})

const messageInput = ref('')
const textareaRef = ref(null)

const hasText = computed(() => messageInput.value.trim().length > 0)

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
  <div class="composer-wrapper" :class="{ 'composer-wrapper--padded': padded }">
    <form class="composer" @submit.prevent="handleSend">
      <!-- Attach button -->
      <button
        type="button"
        class="composer-attach"
        aria-label="Прикрепить файл"
        title="Прикрепить файл"
      >
        <svg viewBox="0 0 24 24" class="composer-icon">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </button>

      <!-- Textarea -->
      <textarea
        v-model="messageInput"
        class="composer-textarea"
        :placeholder="isConnected ? placeholder : 'Нет соединения с сервером...'"
        @keydown="handleKeydown"
        :disabled="!isConnected"
        rows="1"
        ref="textareaRef"
        @input="autoResize"
      ></textarea>

      <!-- Right side buttons -->
      <div class="composer-actions">
        <!-- Emoji -->
        <button
          type="button"
          class="composer-round-btn"
          aria-label="Emoji"
          title="Emoji"
        >
          <svg viewBox="0 0 24 24" class="composer-icon">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M9 9h.01" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M15 9h.01" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>

        <!-- Voice -->
        <button
          type="button"
          class="composer-round-btn"
          aria-label="Голосовое сообщение"
          title="Голосовое сообщение"
        >
          <svg viewBox="0 0 24 24" class="composer-icon">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" stroke-width="2"></path>
            <path d="M12 19v3" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>

        <!-- Send -->
        <button
          type="submit"
          class="send-btn"
          :class="{ 'send-btn--active': hasText && isConnected }"
          :disabled="!isConnected || !hasText"
        >
          <span class="send-text">Send</span>
          <svg viewBox="0 0 24 24" class="send-icon">
            <path d="m22 2-7 20-4-9-9-4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
            <path d="M22 2 11 13" fill="none" stroke="currentColor" stroke-width="2"></path>
          </svg>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.composer-wrapper {
  flex-shrink: 0;
}

/* Admin mode: add padding around the form per design */
.composer-wrapper--padded {
  padding: 12px 24px 16px;
}

.composer {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-height: 112px;
  background: var(--chat-input-bg);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  outline: 1px solid var(--chat-assistant-border);
}

/* Attach */
.composer-attach {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  border-radius: 12px;
  color: var(--text-quaternary);
  cursor: pointer;
  transition: all 0.15s;
}

.composer-attach:hover {
  background: var(--bg-hover);
  color: var(--color-accent);
}

/* Textarea */
.composer-textarea {
  flex: 1;
  min-height: 48px;
  max-height: 144px;
  resize: none;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: 14px;
  line-height: 1.5;
  padding: 12px 0 0;
}

.composer-textarea::placeholder {
  color: var(--text-quaternary);
}

.composer-textarea:disabled {
  opacity: 0.5;
}

/* Actions row */
.composer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-end;
  flex-shrink: 0;
}

/* Round icon buttons (emoji, voice) */
.composer-round-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 50%;
  color: var(--text-quaternary);
  cursor: pointer;
  transition: all 0.15s;
}

.composer-round-btn:hover {
  border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
  color: var(--color-accent);
}

/* Icons */
.composer-icon {
  width: 20px;
  height: 20px;
}

/* Send button */
.send-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  background: var(--color-accent);
  color: var(--text-inverse);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  padding: 0 20px;
  cursor: pointer;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-accent) 20%, transparent);
  transition: all 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  width: 16px;
  height: 16px;
}

.send-text {
  line-height: 1;
}

/* Mobile */
@media (max-width: 767px) {
  .composer-wrapper--padded {
    padding: 8px 12px 12px;
  }

  .composer {
    min-height: auto;
    padding: 12px;
    gap: 8px;
  }

  .composer-attach {
    width: 32px;
    height: 32px;
  }

  .composer-round-btn {
    width: 32px;
    height: 32px;
  }

  .send-btn {
    padding: 0 12px;
    height: 36px;
    gap: 4px;
  }

  .send-text {
    display: none;
  }
}
</style>
