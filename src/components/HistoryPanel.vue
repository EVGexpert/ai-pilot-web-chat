<script setup>
import { ref, computed } from 'vue'
import { useSitesStore } from '../stores/sitesStore'

const sitesStore = useSitesStore()
const selectedConvId = ref(null)

const conversations = computed(() => sitesStore.currentSiteConversations)

const selectedConversation = computed(() =>
  conversations.value.find(c => c.id === selectedConvId.value) || null
)

// Демо-сообщения для раскрытого чата
const DEMO_MESSAGES = {
  'conv-1': [
    { role: 'client', content: 'Здравствуйте! Нужно обновить шапку сайта — поменять логотип и добавить новый пункт меню "Услуги".', time: '05:15' },
    { role: 'assistant', content: 'Здравствуйте! Я могу помочь с этим. Какой у вас новый логотип? Загрузите файл или укажите URL.', time: '05:16' },
    { role: 'client', content: 'Вот ссылка на лого: https://example.com/logo.svg. А в меню нужно добавить "Услуги" между "О нас" и "Контакты".', time: '05:18' },
    { role: 'assistant', content: '✅ Логотип обновлён.\n✅ Пункт "Услуги" добавлен в меню.\n\nХотите ещё что-то изменить на главной?', time: '05:20' },
    { role: 'client', content: 'Да, ещё хочу добавить блок с преимуществами под шапкой — 3 колонки: иконка, заголовок, описание.', time: '05:22' },
    { role: 'assistant', content: 'Отличная идея! Набрасываю варианты... Сейчас покажу превью.', time: '05:23' },
  ],
  'conv-2': [
    { role: 'client', content: 'После обновления перестал работать контактный формуляр на странице "Контакты".', time: '14:15' },
    { role: 'assistant', content: 'Проверяю... Вижу ошибку в JavaScript — конфликт версий плагина CF7. Исправляю.', time: '14:16' },
    { role: 'assistant', content: '✅ Контактная форма восстановлена. Причина: обновление темы перезаписало шаблон формы. Я восстановил из бекапа.', time: '14:20' },
    { role: 'client', content: 'Спасибо, всё работает!', time: '14:25' },
  ],
  'conv-3': [
    { role: 'client', content: 'Нужно создать новую страницу "Услуги" с перечнем и ценами.', time: '09:10' },
    { role: 'assistant', content: 'Создаю страницу "Услуги". Какой формат предпочитаете: таблица с ценами или карточки услуг?', time: '09:11' },
    { role: 'client', content: 'Карточки, как на вашем демо-сайте.', time: '09:13' },
    { role: 'assistant', content: 'Отлично, делаю. Подготовлю структуру и покажу превью.', time: '09:14' },
  ],
}

function openConversation(conv) {
  selectedConvId.value = conv.id
}

function closeConversation() {
  selectedConvId.value = null
}

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
    <!-- Заголовок: список или детали -->
    <div class="history-header" v-if="!selectedConversation">
      <h2 class="history-title">История клиентов</h2>
      <span v-if="hasSiteSelected" class="history-site">
        {{ sitesStore.currentSite?.name }}
      </span>
    </div>

    <div class="history-header" v-else>
      <button class="back-btn" @click="closeConversation">←</button>
      <div class="conv-detail-header">
        <h2 class="history-title">{{ selectedConversation.title }}</h2>
        <span class="conv-detail-site">{{ sitesStore.currentSite?.name }}</span>
      </div>
    </div>

    <!-- Состояния: нет сайта / пусто -->
    <div v-if="!hasSiteSelected" class="history-empty">
      <div class="empty-icon">📋</div>
      <p>Выберите сайт, чтобы увидеть<br/>историю обращений клиентов</p>
    </div>

    <div v-else-if="conversations.length === 0 && !selectedConversation" class="history-empty">
      <div class="empty-icon">💬</div>
      <p>Пока нет обращений</p>
      <p class="empty-hint">Когда клиент начнёт чат с AI Pilot на сайте,<br/>история появится здесь</p>
    </div>

    <!-- Список диалогов -->
    <div v-else-if="!selectedConversation" class="history-list">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        class="conv-item"
        @click="openConversation(conv)"
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

    <!-- Раскрытый диалог (сообщения) -->
    <div v-else class="conversation-detail">
      <div class="messages-list">
        <div
          v-for="(msg, idx) in DEMO_MESSAGES[selectedConversation.id] || []"
          :key="idx"
          class="msg-item"
          :class="{ 'msg-client': msg.role === 'client', 'msg-assistant': msg.role === 'assistant' }"
        >
          <div class="msg-header">
            <span class="msg-role">{{ msg.role === 'client' ? '👤 Клиент' : '🤖 AI Pilot' }}</span>
            <span class="msg-time">{{ msg.time }}</span>
          </div>
          <div class="msg-text" v-html="msg.content.replace(/\n/g, '<br/>')"></div>
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

/* Header */
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

.back-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: background 0.12s;
}

.back-btn:hover {
  background: var(--bg-hover);
}

.conv-detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.conv-detail-site {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  flex-shrink: 0;
}

/* Empty states */
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
  transition: all 0.12s ease;
  border: 1px solid transparent;
}

.conv-item:hover {
  background: var(--bg-hover);
  border-color: var(--border-color);
}

.conv-item:active {
  transform: scale(0.99);
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

/* Раскрытый диалог */
.conversation-detail {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-item {
  max-width: 90%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-client {
  align-self: flex-end;
}

.msg-assistant {
  align-self: flex-start;
}

.msg-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.msg-role {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-quaternary);
}

.msg-time {
  font-size: 10px;
  color: var(--text-muted);
}

.msg-text {
  padding: 10px 14px;
  border-radius: var(--border-radius-md);
  font-size: var(--typography-body-size);
  line-height: 1.6;
  position: relative;
}

.msg-client .msg-text {
  background: var(--chat-user-bg);
  color: var(--chat-user-color);
  border-bottom-right-radius: 4px;
}

.msg-assistant .msg-text {
  background: var(--chat-assistant-bg);
  color: var(--chat-assistant-color);
  border: 1px solid var(--chat-assistant-border);
  border-bottom-left-radius: 4px;
}
</style>
