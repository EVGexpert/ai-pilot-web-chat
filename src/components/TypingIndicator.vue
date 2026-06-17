<script setup>
</script>

<template>
  <div class="typing">
    <div class="typing-avatar">
      <img src="/img/logo-aipilot-v2.png" alt="" />
    </div>
    <div class="typing-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  </div>
</template>

<style scoped>
.typing {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 12px;
}

.typing-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.typing-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  animation: slideInRight 0.25s ease-out;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  animation: pulse-dot 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

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

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
