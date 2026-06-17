/**
 * Тесты для LoginForm.vue
 *
 * Проверяет рендер формы, валидацию и обработку ошибок.
 * API-вызовы замоканы, так как настоящий сервер недоступен.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LoginForm from '../LoginForm.vue'

describe('LoginForm.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('рендерит форму с полями email, password, кнопкой', () => {
    const wrapper = mount(LoginForm)

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('#email').exists()).toBe(true)
    expect(wrapper.find('#password').exists()).toBe(true)
    expect(wrapper.find('#name').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('показывает ошибку при пустом email', async () => {
    const wrapper = mount(LoginForm)

    // Пытаемся отправить с пустыми полями
    await wrapper.find('form').trigger('submit.prevent')

    const errorEl = wrapper.find('.login-alert')
    expect(errorEl.exists()).toBe(true)
    expect(errorEl.text()).toBe('Введите email и пароль')
  })

  it('показывает ошибку при пустом пароле', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.find('#email').setValue('test@test.com')
    await wrapper.find('form').trigger('submit.prevent')

    const errorEl = wrapper.find('.login-alert')
    expect(errorEl.exists()).toBe(true)
    expect(errorEl.text()).toBe('Введите email и пароль')
  })

  it('показывает состояние загрузки при отправке', async () => {
    // Мокаем fetch чтобы он не упал, но и не завершился мгновенно
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) // never resolves

    const wrapper = mount(LoginForm)

    await wrapper.find('#email').setValue('test@test.com')
    await wrapper.find('#password').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')

    const submitBtn = wrapper.find('button[type="submit"]')
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('отображает заголовок и описание', () => {
    const wrapper = mount(LoginForm)

    expect(wrapper.text()).toContain('AI Pilot')
    expect(wrapper.text()).toContain('Войдите для управления сайтами')
  })
})
