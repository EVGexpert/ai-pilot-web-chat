import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('aipilot_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('aipilot_user') || 'null'))
  const theme = ref(localStorage.getItem('aipilot_theme') || 'light')
  const siteUrl = ref(localStorage.getItem('aipilot_site_url') || '')



  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name || '')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isClient = computed(() => user.value?.role === 'client')

  function login(newToken, userData = null, siteUrlData = '') {
    token.value = newToken
    user.value = userData
    siteUrl.value = siteUrlData
    localStorage.setItem('aipilot_token', newToken)
    if (userData) {
      localStorage.setItem('aipilot_user', JSON.stringify(userData))
    }
    if (siteUrlData) {
      localStorage.setItem('aipilot_site_url', siteUrlData)
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    siteUrl.value = ''
    localStorage.removeItem('aipilot_token')
    localStorage.removeItem('aipilot_user')
    localStorage.removeItem('aipilot_site_url')
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

  return { token, user, theme, siteUrl, isAuthenticated, userName, isAdmin, isClient, login, logout, setTheme, initTheme }
})
