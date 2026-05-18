<script setup>
import { computed } from 'vue'
import { useSitesStore } from '../stores/sitesStore'

const sitesStore = useSitesStore()

const conversations = computed(() => sitesStore.currentSiteConversations)

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  if (isYesterday) return `Вчера ${time}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const hasSiteSelected = computed(() => !!sitesStore.currentSiteId)
</script>

<template>
  <div class="history-panel">
    <div class="history-header">
      <h2 class="history-title">История клиентов</h2>
      <span v-if="hasSiteSelected" class="history-site">
        {{ sitesStore.currentSite?.name }}
      </span>
    </div>

    <div v-if="!hasSiteSelected" class="history-empty">
      <div class="empty-icon">📋</div>
      <p>Выберите сайт, чтобы увидеть<br/>историю обращений клиентов</p>
    </div>

    <div v-else-if="conversations.length === 0" class="history-empty">
      <div class="empty-icon">💬</div>
      <p>Пока нет обращений</p>
      <p class="empty-hint">Когда клиент начнёт чат с AI Pilot на сайте,<br/>история появится здесь</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        class="conv-item"
      >
        <div class="conv-header">
          <span class="conv-title">{{ conv.title || 'Без темы' }}</span>
          <span class="conv-time">{{ formatTime(conv.lastMessage) }}</span>
        </div>
        <p class="conv-preview">{{ conv.preview || 'Нет сообщений' }}</p>
        <div class="conv-meta">
          <span v-if="conv.unread > 0" class="conv-unread">{{ conv.unread }} новых</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color);
}

.history-title {
  font-size: var(--typography-h3-size);
  font-weight: var(--typography-h3-weight);
  color: var(--text-primary);
  margin: 0;
}

.history-site {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  padding: 2px 10px;
  background: var(--bg-tertiary);
  border-radius: 12px;
}

.history-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 24px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  line-height: 1;
}

.empty-icon + p {
  font-size: var(--typography-body-size);
  line-height: 1.6;
  margin: 0;
}

.empty-hint {
  color: var(--text-quaternary) !important;
  margin-top: 4px !important;
  font-size: var(--typography-body-small) !important;
}

/* Список диалогов */
.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conv-item {
  padding: 14px 16px;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background 0.12s ease;
  border: 1px solid transparent;
}

.conv-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.conv-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 4px;
}

.conv-title {
  font-size: var(--typography-body-size);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-time {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  white-space: nowrap;
  flex-shrink: 0;
}

.conv-preview {
  font-size: var(--typography-body-small);
  color: var(--text-tertiary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.conv-meta {
  margin-top: 6px;
}

.conv-unread {
  display: inline-block;
  background: var(--color-primary);
  color: var(--text-inverse);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 10px;
  line-height: 1.5;
}
</style>
