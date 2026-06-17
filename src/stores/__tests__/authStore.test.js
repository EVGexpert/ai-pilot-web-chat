/**
 * Тесты для authStore (Pinia store)
 *
 * Проверяет login, logout, theme, роли пользователя.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('изначально не аутентифицирован', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
  })

  it('login сохраняет токен и данные пользователя', () => {
    const store = useAuthStore()
    store.login('test-token', { name: 'Test', email: 'test@test.com', role: 'admin' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('test-token')
    expect(store.userName).toBe('Test')
    expect(store.isAdmin).toBe(true)
    expect(store.isClient).toBe(false)
    expect(localStorage.getItem('aipilot_token')).toBe('test-token')
  })

  it('login сохраняет URL сайта', () => {
    const store = useAuthStore()
    store.login('token', null, 'https://example.com')

    expect(store.siteUrl).toBe('https://example.com')
    expect(localStorage.getItem('aipilot_site_url')).toBe('https://example.com')
  })

  it('logout очищает все данные', () => {
    const store = useAuthStore()
    store.login('test-token', { name: 'Test', email: 'test@test.com', role: 'admin' })
    store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
    expect(store.siteUrl).toBe('')
    expect(localStorage.getItem('aipilot_token')).toBeNull()
    expect(localStorage.getItem('aipilot_user')).toBeNull()
    expect(localStorage.getItem('aipilot_site_url')).toBeNull()
  })

  it('setTheme переключает тему', () => {
    const store = useAuthStore()

    store.setTheme('dark')
    expect(store.theme).toBe('dark')
    expect(localStorage.getItem('aipilot_theme')).toBe('dark')

    store.setTheme('light')
    expect(store.theme).toBe('light')
  })

  it('isClient для роли client', () => {
    const store = useAuthStore()
    store.login('token', { name: 'Client', email: 'c@t.com', role: 'client' })

    expect(store.isClient).toBe(true)
    expect(store.isAdmin).toBe(false)
  })

  it('сохраняет тему в localStorage и устанавливает data-theme атрибут', () => {
    const store = useAuthStore()

    store.setTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    store.setTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
