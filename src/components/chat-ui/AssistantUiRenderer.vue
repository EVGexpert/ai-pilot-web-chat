<script setup>
import { computed } from 'vue'
import AgentChoiceCard from './AgentChoiceCard.vue'
import AgentConfirmationCard from './AgentConfirmationCard.vue'

const props = defineProps({
  card: {
    type: Object,
    required: true,
    validator: (c) => c && c.id && c.kind
  }
})

const emit = defineEmits(['resolve'])

const kind = computed(() => props.card.kind)

const componentMap = {
  single_choice: AgentChoiceCard,
  multi_choice: AgentChoiceCard,
  multiple_choice: AgentChoiceCard,
  confirmation: AgentConfirmationCard
}

const component = computed(() => componentMap[kind.value] || null)
</script>

<template>
  <component
    :is="component"
    v-if="component"
    :card="card"
    @resolve="(payload) => emit('resolve', payload)"
  />
  <div v-else class="text-xs text-red-500">
    Unknown card kind: {{ kind }}
  </div>
</template>
