import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSitesStore = defineStore('sites', () => {
  const sites = ref([])
  const currentSiteId = ref(null)
  const clientConversations = ref([]) // история диалогов клиентов
  const activeView = ref('chat') // 'chat' | 'history'

  const currentSite = computed(() =>
    sites.value.find(s => s.id === currentSiteId.value) || null
  )

  const currentSiteConversations = computed(() =>
    currentSiteId.value
      ? clientConversations.value.filter(c => c.siteId === currentSiteId.value)
      : []
  )

  async function fetchSites() {
    try {
      const token = localStorage.getItem('aipilot_token')
      const res = await fetch('/api/sites', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        sites.value = await res.json()
      }
    } catch (e) {
      console.warn('Не удалось загрузить сайты:', e)
      // Пока заглушка
      sites.value = [
        { id: 'pilotsite.ru', name: 'pilotsite.ru', status: 'online', url: 'https://pilotsite.ru' }
      ]
    }
  }

  function selectSite(id) {
    currentSiteId.value = id
    // При выборе сайта загружаем историю клиентов
    fetchClientHistory(id)
  }

  async function fetchClientHistory(siteId) {
    try {
      const token = localStorage.getItem('aipilot_token')
      const res = await fetch(`/api/sites/${siteId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        clientConversations.value = await res.json()
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю:', e)
      // Заглушка для демо
      clientConversations.value = [
        {
          id: 'conv-1',
          siteId: 'pilotsite.ru',
          title: 'Дизайн главной страницы',
          preview: 'Нужно обновить шапку сайта...',
          lastMessage: '2026-05-18T05:30:00Z',
          unread: 2
        },
        {
          id: 'conv-2',
          siteId: 'pilotsite.ru',
          title: 'Проблема с плагином',
          preview: 'После обновления перестал...',
          lastMessage: '2026-05-17T14:20:00Z',
          unread: 0
        }
      ]
    }
  }

  function setActiveView(view) {
    activeView.value = view
  }

  return {
    sites, currentSiteId, currentSite,
    clientConversations, currentSiteConversations,
    activeView,
    fetchSites, selectSite, fetchClientHistory, setActiveView
  }
})
