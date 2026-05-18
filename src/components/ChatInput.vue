<script setup>
import { ref } from 'vue'

const emit = defineEmits(['send'])
const props = defineProps({
  isConnected: { type: Boolean, default: false },
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
  <div class="chat-footer">
    <div class="input-wrapper">
      <textarea
        v-model="messageInput"
        class="chat-input"
        :placeholder="isConnected ? placeholder : 'Нет соединения с сервером...'"
        @keydown="handleKeydown"
        :disabled="!isConnected"
        rows="1"
        ref="textareaRef"
        @input="autoResize"
      ></textarea>
      <button
        class="send-btn"
        :class="{ 'send-btn--active': messageInput.trim() && isConnected }"
        :disabled="!isConnected || !messageInput.trim()"
        @click="handleSend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  background: var(--bg-primary);
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--chat-input-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-xl);
  padding: 4px 4px 4px 16px;
  transition: border-color 0.15s;
}
.input-wrapper:focus-within { border-color: var(--color-primary); }
.chat-input {
  flex: 1; border: none; background: transparent; color: var(--text-primary);
  font-family: var(--font-family); font-size: var(--typography-body-size);
  line-height: 1.5; padding: 8px 0; resize: none; outline: none; max-height: 120px;
}
.chat-input::placeholder { color: var(--text-quaternary); }
.send-btn {
  width: 40px; height: 40px; border: none; border-radius: 50%;
  background: var(--bg-tertiary); color: var(--text-quaternary);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s ease;
}
.send-btn--active { background: var(--color-primary); color: var(--text-inverse); }
.send-btn--active:hover { background: var(--color-primary-hover); }
.send-btn:disabled { cursor: not-allowed; }
</style>
