<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const isLight = computed(() => authStore.theme === 'light')
const isDark = computed(() => authStore.theme === 'dark')

function set(mode) {
  authStore.setTheme(mode)
}
</script>

<template>
  <div
    class="theme-toggle"
    role="group"
    aria-label="Color mode"
  >
    <div class="theme-toggle-inner">
      <button
        type="button"
        class="theme-btn"
        :class="{ 'theme-btn--active': isLight }"
        title="Светлая"
        aria-label="Color mode: Светлая"
        :aria-pressed="isLight"
        @click="set('light')"
      >
        <svg viewBox="0 0 24 24" class="theme-icon" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3.2"></circle>
          <path d="M12 3.5v2"></path>
          <path d="M12 18.5v2"></path>
          <path d="M4.5 12h2"></path>
          <path d="M17.5 12h2"></path>
          <path d="m6.7 6.7 1.4 1.4"></path>
          <path d="m15.9 15.9 1.4 1.4"></path>
          <path d="m17.3 6.7-1.4 1.4"></path>
          <path d="m8.1 15.9-1.4 1.4"></path>
        </svg>
      </button>

      <button
        type="button"
        class="theme-btn"
        :class="{ 'theme-btn--active': isDark }"
        title="Тёмная"
        aria-label="Color mode: Тёмная"
        :aria-pressed="isDark"
        @click="set('dark')"
      >
        <svg viewBox="0 0 24 24" class="theme-icon" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z"></path>
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
  max-width: 235px;
  height: 34px;
  border-radius: 12px;
  background: var(--toggle-bg);
  padding: 2px;
  box-shadow: var(--toggle-shadow-inset);
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--toggle-text);
  transition: all 0.2s ease;
  padding: 0;
}

.theme-btn:hover:not(.theme-btn--active) {
  background: color-mix(in srgb, var(--bg-primary) 60%, transparent);
}

.theme-btn--active {
  background: var(--toggle-active-bg);
  color: var(--toggle-text);
  box-shadow: var(--toggle-shadow-active);
  outline: 1px solid var(--toggle-ring);
}

.theme-icon {
  width: 16px;
  height: 16px;
}
</style>
