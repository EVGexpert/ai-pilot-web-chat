import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createCard as apiCreate, getActiveCards as apiActive, respondCard as apiRespond } from '../services/agentUiService.js'

export const useAgentUiStore = defineStore('agentUi', () => {
  const cards = ref({})

  function createCard(card) {
    cards.value[card.id] = { ...card, status: card.status || 'active' }
  }

  async function resolveCard(id, selectedOptionId) {
    const card = cards.value[id]
    if (!card) throw new Error(`Card ${id} not found`)
    const updated = await apiRespond(id, { optionId: selectedOptionId })
    cards.value[id] = { ...cards.value[id], ...updated }
  }

  function dismissCard(id) {
    delete cards.value[id]
  }

  async function fetchActiveCards(siteId, sessionId) {
    const data = await apiActive(siteId, sessionId)
    const list = data.cards || data
    if (Array.isArray(list)) {
      for (const card of list) {
        cards.value[card.id] = { ...card, status: card.status || 'active' }
      }
    }
  }

  return { cards, createCard, resolveCard, dismissCard, fetchActiveCards }
})
