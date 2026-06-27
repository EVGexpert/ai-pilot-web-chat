<script setup>
defineProps({
  messageId: { type: [String, Number], required: true },
  theme: { type: String, default: 'light' }
})

const emit = defineEmits(['listen', 'copy', 'like', 'dislike'])
</script>

<template>
  <div class="mt-2 flex items-center gap-4 pl-1 text-gray-400">
    <!-- Listen -->
    <button class="transition hover:text-accent" aria-label="Listen" @click="emit('listen', messageId)">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    </button>

    <!-- Copy -->
    <button class="transition hover:text-accent" aria-label="Copy" @click="emit('copy', messageId)">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M4 16V6a2 2 0 0 1 2-2h10" />
      </svg>
    </button>

    <!-- Regenerate -->
    <button class="transition hover:text-accent" aria-label="Regenerate" @click="emit('like', messageId)">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12a9 9 0 0 1-15.5 6.3" />
        <path d="M3 12A9 9 0 0 1 18.5 5.7" />
        <path d="M18 3v4h4" />
        <path d="M6 21v-4H2" />
      </svg>
    </button>

    <!-- Dislike -->
    <button class="transition hover:text-accent" aria-label="Dislike" @click="emit('dislike', messageId)">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 14V2" />
        <path d="M9 18.1 10 14H4.8a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6.2 3H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3.4a2 2 0 0 0-1.7 1l-3 5a2 2 0 0 1-3.6-1.9Z" />
      </svg>
    </button>
  </div>
</template>