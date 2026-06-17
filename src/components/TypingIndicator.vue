<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
</script>

<template>
  <div class="flex justify-start animate-fade-in">
    <div class="light:bg-gray-100 bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3">
      <div class="flex gap-1.5">
        <span class="w-2 h-2 rounded-full light:bg-gray-400 bg-slate-500 animate-pulse" style="animation-delay: 0ms"></span>
        <span class="w-2 h-2 rounded-full light:bg-gray-400 bg-slate-500 animate-pulse" style="animation-delay: 150ms"></span>
        <span class="w-2 h-2 rounded-full light:bg-gray-400 bg-slate-500 animate-pulse" style="animation-delay: 300ms"></span>
      </div>
    </div>
  </div>
</template>
