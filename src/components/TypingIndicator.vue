<script setup>
</script>

<template>
  <div class="typing">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
</template>

<style scoped>
.typing {
  align-self: flex-start;
  display: flex;
  gap: 4px;
  padding: 0.75rem 1rem;
  background: #f0f0f0;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
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
