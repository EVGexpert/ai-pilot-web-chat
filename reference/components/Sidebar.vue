<script setup>
defineProps({
  logoSrc: { type: String, default: '/img/logo-aipilot-v3.png' },
  user: {
    type: Object,
    default: () => ({ name: 'James Broeng', email: 'test@aipilot.ru', avatar: '/img/user-img.png' })
  }
})

const historyItems = [
  { id: 1, title: 'Ullamco laboris nisi ut', date: '10:26' },
  { id: 2, title: 'Duis aute irure dolor in', date: '09:15' },
  { id: 3, title: 'Lorem ipsum dolor sit amet', date: 'Вчера' },
  { id: 4, title: 'Consectetur adipiscing elit', date: 'Вчера' },
  { id: 5, title: 'Sed do eiusmod tempor', date: '22 мая' },
  { id: 6, title: 'Incididunt ut labore', date: '22 мая' },
]
</script>

<template>
  <aside class="flex w-72 shrink-0 flex-col divide-y divide-gray-200 overflow-hidden rounded-2xl bg-gray-100 px-4 py-5">
    <div class="shrink-0 space-y-5 pb-5">
      <div class="flex justify-between gap-4">
        <img :src="logoSrc" class="size-16 shrink-0" alt="AI Pilot" />
        <button type="button" class="flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:text-accent" aria-label="Свернуть меню">
          <svg class="size-7" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.673 1C10.834 1 11.76 1 12.496 1.08c.749.081 1.383.252 1.93.65.325.235.61.52.845.844.398.548.568 1.181.65 1.93.079.737.079 1.663.079 2.824v3.344c0 1.161 0 2.087-.08 2.824-.081.749-.251 1.382-.649 1.93-.235.324-.52.61-.845.845-.547.397-1.181.568-1.93.649-.736.08-1.662.08-2.823.08H6.327c-1.161 0-2.087 0-2.823-.08-.75-.081-1.383-.252-1.93-.65a3.5 3.5 0 0 1-.845-.844c-.398-.548-.568-1.181-.65-1.93C0 12.76 0 11.834 0 10.673V7.327C0 6.166 0 5.24.08 4.504c.081-.749.251-1.382.649-1.93.235-.324.52-.609.845-.845.547-.397 1.181-.568 1.93-.649C4.24 1 5.166 1 6.327 1h3.346ZM5.543 2.365v12.27c.243.001.504.004.784.004h3.346c1.191 0 2.03 0 2.676-.07.633-.069 1-.197 1.278-.398.208-.152.392-.336.544-.545.201-.277.329-.644.398-1.277.07-.646.07-1.486.07-2.677V7.327c0-1.191 0-2.03-.07-2.676-.069-.633-.197-1-.398-1.278a2.14 2.14 0 0 0-.544-.544c-.277-.201-.645-.33-1.278-.398-.646-.07-1.485-.07-2.676-.07H6.327c-.28 0-.541.003-.784.004ZM4.183 2.39c-.192.01-.368.023-.532.041-.633.069-1 .197-1.278.398-.209.152-.393.336-.544.544-.201.278-.33.645-.398 1.278-.07.646-.07 1.485-.07 2.676v3.346c0 1.191 0 2.03.07 2.676.069.633.197 1 .398 1.277.151.21.335.393.544.545.277.201.645.329 1.278.398.164.018.34.031.532.041V2.39Z" fill="currentColor" /></svg>
        </button>
      </div>
      <div class="relative">
        <svg class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
        <input type="text" placeholder="Поиск" class="w-full rounded-xl border-0 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50" />
      </div>
      <button class="new-chat" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 16 16" fill="none"><path d="M8 .6A7.4 7.4 0 0 0 .6 8c0 1.134.255 2.21.713 3.172l.28.587 1.173-.558-.28-.587A6.08 6.08 0 0 1 1.9 8 6.1 6.1 0 1 1 8 14.1c-.69 0-1.195-.049-1.643-.172-.441-.122-.86-.326-1.36-.675-.732-.51-1.78-.69-2.645-.145l-.014.008-.014.01-.736.518.432 1.286 1.026-.723c.318-.2.793-.178 1.207.111.592.414 1.144.693 1.759.862.607.168 1.243.22 1.988.22A7.4 7.4 0 1 0 8 .6Zm-.655 4.34V7.35H4.94v1.3h2.405v2.41h1.3V8.65h2.416v-1.3H8.646V4.94h-1.3Z" fill="currentColor" /></svg>
        <span>Новый чат</span>
      </button>
    </div>
    <div class="relative min-h-0 flex-1 py-5">
      <div class="scrollbar-thin h-full space-y-6 overflow-y-auto pr-1">
        <section class="space-y-2">
          <h3 class="px-1 text-xs font-medium text-gray-400">Сегодня</h3>
          <ul class="space-y-1 text-sm text-gray-600">
            <li v-for="item in historyItems.slice(0, 2)" :key="item.id">
              <button type="button" class="block w-full truncate rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/70 hover:text-accent">{{ item.title }}</button>
            </li>
          </ul>
        </section>
        <section class="space-y-2">
          <h3 class="px-1 text-xs font-medium text-gray-400">Вчера</h3>
          <ul class="space-y-1 text-sm text-gray-600">
            <li v-for="item in historyItems.slice(2, 4)" :key="item.id">
              <button type="button" class="block w-full truncate rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/70 hover:text-accent">{{ item.title }}</button>
            </li>
          </ul>
        </section>
        <section class="space-y-2">
          <h3 class="px-1 text-xs font-medium text-gray-400">Прошлая неделя</h3>
          <ul class="space-y-1 text-sm text-gray-600">
            <li v-for="item in historyItems.slice(4)" :key="item.id">
              <button type="button" class="block w-full truncate rounded-lg px-1.5 py-1.5 text-left transition hover:bg-white/70 hover:text-accent">{{ item.title }}</button>
            </li>
          </ul>
        </section>
      </div>
      <div class="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-gray-100 to-transparent"></div>
    </div>
    <div class="shrink-0 space-y-4 pt-4">
      <div class="flex justify-between bg-white p-4 rounded-xl shadow-sm">
        <div class="flex min-w-0 items-center gap-3">
          <img class="size-10 shrink-0 rounded-full object-cover" :src="user.avatar" alt="" />
          <div class="min-w-0 text-sm text-gray-800">
            <p class="truncate">{{ user.name }}</p>
            <p class="truncate text-gray-500">{{ user.email }}</p>
          </div>
        </div>
        <button type="button" class="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-accent" aria-label="Profile settings">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.66.84.12.053.237.109.352.168.325.168.718.133 1.01-.085l1.057-.793a1.125 1.125 0 0 1 1.45.12l1.833 1.833c.389.389.44 1.002.12 1.45l-.793 1.057c-.218.292-.253.685-.085 1.01.06.115.115.232.168.352.154.347.466.597.84.66l1.281.213c.542.09.94.56.94 1.11v2.593c0 .55-.398 1.02-.94 1.11l-1.281.213c-.374.063-.686.313-.84.66a6.997 6.997 0 0 1-.168.352c-.168.325-.133.718.085 1.01l.793 1.057c.32.448.269 1.061-.12 1.45l-1.833 1.833a1.125 1.125 0 0 1-1.45.12l-1.057-.793c-.292-.218-.685-.253-1.01-.085a6.997 6.997 0 0 1-.352.168c-.347.154-.597.466-.66.84l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.66-.84a6.997 6.997 0 0 1-.352-.168c-.325-.168-.718-.133-1.01.085l-1.057.793a1.125 1.125 0 0 1-1.45-.12L3.02 18.468a1.125 1.125 0 0 1-.12-1.45l.793-1.057c.218-.292.253-.685.085-1.01a6.997 6.997 0 0 1-.168-.352c-.154-.347-.466-.597-.84-.66l-1.281-.213A1.125 1.125 0 0 1 .55 12.616v-2.593c0-.55.398-1.02.94-1.11L2.77 8.7c.374-.063.686-.313.84-.66.053-.12.109-.237.168-.352.168-.325.133-.718-.085-1.01L2.9 5.621a1.125 1.125 0 0 1 .12-1.45l1.833-1.833a1.125 1.125 0 0 1 1.45-.12l1.057.793c.292.218.685.253 1.01.085.115-.06.232-.115.352-.168.347-.154.597-.466.66-.84l.213-1.281Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        </button>
      </div>
      <div class="grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1">
        <button type="button" title="Светлая" aria-label="Color mode: Светлая" aria-pressed="true" class="flex h-9 items-center justify-center rounded-[10px] text-[#666666] transition hover:bg-white/60 bg-white text-accent shadow-sm">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
        </button>
        <button type="button" title="Тёмная" aria-label="Color mode: Тёмная" aria-pressed="false" class="flex h-9 items-center justify-center rounded-[10px] text-[#666666] transition hover:bg-white/60">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z"></path></svg>
        </button>
      </div>
    </div>
  </aside>
</template>
