import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('aipilot_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('aipilot_user') || 'null'))
  const theme = ref(localStorage.getItem('aipilot_theme') || 'light')

  // Gateway токен — из env (встраивается при сборке)
  const gatewayToken = ref(import.meta.env.VITE_GATEWAY_TOKEN || '')

  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name || '')
  const isAdmin = computed(() => user.value?.role === 'admin')

  function login(newToken, userData = null) {
    token.value = newToken
    user.value = userData
    localStorage.setItem('aipilot_token', newToken)
    if (userData) {
      localStorage.setItem('aipilot_user', JSON.stringify(userData))
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('aipilot_token')
    localStorage.removeItem('aipilot_user')
  }

  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem('aipilot_theme', newTheme)
    applyTheme(newTheme)
  }

  function applyTheme(mode) {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
      document.documentElement.setAttribute('data-theme', prefersDark.matches ? 'dark' : 'light')
      // Слушаем изменения системной темы
      prefersDark.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }, { once: true })
    } else {
      document.documentElement.setAttribute('data-theme', mode)
    }
  }

  function initTheme() {
    applyTheme(theme.value)
  }

  return { token, user, theme, gatewayToken, isAuthenticated, userName, isAdmin, login, logout, setTheme, initTheme }
})
