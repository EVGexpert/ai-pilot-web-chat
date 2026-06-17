<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const windowMatchDark = computed(() => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
})

function set(mode) {
  authStore.setTheme(mode)
}
</script>

<template>
  <div class="theme-toggle" role="group" aria-label="Color mode">
    <div class="theme-toggle-inner">
      <button
        type="button"
        class="theme-btn"
        :class="{ 'theme-btn--active': authStore.theme === 'light' || (authStore.theme === 'system' && !windowMatchDark) }"
        title="Светлая"
        aria-label="Color mode: Светлая"
        :aria-pressed="authStore.theme === 'light' || (authStore.theme === 'system' && !windowMatchDark)"
        @click="set('light')"
      >
        <svg viewBox="0 0 24 24" class="theme-icon">
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
          <path d="M12 3.5v2" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M12 18.5v2" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M4.5 12h2" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="M17.5 12h2" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="m6.7 6.7 1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="m15.9 15.9 1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="m17.3 6.7-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8"></path>
          <path d="m8.1 15.9-1.4 1.4" fill="none" stroke="currentColor" stroke-width="1.8"></path>
        </svg>
      </button>

      <button
        type="button"
        class="theme-btn"
        :class="{ 'theme-btn--active': authStore.theme === 'dark' || (authStore.theme === 'system' && windowMatchDark) }"
        title="Тёмная"
        aria-label="Color mode: Тёмная"
        :aria-pressed="authStore.theme === 'dark'"
        @click="set('dark')"
      >
        <svg viewBox="0 0 24 24" class="theme-icon">
          <path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z" fill="none" stroke="currentColor" stroke-width="1.8"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.theme-toggle-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 34px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--text-muted) 15%, transparent);
  padding: 2px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: all 0.2s ease;
  padding: 0;
}

.theme-btn:hover:not(.theme-btn--active) {
  background: color-mix(in srgb, var(--bg-primary) 60%, transparent);
}

.theme-btn--active {
  background: var(--bg-primary);
  color: var(--text-quaternary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  outline: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-icon {
  width: 16px;
  height: 16px;
}
</style>
