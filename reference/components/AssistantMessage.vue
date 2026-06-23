<script setup>
defineProps({
  message: {
    type: Object,
    default: () => ({
      id: 1,
      role: 'assistant',
      content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 💀',
      time: '02:25'
    })
  },
  assistantAvatar: { type: String, default: '/img/logo-aipilot-v2.png' }
})
</script>

<template>
  <div class="flex items-start gap-3 animate-fade-in">
    <img :src="assistantAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover">
    <div class="max-w-[500px]">
      <div class="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm ring-1 ring-black/5">
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        <p class="mt-5">Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 💀</p>
        <div class="mt-2 flex items-center justify-end gap-1 text-xs text-gray-400">{{ message.time }}</div>
      </div>
      <div class="mt-2 flex items-center gap-4 pl-1 text-gray-400">
        <button class="transition hover:text-accent" aria-label="Listen"><svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg></button>
        <button class="transition hover:text-accent" aria-label="Copy"><svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></svg></button>
        <button class="transition hover:text-accent" aria-label="Regenerate"><svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-15.5 6.3" /><path d="M3 12A9 9 0 0 1 18.5 5.7" /><path d="M18 3v4h4" /><path d="M6 21v-4H2" /></svg></button>
        <button class="transition hover:text-accent" aria-label="Dislike"><svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14V2" /><path d="M9 18.1 10 14H4.8a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 6.2 3H20a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3.4a2 2 0 0 0-1.7 1l-3 5a2 2 0 0 1-3.6-1.9Z" /></svg></button>
      </div>
    </div>
  </div>
</template>
