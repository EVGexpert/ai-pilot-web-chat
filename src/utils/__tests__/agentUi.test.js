import { describe, expect, it } from 'vitest'
import {
  extractAgentUiCards,
  getSelectedOptionLabels,
  normalizeAgentUiCard,
  normalizeCardKind
} from '../agentUi.js'

describe('agentUi utils', () => {
  it('normalizes choice aliases', () => {
    expect(normalizeCardKind('choice')).toBe('single_choice')
    expect(normalizeCardKind('multiple_choice')).toBe('multi_choice')
    expect(normalizeCardKind('yes_no')).toBe('confirmation')
  })

  it('normalizes options from JSON string', () => {
    const card = normalizeAgentUiCard({
      id: 'card-1',
      kind: 'choice',
      question: 'Выберите формат',
      options: '[{"value":"html","text":"HTML"}]'
    })

    expect(card.kind).toBe('single_choice')
    expect(card.title).toBe('Выберите формат')
    expect(card.options).toEqual([
      expect.objectContaining({ id: 'html', label: 'HTML' })
    ])
  })

  it('adds default confirmation options', () => {
    const card = normalizeAgentUiCard({ id: 'confirm-1', kind: 'confirmation' })
    expect(card.options.map((option) => option.id)).toEqual(['confirm', 'cancel'])
  })

  it('extracts cards from ui, cards and card payloads without duplicates', () => {
    const cards = extractAgentUiCards({
      ui: [{ id: 'a', kind: 'choice', options: ['One'] }],
      cards: [{ id: 'a', kind: 'single_choice', options: ['One'] }],
      card: { id: 'b', kind: 'confirmation' }
    })

    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.id)).toEqual(['a', 'b'])
  })

  it('maps selected IDs to display labels', () => {
    const labels = getSelectedOptionLabels({
      options: [
        { id: 'draft', label: 'Сохранить черновик' },
        { id: 'publish', label: 'Опубликовать' }
      ]
    }, ['publish'])

    expect(labels).toEqual(['Опубликовать'])
  })
})
