<script setup>
defineProps({
  visible: { type: Boolean, default: false }
})
</script>

<template>
  <div class="flex justify-start animate-fade-in">
    <div class="bg-accent rounded-2xl rounded-bl-md px-4 py-3 shadow-lg shadow-accent/20">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 bg-white/70 rounded-full animate-[pulse-dot_1.4s_infinite]" style="animation-delay: 0ms"></span>
        <span class="w-2 h-2 bg-white/70 rounded-full animate-[pulse-dot_1.4s_infinite_0.2s]" style="animation-delay: 0.16s"></span>
        <span class="w-2 h-2 bg-white/70 rounded-full animate-[pulse-dot_1.4s_infinite_0.4s]" style="animation-delay: 0.32s"></span>
      </div>
    </div>
  </div>
</template>
