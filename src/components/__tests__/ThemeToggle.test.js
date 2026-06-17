/**
 * Тесты для ThemeToggle.vue
 *
 * Компонент переключает тему (light / dark) через authStore.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../stores/authStore'
import ThemeToggle from '../ThemeToggle.vue'

describe('ThemeToggle.vue', () => {
  beforeEach(() => {
    // Сбрасываем Pinia перед каждым тестом
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('рендерит две кнопки (light, dark)', () => {
    const wrapper = mount(ThemeToggle)
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
  })

  it('подсвечивает активную тему (light по умолчанию)', () => {
    const wrapper = mount(ThemeToggle)
    const activeBtn = wrapper.find('button.theme-btn--active')
    expect(activeBtn.exists()).toBe(true)
  })

  it('переключает тему при клике на dark', async () => {
    const authStore = useAuthStore()
    const wrapper = mount(ThemeToggle)

    const darkBtn = wrapper.findAll('button')[1] // second button = dark
    await darkBtn.trigger('click')

    expect(authStore.theme).toBe('dark')
    expect(localStorage.getItem('aipilot_theme')).toBe('dark')
  })

  it('переключает тему при клике на light', async () => {
    const authStore = useAuthStore()
    authStore.setTheme('dark') // start from dark
    const wrapper = mount(ThemeToggle)

    const lightBtn = wrapper.findAll('button')[0] // first button = light
    await lightBtn.trigger('click')

    expect(authStore.theme).toBe('light')
  })

  it('имеет aria-label для доступности', () => {
    const wrapper = mount(ThemeToggle)
    const buttons = wrapper.findAll('button')

    expect(buttons[0].attributes('aria-label')).toBe('Color mode: Светлая')
    expect(buttons[1].attributes('aria-label')).toBe('Color mode: Тёмная')
  })

  it('имеет aria-pressed для активной кнопки', () => {
    const wrapper = mount(ThemeToggle)
    const activeBtn = wrapper.find('button.theme-btn--active')
    expect(activeBtn.attributes('aria-pressed')).toBe('true')
  })
})
