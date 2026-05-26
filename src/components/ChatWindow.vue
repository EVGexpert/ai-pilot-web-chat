<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import MessageArea from './MessageArea.vue'
import ChatInput from './ChatInput.vue'
import ThemeToggle from './ThemeToggle.vue'

const props = defineProps({ clientMode: { type: Boolean, default: false } })

const authStore = useAuthStore()
const sitesStore = useSitesStore()
const messagesContainer = ref(null)

const messages = ref([])
const isConnected = ref(false)
const isLoading = ref(false)
const streamingContent = ref('')
const error = ref(null)
const currentSessionId = ref(null)
const sessionsList = ref([])

const showClientHistory = ref(false)
const csSidebarOpen = ref(false)

function toggleCsSidebar() {
  csSidebarOpen.value = !csSidebarOpen.value
}

function closeCsSidebar() {
  csSidebarOpen.value = false
}
const currentSiteConversations = computed(() => sitesStore.currentSiteConversations)

function disconnect() {}

async function handleSend(text) {
  messages.value = [...messages.value, { id: `user-${Date.now()}`, role: 'user', content: text }]
  isLoading.value = true
  error.value = null

  // Определяем siteUrl
  let sendSiteUrl = authStore.siteUrl
  if (!sendSiteUrl && sitesStore.currentSite) {
    sendSiteUrl = sitesStore.currentSite.url
  }

  if (!sendSiteUrl) {
    error.value = 'Не выбран сайт. Выберите сайт в боковой панели.'
    isLoading.value = false
    return
  }

  try {
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authStore.token
      },
      body: JSON.stringify({
        message: text,
        siteUrl: sendSiteUrl,
        sessionId: currentSessionId.value
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      currentSessionId.value = data.sessionId || currentSessionId.value
      const newMsg = { id: `msg-${Date.now()}`, role: 'assistant', content: data.message }
      if (data.actions && data.actions.length > 0) {
        newMsg.actions = data.actions
      }
      messages.value = [...messages.value, newMsg]
      await loadSessions()
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }))
      error.value = err.error || 'Ошибка отправки'
    }
  } catch (e) {
    error.value = 'Сетевая ошибка: ' + e.message
  } finally {
    isLoading.value = false
    streamingContent.value = ''
  }
}
function handleReconnect() { error.value = null; connect() }

// Action Proposal: approve / reject
async function handleApproveAction(actionId) {
  const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
  if (!msg) return
  const action = msg.actions.find(a => a.id === actionId)
  if (action) action.status = 'approved'
  try {
    await fetch('/api/chat/actions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authStore.token },
      body: JSON.stringify({ actionId, sessionId: currentSessionId.value })
    })
  } catch (e) {
    console.warn('Approve API call failed:', e)
  }
}

async function handleRejectAction(actionId) {
  const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
  if (!msg) return
  const action = msg.actions.find(a => a.id === actionId)
  if (action) action.status = 'rejected'
  try {
    await fetch('/api/chat/actions/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authStore.token },
      body: JSON.stringify({ actionId, sessionId: currentSessionId.value })
    })
  } catch (e) {
    console.warn('Reject API call failed:', e)
  }
}

// Загрузить список сессий
async function loadSessions() {
  try {
    const res = await fetch('/api/chat/sessions?siteUrl=' + encodeURIComponent(authStore.siteUrl), {
      headers: { 'Authorization': 'Bearer ' + authStore.token }
    })
    if (res.ok) {
      const data = await res.json()
      sessionsList.value = data.sessions || []
    }
  } catch (e) {
    console.warn('Sessions load failed:', e)
  }
}

// Загрузить историю конкретной сессии
async function loadSessionHistory(sessionId) {
  try {
    const res = await fetch('/api/chat/history?sessionId=' + encodeURIComponent(sessionId), {
      headers: { 'Authorization': 'Bearer ' + authStore.token }
    })
    if (res.ok) {
      const hist = await res.json()
      if (hist.messages && hist.messages.length > 0) {
        messages.value = hist.messages.map(m => ({
          id: 'msg-' + m.id,
          role: m.role,
          content: m.content
        }))
      }
    }
  } catch (e) {
    console.warn('History load failed:', e)
  }
}

// Новый чат — создаём сессию и очищаем
async function startNewChat() {
  try {
    const res = await fetch('/api/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + authStore.token
      },
      body: JSON.stringify({ siteUrl: authStore.siteUrl })
    })
    if (res.ok) {
      const data = await res.json()
      currentSessionId.value = data.sessionId
      messages.value = []
      streamingContent.value = ''
      isLoading.value = false
      error.value = null
      await loadSessions()
    }
  } catch (e) {
    console.warn('New chat failed:', e)
  }
}

// Выбрать сессию из списка
async function selectSession(sessionId) {
  currentSessionId.value = sessionId
  await loadSessionHistory(sessionId)
}

function handleLogout() { 
  // Очищаем флаги приветствия при выходе
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  disconnect(); authStore.logout() 
}

isConnected.value = true
onUnmounted(() => disconnect())

