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
  <main class="login-page">
    <div class="login-orb login-orb--one" aria-hidden="true"></div>
    <div class="login-orb login-orb--two" aria-hidden="true"></div>

    <section class="login-shell" aria-label="Авторизация AI Pilot">
      <div class="login-brand">
        <div class="brand-topline">
          <img
            class="brand-logo"
            src="/img/logo-aipilot-v3.png"
            alt="AI Pilot"
            width="72"
            height="72"
          />
          <span class="brand-name">AI Pilot</span>
        </div>

        <div class="brand-copy">
          <p class="brand-kicker">WordPress × AI</p>
          <h1>Управляйте сайтом<br />обычным языком.</h1>
          <p class="brand-description">
            Один интерфейс для контента, страниц и ежедневных задач WordPress.
          </p>
        </div>

        <div class="brand-note">
          <span class="brand-note__dot" aria-hidden="true"></span>
          Безопасные действия с подтверждением
        </div>
      </div>

      <div class="login-panel">
        <div class="login-card" :class="{ 'login-card--error': error }">
          <div class="login-heading">
            <p class="login-eyebrow">Личный кабинет</p>
            <h2>Войти в AI Pilot</h2>
            <p>Продолжите работу с подключёнными WordPress-сайтами.</p>
          </div>

          <form class="login-form" @submit.prevent="handleLogin">
            <div class="field-group">
              <label for="name">Имя</label>
              <input
                id="name"
                v-model="name"
                type="text"
                placeholder="Как к вам обращаться?"
                autocomplete="name"
                :disabled="isLoading"
              />
            </div>

            <div class="field-group">
              <label for="email">Email</label>
              <input
                id="email"
                v-model="email"
                type="email"
                placeholder="your@email.com"
                autocomplete="email"
                :disabled="isLoading"
              />
            </div>

            <div class="field-group">
              <label for="password">Пароль</label>
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="isLoading"
              />
            </div>

            <div v-if="error" class="login-error" role="alert" aria-live="polite">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.75v5.1" />
                <path d="M12 16.5h.01" />
              </svg>
              <span>{{ error }}</span>
            </div>

            <button class="login-submit" type="submit" :disabled="isLoading">
              <span v-if="isLoading" class="login-submit__loading">
                <svg class="login-spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M21 12a9 9 0 0 0-9-9" />
                </svg>
                Вход...
              </span>
              <span v-else class="login-submit__label">
                Войти
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="m14 8 4 4-4 4" />
                </svg>
              </span>
            </button>
          </form>

          <div class="login-footer">
            <span>Нет подключённого сайта?</span>
            <span>Установите AI Pilot Plugin в WordPress.</span>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  --login-bg: var(--color-chat-bg, #eae9ec);
  --login-accent: var(--color-accent, #7e4ce0);
  --login-ink: #18151f;
  --login-muted: #77717f;
  --login-border: rgba(24, 21, 31, 0.09);
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: clamp(20px, 4vw, 56px);
  background:
    radial-gradient(circle at 12% 10%, rgba(126, 76, 224, 0.13), transparent 31%),
    radial-gradient(circle at 92% 88%, rgba(126, 76, 224, 0.08), transparent 28%),
    var(--login-bg);
  color: var(--login-ink);
  font-family: var(--font-chat, "Inter", system-ui, -apple-system, sans-serif);
}

.login-orb {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(2px);
}

.login-orb--one {
  top: -150px;
  right: 12%;
  width: 330px;
  height: 330px;
  border: 1px solid rgba(126, 76, 224, 0.12);
}

.login-orb--two {
  bottom: -210px;
  left: 7%;
  width: 430px;
  height: 430px;
  border: 1px solid rgba(24, 21, 31, 0.06);
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(1080px, 100%);
  min-height: min(680px, calc(100dvh - 80px));
  display: grid;
  grid-template-columns: minmax(0, 1.06fr) minmax(390px, 0.94fr);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.5);
  box-shadow:
    0 30px 80px rgba(43, 32, 62, 0.10),
    0 4px 16px rgba(43, 32, 62, 0.04);
  backdrop-filter: blur(18px);
}

.login-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100%;
  padding: clamp(34px, 5vw, 64px);
  background:
    linear-gradient(145deg, rgba(126, 76, 224, 0.09), rgba(255, 255, 255, 0.28) 52%, rgba(255, 255, 255, 0.08));
  border-right: 1px solid rgba(24, 21, 31, 0.06);
}

.brand-topline {
  display: flex;
  align-items: center;
  gap: 15px;
}

.brand-logo {
  width: 58px;
  height: 58px;
  object-fit: contain;
  filter: drop-shadow(0 10px 20px rgba(126, 76, 224, 0.16));
}

.brand-name {
  font-size: 19px;
  font-weight: 680;
  letter-spacing: -0.035em;
}

.brand-copy {
  max-width: 530px;
  padding: 80px 0 70px;
}

