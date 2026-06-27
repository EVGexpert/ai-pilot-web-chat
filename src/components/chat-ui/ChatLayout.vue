<script setup>
import { ref, watch, nextTick } from 'vue'
import ChatSidebar from './ChatSidebar.vue'
import ChatMessages from './ChatMessages.vue'
import ChatComposer from './ChatComposer.vue'

const props = defineProps({
  // Sidebar props
  historyGroups: { type: Array, default: () => [] },
  activeChatId: { type: [String, Number], default: null },
  user: { type: Object, default: () => ({}) },
  logoSrc: { type: String, default: '/img/logo-aipilot-v3.png' },
  // Messages props
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
  // Composer props
  placeholder: { type: String, default: 'Спросите AIPilot' },
  sendLabel: { type: String, default: 'Send' },
  theme: { type: String, default: 'light' }
})

const emit = defineEmits([
  'new-chat', 'select-chat', 'search', 'update:theme', 'profile-settings',
  'send-message', 'attach', 'emoji',
  'listen', 'copy', 'like', 'dislike',
  'approve-action', 'reject-action'
])

const messagesContainer = ref(null)
const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

function handleSend(text) {
  emit('send-message', text)
}

function handleSelectChat(item) {
  emit('select-chat', item)
  closeSidebar()
}

// Scroll to bottom when new messages arrive
watch(() => [props.messages, props.streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) {
    const el = messagesContainer.value
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      el.scrollTop = el.scrollHeight
    }, 50)
  }
}, { deep: true })
</script>

<template>
  <div class="flex h-full w-full">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="closeSidebar"
    ></div>

    <!-- Sidebar -->
    <div
      :class="[
        'shrink-0 h-full',
        'md:relative md:block',
        'fixed left-0 top-0 z-50 transition-transform duration-300 md:transform-none',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
    >
      <ChatSidebar
        :historyGroups="historyGroups"
        :activeChatId="activeChatId"
        :user="user"
        :theme="theme"
        :logoSrc="logoSrc"
        @update:theme="(val) => emit('update:theme', val)"
        @new-chat="(emit('new-chat'), closeSidebar())"
        @select-chat="handleSelectChat"
        @search="emit('search')"
        @profile-settings="emit('profile-settings')"
      />
    </div>

    <!-- Main area -->
    <div class="flex flex-1 flex-col min-w-0 bg-chat-bg">
      <!-- Mobile burger -->
      <div class="md:hidden flex items-center px-4 py-2 border-b border-gray-200 dark:border-slate-700">
        <button
          class="flex items-center justify-center size-10 rounded-lg transition hover:bg-gray-100 dark:hover:bg-slate-800"
          @click="toggleSidebar"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18" />
            <path d="M3 6h18" />
            <path d="M3 18h18" />
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <ChatMessages
        ref="messagesContainer"
        :messages="messages"
        :streamingContent="streamingContent"
        :isLoading="isLoading"
        :isConnected="isConnected"
        :error="error"
        :startTitle="startTitle"
        :startHint="startHint"
        :clientMode="clientMode"
        :assistantAvatar="assistantAvatar"
        :userAvatar="userAvatar"
        :theme="theme"
        class="flex-1 overflow-y-auto"
        @approve-action="(id) => emit('approve-action', id)"
        @reject-action="(id) => emit('reject-action', id)"
        @listen="(id) => emit('listen', id)"
        @copy="(id) => emit('copy', id)"
        @like="(id) => emit('like', id)"
        @dislike="(id) => emit('dislike', id)"
      />

      <!-- Composer -->
      <div class="px-4 pb-4 pt-2 max-w-5xl mx-auto w-full">
        <ChatComposer
          :placeholder="placeholder"
          :disabled="!isConnected"
          :sendLabel="sendLabel"
          :theme="theme"
          @submit="handleSend"
          @attach="emit('attach')"
          @emoji="emit('emoji')"
        />
      </div>
    </div>
  </div>
</template>