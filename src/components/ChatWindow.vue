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

  // Собираем payload для выполнения через WP Plugin
  const actionPayload = action.raw || {
    type: action.type || 'other',
    target: action.target || {},
    patch: action.patch || {}
  }

  try {
    await fetch('/api/chat/actions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authStore.token },
      body: JSON.stringify({
        actionId,
        sessionId: currentSessionId.value,
        siteUrl: authStore.siteUrl || sitesStore.currentSite?.url,
        action: actionPayload
      })
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
  <div v-if="!clientMode" class="h-full flex flex-col light:bg-white bg-slate-950 w-full">
    <header class="shrink-0 px-6 py-3 border-b light:border-gray-200 border-slate-800 light:bg-white/80 bg-slate-950/80 backdrop-blur-sm flex items-center gap-3">
      <div class="flex items-center gap-2">
        <h2 class="text-sm font-semibold light:text-gray-900 text-slate-100">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
      </div>
      <p class="text-xs light:text-gray-500 text-slate-500 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
      <button v-if="error" class="p-1.5 rounded-lg light:hover:bg-gray-100 hover:bg-slate-800 light:text-gray-400 text-slate-500 light:hover:text-gray-600 hover:text-slate-300 transition-colors" @click="handleReconnect">🔁</button>
    </header>
    <MessageArea ref="messagesContainer"
      :messages="messages" :streamingContent :isLoading :isConnected :error
      startTitle="Добро пожаловать в AI Pilot"
      startHint="Напишите, что нужно сделать с сайтом"
      @approve-action="handleApproveAction"
      @reject-action="handleRejectAction" />
    <ChatInput :isConnected :isLoading @send="handleSend" />
  </div>

  <!-- КЛИЕНТ: сайдбар + хедер + сообщения + ввод -->
  <div v-else class="flex flex-1 w-full min-h-0">
    <!-- Мобильный оверлей для клиента -->
    <div v-if="csSidebarOpen" class="fixed inset-0 bg-black/50 z-[99] animate-[fadeIn_0.2s_ease]" @click="closeCsSidebar"></div>

    <aside class="client-sidebar w-72 border-r light:border-gray-200 border-slate-800 light:bg-white bg-slate-950 flex flex-col shrink-0 hidden md:flex" :class="{ 'cs-sidebar--open': csSidebarOpen }">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 pt-6 pb-3">
        <div class="flex items-center gap-2">
          <span class="text-[22px] leading-none">🎯</span>
          <span class="text-base font-bold light:text-gray-900 text-slate-100 tracking-tight">AI Pilot</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="cs-close-btn w-8 h-8 border-none bg-transparent rounded-lg cursor-pointer text-base items-center justify-center light:text-gray-500 text-slate-400 transition-colors hover:bg-red-500/10 light:hover:text-red-600 hover:text-red-400" @click="closeCsSidebar" title="Закрыть">✕</button>
          <button class="w-8 h-8 border-none bg-transparent rounded-lg cursor-pointer flex items-center justify-center light:text-gray-500 text-slate-400 transition-colors light:hover:bg-gray-100 hover:bg-slate-800 light:hover:text-gray-800 hover:text-slate-200" @click="authStore.setTheme(authStore.theme === 'dark' ? 'light' : 'dark')" :title="authStore.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'">
            <svg v-if="authStore.theme === 'dark'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
        </div>
      </div>

      <!-- Site indicator -->
      <div v-if="sitesStore.currentSite" class="px-4 py-1 text-xs light:text-gray-500 text-slate-500 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
        {{ sitesStore.currentSite.name }}
      </div>

      <!-- Divider -->
      <div class="mx-4 my-2 border-t light:border-gray-200 border-slate-800"></div>

      <!-- New chat button -->
      <button class="w-full border border-dashed light:border-gray-300 border-slate-700 bg-transparent light:text-gray-500 text-slate-400 rounded-xl px-3 py-2 text-sm text-left hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors" @click="startNewChat">✏️ Новый чат</button>

      <!-- History section -->
      <div class="text-[10px] font-semibold uppercase tracking-widest light:text-gray-400 text-slate-600 px-4 pt-3 pb-1.5">История</div>
      <div class="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        <div v-if="sessionsList.length === 0" class="text-xs light:text-gray-400 text-slate-600 text-center py-6 px-4">Нет обращений</div>
        <div v-for="s in sessionsList" :key="s.id"
          class="px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
          :class="s.id === currentSessionId
            ? 'light:bg-blue-50 bg-blue-500/10 border light:border-blue-200 border-blue-500/20'
            : 'light:hover:bg-gray-100 hover:bg-slate-800/50'"
          @click="selectSession(s.id)">
          <div class="flex items-baseline justify-between gap-2 mb-0.5">
            <span class="text-[13px] font-semibold truncate"
              :class="s.id === currentSessionId ? 'light:text-blue-600 text-blue-400' : 'light:text-gray-900 text-slate-100'">
              {{ s.title || 'Чат' }}
            </span>
            <span v-if="s.date" class="text-[10px] light:text-gray-400 text-slate-600 shrink-0">{{ s.date }}</span>
          </div>
          <p class="text-[11px] truncate m-0"
            :class="s.id === currentSessionId ? 'light:text-blue-500/60 text-blue-300/60' : 'light:text-gray-500 text-slate-500'">
            {{ s.preview || s.messageCount + ' сообщений' }}
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-4 py-3 border-t light:border-gray-200 border-slate-800">
        <ThemeToggle />
        <button class="px-4 py-2 text-sm font-medium light:text-gray-500 text-slate-400 light:hover:text-gray-800 hover:text-slate-200 transition-colors" @click="handleLogout">← Выйти</button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
      <!-- Мобильная кнопка для открытия сайдбара у клиента -->
      <button class="cs-mobile-burger fixed top-3 left-3 z-20 w-10 h-10 border-none rounded-lg light:bg-gray-50 bg-slate-900 shadow-md flex-col items-center justify-center gap-[5px] cursor-pointer transition-colors light:hover:bg-gray-100 hover:bg-slate-800" @click="toggleCsSidebar">
        <span class="block w-5 h-0.5 light:bg-gray-800 bg-slate-100 rounded-sm"></span>
        <span class="block w-5 h-0.5 light:bg-gray-800 bg-slate-100 rounded-sm"></span>
        <span class="block w-5 h-0.5 light:bg-gray-800 bg-slate-100 rounded-sm"></span>
      </button>

      <header class="shrink-0 px-6 py-3 border-b light:border-gray-200 border-slate-800 light:bg-white/80 bg-slate-950/80 backdrop-blur-sm flex items-center gap-3">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-semibold light:text-gray-900 text-slate-100">{{ sitesStore.currentSite?.name || 'Чат' }}</h2>
        </div>
        <p class="text-xs light:text-gray-500 text-slate-500 ml-auto">Активный сайт · {{ sessionsList.length || '0' }} задач ожидают</p>
        <button v-if="error" class="p-1.5 rounded-lg light:hover:bg-gray-100 hover:bg-slate-800 light:text-gray-400 text-slate-500 light:hover:text-gray-600 hover:text-slate-300 transition-colors" @click="handleReconnect">🔁</button>
      </header>
      <MessageArea ref="messagesContainer"
        :messages :streamingContent :isLoading :isConnected :error
        clientMode startTitle="Чем могу помочь?"
        startHint="Я AI-ассистент вашего сайта."
        @approve-action="handleApproveAction"
        @reject-action="handleRejectAction" />
      <ChatInput :isConnected :isLoading @send="handleSend" />
    </div>
  </div>
</template>

<style scoped>
/* Mobile close button: hidden on desktop, flex on mobile */
.cs-close-btn {
  display: none;
}

/* Mobile sidebar: hidden by default, slides in on open */
@media (max-width: 767px) {
  .cs-close-btn {
    display: flex;
  }

  .client-sidebar {
    position: fixed !important;
    display: flex !important;
    left: -100%;
    top: 0;
    bottom: 0;
    width: min(85vw, 320px) !important;
    z-index: 100;
    transition: left 0.25s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  }

  .client-sidebar.cs-sidebar--open {
    left: 0;
  }

  .cs-mobile-burger {
    display: flex !important;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
