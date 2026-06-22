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
  <div class="bg-chat-bg h-screen overflow-hidden p-5">
    <LoginForm v-if="!authStore.isAuthenticated" />

    <template v-else-if="authStore.isAdmin">
      <!-- Mobile overlay -->
      <div
        v-if="isMobile && sidebarOpen"
        class="fixed inset-0 bg-black/30 z-[99] md:hidden"
        @click="closeSidebar"
      />

      <div class="flex gap-5 h-full">
        <!-- Sidebar -->
        <aside
          v-if="!isMobile"
          class="w-72 shrink-0"
        >
          <AppSidebar @close="closeSidebar" />
        </aside>

        <!-- Mobile sidebar -->
        <aside
          v-if="isMobile && sidebarOpen"
          class="fixed left-0 top-0 h-full w-72 z-[100] overflow-y-auto"
        >
          <AppSidebar @close="closeSidebar" />
        </aside>

        <!-- Main area -->
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden rounded-2xl bg-chat-bg">
          <!-- Mobile hamburger -->
          <button
            v-if="isMobile"
            class="fixed top-3 left-3 z-20 w-10 h-10 rounded-lg bg-white shadow-sm ring-1 ring-black/5 flex flex-col items-center justify-center gap-[5px] cursor-pointer md:hidden"
            @click="toggleSidebar"
          >
            <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
            <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
            <span class="block w-5 h-0.5 bg-gray-800 rounded-sm"></span>
          </button>

          <Transition name="slide-fade" mode="out-in">
            <ChatWindow v-if="sitesStore.activeView === 'chat'" key="chat" />
            <HistoryPanel v-else key="history" />
          </Transition>

          <!-- Mobile bottom nav -->
          <nav
            v-if="isMobile"
            class="shrink-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-20 md:hidden px-2"
            style="padding-bottom: env(safe-area-inset-bottom, 0)"
          >
            <button
              class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors"
              :class="sitesStore.activeView === 'chat' ? 'text-accent' : 'text-gray-400'"
              @click="sitesStore.setActiveView('chat')"
            >
              <span class="text-xl leading-none">💬</span>
              <span class="text-[10px] text-gray-400">Чат</span>
            </button>
            <button
              class="relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :class="sitesStore.activeView === 'history' ? 'text-accent' : 'text-gray-400'"
              @click="sitesStore.setActiveView('history')"
              :disabled="!sitesStore.currentSiteId"
            >
              <span class="text-xl leading-none">📋</span>
              <span class="text-[10px] text-gray-400">История</span>
              <span
                v-if="sitesStore.currentSiteConversations.length > 0"
                class="absolute -top-1 right-0 bg-accent text-white text-[10px] font-semibold px-1.5 rounded-full leading-4"
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
        </main>
      </div>
    </template>

    <template v-else>
      <ChatWindow :clientMode="true" />
    </template>
  </div>
</template>
