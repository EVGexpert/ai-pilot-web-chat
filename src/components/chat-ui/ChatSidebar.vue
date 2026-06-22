<script setup>
import { computed, ref, watch } from 'vue'
import ChatHistoryGroup from './ChatHistoryGroup.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import UserProfileCard from './UserProfileCard.vue'

const props = defineProps({
  logoSrc: {
    type: String,
    default: '/img/logo-aipilot-v3.png'
  },
  historyGroups: {
    type: Array,
    default: () => []
  },
  activeChatId: {
    type: [String, Number, null],
    default: null
  },
  user: {
    type: Object,
    default: () => ({ name: 'James Broeng', email: 'test@aipilot.ru', avatar: '/img/user-img.png' })
  },
  theme: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits(['new-chat', 'select-chat', 'search', 'profile-settings', 'toggle-sidebar', 'update:theme'])

const query = ref('')

watch(query, value => emit('search', value))

const filteredGroups = computed(() => {
  const value = query.value.trim().toLowerCase()
  if (!value) return props.historyGroups

  return props.historyGroups
    .map(group => ({
      ...group,
      items: (group.items || []).filter(item => String(item.title || '').toLowerCase().includes(value))
    }))
    .filter(group => group.items.length)
})
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col divide-y divide-gray-200 overflow-hidden rounded-2xl bg-gray-100 px-4 py-5">
    <div class="side-header shrink-0 space-y-5 pb-5">
      <div class="flex justify-between gap-4">
        <!-- logoSrc — путь к логотипу, лучше хранить в public/img или отдавать из настроек бренда. -->
        <img :src="logoSrc" class="size-16 shrink-0" alt="AI Pilot" />

        <button
          type="button"
          class="open-close flex size-8 items-start justify-end rounded-lg text-gray-500 transition hover:text-accent"
          aria-label="Свернуть меню"
          @click="emit('toggle-sidebar')"
        >
          <svg class="size-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9.673 1C10.834 1 11.76 1 12.496 1.08c.749.081 1.383.252 1.93.65.325.235.61.52.845.844.398.548.568 1.181.65 1.93.079.737.079 1.663.079 2.824v3.344c0 1.161 0 2.087-.08 2.824-.081.749-.251 1.382-.649 1.93-.235.324-.52.61-.845.845-.547.397-1.181.568-1.93.649-.736.08-1.662.08-2.823.08H6.327c-1.161 0-2.087 0-2.823-.08-.75-.081-1.383-.252-1.93-.65a3.5 3.5 0 0 1-.845-.844c-.398-.548-.568-1.181-.65-1.93C0 12.76 0 11.834 0 10.673V7.327C0 6.166 0 5.24.08 4.504c.081-.749.251-1.382.649-1.93.235-.324.52-.609.845-.845.547-.397 1.181-.568 1.93-.649C4.24 1 5.166 1 6.327 1h3.346ZM5.543 2.365v12.27c.243.001.504.004.784.004h3.346c1.191 0 2.03 0 2.676-.07.633-.069 1-.197 1.278-.398.208-.152.392-.336.544-.545.201-.277.329-.644.398-1.277.07-.646.07-1.486.07-2.677V7.327c0-1.191 0-2.03-.07-2.676-.069-.633-.197-1-.398-1.278a2.14 2.14 0 0 0-.544-.544c-.277-.201-.645-.33-1.278-.398-.646-.07-1.485-.07-2.676-.07H6.327c-.28 0-.541.003-.784.004ZM4.183 2.39c-.192.01-.368.023-.532.041-.633.069-1 .197-1.278.398-.209.152-.393.336-.544.544-.201.278-.33.645-.398 1.278-.07.646-.07 1.485-.07 2.676v3.346c0 1.191 0 2.03.07 2.676.069.633.197 1 .398 1.277.151.21.335.393.544.545.277.201.645.329 1.278.398.164.018.34.031.532.041V2.39Z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <!-- query — локальный поиск по истории, можно заменить на серверный поиск. -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          v-model="query"
          type="text"
          placeholder="Поиск"
          class="w-full rounded-xl border-0 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      <button class="new-chat" type="button" @click="emit('new-chat')">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 16 16" fill="none">
          <path d="M8 .6A7.4 7.4 0 0 0 .6 8c0 1.134.255 2.21.713 3.172l.28.587 1.173-.558-.28-.587A6.08 6.08 0 0 1 1.9 8 6.1 6.1 0 1 1 8 14.1c-.69 0-1.195-.049-1.643-.172-.441-.122-.86-.326-1.36-.675-.732-.51-1.78-.69-2.645-.145l-.014.008-.014.01-.736.518.432 1.286 1.026-.723c.318-.2.793-.178 1.207.111.592.414 1.144.693 1.759.862.607.168 1.243.22 1.988.22A7.4 7.4 0 1 0 8 .6Zm-.655 4.34V7.35H4.94v1.3h2.405v2.41h1.3V8.65h2.416v-1.3H8.646V4.94h-1.3Z" fill="currentColor" />
        </svg>
        <span>Новый чат</span>
      </button>
    </div>

    <div class="relative min-h-0 flex-1 py-5">
      <div class="scrollbar-thin h-full space-y-6 overflow-y-auto pr-1">
        <ChatHistoryGroup
          v-for="group in filteredGroups"
          :key="group.id || group.title"
          :title="group.title"
          :items="group.items"
          :active-id="activeChatId"
          @select="emit('select-chat', $event)"
        />

        <p v-if="!filteredGroups.length" class="px-1 text-sm text-gray-400">Ничего не найдено</p>
      </div>

      <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-gray-100 to-transparent"></div>
    </div>

    <div class="chat-footer shrink-0 space-y-4 pt-4">
      <UserProfileCard :user="user" @settings="emit('profile-settings')" />
      <ThemeSwitcher :model-value="theme" @update:model-value="emit('update:theme', $event)" />
    </div>
  </aside>
</template>
