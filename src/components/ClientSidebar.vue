<script setup>
/**
 * ClientSidebar.vue
 * Боковая панель для клиентского режима.
 * Отображает навигацию, список сессий, управление темой и выход.
 *
 * Props:
 *   sessionsList — список сессий
 *   currentSessionId — ID текущей сессии
 *   siteName — название сайта (опционально)
 *   csSidebarOpen — открыт ли сайдбар на мобилке
 *
 * Emits:
 *   close — закрыть сайдбар
 *   select-session — выбрать сессию
 *   new-chat — создать новый чат
 *   logout — выйти
 *   toggle-theme — переключить тему
 */
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ThemeToggle from './ThemeToggle.vue'

defineProps({
  sessionsList: { type: Array, default: () => [] },
  currentSessionId: { type: String, default: null },
  siteName: { type: String, default: '' },
  csSidebarOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'select-session', 'new-chat', 'logout', 'toggle-theme'])

const authStore = useAuthStore()
const sitesStore = useSitesStore()
</script>

<template>
  <aside class="client-sidebar" :class="{ 'cs-sidebar--open': csSidebarOpen }">
    <!-- Шапка -->
    <div class="cs-header">
      <div class="cs-brand">
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="cs-logo-img" />
      </div>
      <!-- Кнопка закрытия сайдбара на мобилке -->
      <button class="cs-close-btn" @click="$emit('close')" title="Закрыть">✕</button>
      <button class="cs-theme-btn" @click="$emit('toggle-theme')" :title="authStore.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
        <svg v-if="authStore.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>

    <!-- Текущий сайт -->
    <div v-if="siteName" class="cs-site">{{ siteName }}</div>
    <div class="cs-divider"></div>

    <!-- Кнопка нового чата -->
    <button class="cs-new-btn" @click="$emit('new-chat')">✏️ Новый чат</button>

    <!-- Список сессий -->
    <div class="cs-section-title">История</div>
    <div class="cs-history">
      <div v-if="sessionsList.length === 0" class="cs-empty">Нет обращений</div>
      <div
        v-for="s in sessionsList"
        :key="s.id"
        class="cs-conv"
        :class="{ 'cs-conv--active': s.id === currentSessionId }"
        @click="$emit('select-session', s.id)"
      >
        <div class="cs-conv-title">{{ s.title || 'Чат' }}</div>
        <div class="cs-conv-date">{{ s.date }}</div>
        <div class="cs-conv-preview">{{ s.preview || s.messageCount + ' сообщений' }}</div>
      </div>
    </div>

    <!-- Футер -->
    <div class="cs-footer">
      <ThemeToggle />
      <button class="cs-logout-btn" @click="$emit('logout')">← Выйти</button>
    </div>
  </aside>
</template>

<style scoped>
.client-sidebar {
  width: 240px; flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex; flex-direction: column;
}

.cs-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 16px 12px; }
.cs-brand { display: flex; align-items: center; gap: 8px; }
.cs-logo-img { width: 48px; height: 48px; object-fit: contain; }
.cs-title { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.cs-site { padding: 4px 16px; font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; }
.cs-site::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); }
.cs-divider { height: 1px; background: var(--border-color); margin: 0 16px; }
.cs-new-btn {
  margin: 8px 12px; padding: 10px 12px;
  border: none;
  border-radius: 12px; background: var(--bg-primary);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-accent) 10%, transparent);
  color: var(--text-secondary); font-family: var(--font-family);
  font-size: 13px; cursor: pointer; font-weight: 500;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.cs-new-btn:hover {
  background: var(--color-accent); color: var(--text-inverse);
}
.cs-section-title {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-quaternary);
  padding: 12px 16px 6px;
}
.cs-history { flex: 1; overflow-y: auto; padding: 0 8px 8px; scrollbar-width: thin; }
.cs-empty { font-size: var(--typography-body-small); color: var(--text-quaternary); text-align: center; padding: 24px 16px; }
.cs-conv {
  padding: 10px; margin: 2px 0;
  border-radius: 10px; cursor: pointer;
  transition: all 0.15s; border: 1px solid transparent;
}
.cs-conv:hover { background: var(--bg-hover); border-color: var(--border-color); }
.cs-conv--active {
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 20%, transparent);
}
.cs-conv-title { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-conv-date { font-size: 10px; color: var(--text-quaternary); margin-top: 1px; }
.cs-conv-preview { font-size: 11px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 3px; }
.cs-footer { padding: 12px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; }
.cs-theme-btn { width: 32px; height: 32px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.15s; }
.cs-theme-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.cs-close-btn {
  width: 32px; height: 32px; border: none; background: transparent;
  border-radius: 8px; cursor: pointer; font-size: 16px;
  display: none; align-items: center; justify-content: center;
  color: var(--text-secondary); transition: all 0.15s;
}
.cs-close-btn:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); color: var(--color-error); }
@media (max-width: 767px) { .cs-close-btn { display: flex; } }
.cs-logout-btn { border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 13px; padding: 6px 10px; border-radius: 8px; transition: all 0.15s; font-weight: 500; }
.cs-logout-btn:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); color: var(--color-error); }

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
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  }
  .client-sidebar.cs-sidebar--open {
    left: 0;
  }
}
</style>
