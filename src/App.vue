<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useSitesStore } from './stores/sitesStore'
import LoginForm from './components/LoginForm.vue'
import AppSidebar from './components/AppSidebar.vue'
import ChatWindow from './components/ChatWindow.vue'
import HistoryPanel from './components/HistoryPanel.vue'
import ConnectPopup from './components/ConnectPopup.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()

// Определяем режим страницы по URL
const isConnectMode = ref(false)

onMounted(() => {
  const path = window.location.pathname
  isConnectMode.value = path === '/connect' || path.startsWith('/auth/connect')

  if (!isConnectMode.value) {
    authStore.initTheme()
    if (authStore.isAuthenticated) {
      sitesStore.fetchSites()
    }
  }
})

function handleLogin() {
  sitesStore.fetchSites()
}
</script>

<template>
  <div class="app-container">
    <!-- Режим подключения (popup из плагина) -->
    <ConnectPopup v-if="isConnectMode" />

    <!-- Обычный режим -->
    <template v-else>
      <LoginForm v-if="!authStore.isAuthenticated" @login="handleLogin" />

      <!-- 👑 Суперадмин: сайдбар + чат/история -->
      <template v-else-if="authStore.isAdmin">
        <AppSidebar />
        <main class="main-area">
          <Transition name="slide-fade" mode="out-in">
            <ChatWindow v-if="sitesStore.activeView === 'chat'" key="chat" />
            <HistoryPanel v-else key="history" />
          </Transition>
        </main>
      </template>

      <!-- 👤 Клиент: только чат, без сайдбара -->
      <template v-else>
        <main class="main-area client-main">
          <ChatWindow :clientMode="true" />
        </main>
      </template>
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
</style>
