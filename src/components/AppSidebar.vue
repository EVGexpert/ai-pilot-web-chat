<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const emit = defineEmits(['close'])

const collapsed = ref(false)
const searchQuery = ref('')

const siteStatusIcon = (status) => {
  switch (status) {
    case 'online': return '🟢'
    case 'offline': return '🔴'
    case 'pending': return '⏳'
    default: return '⚪'
  }
}

const filteredSites = computed(() => {
  if (!searchQuery.value.trim()) return sitesStore.sites
  const q = searchQuery.value.toLowerCase()
  return sitesStore.sites.filter(s => s.name.toLowerCase().includes(q))
})

function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function handleLogout() {
  sitesStore.clientConversations = []
  authStore.logout()
}
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }" @click="$emit('close')">
    <!-- Шапка сайдбара -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="sidebar-logo" />
      </div>
      <button class="sidebar-close-btn" @click.stop="$emit('close')" title="Закрыть меню">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Поиск -->
    <div class="sidebar-search" v-if="!collapsed">
      <div class="search-wrapper">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Поиск"
          class="search-input"
        />
      </div>
    </div>

    <!-- Новый чат -->
    <div class="sidebar-newchat" v-if="!collapsed">
      <button class="new-chat-btn" @click.stop="sitesStore.setActiveView('chat')">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 16 16" fill="none">
          <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"></path>
        </svg>
        <span>Новый чат</span>
      </button>
    </div>

    <!-- Список сайтов / навигация -->
    <div class="sidebar-nav">
      <!-- Сайты -->
      <div class="nav-section" v-if="!collapsed">
        <p class="nav-section-label">Сегодня</p>
        <ul class="nav-list">
          <li v-for="site in filteredSites" :key="site.id">
            <a
              href="#"
              class="nav-link"
              :class="{ 'nav-link--active': sitesStore.currentSiteId === site.id }"
              @click.prevent.stop="sitesStore.selectSite(site.id)"
            >
              <span class="site-status">{{ siteStatusIcon(site.status) }}</span>
              {{ site.name }}
            </a>
          </li>
          <li v-if="filteredSites.length === 0">
            <span class="nav-empty">Нет сайтов</span>
          </li>
        </ul>
      </div>

      <!-- Навигация -->
      <div class="nav-section" v-if="!collapsed">
        <p class="nav-section-label">Навигация</p>
        <ul class="nav-list">
          <li>
            <a
              href="#"
              class="nav-link"
              :class="{ 'nav-link--active': sitesStore.activeView === 'chat' }"
              @click.prevent.stop="sitesStore.setActiveView('chat')"
            >
              💬 Мой чат
            </a>
          </li>
          <li>
            <a
              href="#"
              class="nav-link"
              :class="{ 'nav-link--active': sitesStore.activeView === 'history' }"
              @click.prevent.stop="sitesStore.setActiveView('history')"
            >
              📋 История клиентов
              <span v-if="sitesStore.currentSiteConversations.length > 0" class="nav-count">
                {{ sitesStore.currentSiteConversations.length }}
              </span>
            </a>
          </li>
        </ul>
      </div>

      <!-- Градиент к прозрачному внизу -->
      <div class="nav-fade" v-if="!collapsed"></div>
    </div>

    <!-- Профиль + Тема + Выход -->
    <div class="sidebar-footer">
      <!-- Профиль -->
      <div class="profile-card" v-if="!collapsed">
        <div class="profile-info">
          <img class="profile-img" src="/img/user-img.png" alt="" />
          <div class="profile-text">
            <p class="profile-name">{{ authStore.userName || 'User' }}</p>
            <p class="profile-email">{{ authStore.userEmail || '' }}</p>
          </div>
        </div>
        <div class="profile-actions">
          <!-- Настройки -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4 profile-settings-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <!-- Выход -->
          <button
            type="button"
            class="logout-btn"
            title="Выйти"
            aria-label="Выйти"
            @click.stop="handleLogout"
          >
            <svg viewBox="0 0 24 24" class="logout-icon" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <path d="M16 17l5-5-5-5"></path>
              <path d="M21 12H9"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Тема -->
      <div class="theme-row" v-if="!collapsed">
        <ThemeToggle />
      </div>

      <!-- Кнопка сворачивания -->
      <button class="collapse-btn" @click.stop="toggleCollapse" :title="collapsed ? 'Развернуть' : 'Свернуть'">
        <svg viewBox="0 0 24 24" class="collapse-icon" :class="{ 'collapse-icon--flipped': collapsed }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 17l-5-5 5-5"></path>
          <path d="M18 17l-5-5 5-5"></path>
        </svg>
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
  padding: 20px 16px;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.25s ease, padding 0.25s ease;
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
  padding: 20px 12px;
}

