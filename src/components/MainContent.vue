<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import { useDevice } from '../composables/useDevice'
import LoginForm from './LoginForm.vue'
import AppSidebar from './AppSidebar.vue'
import ChatWindow from './ChatWindow.vue'
import HistoryPanel from './HistoryPanel.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const { isMobile, sidebarOpen, toggleSidebar, closeSidebar } = useDevice()

const sidebarCollapsed = ref(false)

const sidebarClass = computed(() => {
  if (isMobile.value) {
    return sidebarOpen.value
      ? 'fixed left-0 top-0 h-full w-72 z-[100] light:bg-white bg-slate-950 border-r light:border-gray-200 border-slate-800 overflow-y-auto transition-transform duration-200'
      : 'hidden'
  }
  return 'w-72 shrink-0 border-r light:border-gray-200 border-slate-800 overflow-y-auto'
})

function onResize() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) sidebarOpen.value = false
}

onMounted(() => {
  authStore.initTheme()
  if (authStore.isAuthenticated) {
    sitesStore.fetchSites()
  }
})

function handleLogin() {
  sitesStore.fetchSites()
}
</script>

<template>
  <div class="flex h-screen light:bg-white bg-slate-950 light:text-gray-900 text-slate-100">
    <LoginForm v-if="!authStore.isAuthenticated" @login="handleLogin" />

    <template v-else-if="authStore.isAdmin">
      <!-- Overlay (mobile) -->
      <div
        v-if="isMobile && sidebarOpen"
        class="fixed inset-0 bg-black/50 z-[99] md:hidden"
        @click="closeSidebar"
      />

      <!-- Sidebar -->
      <aside :class="sidebarClass">
        <AppSidebar @close="closeSidebar" />
      </aside>

      <!-- Main chat area -->
      <div :class="['flex-1 flex flex-col min-w-0 overflow-hidden', isMobile ? 'pb-16' : '']">
        <!-- Burger for mobile -->
        <button
          v-if="isMobile"
          class="fixed top-3 left-3 z-20 w-10 h-10 rounded-lg light:bg-gray-100 bg-slate-800 border light:border-gray-300 border-slate-700 flex items-center justify-center light:text-gray-600 text-slate-300 light:hover:bg-gray-200 hover:bg-slate-700 transition-colors md:hidden cursor-pointer"
          @click="toggleSidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

        <Transition name="slide-fade" mode="out-in">
          <ChatWindow v-if="sitesStore.activeView === 'chat'" key="chat" />
          <HistoryPanel v-else key="history" />
        </Transition>

        <!-- Bottom nav (mobile) -->
        <nav
          v-if="isMobile"
          class="fixed bottom-0 inset-x-0 h-16 light:bg-gray-50 bg-slate-900 border-t light:border-gray-200 border-slate-800 flex items-center justify-around z-20 md:hidden px-2"
          style="padding-bottom: env(safe-area-inset-bottom, 0)"
        >
          <button
            class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors"
            :class="sitesStore.activeView === 'chat' ? 'light:text-blue-600 text-blue-400' : 'light:text-gray-500 text-slate-400'"
            @click="sitesStore.setActiveView('chat')"
          >
            <span class="text-xl leading-none">💬</span>
            <span class="text-[10px] light:text-gray-500 text-slate-500">Чат</span>
          </button>
          <button
            class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="sitesStore.activeView === 'history' ? 'light:text-blue-600 text-blue-400' : 'light:text-gray-500 text-slate-400'"
            @click="sitesStore.setActiveView('history')"
            :disabled="!sitesStore.currentSiteId"
          >
            <span class="text-xl leading-none">📋</span>
            <span class="text-[10px] light:text-gray-500 text-slate-500">История</span>
            <span
              v-if="sitesStore.currentSiteConversations.length > 0"
              class="absolute -top-1 right-0 bg-blue-600 text-white text-[10px] font-semibold px-1.5 rounded-full leading-4"
            >
              {{ sitesStore.currentSiteConversations.length }}
            </span>
          </button>
          <button
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors light:text-gray-500 text-slate-400"
            @click="toggleSidebar"
          >
            <span class="text-xl leading-none">🌐</span>
            <span class="text-[10px] light:text-gray-500 text-slate-500">Сайты</span>
          </button>
        </nav>
      </div>
    </template>

    <template v-else>
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ChatWindow :clientMode="true" />
      </div>
    </template>
  </div>
</template>
