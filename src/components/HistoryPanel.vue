<script setup>
import { ref, computed } from 'vue'
import { useSitesStore } from '../stores/sitesStore'
import { useAuthStore } from '../stores/authStore'
import DOMPurify from 'dompurify'

const props = defineProps({
  conversations: { type: Array, default: () => [] },
  messages: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['select'])

const sitesStore = useSitesStore()
const authStore = useAuthStore()
const selectedConvId = ref(null)
const convMessages = ref({})
const isLoadingMessages = ref(false)

const selectedConversation = computed(() =>
  props.conversations.find(c => c.id === selectedConvId.value) || null
)


function openConversation(conv) {
  selectedConvId.value = conv.id
  
  // Загружаем реальную историю с сайта
  if (!convMessages.value[conv.id] && conv.siteId) {
    fetchSiteMemory(conv.siteId)
  }
  
  // Если есть в пропсах — используем
  if (props.messages[conv.id]) {
    convMessages.value[conv.id] = props.messages[conv.id]
  }
  
  emit('select', conv)
}

async function fetchSiteMemory(siteUrl) {
  const token = localStorage.getItem('aipilot_token')
  if (!token) return
  
  // Ищем ID сайта по URL
  const site = sitesStore.sites.find(s => s.url === siteUrl || s.id === siteUrl)
  if (!site) return
  
  isLoadingMessages.value = true
  try {
    const res = await fetch(`/api/sites/${site.id}/memory`, {
      headers: { Authorization: 'Bearer ' + token }
    })
    if (res.ok) {
      const data = await res.json()
      const memList = data.memory || []
      convMessages.value[siteUrl] = memList.map(m => ({
        role: m.agent === 'client' ? 'client' : 'assistant',
        content: m.summary || m.action || '',
        details: m.details || {},
        timestamp: m.timestamp || '',
        time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''
      }))
    }
  } catch (e) {
    console.warn('Failed to load memory:', e)
  } finally {
    isLoadingMessages.value = false
  }
}

function closeConversation() {
  selectedConvId.value = null
}

function getConvMessages(convId) {
  return convMessages.value[convId] || []
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
  <div class="h-full flex flex-col overflow-hidden bg-white bg-slate-950">
    <!-- Заголовок: список или детали -->
    <div v-if="!selectedConversation"
      class="flex items-center gap-3 px-6 py-5 pb-4 shrink-0 border-b border-gray-200 border-slate-800">
      <h2 class="text-lg font-semibold text-gray-900 text-slate-100 m-0">История клиентов</h2>
      <span v-if="hasSiteSelected"
        class="text-xs text-gray-400 text-slate-600 px-2.5 py-0.5 bg-gray-100/80 bg-slate-800/50 rounded-full">
        {{ sitesStore.currentSite?.name }}
      </span>
    </div>

    <div v-else
      class="flex items-center gap-3 px-6 py-5 pb-4 shrink-0 border-b border-gray-200 border-slate-800">
      <button
        class="w-8 h-8 border border-gray-300 border-slate-700 bg-gray-100/80 bg-slate-800/50 rounded-lg cursor-pointer flex items-center justify-center text-base text-gray-500 text-slate-400 shrink-0 transition-colors hover:bg-gray-200 hover:bg-slate-700"
        @click="closeConversation">←</button>
      <div class="flex items-center gap-2 min-w-0">
        <h2 class="text-lg font-semibold text-gray-900 text-slate-100 m-0">{{ selectedConversation.title }}</h2>
        <span class="text-xs text-gray-400 text-slate-600 shrink-0">{{ sitesStore.currentSite?.name }}</span>
      </div>
    </div>

    <!-- Состояния: нет сайта / пусто -->
    <div v-if="!hasSiteSelected"
      class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 text-gray-500 text-slate-500">
      <div class="text-5xl mb-4 leading-none">📋</div>
      <p class="text-sm leading-relaxed m-0">Выберите сайт, чтобы увидеть<br/>историю обращений клиентов</p>
    </div>

    <div v-else-if="conversations.length === 0 && !selectedConversation"
      class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 text-gray-500 text-slate-500">
      <div class="text-5xl mb-4 leading-none">💬</div>
      <p class="text-sm leading-relaxed m-0">Пока нет обращений</p>
      <p class="text-xs text-gray-400 text-slate-600 mt-1 m-0">Когда клиент начнёт чат с AI Pilot на сайте,<br/>история появится здесь</p>
    </div>

    <!-- Список диалогов -->
    <div v-else-if="!selectedConversation"
      class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
      <div
        v-for="conv in conversations"
        :key="conv.id"
        class="px-4 py-3.5 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-gray-100 hover:bg-slate-800/50 hover:border-gray-200/50 hover:border-slate-700/50 active:scale-[0.99]"
        @click="openConversation(conv)"
      >
        <div class="flex justify-between items-baseline gap-3 mb-1">
          <span class="text-sm font-semibold text-gray-900 text-slate-100 truncate">{{ conv.title || 'Без темы' }}</span>
          <span class="text-xs text-gray-400 text-slate-600 whitespace-nowrap shrink-0">{{ formatTime(conv.lastMessage) }}</span>
        </div>
        <p class="text-xs text-gray-500 text-slate-500 leading-relaxed truncate m-0">{{ conv.preview || 'Нет сообщений' }}</p>
        <div class="mt-1.5">
          <span v-if="conv.unread > 0"
            class="inline-block bg-blue-600 text-white text-[11px] font-semibold px-2 py-px rounded-full leading-snug">
            {{ conv.unread }} новых
          </span>
        </div>
      </div>
    </div>

    <!-- Раскрытый диалог (сообщения) -->
    <div v-else class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
      <!-- Статус загрузки -->
      <div v-if="isLoadingMessages"
        class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 text-gray-500 text-slate-500">
        <div class="w-7 h-7 border-[3px] border-gray-300 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-3"></div>
        <p class="text-sm m-0">Загрузка сообщений...</p>
      </div>

      <!-- Сообщения -->
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="(msg, idx) in getConvMessages(selectedConversation.id)"
          :key="idx"
          class="max-w-[90%] flex flex-col gap-1"
          :class="msg.role === 'client' ? 'self-end' : 'self-start'"
        >
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold text-gray-400 text-slate-600">{{ msg.role === 'client' ? '👤 Клиент' : '🤖 AI Pilot' }}</span>
            <span class="text-[10px] text-gray-300 text-slate-700">{{ msg.time || formatTime(msg.timestamp) }}</span>
          </div>
          <div class="px-3.5 py-2.5 rounded-xl text-sm leading-relaxed"
            :class="msg.role === 'client'
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-gray-100 bg-slate-800 text-gray-900 text-slate-100 border border-gray-200 border-slate-700 rounded-bl-sm'"
            v-html="DOMPurify.sanitize((msg.content || msg.text || '').replace(/\n/g, '<br/>'))"></div>
        </div>
        <div v-if="getConvMessages(selectedConversation.id).length === 0"
          class="flex-1 flex flex-col items-center justify-center text-center px-6 py-10 text-gray-500 text-slate-500">
          <p class="text-sm m-0">Нет сообщений в этом обращении</p>
        </div>
      </div>
    </div>
  </div>
</template>
