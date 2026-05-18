<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const emit = defineEmits(['login'])
const authStore = useAuthStore()
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
        email: email.value.trim(),
        password: password.value
      })
    })

    if (res.ok) {
      const data = await res.json()
      authStore.login(data.token, {
        name: data.name || email.value.split('@')[0],
        email: email.value,
        role: data.role || 'client' // ← ключевое: admin или client
      })
      emit('login', data)
    } else {
      const err = await res.json().catch(() => ({}))
      error.value = err.message || 'Ошибка авторизации'
    }
  } catch {
    // fallback для разработки — демо-режим
    const demoToken = import.meta.env.VITE_DEMO_TOKEN
    if (demoToken) {
      const isAdminInput = email.value.includes('admin')
      authStore.login(demoToken, {
        name: email.value.split('@')[0],
        email: email.value,
        role: isAdminInput ? 'admin' : 'client'
      })
      emit('login', { token: demoToken })
    } else {
      error.value = 'Сервер аутентификации недоступен'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="login-logo">🎯</span>
        <h1 class="login-title">AI Pilot</h1>
        <p class="login-subtitle">Управление WordPress-сайтами через ИИ</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label class="field-label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field-input"
            placeholder="your@email.com"
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
            placeholder="••••••••"
            autocomplete="current-password"
            :disabled="isLoading"
          />
        </div>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button
          type="submit"
          class="btn-primary"
          :disabled="isLoading"
        >
          <span v-if="isLoading" class="btn-loader"></span>
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
  background: var(--bg-primary);
}

.login-card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.login-brand {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.login-logo {
  font-size: 48px;
  line-height: 1;
}

.login-title {
  font-size: var(--typography-h2-size);
  font-weight: var(--typography-h2-weight);
  color: var(--text-primary);
  margin: 0;
}

.login-subtitle {
  font-size: var(--typography-body-size);
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: var(--typography-body-small);
  font-weight: 500;
  color: var(--text-secondary);
}

.field-input {
  width: 100%;
  height: 48px;
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
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
}

.field-input::placeholder {
  color: var(--text-quaternary);
}

.form-error {
  padding: 10px 14px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border-radius: var(--border-radius-sm);
  font-size: var(--typography-body-small);
  line-height: 1.4;
}

.btn-primary {
  width: 100%;
  height: 48px;
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
  transition: background 0.15s ease;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loader {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: var(--text-inverse);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  line-height: 1.6;
  margin: 0;
}
</style>
