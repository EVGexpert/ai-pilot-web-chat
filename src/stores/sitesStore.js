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
      if (!token) {
        sites.value = []
        return
      }
      const res = await fetch('/api/sites', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json()
        const list = json.sites || json
        if (Array.isArray(list) && list.length > 0) {
          sites.value = list.map(s => ({
            id: s.url || s.id,
            name: s.name || s.url,
            status: 'online',
            url: s.url
          }))
        } else {
          sites.value = []
        }
      } else {
        sites.value = []
      }
    } catch (e) {
      console.warn('Не удалось загрузить сайты:', e)
      sites.value = []
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
        const data = await res.json()
        clientConversations.value = data.length > 0 ? data : []
      } else {
        clientConversations.value = []
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю:', e)
      clientConversations.value = []
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
