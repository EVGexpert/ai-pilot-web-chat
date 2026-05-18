<script setup>
import { ref, onMounted } from 'vue'

const status = ref('connecting')
const siteName = ref('')
const errorMsg = ref('')

const GATEWAY_TOKEN = import.meta.env.VITE_GATEWAY_TOKEN

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const siteUrl = params.get('site') || ''
  const redirectUrl = params.get('redirect') || ''
  const gatewayUrl = params.get('gateway') || 'https://pilotsite.ru'

  siteName.value = siteUrl
    ? decodeURIComponent(siteUrl).replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    : ''

  if (!GATEWAY_TOKEN) {
    status.value = 'error'
    errorMsg.value = 'Gateway token not configured'
    return
  }

  connectToGateway(redirectUrl, gatewayUrl)
})

function waitForEvent(ws, filter, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    ws.onmessage = (e) => {
      try {
        const frame = JSON.parse(e.data)
        if (filter(frame)) {
          clearTimeout(timer)
          resolve(frame)
        }
      } catch { /* skip malformed frames */ }
    }
  })
}

async function connectToGateway(redirectUrl, gatewayUrl) {
  status.value = 'connecting'

  try {
    const wsUrl = gatewayUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    const ws = new WebSocket(wsUrl)

    // Ждём открытия
    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = () => reject(new Error('WebSocket connection failed'))
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    })

    // Ждём challenge
    await waitForEvent(ws, (f) => f.type === 'event' && f.event === 'connect.challenge')

    // Отправляем connect
    ws.send(JSON.stringify({
      type: 'req', id: '1', method: 'connect',
      params: {
        minProtocol: 3, maxProtocol: 4,
        client: { id: 'web', version: '0.1.0', platform: 'browser', mode: 'cli' },
        role: 'operator', scopes: ['operator.read'],
        caps: [], commands: [], permissions: {},
        auth: { token: GATEWAY_TOKEN },
        locale: 'ru-RU',
        userAgent: 'ai-pilot-connect/0.1.0'
      }
    }))

    // Ждём ответ hello-ok
    const res = await waitForEvent(ws, (f) => f.type === 'res')

    if (res.ok) {
      ws.close()
      status.value = 'success'

      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = decodeURIComponent(redirectUrl)
        }, 1500)
      }
    } else {
      ws.close()
      throw new Error(res.error?.message || 'Connection rejected')
    }
  } catch (e) {
    status.value = 'error'
    errorMsg.value = e.message || 'Connection failed'
  }
}
</script>

<template>
  <div class="connect-page">
    <div class="connect-card">
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
        <p class="connect-redirect">Перенаправляю обратно в WordPress...</p>
      </div>

      <!-- Error -->
      <div v-else class="connect-body">
        <div class="error-icon">❌</div>
        <h2>Ошибка подключения</h2>
        <p class="error-text">{{ errorMsg }}</p>
        <button class="close-btn" @click="window.close()">Закрыть окно</button>
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
.success-icon, .error-icon {
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
