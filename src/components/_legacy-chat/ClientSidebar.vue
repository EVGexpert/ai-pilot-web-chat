<script setup>
/**
 * ClientSidebar.vue — light theme matching chat-layout.html
 */
import { useAuthStore } from '../stores/authStore'
import ThemeToggle from './ThemeToggle.vue'

defineProps({
  sessionsList: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: null },
  siteName: { type: String, default: '' },
  csSidebarOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select-session', 'new-chat', 'logout'])

const authStore = useAuthStore()

function getSessionDate(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <aside class="w-72 shrink-0 bg-gray-100 flex flex-col divide-y divide-gray-200 rounded-2xl overflow-hidden py-5 px-4 border-0 md:flex hidden"
    :class="{ 'fixed !flex left-0 top-0 bottom-0 w-[85vw] max-w-[320px] z-100 shadow-lg md:hidden': csSidebarOpen }">
    <!-- Header: Logo + Close -->
    <div class="side-header space-y-5 pb-5 shrink-0">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="size-12 shrink-0 object-contain" />

        <button class="cs-close-btn size-7 bg-transparent rounded-lg cursor-pointer flex items-center justify-center text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500" @click="$emit('close')" title="Закрыть">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Site indicator -->
      <div v-if="siteName" class="text-xs text-gray-500 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
        {{ siteName }}
      </div>

      <!-- New chat button -->
      <div>
        <button class="flex items-center justify-center gap-2 w-full bg-white rounded-xl shadow-sm py-2.5 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors" @click="$emit('new-chat')">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 16 16" fill="none">
            <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"></path>
          </svg>
          <span>Новый чат</span>
        </button>
      </div>
    </div>

    <!-- Conversations list -->
    <div class="relative flex-1 min-h-0 flex flex-col my-5">
      <p class="text-gray-400 text-sm mb-3">История</p>
      <div class="chat-history scrollbar-thin flex-1 overflow-y-auto space-y-1">
        <div v-if="sessionsList.length === 0" class="text-xs text-gray-400 text-center py-6">Нет обращений</div>
        <div
          v-for="s in sessionsList"
          :key="s.id"
          class="px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          :class="s.id === currentSessionId
            ? 'bg-accent/10 border border-accent/20'
            : 'hover:bg-gray-200'"
          @click="$emit('select-session', s.id)"
        >
          <div class="flex items-baseline justify-between gap-2 mb-0.5">
            <span class="text-[13px] font-semibold truncate"
              :class="s.id === currentSessionId ? 'text-accent' : 'text-gray-700'">
              {{ s.title || 'Чат' }}
            </span>
            <span class="text-[10px] text-gray-400 shrink-0">{{ s.date || getSessionDate(s.updatedAt || s.createdAt) }}</span>
          </div>
          <p class="text-[11px] truncate text-gray-500">{{ s.preview || s.messageCount + ' сообщений' }}</p>
        </div>
      </div>
      <!-- Gradient fade -->
      <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-gray-100 to-transparent"></div>
    </div>

    <!-- Footer -->
    <div class="chat-footer shrink-0 space-y-4 pt-5">
      <!-- Profile -->
      <div class="profile-card flex items-center justify-between bg-white rounded-xl shadow-sm p-4">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="text-sm text-gray-800 min-w-0">
            <p class="truncate font-medium">{{ authStore.userName || 'User' }}</p>
            <p class="text-gray-500 truncate text-xs">{{ authStore.user?.email || '' }}</p>
          </div>
        </div>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          title="Выйти"
          aria-label="Выйти"
          @click="$emit('logout')"
        >
          <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <path d="M16 17l5-5-5-5"/>
            <path d="M21 12H9"/>
          </svg>
        </button>
      </div>

      <!-- Theme toggle -->
      <div class="flex justify-center">
        <ThemeToggle />
      </div>
    </div>
  </aside>
</template>

<style scoped>
@media (max-width: 767px) {
  .cs-close-btn { display: flex; }
}
</style>
