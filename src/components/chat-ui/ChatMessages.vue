<script setup>
import { ref, watch, nextTick } from 'vue'
import ChatMessage from './ChatMessage.vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streamingContent: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: false },
  error: { default: null },
  startTitle: { type: String, default: 'Добро пожаловать' },
  startHint: { type: String, default: '' },
  clientMode: { type: Boolean, default: false },
  assistantAvatar: { type: String, default: '/img/logo-aipilot-v2.png' },
  userAvatar: { type: String, default: '' },
  theme: { type: String, default: 'light' }
})

const emit = defineEmits(['approve-action', 'reject-action', 'listen', 'copy', 'like', 'dislike'])

const scrollEl = ref(null)

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    }
  })
}

watch(() => [props.messages.length, props.streamingContent, props.isLoading], () => {
  scrollToBottom()
}, { immediate: true })
</script>

<template>
  <div ref="scrollEl" class="flex-1 overflow-y-auto px-4 py-4 md:px-6 flex flex-col gap-4">
    <!-- Error banner -->
    <div v-if="error && !isConnected" class="rounded-lg px-4 py-3 text-sm" :class="theme === 'dark' ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-600'">
      ⚠️ {{ error.message || error }}
    </div>

    <!-- Connecting -->
    <div v-if="!isConnected && !error" class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-slate-400">
      <div class="w-6 h-6 border-2 border-gray-300 dark:border-slate-600 border-t-accent rounded-full animate-spin"></div>
      <p class="text-sm">Подключаюсь к серверу...</p>
    </div>

    <!-- Empty state -->
    <div v-if="messages.length === 0 && isConnected" class="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div class="text-5xl mb-5 leading-none">🎯</div>
      <p class="text-lg font-semibold text-gray-800 dark:text-slate-100 mb-2">{{ startTitle }}</p>
      <p v-if="startHint" class="text-sm text-gray-400 dark:text-slate-400 leading-relaxed">{{ startHint }}</p>
    </div>

    <!-- Messages -->
    <ChatMessage
      v-for="msg in messages" :key="msg.id"
      :message="msg"
      :assistantAvatar="assistantAvatar"
      :userAvatar="userAvatar"
      :showAssistantActions="true"
      :theme="theme"
      @listen="(id) => emit('listen', id)"
      @copy="(id) => emit('copy', id)"
      @like="(id) => emit('like', id)"
      @dislike="(id) => emit('dislike', id)"
      @approve-action="(id) => emit('approve-action', id)"
      @reject-action="(id) => emit('reject-action', id)"
    />

    <!-- Streaming content -->
    <div v-if="streamingContent" class="flex items-start gap-3 animate-fade-in">
      <img :src="assistantAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover" />
      <div class="rounded-2xl rounded-tl-md bg-white dark:bg-slate-900 px-4 py-3 text-sm leading-relaxed text-gray-800 dark:text-slate-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        {{ streamingContent }}
      </div>
    </div>

    <!-- Loading indicator -->
    <div v-if="isLoading && !streamingContent" class="flex items-start gap-3">
      <img :src="assistantAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover" />
      <div class="rounded-2xl rounded-tl-md bg-white dark:bg-slate-900 px-4 py-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div class="flex gap-1">
          <span class="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500" style="animation: pulse-dot 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></span>
          <span class="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500" style="animation: pulse-dot 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></span>
          <span class="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-500" style="animation: pulse-dot 1.4s infinite ease-in-out both;"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse-dot {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease forwards;
}
</style>