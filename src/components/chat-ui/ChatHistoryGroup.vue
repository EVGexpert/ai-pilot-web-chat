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
          class="flex w-full items-center truncate text-sm transition hover:text-accent"
          :class="[
            collapsed ? 'justify-center' : '',
            item.id === activeChatId
              ? 'text-accent'
              : theme === 'dark'
                ? 'text-slate-400'
                : 'text-gray-800'
          ]"
          :title="item.title"
          @click="handleClick(item)"
        >
          <template v-if="collapsed">
            <svg class="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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