.brand-kicker,
.login-eyebrow {
  margin: 0;
  color: var(--login-accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.brand-copy h1 {
  margin: 19px 0 22px;
  max-width: 560px;
  font-size: clamp(43px, 5.1vw, 66px);
  line-height: 0.99;
  letter-spacing: -0.061em;
  font-weight: 650;
}

.brand-description {
  max-width: 470px;
  margin: 0;
  color: #696270;
  font-size: clamp(15px, 1.6vw, 18px);
  line-height: 1.65;
}

.brand-note {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  color: #625c68;
  font-size: 12px;
  font-weight: 520;
}

.brand-note__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--login-accent);
  box-shadow: 0 0 0 5px rgba(126, 76, 224, 0.10);
}

.login-panel {
  display: grid;
  place-items: center;
  padding: clamp(24px, 4vw, 54px);
  background: rgba(255, 255, 255, 0.82);
}

.login-card {
  width: min(390px, 100%);
}

.login-heading {
  margin-bottom: 34px;
}

.login-heading h2 {
  margin: 11px 0 9px;
  color: var(--login-ink);
  font-size: clamp(29px, 3vw, 36px);
  line-height: 1.1;
  letter-spacing: -0.045em;
  font-weight: 650;
}

.login-heading > p:last-child {
  margin: 0;
  color: var(--login-muted);
  font-size: 14px;
  line-height: 1.55;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-group label {
  color: #625c68;
  font-size: 12px;
  font-weight: 620;
}

.field-group input {
  width: 100%;
  min-height: 50px;
  padding: 0 15px;
  border: 1px solid var(--login-border);
  border-radius: 13px;
  outline: none;
  background: rgba(255, 255, 255, 0.85);
  color: var(--login-ink);
  font: inherit;
  font-size: 14px;
  box-shadow: 0 1px 1px rgba(24, 21, 31, 0.02);
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.field-group input::placeholder {
  color: #aaa5af;
}

.field-group input:hover:not(:disabled) {
  border-color: rgba(126, 76, 224, 0.28);
}

.field-group input:focus {
  border-color: rgba(126, 76, 224, 0.68);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(126, 76, 224, 0.09);
}

.field-group input:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.login-error {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 12px;
  background: rgba(254, 242, 242, 0.92);
  color: #c43d3d;
  font-size: 13px;
  line-height: 1.45;
}

.login-error svg {
  flex: 0 0 17px;
  width: 17px;
  height: 17px;
  margin-top: 1px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.login-submit {
  width: 100%;
  min-height: 51px;
  margin-top: 4px;
  border: 0;
  border-radius: 13px;
  cursor: pointer;
  background: var(--login-accent);
  color: white;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  box-shadow: 0 12px 28px rgba(126, 76, 224, 0.22);
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.login-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 15px 32px rgba(126, 76, 224, 0.27);
}

.login-submit:active:not(:disabled) {
  transform: translateY(0);
}

.login-submit:focus-visible {
  outline: 3px solid rgba(126, 76, 224, 0.24);
  outline-offset: 3px;
}

.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.login-submit__label,
.login-submit__loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
}

.login-submit__label svg {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.login-spinner {
  width: 17px;
  height: 17px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  animation: login-spin 0.75s linear infinite;
}

.login-spinner circle {
  opacity: 0.25;
}

.login-footer {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 26px;
  padding-top: 19px;
  border-top: 1px solid rgba(24, 21, 31, 0.07);
  color: #99939e;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.login-card--error .field-group input:not(:focus) {
  border-color: rgba(239, 68, 68, 0.12);
}

@keyframes login-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 820px) {
  .login-page {
    align-items: start;
    overflow-y: auto;
    padding: 16px;
  }

  .login-shell {
    min-height: 0;
    grid-template-columns: 1fr;
    border-radius: 24px;
  }

  .login-brand {
    min-height: 260px;
    padding: 28px;
    border-right: 0;
    border-bottom: 1px solid rgba(24, 21, 31, 0.06);
  }

  .brand-copy {
    padding: 48px 0 38px;
  }

  .brand-copy h1 {
    max-width: 480px;
    margin-top: 14px;
    font-size: clamp(37px, 10vw, 52px);
  }

  .brand-description {
    max-width: 480px;
  }

  .login-panel {
    padding: 34px 24px 30px;
  }
}

@media (max-width: 520px) {
  .login-page {
    padding: 0;
    background: #fff;
  }

  .login-shell {
    width: 100%;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .login-brand {
    min-height: 230px;
    padding: 24px 22px;
  }

  .brand-logo {
    width: 48px;
    height: 48px;
  }

  .brand-name {
    font-size: 17px;
  }

  .brand-copy {
    padding: 34px 0 24px;
  }

  .brand-copy h1 {
    margin-bottom: 14px;
    font-size: 39px;
  }

  .brand-description {
    font-size: 14px;
  }

  .brand-note {
    display: none;
  }

  .login-panel {
    align-items: start;
    padding: 32px 22px 34px;
  }

  .login-heading {
    margin-bottom: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-submit,
  .field-group input,
  .login-spinner {
    transition: none;
    animation-duration: 0.001ms;
  }
}
</style>
