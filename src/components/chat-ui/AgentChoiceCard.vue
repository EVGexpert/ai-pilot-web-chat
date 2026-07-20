<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true,
    validator: (c) => c && c.id && Array.isArray(c.options)
  }
})

const emit = defineEmits(['resolve'])

const selectedIds = ref([])

const kind = computed(() => props.card.kind || 'single_choice')
const isMulti = computed(() => kind.value === 'multi_choice' || kind.value === 'multiple_choice')

function toggleOption(optionId) {
  if (isMulti.value) {
    const idx = selectedIds.value.indexOf(optionId)
    if (idx === -1) selectedIds.value.push(optionId)
    else selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value = [optionId]
  }
}

function isSelected(optionId) {
  return selectedIds.value.includes(optionId)
}

function handleSubmit() {
  if (selectedIds.value.length === 0) return
  emit('resolve', {
    id: props.card.id,
    selectedOptionIds: isMulti.value ? selectedIds.value : selectedIds.value[0]
  })
}
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm animate-fade-in">
    <div v-if="card.title" class="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">{{ card.title }}</div>
    <div v-if="card.description" class="text-xs text-gray-500 dark:text-slate-400 mb-3">{{ card.description }}</div>

    <div class="space-y-2">
      <div
        v-for="opt in card.options"
        :key="opt.id"
        class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
        :class="isSelected(opt.id)
          ? 'border-accent bg-accent/5 dark:bg-accent/10'
          : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'"
        @click="toggleOption(opt.id)"
      >
        <input
          :type="isMulti ? 'checkbox' : 'radio'"
          :name="'choice-' + card.id"
          :value="opt.id"
          :checked="isSelected(opt.id)"
          class="mt-0.5 accent-accent"
          readonly
        />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-gray-800 dark:text-slate-100">{{ opt.label }}</div>
          <div v-if="opt.description" class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ opt.description }}</div>
        </div>
      </div>
    </div>

    <button
      class="mt-3 w-full px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl transition-opacity disabled:opacity-40"
      :disabled="selectedIds.length === 0"
      @click="handleSubmit"
    >
      {{ card.submitLabel || 'Подтвердить' }}
    </button>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
