<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const current = computed(() => authStore.theme)

function set(mode) {
  authStore.setTheme(mode)
}

const modes = [
  {
    id: 'light',
    title: 'Светлая',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
  },
  {
    id: 'dark',
    title: 'Тёмная',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
  }
]
</script>

<template>
  <div class="flex gap-0.5 p-0.5 bg-gray-200/50 rounded-lg" role="group" aria-label="Color mode">
    <button
      v-for="m in modes"
      :key="m.id"
      type="button"
      class="w-7 h-7 border border-transparent bg-transparent rounded-md cursor-pointer flex items-center justify-center text-gray-400 transition-all p-0"
      :class="{ 'text-blue-600 !border-blue-400/50 !bg-blue-50': current === m.id }"
      :title="m.title"
      :aria-label="`Color mode: ${m.title}`"
      :aria-pressed="current === m.id"
      @click="set(m.id)"
      v-html="m.icon"
    ></button>
  </div>
</template>
