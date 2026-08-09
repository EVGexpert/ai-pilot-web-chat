/**
 * Нормализация Agent UI Cards.
 * Поддерживает как канонический контракт auth-api, так и совместимые alias-поля.
 */

const KIND_ALIASES = {
  choice: 'single_choice',
  select: 'single_choice',
  radio: 'single_choice',
  single: 'single_choice',
  single_choice: 'single_choice',
  multi: 'multi_choice',
  multiselect: 'multi_choice',
  multiple_choice: 'multi_choice',
  multi_choice: 'multi_choice',
  confirm: 'confirmation',
  yes_no: 'confirmation',
  confirmation: 'confirmation',
  form: 'form'
}

function parseMaybeJson(value, fallback) {
  if (typeof value !== 'string') return value ?? fallback
  try { return JSON.parse(value) } catch { return fallback }
}

export function normalizeCardKind(kind) {
  if (!kind) return ''
  return KIND_ALIASES[String(kind).trim().toLowerCase()] || String(kind).trim().toLowerCase()
}

export function normalizeOption(option, index = 0) {
  if (typeof option === 'string') {
    return { id: option, label: option }
  }

  const source = option && typeof option === 'object' ? option : {}
  const id = source.id ?? source.value ?? source.option_id ?? `option-${index + 1}`
  const label = source.label ?? source.title ?? source.text ?? String(id)

  return {
    ...source,
    id: String(id),
    label: String(label),
    description: source.description ?? source.hint ?? ''
  }
}

export function normalizeAgentUiCard(card, index = 0) {
  const source = card && typeof card === 'object' ? { ...card } : {}
  const rawOptions = parseMaybeJson(source.options ?? source.items ?? source.choices, [])
  const kind = normalizeCardKind(source.kind ?? source.type)
  const id = source.id ?? source.card_id ?? source.cardId ?? `local-card-${Date.now()}-${index}`

  let options = Array.isArray(rawOptions)
    ? rawOptions.map((option, optionIndex) => normalizeOption(option, optionIndex))
    : []

  // Confirmation cards may arrive without explicit options.
  if (kind === 'confirmation' && options.length === 0) {
    options = [
      { id: 'confirm', label: source.confirmLabel ?? source.confirm_label ?? 'Да' },
      { id: 'cancel', label: source.cancelLabel ?? source.cancel_label ?? 'Нет' }
    ]
  }

  return {
    ...source,
    id: String(id),
    kind,
    title: source.title ?? source.question ?? source.prompt ?? '',
    description: source.description ?? source.hint ?? '',
    submitLabel: source.submitLabel ?? source.submit_label ?? source.button_label,
    confirmLabel: source.confirmLabel ?? source.confirm_label,
    cancelLabel: source.cancelLabel ?? source.cancel_label,
    options,
    status: source.status || 'active'
  }
}

export function extractAgentUiCards(payload) {
  if (!payload || typeof payload !== 'object') return []

  const candidates = []
  if (Array.isArray(payload.ui)) candidates.push(...payload.ui)
  else if (payload.ui && typeof payload.ui === 'object') {
    if (Array.isArray(payload.ui.cards)) candidates.push(...payload.ui.cards)
    else candidates.push(payload.ui)
  }

  if (Array.isArray(payload.cards)) candidates.push(...payload.cards)
  if (payload.card && typeof payload.card === 'object') candidates.push(payload.card)

  const seen = new Set()
  return candidates
    .map((card, index) => normalizeAgentUiCard(card, index))
    .filter((card) => {
      if (!card.id || !card.kind || seen.has(card.id)) return false
      seen.add(card.id)
      return true
    })
}

export function getSelectedOptionLabels(card, selectedOptionIds) {
  const ids = Array.isArray(selectedOptionIds) ? selectedOptionIds : [selectedOptionIds]
  const normalizedIds = ids.filter(Boolean).map(String)
  const options = Array.isArray(card?.options) ? card.options : []

  return normalizedIds.map((id) => {
    const option = options.find((item) => String(item.id) === id || String(item.value) === id)
    return option?.label || id
  })
}
