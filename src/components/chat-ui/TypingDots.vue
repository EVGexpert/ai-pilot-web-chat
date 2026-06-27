<script setup>
</script>

<template>
  <div class="flex items-start gap-3">
    <div class="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
      <div class="flex gap-1">
        <span class="w-2 h-2 rounded-full bg-gray-400 dot"></span>
        <span class="w-2 h-2 rounded-full bg-gray-400 dot"></span>
        <span class="w-2 h-2 rounded-full bg-gray-400 dot"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dot {
  animation: pulse-dot 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
.dot:nth-child(3) { animation-delay: 0s; }

@keyframes pulse-dot {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>