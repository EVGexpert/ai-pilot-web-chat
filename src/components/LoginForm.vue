<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Password from 'primevue/password'

const authStore = useAuthStore()
const tokenInput = ref('')

function handleLogin() {
  if (tokenInput.value.trim()) {
    authStore.login(tokenInput.value.trim())
  }
}
</script>

<template>
  <Card class="login-card">
    <template #title>
      <div class="login-header">
        <span class="login-icon">🎯</span>
        <h2>AI Pilot</h2>
      </div>
    </template>
    <template #content>
      <p class="login-desc">Введите токен доступа к Gateway</p>
      <div class="login-form">
        <Password
          v-model="tokenInput"
          :feedback="false"
          placeholder="gateway token"
          class="login-input"
          @keyup.enter="handleLogin"
        />
        <Button
          label="Подключиться"
          icon="pi pi-sign-in"
          @click="handleLogin"
          :disabled="!tokenInput.trim()"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.login-card {
  max-width: 400px;
  width: 100%;
}
.login-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.login-icon {
  font-size: 1.5rem;
}
.login-desc {
  color: #666;
  margin-bottom: 1rem;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.login-input {
  width: 100%;
}
</style>
