<script setup>
/**
 * MessageArea.vue — light theme from chat-layout.html
 */
import MessageBubble from './MessageBubble.vue'
import TypingIndicator from './TypingIndicator.vue'
import { computed } from 'vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  streamingContent: { type: String, default: '' },
  isLoading: { type: Boolean, default: false },
  isConnected: { type: Boolean, default: false },
  error: { default: null },
  hasSite: { type: Boolean, default: true },
  startTitle: { type: String, default: 'Добро пожаловать' },
  startHint: { type: String, default: '' },
  clientMode: { type: Boolean, default: false }
})

const emit = defineEmits(['approve-action', 'reject-action'])
</script>

<template>
  <div class="scrollbar-thin flex-1 overflow-y-auto px-6 pb-8 pt-2" ref="container">
    <!-- Error -->
    <div v-if="error && !isConnected" class="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
      ⚠️ {{ error.message || error }}
    </div>

    <!-- Connecting -->
    <div v-if="!isConnected && !error" class="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <div class="w-6 h-6 border-2 border-gray-300 border-t-accent rounded-full animate-spin"></div>
      <p class="text-sm">Подключаюсь к серверу...</p>
    </div>

    <!-- Messages container -->
    <div v-if="messages.length > 0 || streamingContent" class="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <!-- Messages -->
      <MessageBubble
        v-for="msg in messages" :key="msg.id"
        :message="msg"
        @approve-action="(id) => emit('approve-action', id)"
        @reject-action="(id) => emit('reject-action', id)"
      />

      <!-- Streaming -->
      <div v-if="streamingContent" class="flex justify-start animate-fade-in">
        <div class="max-w-[560px] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5">
          {{ streamingContent }}
        </div>
      </div>

      <!-- Typing -->
      <TypingIndicator v-if="isLoading && !streamingContent" :visible="isLoading" />
    </div>

    <!-- Welcome (admin) -->
    <div v-if="messages.length === 0 && isConnected && !streamingContent && !clientMode" class="flex flex-col items-center justify-center h-full text-center px-6">
      <div class="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-700 mb-1">AI Pilot</h2>
      <p class="text-sm text-gray-400">Выберите сайт и начните диалог</p>
    </div>

    <!-- Welcome (client) -->
    <div v-if="messages.length === 0 && isConnected && !streamingContent && clientMode" class="flex flex-col items-center justify-center h-full text-center px-6">
      <div class="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
        <svg class="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-700 mb-1">{{ startTitle }}</h2>
      <p class="text-sm text-gray-400">{{ startHint }}</p>
    </div>
  </div>
</template>