/* Шапка */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 20px;
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.sidebar-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}

.sidebar--collapsed .sidebar-logo {
  width: 40px;
  height: 40px;
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

/* Поиск */
.sidebar-search {
  padding-bottom: 16px;
  flex-shrink: 0;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-quaternary);
}

.search-input {
  width: 100%;
  padding: 8px 16px 8px 40px;
  background: var(--bg-primary);
  border: none;
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: var(--font-family);
  box-shadow: var(--shadow-sm);
  outline: none;
  transition: box-shadow 0.15s;
}

.search-input::placeholder {
  color: var(--text-quaternary);
}

.search-input:focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 50%, transparent);
}

/* Новый чат */
.sidebar-newchat {
  padding-bottom: 16px;
  flex-shrink: 0;
}

.new-chat-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  background: var(--bg-primary);
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--text-secondary);
  font-size: 14px;
  font-family: var(--font-family);
  width: 100%;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: var(--color-accent);
  color: var(--text-inverse);
}

.new-chat-btn svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Навигация */
.sidebar-nav {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 0;
  overflow: hidden;
}

.nav-section {
  flex-shrink: 0;
}

.nav-section-label {
  font-size: 14px;
  color: var(--text-quaternary);
  margin-bottom: 12px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  margin-bottom: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 14px;
  text-decoration: none;
  transition: color 0.15s;
  cursor: pointer;
}

.nav-link:hover {
  color: var(--color-accent);
}

.nav-link--active {
  color: var(--color-accent);
  font-weight: 600;
}

.site-status {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

.nav-count {
  background: var(--color-accent);
  color: var(--text-inverse);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.5;
  margin-left: auto;
}

.nav-empty {
  font-size: 13px;
  color: var(--text-quaternary);
}

/* Градиент внизу навигации */
.nav-fade {
  pointer-events: none;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(to top, var(--bg-sidebar), transparent);
}

/* Футер */
.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

/* Профиль */
.profile-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-primary);
  padding: 16px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.profile-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-text {
  font-size: 14px;
  color: var(--text-primary);
  min-width: 0;
}

.profile-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
  font-weight: 500;
}

.profile-email {
  color: var(--text-quaternary);
  font-size: 12px;
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.profile-settings-icon {
  width: 16px;
  height: 16px;
  color: var(--text-quaternary);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: var(--text-quaternary);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.logout-btn:hover {
  color: var(--color-error);
}

.logout-icon {
  width: 20px;
  height: 20px;
}

/* Тема */
.theme-row {
  display: flex;
  justify-content: center;
}

/* Кнопка сворачивания */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 36px;
  border: none;
  background: var(--bg-tertiary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: all 0.15s;
}

.collapse-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.collapse-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.25s ease;
}

.collapse-icon--flipped {
  transform: rotate(180deg);
}

/* ============ Collapsed state ============ */
.sidebar--collapsed .sidebar-header {
  justify-content: center;
}

.sidebar--collapsed .sidebar-footer {
  align-items: center;
  border-top: none;
  padding-top: 8px;
}

.sidebar--collapsed .collapse-btn {
  width: 40px;
  margin: 0 auto;
}

/* ============ Mobile Styles ============ */

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    bottom: 0;
    z-index: 100;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
    width: min(85vw, 320px);
  }

  .sidebar.sidebar--open {
    left: 0;
  }

  .sidebar--collapsed {
    width: min(85vw, 320px);
    padding: 20px 16px;
  }
}
</style>
