<script setup>
import { onMounted, onUnmounted } from 'vue'
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
  <div class="app-container">
    <LoginForm v-if="!authStore.isAuthenticated" @login="handleLogin" />

    <template v-else-if="authStore.isAdmin">
      <!-- Mobile overlay -->
      <div
        v-if="isMobile && sidebarOpen"
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>

      <!-- Sidebar with mobile drawer behavior -->
      <AppSidebar
        :class="{ 'sidebar--open': sidebarOpen, 'sidebar--mobile': isMobile }"
        @close="closeSidebar"
      />

      <main class="main-area">
        <!-- Mobile burger -->
        <button v-if="isMobile" class="burger-btn" @click="toggleSidebar">
          <span class="burger-line"></span>
          <span class="burger-line"></span>
          <span class="burger-line"></span>
        </button>

        <Transition name="slide-fade" mode="out-in">
          <ChatWindow v-if="sitesStore.activeView === 'chat'" key="chat" />
          <HistoryPanel v-else key="history" />
        </Transition>

        <!-- Mobile bottom nav -->
        <nav v-if="isMobile" class="bottom-nav">
          <button
            class="bottom-nav-item"
            :class="{ 'bottom-nav-item--active': sitesStore.activeView === 'chat' }"
            @click="sitesStore.setActiveView('chat')"
          >
            <span class="bottom-nav-icon">💬</span>
            <span class="bottom-nav-label">Чат</span>
          </button>
          <button
            class="bottom-nav-item"
            :class="{ 'bottom-nav-item--active': sitesStore.activeView === 'history' }"
            @click="sitesStore.setActiveView('history')"
            :disabled="!sitesStore.currentSiteId"
          >
            <span class="bottom-nav-icon">📋</span>
            <span class="bottom-nav-label">История</span>
            <span v-if="sitesStore.currentSiteConversations.length > 0" class="bottom-nav-badge">
              {{ sitesStore.currentSiteConversations.length }}
            </span>
          </button>
          <button class="bottom-nav-item" @click="toggleSidebar">
            <span class="bottom-nav-icon">🌐</span>
            <span class="bottom-nav-label">Сайты</span>
          </button>
        </nav>
      </main>
    </template>

    <template v-else>
      <main class="main-area client-main">
        <ChatWindow :clientMode="true" />
      </main>
    </template>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  overflow: hidden;
  background: var(--bg-primary);
}
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.burger-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 20;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s;
}
.burger-btn:hover { background: var(--bg-hover); }
.burger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: transform 0.2s;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 20;
  padding-bottom: env(safe-area-inset-bottom, 0);
}
.bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  font-family: var(--font-family);
  transition: color 0.12s;
  position: relative;
}
.bottom-nav-item--active { color: var(--color-primary); }
.bottom-nav-item:disabled { opacity: 0.4; cursor: not-allowed; }
.bottom-nav-icon { font-size: 20px; line-height: 1; }
.bottom-nav-label { font-size: 11px; font-weight: 500; }
.bottom-nav-badge {
  position: absolute;
  top: 0;
  right: 6px;
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 1.4;
}

@media (max-width: 767px) {
  .app-container { flex-direction: column; }
  .main-area { padding-top: 0; padding-bottom: 64px; }
  .client-main { padding-bottom: 0; }
}
</style>
