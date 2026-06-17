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
      if (!token) { clientConversations.value = []; return }

      // Ищем сайт по ID
      const site = sites.value.find(s => s.id === siteId || s.url === siteId)
      if (!site || !site.id) { clientConversations.value = []; return }

      // Загружаем историю с сайта через auth-api прокси
      const res = await fetch(`/api/sites/${site.id}/memory`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const memList = data.memory || []

        // Группируем записи по дням как "обращения"
        const grouped = {}
        for (const entry of memList) {
          const day = entry.timestamp ? entry.timestamp.slice(0, 10) : 'unknown'
          if (!grouped[day]) {
            grouped[day] = { id: `mem-${day}`, siteId, title: day, preview: '', messages: [], lastMessage: entry.timestamp, unread: 0 }
          }
          grouped[day].messages.push(entry)
          // Первое сообщение дня = preview
          if (!grouped[day].preview) {
            grouped[day].preview = entry.summary || entry.action || ''
          }
        }

        clientConversations.value = Object.values(grouped)
          .sort((a, b) => b.lastMessage?.localeCompare(a.lastMessage) || 0)
      } else {
        clientConversations.value = []
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю:', e)
      clientConversations.value = []
    }
  }

  /** Установить список сайтов напрямую (используется при логине) */
  function setSites(siteList) {
    sites.value = siteList
  }

  function setActiveView(view) {
    activeView.value = view
  }

  return {
    sites, currentSiteId, currentSite,
    clientConversations, currentSiteConversations,
    activeView,
    fetchSites, setSites, selectSite, fetchClientHistory, setActiveView
  }
})
