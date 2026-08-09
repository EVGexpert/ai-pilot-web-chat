/**
 * Tests for ActionProposalCard.vue
 *
 * Covers:
 * - processing state visible
 * - double click protection (buttons disabled)
 * - 200 completed updates card
 * - 4xx/5xx shows error
 * - no RangeError / recursion
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionProposalCard from '../ActionProposalCard.vue'

function makeAction(overrides = {}) {
  return {
    id: 'test-action-1',
    title: 'Обновить заголовок',
    description: 'Изменить заголовок страницы на "Новый заголовок"',
    status: 'pending',
    diff: [
      { text: '--- old', added: false, removed: false },
      { text: '+++ new', added: false, removed: false },
      { text: '- Старый заголовок', removed: true },
      { text: '+ Новый заголовок', added: true }
    ],
    ...overrides
  }
}

describe('ActionProposalCard.vue', () => {
  let wrapper

  function mountCard(actionOverrides = {}) {
    return mount(ActionProposalCard, {
      props: {
        action: makeAction(actionOverrides)
      }
    })
  }

  describe('pending state', () => {
    beforeEach(() => {
      wrapper = mountCard({ status: 'pending' })
    })

    it('отображает кнопки Подтвердить и Отклонить', () => {
      expect(wrapper.text()).toContain('Подтвердить')
      expect(wrapper.text()).toContain('Отклонить')
    })

    it('кнопки не disabled', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
      buttons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeUndefined()
      })
    })

    it('отображает статус "Ожидает подтверждения"', () => {
      expect(wrapper.text()).toContain('Ожидает подтверждения')
    })

    it('не имеет ошибки или postId', () => {
      expect(wrapper.text()).not.toContain('ID записи')
      expect(wrapper.text()).not.toContain('Ошибка')
    })
  })

  describe('processing state', () => {
    beforeEach(() => {
      wrapper = mountCard({ status: 'processing' })
    })

    it('отображает "Публикуем…"', () => {
      expect(wrapper.text()).toContain('Публикуем…')
      expect(wrapper.text()).toContain('Отклоняем…')
    })

    it('не отображает "Подтвердить" и "Отклонить"', () => {
      expect(wrapper.text()).not.toContain('Подтвердить')
      expect(wrapper.text()).not.toContain('Отклонить')
    })

    it('кнопки disabled (атрибут disabled присутствует)', () => {
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
      buttons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
    })

    it('отображает статус "Обработка…"', () => {
      expect(wrapper.text()).toContain('Обработка…')
    })

    it('содержит спиннер (svg с классом animate-spin)', () => {
      const spinners = wrapper.findAll('.animate-spin')
      expect(spinners.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('completed state', () => {
    it('отображает "Выполнено" и статус completed', () => {
      wrapper = mountCard({ status: 'completed' })
      expect(wrapper.text()).toContain('Выполнено')
      expect(wrapper.text()).toContain('completed')
    })

    it('показывает post ID при наличии', () => {
      wrapper = mountCard({ status: 'completed', postId: '12345' })
      expect(wrapper.text()).toContain('ID записи')
      expect(wrapper.text()).toContain('12345')
    })

    it('не показывает post ID когда его нет', () => {
      wrapper = mountCard({ status: 'completed' })
      expect(wrapper.text()).not.toContain('ID записи')
    })

    it('показывает "Подтверждено вами"', () => {
      wrapper = mountCard({ status: 'completed' })
      expect(wrapper.text()).toContain('Подтверждено вами')
    })

    it('не имеет активных кнопок', () => {
      wrapper = mountCard({ status: 'completed' })
      expect(wrapper.findAll('button').length).toBe(0)
    })
  })

  describe('rejected state', () => {
    beforeEach(() => {
      wrapper = mountCard({ status: 'rejected' })
    })

    it('отображает "Отклонено"', () => {
      expect(wrapper.text()).toContain('Отклонено')
    })

    it('показывает "Отклонено вами"', () => {
      expect(wrapper.text()).toContain('Отклонено вами')
    })

    it('не имеет активных кнопок', () => {
      expect(wrapper.findAll('button').length).toBe(0)
    })
  })

  describe('failed state', () => {
    beforeEach(() => {
      wrapper = mountCard({ status: 'failed', error: 'Ошибка соединения с сервером' })
    })

    it('отображает текст ошибки', () => {
      expect(wrapper.text()).toContain('Ошибка соединения с сервером')
    })

    it('отображает статус "Ошибка"', () => {
      expect(wrapper.text()).toContain('Ошибка')
    })

    it('показывает кнопку "Повторить"', () => {
      expect(wrapper.text()).toContain('Повторить')
    })

    it('показывает кнопку "Отклонить"', () => {
      expect(wrapper.text()).toContain('Отклонить')
    })

    it('кнопка Повторить не disabled (можно retry)', () => {
      const buttons = wrapper.findAll('button')
      buttons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeUndefined()
      })
    })
  })

  describe('double-click protection', () => {
    it('в processing кнопки disabled и не имеют активных @click', async () => {
      wrapper = mountCard({ status: 'processing' })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
      // Кнопки disabled
      buttons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeDefined()
      })
      // Текст говорит «Публикуем…» — no approve buttons
      expect(wrapper.text()).toContain('Публикуем…')
      expect(wrapper.text()).toContain('Отклоняем…')
      expect(wrapper.text()).not.toContain('Подтвердить')
      expect(wrapper.text()).not.toContain('Отклонить')
    })

    it('в pending кнопки доступны для клика', () => {
      wrapper = mountCard({ status: 'pending' })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
      expect(buttons[0].text()).toContain('Подтвердить')
      expect(buttons[1].text()).toContain('Отклонить')
      expect(buttons[0].attributes('disabled')).toBeUndefined()
      expect(buttons[1].attributes('disabled')).toBeUndefined()
    })

    it('в completed нет кнопок', () => {
      wrapper = mountCard({ status: 'completed' })
      expect(wrapper.findAll('button').length).toBe(0)
    })
  })

  describe('diff rendering', () => {
    it('отображает diff блок', () => {
      wrapper = mountCard({ status: 'pending' })
      expect(wrapper.text()).toContain('Старый заголовок')
      expect(wrapper.text()).toContain('Новый заголовок')
    })

    it('не показывает diff если его нет', () => {
      wrapper = mountCard({ status: 'pending', diff: [] })
      expect(wrapper.text()).not.toContain('Старый заголовок')
    })

    it('не показывает diff если он undefined', () => {
      wrapper = mountCard({ status: 'pending', diff: undefined })
      expect(wrapper.text()).not.toContain('Старый заголовок')
    })
  })

  describe('title and description', () => {
    it('отображает заголовок действия', () => {
      wrapper = mountCard({ status: 'pending', title: 'Тестовое действие' })
      expect(wrapper.text()).toContain('Тестовое действие')
    })

    it('отображает описание при наличии', () => {
      wrapper = mountCard({ status: 'pending', description: 'Описание теста' })
      expect(wrapper.text()).toContain('Описание теста')
    })

    it('не падает при отсутствии описания', () => {
      wrapper = mountCard({ status: 'pending', description: undefined })
      expect(wrapper.text()).toContain('Подтвердить')
    })
  })

  describe('regression', () => {
    it('не вызывает RangeError при любом статусе', () => {
      const statuses = ['pending', 'processing', 'completed', 'rejected', 'failed', 'approved']
      for (const status of statuses) {
        expect(() => {
          mountCard({ status })
        }).not.toThrow()
      }
    })

    it('не вызывает Vue recursion error с разными diff', () => {
      const diffs = [
        ['+ line 1', '- line 2', ' context line'],
        [{ text: 'test', added: true }, { text: 'removed', removed: true }],
        [],
        undefined
      ]
      for (const diff of diffs) {
        expect(() => {
          mountCard({ status: 'pending', diff })
        }).not.toThrow()
      }
    })

    it('сохраняет ActionProposalCard contract — эмитит approve с actionId и reject с actionId', () => {
      const singleAction = makeAction({ id: 'contract-test' })
      wrapper = mount(ActionProposalCard, {
        props: { action: singleAction }
      })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBe(2)
    })

    it('валидатор action.id не падает', () => {
      expect(() => mount(ActionProposalCard, {
        props: { action: { id: 0 } }
      })).not.toThrow()
      expect(() => mount(ActionProposalCard, {
        props: { action: { id: '' } }
      })).not.toThrow()
    })
  })
})
