<script setup>
</script>

<template>
  <div class="typing">
    <div class="typing-bubble">
      <div class="bubble-avatar">🤖</div>
      <div class="dots-wrapper">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.typing {
  align-self: flex-start;
  display: flex;
  gap: 8px;
}

.typing-bubble {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bubble-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  font-size: 14px;
  flex-shrink: 0;
}

.dots-wrapper {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--chat-assistant-bg);
  border: 1px solid var(--chat-assistant-border);
  border-radius: var(--border-radius-md);
  border-bottom-left-radius: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-quaternary);
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
