<script setup>
import { ref, onMounted, computed } from 'vue'

// Состояния: login | connecting | scanning | success | error
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
const siteToken = ref('')

const GATEWAY_TOKEN = import.meta.env.VITE_GATEWAY_TOKEN

const pageTitle = computed(() => {
  if (step.value === 'login') return isRegister.value ? 'Регистрация' : 'Вход в AI Pilot'
  if (step.value === 'connecting') return siteName.value ? `Подключаю ${siteName.value}...` : 'Подключаюсь...'
  if (step.value === 'scanning') return `Сканирую ${siteName.value}...`
  if (step.value === 'success') return 'Подключено!'
  return 'Ошибка подключения'
})

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const rawSite = params.get('site') || ''
  siteUrl.value = rawSite ? decodeURIComponent(rawSite) : ''
  redirectUrl.value = params.get('redirect') || ''
  const rawToken = params.get('token') || ''
  siteToken.value = rawToken ? decodeURIComponent(rawToken) : ''
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

    // Переходим к подключению
    step.value = 'connecting'

    // Регистрируем сайт в auth-api
    let apiToken = siteToken.value || 'pending'
    if (siteUrl.value) {
      try {
        const regRes = await fetch('/api/sites/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({
            url: siteUrl.value,
            apiToken: apiToken,
            name: siteName.value
          })
        })
        if (regRes.ok) {
          const regData = await regRes.json()
          apiToken = regData.apiToken || apiToken
        }
      } catch (e) {
        console.warn('Site registration failed:', e)
      }
    }

    await connectToGateway()

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
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isLoading.value = false
  }
}

function waitForEvent(ws, filter, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ws.onmessage = (e) => {
      try {
        const frame = JSON.parse(e.data)
        if (filter(frame)) { clearTimeout(timer); resolve(frame) }
      } catch {}
    }
  })
}

async function connectToGateway() {
  if (!GATEWAY_TOKEN) {
    step.value = 'error'
    errorMsg.value = 'Gateway token not configured'
    return
  }

  try {
    const ws = new WebSocket('wss://pilotsite.ru/')

    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = () => reject(new Error('WebSocket connection failed'))
      setTimeout(() => reject(new Error('Connection timeout')), 8000)
    })

    await waitForEvent(ws, (f) => f.type === 'event' && f.event === 'connect.challenge')

    ws.send(JSON.stringify({
      type: 'req', id: '1', method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 4,
        client: { id: 'cli', version: '0.1.0', platform: 'browser', mode: 'cli' },
        role: 'operator', scopes: ['operator.read'],
        caps: [], commands: [], permissions: {},
        auth: { token: GATEWAY_TOKEN },
        locale: 'ru-RU', userAgent: 'ai-pilot-connect/0.1.0'
      }
    }))

    const res = await waitForEvent(ws, (f) => f.type === 'res')
    ws.close()

    if (!res.ok) throw new Error(res.error?.message || 'Connection rejected')

    step.value = 'success'
    if (redirectUrl.value) {
      setTimeout(() => {
        window.location.href = decodeURIComponent(redirectUrl.value)
      }, 1500)
    }
  } catch (e) {
    step.value = 'error'
    errorMsg.value = e.message || 'Connection failed'
  }
}
</script>

