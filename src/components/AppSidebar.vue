<script setup>
/**
 * AppSidebar.vue
 * Боковая панель для админского режима.
 * Дизайн из chat-layout.html: логотип, поиск, новый чат,
 * история с группами (Сегодня / 7 дней / 30 дней),
 * градиент fade, profile-card, переключатель темы, сворачивание.
 */
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const emit = defineEmits(['close', 'toggle-collapse'])

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})

const searchQuery = ref('')

/** Фильтрованные сайты */
const filteredSites = computed(() => {
  if (!searchQuery.value) return sitesStore.sites
  const q = searchQuery.value.toLowerCase()
  return sitesStore.sites.filter(s => s.name.toLowerCase().includes(q))
})

/** Группировка сессий по времени */
const todayConversations = computed(() => {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  return sitesStore.currentSiteConversations.filter(c => {
    const d = (c.updatedAt || c.createdAt || '').slice(0, 10)
    return d === today
  })
})

const weekConversations = computed(() => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const today = now.toISOString().slice(0, 10)
  return sitesStore.currentSiteConversations.filter(c => {
    const d = (c.updatedAt || c.createdAt || '').slice(0, 10)
    return d >= weekAgo && d !== today
  })
})

const monthConversations = computed(() => {
  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return sitesStore.currentSiteConversations.filter(c => {
    const d = (c.updatedAt || c.createdAt || '').slice(0, 10)
    return d >= monthAgo && d < weekAgo
  })
})

function siteStatusColor(status) {
  switch (status) {
    case 'online': return 'bg-green-500'
    case 'offline': return 'bg-slate-600'
    case 'pending': return 'bg-yellow-500'
    default: return 'bg-slate-600'
  }
}

function siteActiveStatus(status) {
  if (status === 'online') return 'bg-blue-400'
  return siteStatusColor(status)
}

function formatConversationDate(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function handleLogout() {
  sitesStore.clientConversations = []
  authStore.logout()
}

function handleToggleCollapse() {
  emit('toggle-collapse')
}

/** User email from auth store */
const userEmail = computed(() => authStore.user?.email || '')
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <!-- Header: Logo + Collapse button -->
    <div class="side-header">
      <div class="sidebar-brand">
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="sidebar-logo" />
      </div>
      <button class="open-close-btn" @click.stop="handleToggleCollapse" :title="collapsed ? 'Развернуть' : 'Свернуть'">
        <svg class="size-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z"
            fill="currentColor"
          ></path>
        </svg>
      </button>
    </div>

    <!-- Search -->
    <div v-if="!collapsed" class="sidebar-search">
      <div class="relative">
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

    <!-- New Chat -->
    <div v-if="!collapsed" class="sidebar-newchat">
      <button class="new-chat-btn" @click.stop="sitesStore.setActiveView('chat')">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 16 16" fill="none">
          <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"></path>
        </svg>
        <span>Новый чат</span>
      </button>
    </div>

    <!-- Divider -->
    <div class="sidebar-divider" v-if="!collapsed"></div>

    <!-- Chat history — scrollable area -->
    <div class="sidebar-history" v-if="!collapsed">
      <div class="chat-history scrollbar-thin">
        <!-- Sites (today group) -->
        <div v-if="filteredSites.length > 0">
          <p class="history-label">Сегодня</p>
          <ul class="history-list">
            <li v-for="site in filteredSites" :key="site.id">
              <a
                href="#"
                class="history-link"
                :class="{ 'history-link--active': sitesStore.currentSiteId === site.id }"
                @click.prevent.stop="sitesStore.selectSite(site.id)"
              >
                {{ site.name }}
              </a>
            </li>
          </ul>
        </div>

        <!-- Navigation -->
        <div>
          <p class="history-label">Навигация</p>
          <ul class="history-list">
            <li>
              <a
                href="#"
                class="history-link"
                :class="{ 'history-link--active': sitesStore.activeView === 'chat' }"
                @click.prevent.stop="sitesStore.setActiveView('chat')"
              >💬 Мой чат</a>
            </li>
            <li>
              <a
                href="#"
                class="history-link"
                :class="{ 'history-link--active': sitesStore.activeView === 'history' }"
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

        <!-- Recent conversations — grouped -->
        <div v-if="todayConversations.length > 0">
          <p class="history-label">Сегодня</p>
          <ul class="history-list">
            <li v-for="conv in todayConversations" :key="conv.id">
              <a href="#" class="history-link" @click.prevent>{{ conv.title || conv.id }}</a>
            </li>
          </ul>
        </div>

        <div v-if="weekConversations.length > 0">
          <p class="history-label">7 дней</p>
          <ul class="history-list">
            <li v-for="conv in weekConversations" :key="conv.id">
              <a href="#" class="history-link" @click.prevent>{{ conv.title || conv.id }}</a>
            </li>
          </ul>
        </div>

        <div v-if="monthConversations.length > 0">
          <p class="history-label">30 дней</p>
          <ul class="history-list">
            <li v-for="conv in monthConversations" :key="conv.id">
              <a href="#" class="history-link" @click.prevent>{{ conv.title || conv.id }}</a>
            </li>
          </ul>
        </div>
      </div>
      <!-- Gradient fade -->
      <div class="nav-fade"></div>
    </div>

    <!-- Collapsed: icons only -->
    <div v-if="collapsed" class="sidebar-collapsed-icons">
      <button class="collapsed-icon-btn" @click.stop="sitesStore.setActiveView('chat')" title="Мой чат">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
      </button>
      <button class="collapsed-icon-btn" @click.stop="sitesStore.setActiveView('history')" title="История">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </button>
    </div>

    <!-- Footer -->
    <div class="chat-footer">
      <!-- Profile card -->
      <div class="profile-card" v-if="!collapsed">
        <div class="profile-info">
          <img class="profile-img" src="/img/user-img.png" alt="" />
          <div class="profile-text">
            <p class="profile-name">{{ authStore.userName || 'User' }}</p>
            <p class="profile-email">{{ userEmail }}</p>
          </div>
        </div>
        <div class="profile-setting">
          <!-- Settings -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="settings-icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <!-- Logout -->
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

      <!-- Theme toggle -->
      <div class="theme-row" v-if="!collapsed">
        <ThemeToggle />
      </div>

      <!-- Collapsed: logout icon -->
      <button v-if="collapsed" class="collapsed-logout" @click.stop="handleLogout" title="Выйти">
        <svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <path d="M16 17l5-5-5-5"></path>
          <path d="M21 12H9"></path>
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  border-radius: 16px;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.25s ease, padding 0.25s ease;
  padding: 20px 16px;
}

