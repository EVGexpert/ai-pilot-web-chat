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

  const DEMO_SITES = [
    { id: 'pilotsite.ru', name: 'pilotsite.ru', status: 'online', url: 'https://pilotsite.ru' },
    { id: 'client1.ru', name: 'client1.ru', status: 'online', url: 'https://client1.ru' },
    { id: 'client2.ru', name: 'client2.ru', status: 'pending', url: 'https://client2.ru' },
  ]

  async function fetchSites() {
    try {
      const token = localStorage.getItem('aipilot_token')
      if (!token) {
        sites.value = DEMO_SITES
        return
      }
      const res = await fetch('/api/sites', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const json = await res.json()
        // auth-api возвращает {sites: [...]} или {sites: [...]}
        const list = json.sites || json
        if (Array.isArray(list) && list.length > 0) {
          sites.value = list.map(s => ({
            id: s.url || s.id,
            name: s.name || s.url,
            status: 'online',
            url: s.url
          }))
        } else {
          sites.value = DEMO_SITES
        }
      } else {
        sites.value = DEMO_SITES
      }
    } catch (e) {
      console.warn('Не удалось загрузить сайты:', e)
      sites.value = DEMO_SITES
    }
  }

  function selectSite(id) {
    currentSiteId.value = id
    // При выборе сайта загружаем историю клиентов
    fetchClientHistory(id)
  }

  const DEMO_CONVERSATIONS = [
    {
      id: 'conv-1',
      siteId: 'pilotsite.ru',
      title: 'Дизайн главной страницы',
      preview: 'Нужно обновить шапку сайта и добавить новый блок с преимуществами...',
      lastMessage: '2026-05-18T05:30:00Z',
      unread: 2
    },
    {
      id: 'conv-2',
      siteId: 'pilotsite.ru',
      title: 'Проблема с плагином',
      preview: 'После обновления перестал работать контактный формуляр...',
      lastMessage: '2026-05-17T14:20:00Z',
      unread: 0
    },
    {
      id: 'conv-3',
      siteId: 'client1.ru',
      title: 'Добавить страницу услуг',
      preview: 'Нужно создать новую страницу с перечнем услуг и ценами...',
      lastMessage: '2026-05-16T09:15:00Z',
      unread: 1
    },
  ]

  async function fetchClientHistory(siteId) {
    try {
      const token = localStorage.getItem('aipilot_token')
      const res = await fetch(`/api/sites/${siteId}/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        clientConversations.value = data.length > 0 ? data : DEMO_CONVERSATIONS.filter(c => c.siteId === siteId)
      } else {
        clientConversations.value = DEMO_CONVERSATIONS.filter(c => c.siteId === siteId)
      }
    } catch (e) {
      console.warn('Не удалось загрузить историю:', e)
      clientConversations.value = DEMO_CONVERSATIONS.filter(c => c.siteId === siteId)
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
