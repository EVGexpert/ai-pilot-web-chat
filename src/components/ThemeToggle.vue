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
    icon: '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.5v2"></path><path d="M12 18.5v2"></path><path d="M4.5 12h2"></path><path d="M17.5 12h2"></path><path d="m6.7 6.7 1.4 1.4"></path><path d="m15.9 15.9 1.4 1.4"></path><path d="m17.3 6.7-1.4 1.4"></path><path d="m8.1 15.9-1.4 1.4"></path></svg>'
  },
  {
    id: 'dark',
    title: 'Тёмная',
    icon: '<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z"></path></svg>'
  }
]
</script>

<template>
  <div
    class="grid h-[34px] w-full max-w-[235px] grid-cols-2 rounded-xl bg-[#eeeeF1] p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-black/5"
    role="group"
    aria-label="Color mode"
  >
    <button
      v-for="m in modes"
      :key="m.id"
      type="button"
      class="flex items-center justify-center rounded-[10px] text-[#666666] transition"
      :class="current === m.id
        ? 'bg-[#fafafa] shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-black/10'
        : 'hover:bg-white/60'"
      :title="m.title"
      :aria-label="`Color mode: ${m.title}`"
      :aria-pressed="current === m.id"
      @click="set(m.id)"
      v-html="m.icon"
    ></button>
  </div>
</template>
