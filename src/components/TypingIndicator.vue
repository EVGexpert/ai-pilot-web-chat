<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
</script>

<template>
  <div class="flex justify-start animate-fade-in">
    <div class="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0ms"></span>
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.16s"></span>
        <span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style="animation-delay: 0.32s"></span>
      </div>
    </div>
  </div>
</template>
