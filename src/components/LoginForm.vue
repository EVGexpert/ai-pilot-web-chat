<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'

const emit = defineEmits(['login'])
const sitesStore = useSitesStore()
const authStore = useAuthStore()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

async function handleLogin() {
  if (!email.value.trim() || !password.value.trim()) {
    error.value = 'Введите email и пароль'
    return
  }
  isLoading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.value.trim() || undefined,
        email: email.value.trim(),
        password: password.value
      })
    })

    if (res.ok) {
      const data = await res.json()
      const userData = data.user || {}
      // Определяем URL сайта клиента
      let siteUrl = ''
      if (data.sites && data.sites.length > 0) {
        siteUrl = data.sites[0].url || ''
        sitesStore.sites.value = data.sites.map(s => ({
          id: s.url || s.id,
          name: s.name || s.url,
          status: 'online',
          url: s.url
        }))
      }
      authStore.login(data.token, {
        name: name.value.trim() || userData.name || email.value.split('@')[0],
        email: userData.email || email.value,
        role: userData.role || 'client'
      }, siteUrl)
      emit('login', data)
      return
    }

    const err = await res.json().catch(() => ({ error: 'Сервер авторизации недоступен' }))
    error.value = err.error || err.message || 'Ошибка авторизации'
  } catch (e) {
    error.value = 'Сетевая ошибка: сервер авторизации не отвечает'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="light:bg-white bg-slate-950 min-h-screen flex items-center justify-center p-4">
    <div class="light:bg-gray-50 bg-slate-900 border light:border-gray-200 border-slate-800 rounded-2xl p-6 w-full max-w-[400px] shadow-xl flex flex-col gap-8"
         :class="{'border-red-500/30 ring-1 ring-red-500/10': error}">
      <!-- Brand -->
      <div class="text-center flex flex-col items-center gap-2">
        <div class="w-14 h-14 rounded-2xl light:bg-blue-50 bg-blue-500/15 flex items-center justify-center mx-auto mb-1">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="light:text-blue-600 text-blue-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold light:text-gray-900 text-slate-100 m-0">AI Pilot</h1>
        <p class="text-sm light:text-gray-500 text-slate-500 m-0 leading-relaxed">Управление WordPress-сайтами через ИИ</p>
      </div>

      <!-- Form -->
      <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400" for="name">Имя</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-4 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="Как к вам обращаться?"
            autocomplete="name"
            :disabled="isLoading"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-4 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="your@email.com"
            autocomplete="email"
            :disabled="isLoading"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400" for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-4 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="isLoading"
          />
        </div>

        <!-- Error -->
        <div v-if="error"
          class="light:bg-red-50 bg-red-500/10 border light:border-red-300 border-red-500/30 light:text-red-600 text-red-300 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Вход...
          </span>
          <span v-else>Войти</span>
        </button>
      </form>

      <!-- Footer -->
      <p class="text-center text-xs light:text-gray-400 text-slate-600 leading-relaxed m-0">
        Установите плагин AI Pilot на ваш WordPress-сайт,<br />
        чтобы он появился в панели управления.
      </p>
    </div>
  </div>
</template>
