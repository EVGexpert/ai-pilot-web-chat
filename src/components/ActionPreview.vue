<script setup>
import Button from 'primevue/button'

defineProps({
  action: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['confirm', 'reject'])
</script>

<template>
  <Card class="action-card">
    <template #title>
      <div class="action-title">
        <span>🛠️ {{ action.type }}</span>
      </div>
    </template>
    <template #content>
      <pre class="action-content">{{ JSON.stringify(action.data, null, 2) }}</pre>
    </template>
    <template #footer>
      <div class="action-buttons">
        <Button
          label="Отклонить"
          severity="danger"
          icon="pi pi-times"
          @click="emit('reject')"
        />
        <Button
          label="Подтвердить"
          severity="success"
          icon="pi pi-check"
          @click="emit('confirm')"
        />
      </div>
    </template>
  </Card>
</template>

<style scoped>
.action-card {
  max-width: 100%;
}
.action-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.action-content {
  background: #f5f5f5;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.action-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>
