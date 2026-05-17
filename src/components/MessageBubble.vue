<script setup>
defineProps({
  message: {
    type: Object,
    required: true
  }
})

function isUser(msg) {
  return msg.role === 'user'
}
</script>

<template>
  <div
    class="bubble"
    :class="{ 'bubble-user': isUser(message), 'bubble-assistant': !isUser(message) }"
  >
    <div class="bubble-role">
      {{ isUser(message) ? 'Вы' : 'AI Pilot' }}
    </div>
    <div class="bubble-text">{{ message.content }}</div>
  </div>
</template>

<style scoped>
.bubble {
  max-width: 80%;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  word-wrap: break-word;
}
.bubble-user {
  align-self: flex-end;
  background: #667eea;
  color: white;
  border-bottom-right-radius: 4px;
}
.bubble-assistant {
  align-self: flex-start;
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}
.bubble-role {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  opacity: 0.7;
}
.bubble-text {
  line-height: 1.4;
}
</style>
