import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getActiveCards as apiActive, respondCard as apiRespond } from '../services/agentUiService.js'
import { normalizeAgentUiCard } from '../utils/agentUi.js'

export const useAgentUiStore = defineStore('agentUi', () => {
  const cards = ref({})

  function createCard(card) {
    const normalized = normalizeAgentUiCard(card)
    if (!normalized.id || !normalized.kind) return null
    cards.value[normalized.id] = normalized
    return normalized
  }

  function createCards(cardList = []) {
    return cardList.map(createCard).filter(Boolean)
  }

  function getCard(id) {
    return cards.value[id] || null
  }

  async function resolveCard(id, selectedOptionIds) {
    const card = cards.value[id]
    if (!card) throw new Error(`Card ${id} not found`)

    const previous = { ...card }
    const ids = Array.isArray(selectedOptionIds)
      ? selectedOptionIds.filter(Boolean)
      : [selectedOptionIds].filter(Boolean)

    cards.value[id] = {
      ...card,
      status: 'resolving',
      selected_option_ids: ids
    }

    try {
      const response = await apiRespond(id, ids)
      const responseCard = response?.card || response
      const normalized = normalizeAgentUiCard({
        ...card,
        ...(responseCard && typeof responseCard === 'object' ? responseCard : {}),
        status: responseCard?.status || 'resolved'
      })

      cards.value[id] = normalized

      return {
        ...(response && typeof response === 'object' ? response : {}),
        card: normalized
      }
    } catch (e) {
      cards.value[id] = previous
      throw e
    }
  }

  function dismissCard(id) {
    delete cards.value[id]
  }

  function clearCards() {
    cards.value = {}
  }

  async function fetchActiveCards(siteUrl, sessionId) {
    const data = await apiActive(siteUrl, sessionId)
    const list = data?.cards || data
    const activeIds = new Set()

    if (Array.isArray(list)) {
      for (const card of list) {
        const normalized = createCard(card)
        if (normalized?.status === 'active') activeIds.add(normalized.id)
      }
    }

    // Remove stale active cards for the same session; keep resolving/resolved cards
    // until their current UI interaction finishes.
    for (const [id, card] of Object.entries(cards.value)) {
      if (
        card.status === 'active' &&
        (!card.session_id || card.session_id === sessionId) &&
        !activeIds.has(id)
      ) {
        delete cards.value[id]
      }
    }

    return Array.from(activeIds)
  }

  return {
    cards,
    createCard,
    createCards,
    getCard,
    resolveCard,
    dismissCard,
    clearCards,
    fetchActiveCards
  }
})
