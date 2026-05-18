<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useSitesStore } from '../stores/sitesStore'

const authStore = useAuthStore()
const sitesStore = useSitesStore()

const status = ref('connecting') // connecting | success | error
const siteName = ref('')
const errorMsg = ref('')

// В качестве fallback при прямом открытии — самодостаточный popup
const FALLBACK_TOKEN = import.meta.env.VITE_GATEWAY_TOKEN

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const siteUrl = params.get('site') || ''
  const tokenParam = params.get('token') || ''
  const redirectUrl = params.get('redirect') || ''
  const sessionKey = params.get('session') || ''
  const gatewayUrl = params.get('gateway') || 'https://pilotsite.ru'

  siteName.value = siteUrl ? decodeURIComponent(siteUrl).replace(/^https?:\/\//, '').replace(/\/.*$/, '') : ''

  // Если есть session key в URL — коннектимся напрямую
  if (sessionKey) {
    doConnect(siteUrl, tokenParam, redirectUrl, sessionKey, gatewayUrl)
  } else {
    // Прямой доступ: логинимся демо-токеном и вызываем callback
    autoConnect(siteUrl, redirectUrl)
  }
})

async function doConnect(siteUrl, token, redirectUrl, sessionKey, gatewayUrl) {
  status.value = 'connecting'
  try {
    // Подключаемся к Gateway WebSocket
    const ws = new WebSocket(gatewayUrl.replace('https://', 'wss://').replace('http://', 'ws://'))

    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = () => reject(new Error('WebSocket connection failed'))
      setTimeout(() => reject(new Error('Timeout')), 5000)
    })

    // Ждём challenge
    const challenge = await new Promise((resolve, reject) => {
      ws.onmessage = (e) => {
        try {
          const frame = JSON.parse(e.data)
          if (frame.type === 'event' && frame.event === 'connect.challenge') {
            resolve(frame.payload?.nonce)
          }
        } catch {}
      }
      setTimeout(() => reject(new Error('Challenge timeout')), 5000)
    })

    // Отправляем connect с sessionKey
    const token = FALLBACK_TOKEN
    ws.send(JSON.stringify({
      type: 'req', id: '1', method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 4,
        client: { id: 'plugin-connect', version: '0.1.0', platform: 'browser', mode: 'popup' },
        role: 'operator', scopes: ['operator.read'],
        caps: [], commands: [], permissions: {},
        auth: { token }, locale: 'ru-RU', userAgent: 'ai-pilot-connect/0.1.0',
        sessionKey
      }
    }))

    // Ждём ответ
    const result = await new Promise((resolve, reject) => {
      ws.onmessage = (e) => {
        try {
          const frame = JSON.parse(e.data)
          if (frame.type === 'res' && frame.ok) resolve(true)
          if (frame.type === 'res' && !frame.ok) reject(new Error(frame.error?.message || 'Connect failed'))
        } catch {}
      }
      setTimeout(() => reject(new Error('Connect response timeout')), 5000)
    })

    ws.close()
    status.value = 'success'

    // Редирект обратно
    if (redirectUrl) {
      setTimeout(() => {
        window.location.href = decodeURIComponent(redirectUrl)
      }, 1500)
    }
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message || 'Connection failed'
  }
}

async function autoConnect(siteUrl, redirectUrl) {
  status.value = 'connecting'
  try {
    if (!FALLBACK_TOKEN) {
      throw new Error('Gateway token not configured')
    }
    authStore.login(FALLBACK_TOKEN, {
      name: 'WordPress Plugin',
      email: 'plugin@wordpress',
      role: 'admin'
    })
    sitesStore.fetchSites()

    status.value = 'success'
    if (redirectUrl) {
      setTimeout(() => {
        window.close()
        window.location.href = decodeURIComponent(redirectUrl)
      }, 1500)
    }
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message
  }
}
</script>

<template>
  <div class="connect-page">
    <div class="connect-card">
      <!-- Логотип -->
      <div class="connect-logo">🎯</div>

      <!-- Connecting -->
      <div v-if="status === 'connecting'" class="connect-body">
        <div class="spinner"></div>
        <h2>{{ siteName ? `Подключаю ${siteName}...` : 'Подключаюсь к AI Pilot...' }}</h2>
        <p class="connect-hint">Устанавливаю защищённое соединение с сервером</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'success'" class="connect-body">
        <div class="success-icon">✅</div>
        <h2>Подключено!</h2>
        <p class="connect-hint" v-if="siteName">Сайт {{ siteName }} подключён к AI Pilot</p>
        <p class="connect-redirect">Перенаправляю обратно...</p>
      </div>

      <!-- Error -->
      <div v-else class="connect-body">
        <div class="error-icon">❌</div>
        <h2>Ошибка подключения</h2>
        <p class="error-text">{{ errorMsg || 'Не удалось подключиться к серверу' }}</p>
        <button class="close-btn" @click="window.close()">Закрыть окно</button>
      </div>
    </div>
  </div>
</template>

<script>
// Для шаблона
const window = globalThis.window
</script>

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
  padding: 40px 32px;
  text-align: center;
  box-shadow: var(--shadow-lg);
}

.connect-logo {
  font-size: 48px;
  margin-bottom: 24px;
  line-height: 1;
}

.connect-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.connect-body h2 {
  font-size: var(--typography-h3-size);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.connect-hint {
  font-size: var(--typography-body-size);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.connect-redirect {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  margin: 4px 0 0;
}

/* Spinner */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-icon,
.error-icon {
  font-size: 40px;
  line-height: 1;
  margin-bottom: 8px;
}

.error-text {
  font-size: var(--typography-body-small);
  color: var(--color-error);
  margin: 0;
  line-height: 1.5;
}

.close-btn {
  margin-top: 8px;
  padding: 10px 24px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  transition: background 0.12s;
}

.close-btn:hover {
  background: var(--bg-hover);
}
</style>
