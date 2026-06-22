<script setup>
defineProps({
  // Название группы: «Сегодня», «7 дней», «30 дней» и т.д.
  title: {
    type: String,
    required: true
  },
  // items: [{ id, title, date? }]. date можно использовать для сортировки/подсказки.
  items: {
    type: Array,
    default: () => []
  },
  activeId: {
    type: [String, Number, null],
    default: null
  }
})

const emit = defineEmits(['select'])
</script>

<template>
  <section v-if="items.length" class="space-y-2">
    <h3 class="px-1 text-xs font-medium text-gray-400">{{ title }}</h3>

    <ul class="space-y-1 text-sm text-gray-600">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="block w-full truncate rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/70 hover:text-accent"
          :class="activeId === item.id ? 'bg-white text-accent shadow-sm' : ''"
          :title="item.title"
          @click="emit('select', item)"
        >
          {{ item.title }}
        </button>
      </li>
    </ul>
  </section>
</template>
