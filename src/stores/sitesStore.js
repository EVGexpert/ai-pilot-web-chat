import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSitesStore = defineStore('sites', () => {
  const sites = ref([])
  const currentSiteId = ref(null)

  const currentSite = computed(() =>
    sites.value.find(s => s.id === currentSiteId.value) || null
  )

  async function fetchSites() {
    // TODO: запрос к API для получения списка сайтов
    sites.value = []
  }

  function selectSite(id) {
    currentSiteId.value = id
  }

  return { sites, currentSiteId, currentSite, fetchSites, selectSite }
})
