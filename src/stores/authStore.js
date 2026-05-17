import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('aipilot_token') || '')
  const isAuthenticated = computed(() => !!token.value)

  function login(newToken) {
    token.value = newToken
    localStorage.setItem('aipilot_token', newToken)
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('aipilot_token')
  }

  return { token, isAuthenticated, login, logout }
})
