<script setup>
import { ref } from 'vue'
import LoginForm from './components/LoginForm.vue'
import ChatWindow from './components/ChatWindow.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
</script>

<template>
  <div class="app-container">
    <LoginForm v-if="!authStore.isAuthenticated" />
    <ChatWindow v-else />
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
