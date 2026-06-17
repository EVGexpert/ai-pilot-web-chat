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
    case 'online': return 'bg-blue-500'
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
  <aside class="w-72 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden h-screen">
    <!-- Brand -->
    <div class="px-4 py-5 border-b border-slate-800">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-600/20">
            AP
          </div>
          <div>
            <h1 class="text-base font-bold text-slate-100">AI Pilot</h1>
            <p class="text-xs text-slate-600">Управление сайтами</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <ThemeToggle />
          <button
            class="md:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-slate-300 transition-colors"
            @click.stop="$emit('close')"
            title="Закрыть меню"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="px-4 pt-4 pb-2">
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input
          type="text"
          placeholder="Поиск..."
          class="w-full bg-slate-800 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 outline-none focus:border-blue-500/40 transition-colors"
        />
      </div>
    </div>

    <!-- Sites & History -->
    <div class="flex-1 overflow-y-auto px-4 py-3">
      <h2 class="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Мои сайты</h2>
      <nav class="space-y-1 mb-6">
        <button
          v-for="site in sitesStore.sites"
          :key="site.id"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          :class="sitesStore.currentSiteId === site.id
            ? 'bg-blue-500/10 text-blue-400 font-medium'
            : 'hover:bg-slate-800 text-slate-300'"
          @click="sitesStore.selectSite(site.id)"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="siteStatusDot(site.status)"></span>
          <span class="truncate">{{ site.name }}</span>
        </button>

        <div v-if="sitesStore.sites.length === 0" class="py-6 text-center">
          <p class="text-sm text-slate-400">Нет подключённых сайтов</p>
          <p class="text-xs text-slate-600 mt-1">Установите плагин AI Pilot на WordPress</p>
        </div>
      </nav>

      <template v-if="sitesStore.currentSiteConversations.length > 0">
        <h2 class="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2">Недавние диалоги</h2>
        <div class="space-y-1">
          <div
            v-for="conv in sitesStore.currentSiteConversations"
            :key="conv.id"
            class="px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span class="block text-sm text-slate-300 truncate">{{ conv.title || conv.preview || 'Диалог' }}</span>
            <span class="block text-xs text-slate-600">{{ conv.lastMessage || '' }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- User footer -->
    <div class="px-4 py-4 border-t border-slate-800 mt-auto">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
            {{ userInitial }}
          </div>
          <div class="min-w-0">
            <span class="block text-sm text-slate-200 font-medium truncate">{{ userEmail }}</span>
            <span class="block text-xs text-slate-600">{{ userRole }}</span>
          </div>
        </div>
        <button
          class="shrink-0 p-2 rounded-lg hover:bg-slate-800 text-slate-600 hover:text-slate-300 transition-colors"
          @click="handleLogout"
          title="Выйти"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
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
  background: #334155;
  border-radius: 4px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>
