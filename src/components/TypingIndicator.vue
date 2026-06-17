<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
</script>

<template>
  <div class="flex justify-start animate-fade-in">
    <div class="bg-slate-800/80 text-slate-400 rounded-2xl rounded-bl-md px-4 py-3">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 bg-slate-500 rounded-full animate-pulse" style="animation-delay: 0ms"></span>
        <span class="w-2 h-2 bg-slate-500 rounded-full animate-pulse" style="animation-delay: 0.16s"></span>
        <span class="w-2 h-2 bg-slate-500 rounded-full animate-pulse" style="animation-delay: 0.32s"></span>
      </div>
    </div>
  </div>
</template>
