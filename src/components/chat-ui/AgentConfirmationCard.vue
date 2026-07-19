<script setup>
const props = defineProps({
  card: {
    type: Object,
    required: true,
    validator: (c) => c && c.id
  }
})

const emit = defineEmits(['resolve'])

function handleConfirm() {
  emit('resolve', { id: props.card.id, confirmed: true })
}

function handleCancel() {
  emit('resolve', { id: props.card.id, confirmed: false })
}
</script>

<template>
  <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm animate-fade-in">
    <div v-if="card.title" class="text-sm font-semibold text-gray-800 mb-1">{{ card.title }}</div>
    <div v-if="card.description" class="text-xs text-gray-500 mb-4">{{ card.description }}</div>

    <div class="flex gap-2">
      <button
        class="flex-1 px-4 py-2 bg-accent text-white text-sm font-medium rounded-xl transition-opacity hover:opacity-90"
        @click="handleConfirm"
      >
        {{ card.confirmLabel || 'Да' }}
      </button>
      <button
        class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-opacity hover:bg-gray-300"
        @click="handleCancel"
      >
        {{ card.cancelLabel || 'Нет' }}
      </button>
    </div>
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
