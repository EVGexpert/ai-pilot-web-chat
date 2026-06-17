<script setup>
import { ref, onMounted, computed } from 'vue'

// Состояния: login | scanning | success | error
const step = ref('login')
const email = ref('')
const password = ref('')
const name = ref('')
const isRegister = ref(false)
const errorMsg = ref('')
const isLoading = ref(false)
const siteName = ref('')
const siteUrl = ref('')
const redirectUrl = ref('')
const siteCode = ref('')
const directToken = ref('')

// Gateway токен больше не нужен на фронте — Auth API работает с Gateway на сервере

const pageTitle = computed(() => {
  if (step.value === 'login') return isRegister.value ? 'Регистрация' : 'Вход в AI Pilot'
  if (step.value === 'scanning') return `Сканирую ${siteName.value}...`
  if (step.value === 'success') return 'Подключено!'
  return 'Ошибка подключения'
})

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const rawSite = params.get('site') || ''
  siteUrl.value = rawSite ? decodeURIComponent(rawSite) : ''
  redirectUrl.value = params.get('redirect') || ''
  siteCode.value = params.get('code') || ''
  directToken.value = params.get('token') || ''
  siteName.value = siteUrl.value
    ? siteUrl.value.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    : ''
})

async function handleSubmit() {
  if (!email.value.trim() || !password.value.trim()) {
    errorMsg.value = 'Введите email и пароль'
    return
  }
  isLoading.value = true
  errorMsg.value = ''

  try {
    const endpoint = isRegister.value ? '/api/auth/register' : '/api/auth/login'
    const body = isRegister.value
      ? { email: email.value.trim(), password: password.value, name: name.value.trim() || email.value.split('@')[0] }
      : { email: email.value.trim(), password: password.value }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Ошибка авторизации')
    }

    // Сохраняем JWT для API-запросов
    const data = await res.json()
    const token = data.token
    localStorage.setItem('aipilot_token', token)
    localStorage.setItem('aipilot_user', JSON.stringify(data.user))
    if (siteUrl.value) {
      localStorage.setItem('aipilot_site_url', siteUrl.value)
    }

    // Переходим к подключению
    // Регистрируем сайт
    let apiToken = 'pending'
    if (siteUrl.value) {
      try {
        let regRes
        if (siteCode.value) {
          // Безопасный метод — connection code
          regRes = await fetch('/api/sites/connect-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ code: siteCode.value, siteUrl: siteUrl.value })
          })
        } else if (directToken.value) {
          // Токен из URL — передаём напрямую
          regRes = await fetch('/api/sites/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              url: siteUrl.value,
              apiToken: directToken.value,
              name: siteName.value
            })
          })
          // Если сайт уже привязан (409) — обновляем токен
          if (regRes.status === 409) {
            // Нужно получить id сайта и обновить токен
            const meRes = await fetch('/api/auth/me', {
              headers: { 'Authorization': 'Bearer ' + token }
            })
            if (meRes.ok) {
              const meData = await meRes.json()
              const existingSite = (meData.sites || []).find(s =>
                s.url.replace(/\/+$/, '') === siteUrl.value.replace(/\/+$/, '')
              )
              if (existingSite) {
                regRes = await fetch('/api/sites/' + existingSite.id + '/token', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                  body: JSON.stringify({ apiToken: directToken.value })
                })
              }
            }
          }
        } else {
          // Без токена — создаём с 'pending' (будет обновлён позже)
          regRes = await fetch('/api/sites/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              url: siteUrl.value,
              apiToken: 'pending',
              name: siteName.value
            })
          })
        }
        if (regRes.ok) {
          const regData = await regRes.json()
          apiToken = directToken.value || regData.apiToken || apiToken
        }
      } catch (e) {
        console.warn('Site registration failed:', e)
      }
    }

    // Сканируем сайт через auth-api (прокси на WP REST API)
    if (siteUrl.value && apiToken !== 'pending') {
      step.value = 'scanning'
      try {
        const scanRes = await fetch('/api/sites/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            url: siteUrl.value,
            apiToken: apiToken
          })
        })
        if (scanRes.ok) {
          console.log('✅ Сайт отсканирован:', siteName.value)
        } else {
          console.warn('Scan returned non-ok:', scanRes.status)
        }
      } catch (e) {
        console.warn('Scan request failed (CORS?), continuing:', e)
      }
    }
    // Успешное завершение: показываем success и редирект
    step.value = 'success'
    if (redirectUrl.value) {
      setTimeout(() => {
        window.location.href = decodeURIComponent(redirectUrl.value)
      }, 1500)
    }
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="light:bg-white bg-slate-950 min-h-screen flex items-center justify-center p-4">
    <div class="light:bg-gray-50 bg-slate-900 border light:border-gray-200 border-slate-800 rounded-2xl p-8 w-full max-w-[380px] shadow-xl text-center"
         :class="{'light:border-red-300 border-red-500/30 light:ring-red-200 ring-1 ring-red-500/10': errorMsg && step === 'login'}">
      <!-- Logo -->
      <div class="w-14 h-14 rounded-2xl light:bg-blue-50 bg-blue-500/15 flex items-center justify-center mx-auto mb-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="light:text-blue-600 text-blue-400">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1 class="text-lg font-semibold light:text-gray-900 text-slate-100 m-0 mb-5">{{ pageTitle }}</h1>

      <!-- Форма входа / регистрации -->
      <form v-if="step === 'login'" class="flex flex-col gap-3.5 text-left" @submit.prevent="handleSubmit">
        <div v-if="siteName" class="inline-block light:bg-gray-200 bg-slate-800 light:text-gray-500 text-slate-400 px-3 py-1 rounded-full text-xs self-center mb-1">
          {{ siteName }}
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400">Email</label>
          <input v-model="email" type="email"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="your@email.com" :disabled="isLoading" />
        </div>

        <div v-if="isRegister" class="flex flex-col gap-1">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400">Имя (необязательно)</label>
          <input v-model="name" type="text"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="Ваше имя" :disabled="isLoading" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium light:text-gray-500 text-slate-400">Пароль</label>
          <input v-model="password" type="password"
            class="w-full light:bg-gray-100/80 bg-slate-800/50 border light:border-gray-200/60 border-slate-700/60 rounded-xl px-3.5 py-2.5 text-sm light:text-gray-900 text-slate-100 light:placeholder-gray-400 placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 light:focus:ring-blue-200 focus:ring-blue-500/20"
            placeholder="••••••••" :disabled="isLoading" />
        </div>

        <!-- Error -->
        <div v-if="errorMsg"
          class="light:bg-red-50 bg-red-500/10 border light:border-red-300 border-red-500/30 light:text-red-600 text-red-300 text-sm rounded-xl px-3 py-2 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ errorMsg }}
        </div>

        <button type="submit" :disabled="isLoading"
          class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
          <span v-if="isLoading" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ isRegister ? 'Регистрация...' : 'Вход...' }}
          </span>
          <span v-else>{{ isRegister ? 'Зарегистрироваться' : 'Войти' }}</span>
        </button>

        <button type="button"
          class="bg-transparent border-none light:text-blue-600 text-blue-400 cursor-pointer text-xs text-center py-1 hover:underline"
          @click="isRegister = !isRegister; errorMsg = ''">
          {{ isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться' }}
        </button>
      </form>

      <!-- Сканирование -->
      <div v-if="step === 'scanning'" class="flex flex-col items-center gap-3 py-3">
        <div class="w-9 h-9 border-[3px] light:border-gray-300 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
        <p class="text-sm light:text-gray-500 text-slate-500 m-0 leading-relaxed">AI-помощник изучает структуру сайта, контент и настройки</p>
        <div class="flex flex-col gap-2 w-full text-left py-2">
          <div class="light:bg-gray-100/80 bg-slate-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs light:text-gray-500 text-slate-400 animate-[fadeIn_0.3s_ease_forwards] opacity-0 [animation-delay:0.1s]">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span> Посты и страницы
          </div>
          <div class="light:bg-gray-100/80 bg-slate-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs light:text-gray-500 text-slate-400 animate-[fadeIn_0.3s_ease_forwards] opacity-0 [animation-delay:0.4s]">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span> Плагины и тема
          </div>
          <div class="light:bg-gray-100/80 bg-slate-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs light:text-gray-500 text-slate-400 animate-[fadeIn_0.3s_ease_forwards] opacity-0 [animation-delay:0.7s]">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span> Меню и навигация
          </div>
          <div class="light:bg-gray-100/80 bg-slate-800/50 rounded-xl p-3 flex items-center gap-2.5 text-xs light:text-gray-500 text-slate-400 animate-[fadeIn_0.3s_ease_forwards] opacity-0 [animation-delay:1s]">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span> Tone of Voice
          </div>
        </div>
      </div>

      <!-- Успех -->
      <div v-if="step === 'success'" class="flex flex-col items-center gap-3 py-3">
        <div class="w-14 h-14 rounded-2xl light:bg-green-50 bg-green-500/15 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="light:text-green-600 text-green-400">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p class="text-sm light:text-gray-500 text-slate-500 m-0" v-if="siteName">Сайт {{ siteName }} подключён к AI Pilot</p>
        <p class="text-sm light:text-gray-500 text-slate-500 m-0" v-else>AI Pilot готов к работе</p>
        <p class="text-xs light:text-gray-400 text-slate-600 m-0">Перенаправляю обратно в WordPress...</p>
      </div>

      <!-- Ошибка -->
      <div v-if="step === 'error'" class="flex flex-col items-center gap-3 py-3">
        <div class="text-4xl leading-none">❌</div>
        <p class="text-xs light:text-red-600 text-red-400 m-0 leading-relaxed">{{ errorMsg }}</p>
        <button
          class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          @click="step = 'login'; errorMsg = ''">Попробовать снова</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
