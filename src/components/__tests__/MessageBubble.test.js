/**
 * Тесты для MessageBubble.vue
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MessageBubble from '../_legacy-chat/MessageBubble.vue'

describe('MessageBubble.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('рендерит сообщение пользователя', () => {
    const msg = { id: '1', role: 'user', content: 'Привет!' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.text()).toContain('Привет!')
    expect(wrapper.find('.max-w-\\[420px\\]').exists()).toBe(true)
  })

  it('рендерит сообщение ассистента', () => {
    const msg = { id: '2', role: 'assistant', content: 'Чем могу помочь?' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.text()).toContain('Чем могу помочь?')
  })

  it('рендерит сообщение системы', () => {
    const msg = { id: '3', role: 'system', content: 'Системное сообщение' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.text()).toContain('Системное сообщение')
  })

  it('парсит Markdown в сообщениях ассистента', () => {
    const msg = { id: '4', role: 'assistant', content: '**Жирный текст**' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.html()).toContain('<strong>')
    expect(wrapper.html()).toContain('Жирный текст')
  })

  it('НЕ парсит Markdown в сообщениях пользователя (plain text)', () => {
    const msg = { id: '5', role: 'user', content: '**не жирный**' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    // User messages are sanitized as plain text
    expect(wrapper.text()).toContain('**не жирный**')
    expect(wrapper.html()).not.toContain('<strong>')
  })

  it('рендерит пользовательское сообщение', () => {
    const userMsg = { id: '6', role: 'user', content: 'Тест' }
    const wrapper = mount(MessageBubble, {
      props: { message: userMsg }
    })

    expect(wrapper.text()).toContain('Тест')
  })
})
