<script setup>
import { nextTick, ref, watch } from 'vue'
import ChatMessage from './ChatMessage.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  assistantAvatar: {
    type: String,
    default: '/img/logo-aipilot-v2.png'
  },
  userAvatar: {
    type: String,
    default: '/img/user-img.png'
  },
  isTyping: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['listen', 'copy', 'like', 'dislike'])
const scrollEl = ref(null)

async function scrollToBottom() {
  await nextTick()
  if (!scrollEl.value) return
  scrollEl.value.scrollTop = scrollEl.value.scrollHeight
}

watch(() => [props.messages.length, props.isTyping], scrollToBottom, { immediate: true })
</script>

<template>
  <div ref="scrollEl" class="scrollbar-thin flex-1 overflow-y-auto px-6 pb-8 pt-2">
    <TransitionGroup name="chat-list" tag="div" class="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :assistant-avatar="assistantAvatar"
        :user-avatar="userAvatar"
        @listen="emit('listen', $event)"
        @copy="emit('copy', $event)"
        @like="emit('like', $event)"
        @dislike="emit('dislike', $event)"
      />

      <!-- isTyping — флаг генерации ответа ассистента, приходит из API/WebSocket. -->
      <ChatMessage
        v-if="isTyping"
        key="assistant-typing"
        :message="{ id: 'assistant-typing', role: 'assistant', type: 'loading' }"
        :assistant-avatar="assistantAvatar"
        :user-avatar="userAvatar"
        :show-assistant-actions="false"
      />
    </TransitionGroup>
  </div>
</template>
