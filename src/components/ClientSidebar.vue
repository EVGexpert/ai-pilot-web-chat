<script setup>
/**
 * ClientSidebar.vue
 * Боковая панель для клиентского режима.
 * Дизайн из chat-layout.html sidebar.
 */
import { useAuthStore } from '../stores/authStore'
import ThemeToggle from './ThemeToggle.vue'

defineProps({
  sessionsList: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: null },
  siteName: { type: String, default: '' },
  csSidebarOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select-session', 'new-chat', 'logout', 'toggle-theme'])

const authStore = useAuthStore()

/** Group sessions by date */
function getSessionDate(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <aside class="client-sidebar" :class="{ 'cs-sidebar--open': csSidebarOpen }">
    <!-- Header: Logo + Close -->
    <div class="cs-header">
      <div class="cs-brand">
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="cs-logo-img" />
      </div>
      <button class="cs-close-btn" @click="$emit('close')" title="Закрыть">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Current site -->
    <div v-if="siteName" class="cs-site">{{ siteName }}</div>
    <div class="cs-divider"></div>

    <!-- New chat button -->
    <div class="cs-newchat">
      <button class="new-chat-btn" @click="$emit('new-chat')">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 16 16" fill="none">
          <path d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z" fill="currentColor"></path>
        </svg>
        <span>Новый чат</span>
      </button>
    </div>

    <!-- Session history -->
    <div class="cs-section-title">История</div>
    <div class="cs-history scrollbar-thin">
      <div v-if="sessionsList.length === 0" class="cs-empty">Нет обращений</div>
      <div
        v-for="s in sessionsList"
        :key="s.id"
        class="cs-conv"
        :class="{ 'cs-conv--active': s.id === currentSessionId }"
        @click="$emit('select-session', s.id)"
      >
        <div class="cs-conv-title">{{ s.title || 'Чат' }}</div>
        <div class="cs-conv-date">{{ s.date || getSessionDate(s.updatedAt || s.createdAt) }}</div>
      </div>
    </div>

    <!-- Gradient fade -->
    <div class="cs-fade"></div>

    <!-- Footer -->
    <div class="cs-footer">
      <!-- Profile -->
      <div class="profile-card">
        <div class="profile-info">
          <img class="profile-img" src="/img/user-img.png" alt="" />
          <div class="profile-text">
            <p class="profile-name">{{ authStore.userName || 'User' }}</p>
            <p class="profile-email">{{ authStore.user?.email || '' }}</p>
          </div>
        </div>
        <div class="profile-setting">
          <!-- Logout -->
          <button
            type="button"
            class="logout-btn"
            title="Выйти"
            aria-label="Выйти"
            @click="$emit('logout')"
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
      <div class="theme-row">
        <ThemeToggle />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.client-sidebar {
  width: 288px;
  flex-shrink: 0;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 20px 16px;
}

/* Header */
.cs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
}

.cs-brand {
  display: flex;
  align-items: center;
}

.cs-logo-img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.cs-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.cs-close-btn:hover {
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
}

@media (max-width: 767px) {
  .cs-close-btn { display: flex; }
}

/* Site */
.cs-site {
  padding: 4px 0;
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.cs-site::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
}

.cs-divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 0 12px;
}

/* New chat */
.cs-newchat {
  margin-bottom: 12px;
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

/* Section title */
.cs-section-title {
  font-size: 14px;
  color: var(--text-quaternary);
  margin-bottom: 12px;
}

/* History */
.cs-history {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.cs-empty {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  text-align: center;
  padding: 24px 16px;
}

.cs-conv {
  padding: 10px;
  margin: 2px 0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.cs-conv:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.cs-conv--active {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.cs-conv-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cs-conv-date {
  font-size: 10px;
  color: var(--text-quaternary);
  margin-top: 1px;
}

/* Gradient fade */
.cs-fade {
  pointer-events: none;
  height: 40px;
  background: linear-gradient(to top, var(--sidebar-gradient-from), var(--sidebar-gradient-to));
  flex-shrink: 0;
  margin-top: -40px;
  position: relative;
}

/* Footer */
.cs-footer {
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
  align-items: center;
  gap: 8px;
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

/* Mobile */
@media (max-width: 767px) {
  .client-sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    bottom: 0;
    width: min(85vw, 320px);
    z-index: 100;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }

  .client-sidebar.cs-sidebar--open {
    left: 0;
  }
}
</style>