// Клиент: всё из БД, без localStorage
if (props.clientMode) {
  nextTick(async () => {
    isConnected.value = true
    try {
      if (!authStore.siteUrl && authStore.token) {
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + authStore.token }
        })
        if (meRes.ok) {
          const meData = await meRes.json()
          if (meData.sites && meData.sites.length > 0) {
            authStore.siteUrl = meData.sites[0].url
            localStorage.setItem('aipilot_site_url', authStore.siteUrl)
          }
        }
      }
      if (!authStore.siteUrl) return
      await loadSessions()
      if (sessionsList.value.length > 0) {
        const last = sessionsList.value[0]
        currentSessionId.value = last.id
        await loadSessionHistory(last.id)
      }
      if (sessionsList.value.length === 0) {
        const res = await fetch('/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authStore.token },
          body: JSON.stringify({ message: '/start', siteUrl: authStore.siteUrl })
        })
        if (res.ok) {
          const data = await res.json()
          currentSessionId.value = data.sessionId
          messages.value = [{ id: 'greeting', role: 'assistant', content: data.message }]
          await loadSessions()
        }
      }
    } catch (e) {
      console.warn('Init failed:', e)
    }
  })
}

watch([messages, streamingContent], async () => {
  await nextTick()
  if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
}, { deep: true })
</script>

<template>
  <!-- АДМИН: хедер + сообщения + ввод -->
  <div v-if="!clientMode" class="chat-window">
    <div class="chat-header">
      <div class="chat-header-left">
        <h2 class="chat-title">Мой чат</h2>
        <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
        <span class="status-text">{{ isConnected ? 'Подключено' : 'Нет соединения' }}</span>
      </div>
      <div class="chat-header-right">
        <span v-if="sitesStore.currentSite" class="badge">🟢 {{ sitesStore.currentSite.name }}</span>
        <button v-if="error" class="btn-reconnect" @click="handleReconnect">🔁</button>
      </div>
    </div>
    <MessageArea ref="messagesContainer"
      :messages="messages" :streamingContent :isLoading :isConnected :error
      startTitle="Добро пожаловать в AI Pilot"
      startHint="Напишите, что нужно сделать с сайтом"
      @approve-action="handleApproveAction"
      @reject-action="handleRejectAction" />
    <ChatInput :isConnected @send="handleSend" />
  </div>

  <!-- КЛИЕНТ: сайдбар + хедер + сообщения + ввод -->
  <div v-else class="client-layout">
    <!-- Мобильный оверлей для клиента -->
    <div v-if="csSidebarOpen" class="cs-overlay" @click="closeCsSidebar"></div>

    <aside class="client-sidebar" :class="{ 'cs-sidebar--open': csSidebarOpen }">
      <div class="cs-header">
        <div class="cs-brand"><span class="cs-logo">🎯</span><span class="cs-title">AI Pilot</span></div>
        <!-- Кнопка закрытия сайдбара на мобилке -->
        <button class="cs-close-btn" @click="closeCsSidebar" title="Закрыть">✕</button>
        <button class="cs-theme-btn" @click="authStore.setTheme(authStore.theme === 'dark' ? 'light' : 'dark')" :title="authStore.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
          <svg v-if="authStore.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
      <div v-if="sitesStore.currentSite" class="cs-site">🟢 {{ sitesStore.currentSite.name }}</div>
      <div class="cs-divider"></div>
      <button class="cs-new-btn" @click="startNewChat">✏️ Новый чат</button>
      <div class="cs-section-title">История</div>
      <div class="cs-history">
        <div v-if="sessionsList.length === 0" class="cs-empty">Нет обращений</div>
        <div v-for="s in sessionsList" :key="s.id" 
             class="cs-conv" 
             :class="{ 'cs-conv--active': s.id === currentSessionId }"
             @click="selectSession(s.id)">
          <div class="cs-conv-title">{{ s.title || 'Чат' }}</div>
          <div class="cs-conv-date">{{ s.date }}</div>
          <div class="cs-conv-preview">{{ s.preview || s.messageCount + ' сообщений' }}</div>
        </div>
      </div>
      <div class="cs-footer">
        <ThemeToggle />
        <button class="cs-logout-btn" @click="handleLogout">← Выйти</button>
      </div>
    </aside>
    <div class="client-main">
      <!-- Мобильная кнопка для открытия сайдбара у клиента -->
      <button class="cs-mobile-burger" @click="toggleCsSidebar">
        <span class="burger-line"></span>
        <span class="burger-line"></span>
        <span class="burger-line"></span>
      </button>

      <div class="chat-header">
        <div class="connection-status">
          <span class="status-dot" :class="{ 'status-dot--online': isConnected }"></span>
          <span class="status-text">{{ isConnected ? 'Подключено' : 'Нет соединения' }}</span>
        </div>
        <button v-if="error" class="btn-reconnect" @click="handleReconnect">🔁</button>
      </div>
      <MessageArea ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        clientMode startTitle="Чем могу помочь?"
        startHint="Я AI-ассистент вашего сайта."
        @approve-action="handleApproveAction"
        @reject-action="handleRejectAction" />
      <ChatInput :isConnected @send="handleSend" />
    </div>
  </div>
</template>