.sidebar--collapsed {
  width: var(--sidebar-collapsed-width);
  padding: 20px 12px;
}

/* === Header === */
.side-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 20px;
  flex-shrink: 0;
}

.sidebar--collapsed .side-header {
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
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

.open-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: color 0.15s;
  padding: 4px;
  border-radius: 8px;
}

.open-close-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* === Search === */
.sidebar-search {
  padding-bottom: 16px;
  flex-shrink: 0;
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

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--text-quaternary);
  pointer-events: none;
}

.relative {
  position: relative;
}

/* === New Chat === */
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
  background: color-mix(in srgb, var(--color-accent) 70%, transparent);
  color: var(--text-inverse);
}

/* === Divider === */
.sidebar-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0 0 16px;
  flex-shrink: 0;
}

/* === History === */
.sidebar-history {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 4px;
}

.history-label {
  font-size: 14px;
  color: var(--text-quaternary);
  margin-bottom: 12px;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-list li {
  margin-bottom: 8px;
}

.history-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 14px;
  text-decoration: none;
  transition: color 0.15s;
  cursor: pointer;
}

.history-link:hover {
  color: var(--color-accent);
}

.history-link--active {
  color: var(--color-accent);
  font-weight: 600;
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

/* Gradient fade at bottom */
.nav-fade {
  pointer-events: none;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: linear-gradient(to top, var(--sidebar-gradient-from), var(--sidebar-gradient-to));
}

/* === Collapsed icons === */
.sidebar-collapsed-icons {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.collapsed-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: all 0.15s;
}

.collapsed-icon-btn:hover {
  color: var(--color-accent);
  background: var(--bg-hover);
}

.collapsed-icon-btn .icon {
  width: 20px;
  height: 20px;
}

/* === Footer === */
.chat-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

/* Profile card */
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

.profile-setting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.settings-icon {
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

/* Theme row */
.theme-row {
  display: flex;
  justify-content: center;
}

/* Collapsed logout */
.collapsed-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-quaternary);
  transition: all 0.15s;
  margin: 0 auto;
}

.collapsed-logout:hover {
  color: var(--color-error);
  background: var(--bg-hover);
}

.collapsed-logout .icon {
  width: 20px;
  height: 20px;
}

/* === Collapsed footer === */
.sidebar--collapsed .chat-footer {
  align-items: center;
  border-top: none;
  padding-top: 8px;
}

/* === Mobile === */
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
}
</style>
