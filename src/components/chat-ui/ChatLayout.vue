<script setup>
import { computed, ref } from 'vue'
import ChatComposer from './ChatComposer.vue'
import ChatMessages from './ChatMessages.vue'
import ChatSidebar from './ChatSidebar.vue'

const props = defineProps({
  // historyGroups: [{ title: 'Сегодня', items: [{ id, title, date }] }]
  historyGroups: {
    type: Array,
    default: () => []
  },
  // messages: [{ id, role: 'assistant'|'user', type?: 'text'|'voice'|'link', content, time, items? }]
  messages: {
    type: Array,
    default: () => []
  },
  activeChatId: {
    type: [String, Number, null],
    default: null
  },
  user: {
    type: Object,
    default: () => ({ name: 'James Broeng', email: 'test@aipilot.ru', avatar: '/img/user-img.png' })
  },
  logoSrc: {
    type: String,
    default: '/img/logo-aipilot-v3.png'
  },
  assistantAvatar: {
    type: String,
    default: '/img/logo-aipilot-v2.png'
  },
  userAvatar: {
    type: String,
    default: '/img/user-img.png'
  },
  modelValue: {
    type: String,
    default: ''
  },
  isSending: {
    type: Boolean,
    default: false
  },
  isAssistantTyping: {
    type: Boolean,
    default: false
  },
  theme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits([
  'update:modelValue',
  'update:theme',
  'send-message',
  'new-chat',
  'select-chat',
  'search',
  'profile-settings',
  'attach',
  'emoji',
  'listen',
  'copy',
  'like',
  'dislike'
])

const mobileSidebarOpen = ref(false)

const userAvatarSrc = computed(() => props.user?.avatar || props.userAvatar)

function handleSelectChat(chat) {
  emit('select-chat', chat)
  mobileSidebarOpen.value = false
}

function handleNewChat() {
  emit('new-chat')
  mobileSidebarOpen.value = false
}
</script>

<template>
  <div class="h-screen overflow-hidden bg-chat-bg p-3 md:p-5">
    <div class="flex h-full gap-5">
      <ChatSidebar
        class="hidden md:flex"
        :logo-src="logoSrc"
        :history-groups="historyGroups"
        :active-chat-id="activeChatId"
        :user="user"
        :theme="theme"
        @new-chat="handleNewChat"
        @select-chat="handleSelectChat"
        @search="emit('search', $event)"
        @profile-settings="emit('profile-settings')"
        @toggle-sidebar="mobileSidebarOpen = false"
        @update:theme="emit('update:theme', $event)"
      />

      <Transition name="fade">
        <div v-if="mobileSidebarOpen" class="fixed inset-0 z-40 bg-black/30 md:hidden" @click="mobileSidebarOpen = false"></div>
      </Transition>

      <Transition name="chat-list">
        <ChatSidebar
          v-if="mobileSidebarOpen"
          class="fixed bottom-3 left-3 top-3 z-50 md:hidden"
          :logo-src="logoSrc"
          :history-groups="historyGroups"
          :active-chat-id="activeChatId"
          :user="user"
          :theme="theme"
          @new-chat="handleNewChat"
          @select-chat="handleSelectChat"
          @search="emit('search', $event)"
          @profile-settings="emit('profile-settings')"
          @toggle-sidebar="mobileSidebarOpen = false"
          @update:theme="emit('update:theme', $event)"
        />
      </Transition>

      <main class="flex min-w-0 flex-1 flex-col">
        <section class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-chat-bg">
          <div class="mb-3 flex items-center justify-between md:hidden">
            <button
              type="button"
              class="flex size-10 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm transition hover:text-accent"
              aria-label="Открыть меню"
              @click="mobileSidebarOpen = true"
            >
              <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 6h16"></path>
                <path d="M4 12h16"></path>
                <path d="M4 18h16"></path>
              </svg>
            </button>

            <img :src="logoSrc" class="size-10" alt="AI Pilot" />
          </div>

          <ChatMessages
            :messages="messages"
            :assistant-avatar="assistantAvatar"
            :user-avatar="userAvatarSrc"
            :is-typing="isAssistantTyping"
            @listen="emit('listen', $event)"
            @copy="emit('copy', $event)"
            @like="emit('like', $event)"
            @dislike="emit('dislike', $event)"
          />

          <ChatComposer
            :model-value="modelValue"
            :disabled="isSending"
            @update:model-value="emit('update:modelValue', $event)"
            @submit="emit('send-message', $event)"
            @attach="emit('attach')"
            @emoji="emit('emoji')"
          />
        </section>
      </main>
    </div>
  </div>
</template>
