/**
 * Тесты для MessageBubble.vue
 *
 * Проверяет рендер сообщений пользователя и ассистента,
 * разметку Markdown, и отображение действий.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MessageBubble from '../MessageBubble.vue'

describe('MessageBubble.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('рендерит сообщение пользователя с классом bubble-user', () => {
    const msg = { id: '1', role: 'user', content: 'Привет!' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.find('.bubble-user').exists()).toBe(true)
    expect(wrapper.text()).toContain('Привет!')
  })

  it('рендерит сообщение ассистента с классом bubble-assistant', () => {
    const msg = { id: '2', role: 'assistant', content: 'Чем могу помочь?' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.find('.bubble-assistant').exists()).toBe(true)
    expect(wrapper.text()).toContain('Чем могу помочь?')
  })

  it('рендерит сообщение системы с классом bubble-system', () => {
    const msg = { id: '3', role: 'system', content: 'Системное сообщение' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    expect(wrapper.find('.bubble-system').exists()).toBe(true)
  })

  it('парсит Markdown в сообщениях ассистента', () => {
    const msg = { id: '4', role: 'assistant', content: '**Жирный текст**' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    // После парсинга Markdown содержимое — HTML
    const content = wrapper.find('.bubble-content')
    expect(content.html()).toContain('<strong>')
    expect(content.html()).toContain('Жирный текст')
  })

  it('НЕ парсит Markdown в сообщениях пользователя (plain text)', () => {
    const msg = { id: '5', role: 'user', content: '**не жирный**' }
    const wrapper = mount(MessageBubble, {
      props: { message: msg }
    })

    const content = wrapper.find('.bubble-content')
    // Должен быть просто текст, без HTML-тегов
    expect(content.text()).toContain('**не жирный**')
    expect(content.html()).not.toContain('<strong>')
  })

  it('рендерит пользовательское сообщение в стилизованном пузыре', () => {
    const userMsg = { id: '6', role: 'user', content: 'Тест' }
    const wrapper = mount(MessageBubble, {
      props: { message: userMsg }
    })

    expect(wrapper.find('.bubble-user').exists()).toBe(true)
    expect(wrapper.text()).toContain('Тест')
  })
})
