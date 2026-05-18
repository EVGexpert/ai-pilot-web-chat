<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import LoginForm from './LoginForm.vue'
import AppSidebar from './AppSidebar.vue'
import ChatWindow from './ChatWindow.vue'
import HistoryPanel from './HistoryPanel.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()

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
      <AppSidebar />
      <main class="main-area">
        <Transition name="slide-fade" mode="out-in">
          <ChatWindow v-if="sitesStore.activeView === 'chat'" key="chat" />
          <HistoryPanel v-else key="history" />
        </Transition>
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
</style>
