<script setup>
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streamingContent: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: false },
  error: { default: null },
  startTitle: { type: String, default: 'Добро пожаловать' },
  startHint: { type: String, default: '' },
  clientMode: { type: Boolean, default: false }
})

const emit = defineEmits(['approve-action', 'reject-action'])
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-1" ref="container">
    <!-- Error banner -->
    <div v-if="error && !isConnected" class="px-4 py-2.5 light:bg-red-50 bg-red-500/10 light:text-red-600 text-red-400 rounded-xl text-sm leading-relaxed">
      ⚠️ {{ error.message || error }}
    </div>

    <!-- Connecting state -->
    <div v-if="!isConnected && !error" class="flex-1 flex flex-col items-center justify-center gap-3 light:text-gray-500 text-slate-500">
      <div class="w-6 h-6 border-2 light:border-gray-300 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      <p class="text-sm">Подключаюсь к серверу...</p>
    </div>

    <!-- Welcome screen (no messages) -->
    <div v-if="messages.length === 0 && isConnected && !streamingContent" class="flex flex-col items-center justify-center h-full text-center px-6">
      <div class="w-14 h-14 rounded-2xl light:bg-blue-50 bg-blue-600/10 flex items-center justify-center mb-4">
        <svg class="w-7 h-7 light:text-blue-600 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2 class="text-lg font-semibold light:text-gray-800 text-slate-200 mb-1">AI Pilot</h2>
      <p class="text-sm light:text-gray-500 text-slate-500">Выберите сайт и начните диалог</p>
    </div>

    <!-- Messages list -->
    <div class="flex flex-col gap-1 space-y-1">
      <MessageBubble
        v-for="msg in messages" :key="msg.id"
        :message="msg"
        @approve-action="(id) => emit('approve-action', id)"
        @reject-action="(id) => emit('reject-action', id)"
      />
    </div>

    <!-- Streaming content -->
    <div v-if="streamingContent" class="flex justify-start animate-fade-in">
      <div class="max-w-[75%] light:bg-gray-100 bg-slate-800 light:text-gray-900 text-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed shadow-lg whitespace-pre-wrap">
        {{ streamingContent }}
      </div>
    </div>

    <!-- Typing indicator -->
    <TypingIndicator v-if="isLoading && !streamingContent" :visible="isLoading" />
  </div>
</template>
