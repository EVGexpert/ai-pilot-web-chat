/**
 * Тесты для LoginForm.vue
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

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Введите email и пароль')
  })

  it('показывает ошибку при пустом пароле', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.find('#email').setValue('test@test.com')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Введите email и пароль')
  })

  it('показывает состояние загрузки при отправке', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))

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
    expect(wrapper.text()).toContain('Управление WordPress-сайтами')
  })
})