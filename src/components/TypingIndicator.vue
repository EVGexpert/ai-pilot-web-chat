<script setup>
/**
 * TypingIndicator.vue
 * 3 пульсирующие точки по дизайну chat-layout.html.
 */
</script>

<template>
  <div class="typing animate-fade-in">
    <div class="typing-dots">
      <span class="dot" style="animation-delay: 0s;"></span>
      <span class="dot" style="animation-delay: 0.2s;"></span>
      <span class="dot" style="animation-delay: 0.4s;"></span>
    </div>
  </div>
</template>

<style scoped>
.typing {
  align-self: flex-start;
  display: flex;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 16px;
  background: var(--color-accent);
  border-radius: 16px;
  border-top-right-radius: 6px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  animation: pulse-dot 1.4s infinite ease-in-out both;
}

@keyframes pulse-dot {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