<template>
  <div class="connect-page">
    <div class="connect-card">
      <div class="connect-logo">🎯</div>
      <h1 class="page-title">{{ pageTitle }}</h1>

      <!-- Форма входа / регистрации -->
      <form v-if="step === 'login'" class="auth-form" @submit.prevent="handleSubmit">
        <div class="site-badge" v-if="siteName">{{ siteName }}</div>

        <div class="field">
          <label class="field-label">Email</label>
          <input v-model="email" type="email" class="field-input" placeholder="your@email.com" :disabled="isLoading" />
        </div>

        <div v-if="isRegister" class="field">
          <label class="field-label">Имя (необязательно)</label>
          <input v-model="name" type="text" class="field-input" placeholder="Ваше имя" :disabled="isLoading" />
        </div>

        <div class="field">
          <label class="field-label">Пароль</label>
          <input v-model="password" type="password" class="field-input" placeholder="••••••••" :disabled="isLoading" />
        </div>

        <div v-if="errorMsg" class="form-error">{{ errorMsg }}</div>

        <button type="submit" class="btn-primary" :disabled="isLoading">
          <span v-if="isLoading" class="btn-loader"></span>
          <span v-else>{{ isRegister ? 'Зарегистрироваться' : 'Войти' }}</span>
        </button>

        <button type="button" class="btn-link" @click="isRegister = !isRegister; errorMsg = ''">
          {{ isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться' }}
        </button>
      </form>

      <!-- Подключение -->
      <div v-if="step === 'connecting'" class="status-body">
        <div class="spinner"></div>
        <p class="status-desc">Устанавливаю защищённое соединение с сервером AI Pilot</p>
        <div class="progress-bar"><div class="progress-fill"></div></div>
      </div>

      <!-- Сканирование -->
      <div v-if="step === 'scanning'" class="status-body">
        <div class="spinner"></div>
        <p class="status-desc">AI-помощник изучает структуру сайта, контент и настройки</p>
        <div class="scan-steps">
          <div class="scan-step"><span class="scan-dot"></span> Посты и страницы</div>
          <div class="scan-step"><span class="scan-dot"></span> Плагины и тема</div>
          <div class="scan-step"><span class="scan-dot"></span> Меню и навигация</div>
          <div class="scan-step"><span class="scan-dot"></span> Tone of Voice</div>
        </div>
      </div>

      <!-- Успех -->
      <div v-if="step === 'success'" class="status-body">
        <div class="success-icon">✅</div>
        <p class="status-desc" v-if="siteName">Сайт {{ siteName }} подключён к AI Pilot</p>
        <p class="status-desc" v-else>AI Pilot готов к работе</p>
        <p class="status-redirect">Перенаправляю обратно в WordPress...</p>
      </div>

      <!-- Ошибка -->
      <div v-if="step === 'error'" class="status-body">
        <div class="error-icon">❌</div>
        <p class="error-text">{{ errorMsg }}</p>
        <button class="btn-primary" @click="step = 'login'; errorMsg = ''">Попробовать снова</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.connect-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
}
.connect-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 36px 28px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}
.connect-logo {
  font-size: 48px;
  margin-bottom: 12px;
  line-height: 1;
}
.page-title {
  font-size: var(--typography-h3-size);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px;
}
.site-badge {
  display: inline-block;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 4px 14px;
  border-radius: 16px;
  font-size: var(--typography-body-small);
  margin-bottom: 16px;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field-label {
  font-size: var(--typography-body-small);
  font-weight: 500;
  color: var(--text-secondary);
}
.field-input {
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  outline: none;
  transition: border-color 0.15s;
}
.field-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}
.form-error {
  padding: 8px 12px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border-radius: var(--border-radius-sm);
  font-size: var(--typography-body-small);
  line-height: 1.4;
}
.btn-primary {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--color-primary);
  color: var(--text-inverse);
  font-family: var(--font-family);
  font-size: var(--typography-button-size);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--typography-body-small);
  text-align: center;
  padding: 4px;
}
.btn-link:hover { text-decoration: underline; }
.btn-loader {
  width: 18px; height: 18px;
  border: 2px solid transparent;
  border-top-color: var(--text-inverse);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Statuses */
.status-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}
.status-desc {
  font-size: var(--typography-body-size);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}
.status-redirect {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  margin: 0;
}
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}
.progress-fill {
  height: 100%;
  width: 30%;
  background: var(--color-primary);
  border-radius: 2px;
  animation: progress 2s ease-in-out infinite;
}
@keyframes progress {
  0% { width: 10%; margin-left: 0; }
  50% { width: 50%; margin-left: 30%; }
  100% { width: 10%; margin-left: 90%; }
}

/* Scan steps */
.scan-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 0;
}
.scan-step {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--typography-body-small);
  color: var(--text-tertiary);
  animation: fadeIn 0.3s ease forwards;
  opacity: 0;
}
.scan-step:nth-child(1) { animation-delay: 0.1s; }
.scan-step:nth-child(2) { animation-delay: 0.4s; }
.scan-step:nth-child(3) { animation-delay: 0.7s; }
.scan-step:nth-child(4) { animation-delay: 1.0s; }
.scan-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes fadeIn {
  to { opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.success-icon, .error-icon {
  font-size: 40px;
  line-height: 1;
}
.error-text {
  font-size: var(--typography-body-small);
  color: var(--color-error);
  margin: 0;
  line-height: 1.5;
}
</style>
