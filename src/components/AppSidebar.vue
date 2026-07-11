<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const emit = defineEmits(['close'])

const userInitial = computed(() => {
  const name = authStore.userName
  if (name) return name.charAt(0).toUpperCase()
  const email = authStore.user?.email
  if (email) return email.charAt(0).toUpperCase()
  return '?'
})

const userEmail = computed(() => {
  return authStore.user?.email || authStore.userName || 'Пользователь'
})

const userRole = computed(() => {
  const role = authStore.user?.role
  if (role === 'admin') return 'Администратор'
  if (role === 'client') return 'Клиент'
  return role || ''
})

const siteStatusDot = (status) => {
  switch (status) {
    case 'online': return 'bg-accent'
    case 'syncing': return 'bg-green-500'
    case 'offline': return 'bg-gray-400'
    default: return 'bg-gray-400'
  }
}

function handleLogout() {
  sitesStore.clientConversations = []
  authStore.logout()
}
</script>

<template>
  <aside class="bg-gray-100 rounded-2xl flex flex-col divide-y divide-gray-200 py-5 px-4 h-full overflow-hidden">
    <!-- Header: Logo + Close -->
    <div class="side-header space-y-5 pb-5 shrink-0">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="size-12 shrink-0 object-contain" />

        <div class="flex items-center gap-1">
          <ThemeToggle />
          <button
            class="md:hidden p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
            @click.stop="$emit('close')"
            title="Закрыть меню"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"/>
        </svg>
        <input
          type="text"
          placeholder="Поиск"
          class="w-full py-2 pl-10 pr-4 bg-white border-0 rounded-xl text-gray-700 text-sm placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <!-- New chat button -->
      <div>
        <button
          class="new-chat flex items-center justify-center gap-2 w-full bg-white rounded-xl shadow-sm py-2.5 text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          @click="sitesStore.setActiveView('chat')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 16 16" fill="none">
            <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"></path>
          </svg>
          <span>Новый чат</span>
        </button>
      </div>
    </div>

    <!-- Sites & History - full-height scrollable area -->
    <div class="relative flex-1 min-h-0 flex flex-col my-5">
      <div class="chat-history scrollbar-thin flex-1 overflow-y-auto space-y-5 px-1">
        <!-- My Sites section -->
        <div>
          <p class="text-gray-400 text-sm mb-3">Мои сайты</p>
          <nav class="space-y-1">
            <button
              v-for="site in sitesStore.sites"
              :key="site.id"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer text-left"
              :class="sitesStore.currentSiteId === site.id
                ? 'bg-accent/10 text-accent font-medium'
                : 'hover:bg-gray-200 text-gray-700'"
              @click="sitesStore.selectSite(site.id)"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :class="siteStatusDot(site.status)"></span>
              <span class="truncate">{{ site.name }}</span>
            </button>

            <div v-if="sitesStore.sites.length === 0" class="py-6 text-center">
              <p class="text-sm text-gray-400">Нет подключённых сайтов</p>
              <p class="text-xs text-gray-500 mt-1">Установите плагин AI Pilot на WordPress</p>
            </div>
          </nav>
        </div>

        <!-- Recent conversations -->
        <div v-if="sitesStore.currentSiteConversations.length > 0">
          <p class="text-gray-400 text-sm mb-3">Недавние диалоги</p>
          <ul class="text-gray-700 space-y-2">
            <li v-for="conv in sitesStore.currentSiteConversations" :key="conv.id">
              <a href="#" class="hover:text-accent transition-colors text-sm truncate block"
                 @click.prevent="sitesStore.selectSite(sitesStore.currentSite?.id)">
                {{ conv.title || conv.preview || 'Диалог' }}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Gradient fade at bottom -->
      <div
        class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-gray-100 to-transparent"
      ></div>
    </div>

    <!-- Footer -->
    <div class="chat-footer shrink-0 space-y-4 pt-5">
      <!-- Profile -->
      <div class="profile-card bg-white rounded-xl shadow-sm p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="text-sm text-gray-800 min-w-0">
            <p class="truncate font-medium">{{ userEmail }}</p>
            <p class="text-gray-500 truncate text-xs">{{ userRole }}</p>
          </div>
        </div>
        <div class="profile-setting flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Настройки"
            aria-label="Настройки"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
            </svg>
          </button>
          <button
            type="button"
            class="flex size-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            title="Выйти"
            aria-label="Выйти"
            @click="handleLogout"
          >
            <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <path d="M16 17l5-5-5-5"/>
              <path d="M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Theme segmented control -->
      <div class="theme-toggle-wrapper">
        <ThemeToggle />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
}
.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
