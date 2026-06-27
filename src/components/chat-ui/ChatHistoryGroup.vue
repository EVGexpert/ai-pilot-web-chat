<script setup>
defineProps({
  title: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  activeChatId: { type: [String, Number], default: null },
  collapsed: { type: Boolean, default: false },
  theme: { type: String, default: 'light' }
})

const emit = defineEmits(['select'])

function handleClick(item) {
  emit('select', item)
}
</script>

<template>
  <div>
    <p
      v-if="!collapsed"
      class="mb-3 px-1 text-xs font-medium"
      :class="theme === 'dark' ? 'text-slate-500' : 'text-gray-400'"
    >
      {{ title }}
    </p>

    <ul class="space-y-2" :class="collapsed ? 'text-gray-500' : ''">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="block w-full truncate rounded-lg px-1.5 py-1.5 text-left text-sm transition hover:bg-white/70 hover:text-accent"
          :class="[
            collapsed ? 'text-center' : '',
            item.id === activeChatId
              ? 'bg-white text-accent shadow-sm'
              : theme === 'dark'
                ? 'text-slate-300 dark:hover:bg-white/10'
                : 'text-gray-800'
          ]"
          :title="item.title"
          @click="handleClick(item)"
        >
          <template v-if="collapsed">
            <svg class="mx-auto size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
            </svg>
          </template>
          <template v-else>
            {{ item.title }}
          </template>
        </button>
      </li>
    </ul>
  </div>
</template>