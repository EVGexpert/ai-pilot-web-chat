<script setup>
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const emit = defineEmits(['close'])

const siteStatusIcon = (status) => {
  switch (status) {
    case 'online': return '🟢'
    case 'offline': return '🔴'
    case 'pending': return '⏳'
    default: return '⚪'
  }
}

function handleLogout() {
  sitesStore.clientConversations = []
  authStore.logout()
}
</script>

<template>
  <aside class="sidebar"
      @click="$emit('close')">
    <!-- Шапка сайдбара -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <span class="sidebar-logo">🎯</span>
        <span class="sidebar-title">AI Pilot</span>
      </div>
      <div class="sidebar-header-actions">
        <button class="sidebar-close-btn" @click="$emit('close')" title="Закрыть меню">✕</button>
        <ThemeToggle />
      </div>
    </div>

    <!-- Список сайтов -->
    <div class="sidebar-section">
      <div class="section-label">Сайты</div>
      <div class="sites-list">
        <div
          v-for="site in sitesStore.sites"
          :key="site.id"
          class="site-item"
          :class="{ 'site-item--active': sitesStore.currentSiteId === site.id }"
          @click="sitesStore.selectSite(site.id)"
        >
          <span class="site-status">{{ siteStatusIcon(site.status) }}</span>
          <span class="site-name">{{ site.name }}</span>
        </div>
        <div v-if="sitesStore.sites.length === 0" class="sites-empty">
          <p>Нет подключённых сайтов</p>
          <p class="sites-hint">Установите плагин AI Pilot на WordPress</p>
        </div>
      </div>
    </div>

    <!-- Навигация -->
    <div class="sidebar-section">
      <div class="section-label">Навигация</div>
      <button
        class="nav-item"
        :class="{ 'nav-item--active': sitesStore.activeView === 'chat' }"
        @click="sitesStore.setActiveView('chat')"
      >
        <span class="nav-icon">💬</span>
        <span class="nav-label">Мой чат</span>
      </button>
      <button
        class="nav-item"
        :class="{ 'nav-item--active': sitesStore.activeView === 'history' }"
        @click="sitesStore.setActiveView('history')"
        :disabled="!sitesStore.currentSiteId"
      >
        <span class="nav-icon">📋</span>
        <span class="nav-label">История клиентов</span>
        <span v-if="sitesStore.currentSiteConversations.length > 0" class="nav-count">
          {{ sitesStore.currentSiteConversations.length }}
        </span>
      </button>
    </div>

    <!-- Профиль / Выход -->
    <div class="sidebar-footer">
      <div class="user-info" v-if="authStore.userName">
        <span class="user-avatar">{{ authStore.userName.charAt(0).toUpperCase() }}</span>
        <span class="user-name">{{ authStore.userName }}</span>
      </div>
      <button class="sidebar-icon-btn logout-btn" @click="handleLogout" title="Выйти">
        <span class="logout-icon">←</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  padding: 0;
  flex-shrink: 0;
  overflow: hidden;
}

/* Шапка */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px 12px;
  flex-shrink: 0;
}

.sidebar-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sidebar-close-btn {
  display: none;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.sidebar-close-btn:hover {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
}

@media (max-width: 767px) {
  .sidebar-close-btn {
    display: flex;
  }
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-logo {
  font-size: 24px;
  line-height: 1;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-icon-btn {
  width: 36px; height: 36px;
  border: none; background: transparent;
  border-radius: var(--border-radius-sm); cursor: pointer;
  font-size: 16px; display: flex;
  align-items: center; justify-content: center;
  transition: background 0.15s;
  color: var(--text-secondary);
}
.sidebar-icon-btn:hover { background: var(--bg-hover); }



/* Секции */
.sidebar-section {
  padding: 8px 12px;
  flex-shrink: 0;
}

.section-label {
  font-size: var(--typography-caps-size);
  font-weight: var(--typography-caps-weight);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-quaternary);
  padding: 0 4px;
  margin-bottom: 6px;
}

/* Список сайтов */
.sites-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.site-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background 0.12s ease;
  user-select: none;
  position: relative;
}

.site-item:hover {
  background: var(--bg-hover);
}

.site-item--active {
  background: var(--bg-tertiary);
}

.site-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 3px 3px 0;
}

.site-status {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.site-name {
  font-size: var(--typography-body-size);
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sites-empty {
  padding: 16px 12px;
  text-align: center;
}

.sites-empty p {
  font-size: var(--typography-body-small);
  color: var(--text-tertiary);
  line-height: 1.5;
  margin: 0;
}

.sites-hint {
  color: var(--text-quaternary) !important;
  margin-top: 4px !important;
}

/* Навигация */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background 0.12s ease;
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  color: var(--text-secondary);
  text-align: left;
  margin-bottom: 2px;
  position: relative;
}

.nav-item:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.nav-item--active {
  background: var(--bg-tertiary);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 3px 3px 0;
}

.nav-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.nav-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
}

.nav-count {
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.5;
}

/* Футер */
.sidebar-footer {
  margin-top: auto;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.user-name {
  font-size: var(--typography-body-size);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  flex-shrink: 0;
}

.logout-icon {
  font-size: 18px;
}

/* ============ Mobile Styles ============ */

@media (max-width: 767px) {
  .sidebar--mobile {
    position: fixed;
    left: -100%;
    top: 0;
    bottom: 0;
    z-index: 100;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  }

  .sidebar--mobile.sidebar--open {
    left: 0;
  }
}
</style>
