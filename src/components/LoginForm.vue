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
        sitesStore.setSites(data.sites.map(s => ({
          id: s.url || s.id,
          name: s.name || s.url,
          status: 'online',
          url: s.url
        })))
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
  <div class="login-page">
    <div class="login-card" :class="{ 'login-card--error': error, 'login-card--loading': isLoading }">
      <!-- Brand header -->
      <div class="login-brand">
        <img src="/img/logo-aipilot-v3.png" alt="AI Pilot" class="login-logo-img" />
        <h1 class="login-title">AI Pilot</h1>
        <p class="login-subtitle">{{ isLoading ? 'Выполняется вход…' : 'Войдите для управления сайтами' }}</p>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="login-alert">
        <p>{{ error }}</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label class="field-label" for="name">Имя</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="field-input"
            :class="{ 'field-input--error': error }"
            placeholder="Как к вам обращаться?"
            autocomplete="name"
            :disabled="isLoading"
          />
        </div>

        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            :class="{ 'field-input--error': error }"
            placeholder="mail@example.com"
            autocomplete="email"
            :disabled="isLoading"
          />
        </div>

        <div class="field">
          <label class="field-label" for="password">Пароль</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="field-input"
            :class="{ 'field-input--error': error }"
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="isLoading"
          />
        </div>

        <button
          type="submit"
          class="btn-primary"
          :class="{ 'btn-primary--error': error }"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="btn-loading">
            <svg class="btn-spinner" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Вход…
          </span>
          <span v-else>Войти</span>
        </button>
      </form>

      <p class="login-footer">
        Установите плагин AI Pilot на ваш WordPress-сайт,<br />
        чтобы он появился в панели управления.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-secondary);
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px 24px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: border-color 0.2s ease, opacity 0.2s ease;
}

.login-card--error {
  border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-error) 10%, transparent);
}

.login-card--loading {
  opacity: 0.7;
}

/* Brand */
.login-brand {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.login-logo-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 8px;
}

.login-title {
  font-size: var(--typography-h2-size);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.login-subtitle {
  font-size: var(--typography-body-size);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

/* Error alert */
.login-alert {
  padding: 12px 14px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
  border-radius: var(--border-radius-md);
  font-size: var(--typography-body-small);
  color: var(--color-error);
  line-height: 1.4;
}

.login-alert p {
  margin: 0;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: var(--typography-body-small);
  font-weight: 500;
  color: var(--text-tertiary);
}

.field-input {
  width: 100%;
  height: 46px;
  padding: 0 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.field-input:focus {
  border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.field-input::placeholder {
  color: var(--text-quaternary);
}

.field-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-input--error {
  border-color: color-mix(in srgb, var(--color-error) 40%, transparent);
}

.field-input--error:focus {
  border-color: color-mix(in srgb, var(--color-error) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 15%, transparent);
}

/* Button */
.btn-primary {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: var(--border-radius-md);
  background: var(--color-primary);
  color: var(--text-inverse);
  font-family: var(--font-family);
  font-size: var(--typography-button-size);
  font-weight: var(--typography-button-weight);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary--error {
  background: color-mix(in srgb, var(--color-error) 50%, transparent);
  color: color-mix(in srgb, var(--text-inverse) 60%, transparent);
}

.btn-loading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Footer */
.login-footer {
  text-align: center;
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  line-height: 1.6;
  margin: 0;
}

@media (max-width: 767px) {
  .login-card {
    padding: 24px 18px;
  }
}
</style>