<style scoped>
/* === Admin Chat === */
.chat-window {
  height: 100%; display: flex; flex-direction: column;
  background: var(--bg-primary); width: 100%;
}
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px; border-bottom: 1px solid var(--border-color);
  flex-shrink: 0; background: var(--bg-primary);
}
.chat-header-left, .chat-header-right { display: flex; align-items: center; gap: 10px; }
.chat-title { font-size: var(--typography-h3-size); color: var(--text-primary); margin: 0; font-weight: 600; }
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--color-error);
  transition: background 0.3s, box-shadow 0.3s;
}
.status-dot--online { background: var(--color-success); box-shadow: 0 0 6px color-mix(in srgb, var(--color-success) 60%, transparent); }
.status-text { font-size: var(--typography-body-small); color: var(--text-quaternary); }
.badge {
  font-size: var(--typography-body-small); color: var(--text-secondary);
  padding: 4px 12px; background: var(--bg-tertiary); border-radius: 16px; font-weight: 500;
}
.btn-reconnect {
  border: none; background: var(--bg-tertiary); color: var(--text-secondary);
  padding: 6px 12px; border-radius: var(--border-radius-sm); cursor: pointer;
  font-size: 14px; transition: background 0.12s;
}
.btn-reconnect:hover { background: var(--bg-hover); }

/* === Client Layout === */
.client-layout { flex: 1; display: flex; width: 100%; min-height: 0; }
.client-sidebar {
  width: 240px; flex-shrink: 0; position: relative;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex; flex-direction: column;
  overflow-y: auto;
}
.cs-header { display: flex; align-items: center; justify-content: space-between; padding: 24px 16px 12px; }
.cs-brand { display: flex; align-items: center; gap: 8px; }
.cs-logo { font-size: 22px; line-height: 1; }
.cs-title { font-size: 16px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.02em; }
.cs-site { padding: 4px 16px; font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; }
.cs-site::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); }

.cs-new-btn {
  margin: 8px 12px; padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px; background: transparent;
  color: var(--text-secondary); font-family: var(--font-family);
  font-size: 13px; cursor: pointer; font-weight: 500;
  transition: all 0.2s; display: flex; align-items: center; gap: 6px;
}
.cs-new-btn:hover {
  background: var(--color-primary); color: var(--text-inverse); border-color: var(--color-primary);
  transform: translateY(-1px);
}

.cs-section-title {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-quaternary);
  padding: 12px 16px 6px;
}
.cs-history { flex: 1; overflow-y: auto; padding: 0 8px 8px; scrollbar-width: thin; }
.cs-empty { font-size: var(--typography-body-small); color: var(--text-quaternary); text-align: center; padding: 24px 16px; }
.cs-conv {
  padding: 10px 10px; margin: 2px 0;
  border-radius: 10px; cursor: pointer;
  transition: all 0.15s; border: 1px solid transparent;
}
.cs-conv:hover { background: var(--bg-hover); border-color: var(--border-color); }
.cs-conv--active {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 20%, transparent);
}
.cs-conv-title { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs-conv-date { font-size: 10px; color: var(--text-quaternary); margin-top: 1px; }
.cs-conv-preview { font-size: 11px; color: var(--text-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 3px; }

.cs-footer { padding: 12px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; }
.cs-theme-btn { width: 32px; height: 32px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all 0.15s; }
.cs-theme-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

/* Close button for mobile client sidebar */
.cs-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
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
  .cs-close-btn {
    display: flex;
  }
}
.cs-logout-btn { border: none; background: transparent; color: var(--text-tertiary); cursor: pointer; font-size: 13px; padding: 6px 10px; border-radius: 8px; transition: all 0.15s; font-weight: 500; }
.cs-logout-btn:hover { background: color-mix(in srgb, var(--color-error) 10%, transparent); color: var(--color-error); }

.client-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; position: relative; }

/* Mobile burger for client mode */
.cs-mobile-burger {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 20;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s;
}

.cs-mobile-burger:hover {
  background: var(--bg-hover);
}

.cs-mobile-burger .burger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
}
.connection-status { display: flex; align-items: center; gap: 8px; }

/* ============ Mobile ============ */
@media (max-width: 767px) {
  .chat-header { padding: 12px 16px; }

  /* У админа — отступ для бургер-кнопки */
  .chat-window .chat-header { padding: 12px 16px 12px 56px; }

  .bubble { max-width: 90%; }

  .messages-area { padding: 12px 16px; }

  /* === Клиентский режим на мобилке === */
  .client-layout {
    flex-direction: column;
    height: 100%;
  }

  .client-sidebar {
    position: fixed;
    left: -100%;
    top: 0;
    bottom: 0;
    width: min(85vw, 320px);
    z-index: 100;
    display: flex !important;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  }

  .client-sidebar.cs-sidebar--open {
    left: 0;
  }

  .client-main {
    height: 100%;
    overflow: hidden;
  }

  /* Оверлей для клиентского сайдбара */
  .cs-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
    animation: fadeIn 0.2s ease;
  }

  /* Кнопка открытия сайдбара у клиента */
  .cs-mobile-burger {
    display: flex !important;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
