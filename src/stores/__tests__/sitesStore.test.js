/**
 * Тесты для sitesStore (Pinia store)
 *
 * Проверяет управление сайтами, выбор текущего сайта,
 * установку активного view.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSitesStore } from '../sitesStore'

describe('sitesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('изначально пустой', () => {
    const store = useSitesStore()
    expect(store.sites).toEqual([])
    expect(store.currentSiteId).toBeNull()
    expect(store.currentSite).toBeNull()
    expect(store.activeView).toBe('chat')
  })

  it('setSites устанавливает список сайтов', () => {
    const store = useSitesStore()
    store.setSites([
      { id: 'site1', name: 'Site 1', status: 'online', url: 'https://site1.com' },
      { id: 'site2', name: 'Site 2', status: 'offline', url: 'https://site2.com' }
    ])

    expect(store.sites).toHaveLength(2)
    expect(store.sites[0].name).toBe('Site 1')
  })

  it('selectSite устанавливает currentSiteId', () => {
    const store = useSitesStore()
    store.setSites([
      { id: 'site1', name: 'Site 1', status: 'online', url: 'https://site1.com' }
    ])

    store.selectSite('site1')
    expect(store.currentSiteId).toBe('site1')
    expect(store.currentSite).toEqual(store.sites[0])
  })

  it('setActiveView переключает view', () => {
    const store = useSitesStore()
    expect(store.activeView).toBe('chat')

    store.setActiveView('history')
    expect(store.activeView).toBe('history')

    store.setActiveView('chat')
    expect(store.activeView).toBe('chat')
  })

  it('currentSiteConversations фильтрует по siteId', () => {
    const store = useSitesStore()
    store.setSites([{ id: 'site1', name: 'Site 1', status: 'online', url: 'https://site1.com' }])
    store.selectSite('site1')
    store.clientConversations = [
      { id: 'c1', siteId: 'site1', title: 'Conv 1' },
      { id: 'c2', siteId: 'site2', title: 'Conv 2' },
      { id: 'c3', siteId: 'site1', title: 'Conv 3' }
    ]

    expect(store.currentSiteConversations).toHaveLength(2)
    expect(store.currentSiteConversations.map(c => c.id)).toEqual(['c1', 'c3'])
  })

  it('fetchSites загружает сайты из API', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        sites: [
          { url: 'https://test.com', name: 'Test Site' }
        ]
      })
    })
    localStorage.setItem('aipilot_token', 'test-token')

    const store = useSitesStore()
    await store.fetchSites()

    expect(store.sites).toHaveLength(1)
    expect(store.sites[0].name).toBe('Test Site')
    expect(store.sites[0].status).toBe('online')
  })

  it('fetchSites очищает сайты при отсутствии токена', async () => {
    localStorage.removeItem('aipilot_token')

    const store = useSitesStore()
    await store.fetchSites()

    expect(store.sites).toEqual([])
  })
})
