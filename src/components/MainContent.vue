<script setup>
import { ref, computed, onMounted } from 'vue'
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
  <div class="flex h-screen bg-gray-50 text-gray-900">
    <LoginForm v-if="!authStore.isAuthenticated" @login="handleLogin" />

    <template v-else-if="authStore.isAdmin">
      <div
        v-if="isMobile && sidebarOpen"
        class="fixed inset-0 bg-black/50 z-[99] md:hidden"
        @click="closeSidebar"
      />

      <aside :class="isMobile
        ? (sidebarOpen ? 'fixed left-0 top-0 h-full w-72 z-[100] bg-white border-r border-gray-200 overflow-y-auto' : 'hidden')
        : 'w-72 shrink-0 border-r border-gray-200 overflow-y-auto'">
        <AppSidebar @close="closeSidebar" />
      </aside>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <button
          v-if="isMobile"
          class="fixed top-3 left-3 z-20 w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors md:hidden cursor-pointer"
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

        <nav
          v-if="isMobile"
          class="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-20 md:hidden px-2"
          style="padding-bottom: env(safe-area-inset-bottom, 0)"
        >
          <button
            class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors"
            :class="sitesStore.activeView === 'chat' ? 'text-blue-600' : 'text-gray-400'"
            @click="sitesStore.setActiveView('chat')"
          >
            <span class="text-xl leading-none">💬</span>
            <span class="text-[10px] text-gray-400">Чат</span>
          </button>
          <button
            class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :class="sitesStore.activeView === 'history' ? 'text-blue-600' : 'text-gray-400'"
            @click="sitesStore.setActiveView('history')"
            :disabled="!sitesStore.currentSiteId"
          >
            <span class="text-xl leading-none">📋</span>
            <span class="text-[10px] text-gray-400">История</span>
            <span
              v-if="sitesStore.currentSiteConversations.length > 0"
              class="absolute -top-1 right-0 bg-blue-600 text-white text-[10px] font-semibold px-1.5 rounded-full leading-4"
            >
              {{ sitesStore.currentSiteConversations.length }}
            </span>
          </button>
          <button
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors text-gray-400"
            @click="toggleSidebar"
          >
            <span class="text-xl leading-none">🌐</span>
            <span class="text-[10px] text-gray-400">Сайты</span>
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
