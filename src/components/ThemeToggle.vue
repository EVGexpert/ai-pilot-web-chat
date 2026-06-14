<script setup>
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

function set(mode) {
  authStore.setTheme(mode)
}

const modes = [
  {
    id: 'system',
    title: 'Системная',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>'
  },
  {
    id: 'light',
    title: 'Светлая',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>'
  },
  {
    id: 'dark',
    title: 'Тёмная',
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6.5 6.5 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>'
  }
]
</script>

<template>
  <div class="theme-toggle" role="group" aria-label="Color mode">
    <button
      v-for="m in modes"
      :key="m.id"
      type="button"
      class="theme-btn"
      :class="{ 'theme-btn--active': authStore.theme === m.id }"
      :title="m.title"
      :aria-label="`Color mode: ${m.title}`"
      :aria-pressed="authStore.theme === m.id"
      @click="set(m.id)"
      v-html="m.icon"
    ></button>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}
.theme-btn {
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-quaternary);
  transition: all 0.15s;
  padding: 0;
}
.theme-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}
.theme-btn--active {
  color: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.theme-btn svg {
  display: block;
}
</style>
