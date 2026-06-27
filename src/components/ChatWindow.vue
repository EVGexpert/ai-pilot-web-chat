<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'
import ChatLayout from './chat-ui/ChatLayout.vue'

const props = defineProps({ clientMode: { type: Boolean, default: false } })

const authStore = useAuthStore()
const sitesStore = useSitesStore()

const messages = ref([])
const isConnected = ref(false)
const isLoading = ref(false)
const streamingContent = ref('')
const error = ref(null)
const currentSessionId = ref(null)
const sessionsList = ref([])
const theme = ref(authStore.theme)

// Watch authStore.theme changes
watch(() => authStore.theme, (val) => {
  theme.value = val
}, { immediate: true })

// Real date-based history grouping
const historyGroups = computed(() => {
  const today = new Date()
  const todayStr = today.toDateString()

  const groups = {
    today: { title: 'Сегодня', items: [] },
    week: { title: '7 дней', items: [] },
    month: { title: '30 дней', items: [] }
  }

  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  for (const session of sessionsList.value) {
    const dateStr = session.updatedAt || session.createdAt
    const sessionDate = dateStr ? new Date(dateStr) : null

    const item = {
      id: session.id,
      title: session.title || 'Новый чат',
      date: dateStr || ''
    }

    if (!sessionDate) {
      groups.month.items.push(item)
      continue
    }

    const sessionDateStr = sessionDate.toDateString()

    if (sessionDateStr === todayStr) {
      groups.today.items.push(item)
    } else if (sessionDate >= sevenDaysAgo) {
      groups.week.items.push(item)
    } else if (sessionDate >= thirtyDaysAgo) {
      groups.month.items.push(item)
    } else {
      // Past 30 days — add to month as "Ранее" if needed
      groups.month.items.push(item)
    }
  }

  const result = []
  if (groups.today.items.length > 0) result.push(groups.today)
  if (groups.week.items.length > 0) result.push(groups.week)
  if (groups.month.items.length > 0) result.push(groups.month)

  return result
})

// User data for sidebar
const userData = computed(() => ({
  name: authStore.user?.name || authStore.userName || 'Пользователь',
  email: authStore.user?.email || '',
  avatar: authStore.user?.avatar || ''
}))

const currentSiteConversations = computed(() => sitesStore.currentSiteConversations)

async function handleSend(text) {
  messages.value = [...messages.value, { id: `user-${Date.now()}`, role: 'user', content: text }]
  isLoading.value = true
  error.value = null

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
        'Authorization': '***' + authStore.token
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

function disconnect() {}

// Action Proposal: approve / reject
async function handleApproveAction(actionId) {
  const msg = messages.value.find(m => m.actions?.some(a => a.id === actionId))
  if (!msg) return
  const action = msg.actions.find(a => a.id === actionId)
  if (action) action.status = 'approved'

  const actionPayload = action.raw || {
    type: action.type || 'other',
    target: action.target || {},
    patch: action.patch || {}
  }

  try {
    await fetch('/api/chat/actions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': '***' + authStore.token },
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
      headers: { 'Content-Type': 'application/json', 'Authorization': '***' + authStore.token },
      body: JSON.stringify({ actionId, sessionId: currentSessionId.value })
    })
  } catch (e) {
    console.warn('Reject API call failed:', e)
  }
}

// Load sessions list
async function loadSessions() {
  try {
    const res = await fetch('/api/chat/sessions?siteUrl=' + encodeURIComponent(authStore.siteUrl), {
      headers: { 'Authorization': '***' + authStore.token }
    })
    if (res.ok) {
      const data = await res.json()
      sessionsList.value = data.sessions || []
    }
  } catch (e) {
    console.warn('Sessions load failed:', e)
  }
}

// Load session history
async function loadSessionHistory(sessionId) {
  try {
    const res = await fetch('/api/chat/history?sessionId=' + encodeURIComponent(sessionId), {
      headers: { 'Authorization': '***' + authStore.token }
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

// New chat
async function startNewChat() {
  try {
    const res = await fetch('/api/chat/new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '***' + authStore.token
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

// Select session
async function selectSession(sessionId) {
  currentSessionId.value = sessionId
  await loadSessionHistory(sessionId)
}

function handleSelectChat(item) {
  selectSession(item.id)
}

function handleLogout() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('aipilot_greeted_'))
  keys.forEach(k => localStorage.removeItem(k))
  disconnect()
  authStore.logout()
}

function handleProfileSettings() {
  handleLogout()
}

// Theme handler
function handleThemeUpdate(val) {
  authStore.setTheme(val)
}

isConnected.value = true
onUnmounted(() => disconnect())

// Client mode init
if (props.clientMode) {
  nextTick(async () => {
    isConnected.value = true
    try {
      if (!authStore.siteUrl && authStore.token) {
        const meRes = await fetch('/api/auth/me', {
          headers: { 'Authorization': '***' + authStore.token }
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
          headers: { 'Content-Type': 'application/json', 'Authorization': '***' + authStore.token },
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
</script>

<template>
  <div class="h-full w-full">
    <ChatLayout
      :historyGroups="historyGroups"
      :activeChatId="currentSessionId"
      :user="userData"
      :logoSrc="'/img/logo-aipilot-v3.png'"
      :messages="messages"
      :streamingContent="streamingContent"
      :isLoading="isLoading"
      :isConnected="isConnected"
      :error="error"
      :startTitle="clientMode ? 'Чем могу помочь?' : 'Добро пожаловать в AI Pilot'"
      :startHint="clientMode ? 'Я AI-ассистент вашего сайта.' : 'Напишите, что нужно сделать с сайтом'"
      :clientMode="clientMode"
      :theme="theme"
      :placeholder="'Напишите сообщение...'"
      :sendLabel="'Отправить'"
      @new-chat="startNewChat"
      @select-chat="handleSelectChat"
      @update:theme="handleThemeUpdate"
      @profile-settings="handleProfileSettings"
      @send-message="handleSend"
      @approve-action="handleApproveAction"
      @reject-action="handleRejectAction"
    />
  </div>
</template>