<script setup>
defineProps({
  message: {
    type: Object,
    default: () => ({
      id: 2, role: 'user', type: 'text',
      content: 'Привет, проверка связи', time: '01:25'
    })
  },
  userAvatar: { type: String, default: '/img/user-img.png' }
})
</script>

<template>
  <div class="flex items-start justify-end gap-3 animate-slide-in">
    <template v-if="message.type === 'link'">
      <div class="max-w-[420px]">
        <div class="overflow-hidden rounded-2xl rounded-tr-md bg-accent text-white shadow-lg shadow-accent/20">
          <div class="flex items-start justify-between gap-4 bg-black/10 px-4 py-3">
            <div>
              <p class="text-sm font-semibold">{{ message.link?.title || 'External Link Title' }}</p>
              <p class="mt-1 text-xs text-white/60">{{ message.link?.description || 'External link description' }}</p>
            </div>
            <svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </div>
          <div class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span class="truncate">{{ message.link?.url || 'https://www.externallink.com' }}</span>
            <span class="flex shrink-0 items-center gap-1 text-xs text-white/60">{{ message.time }}</span>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="max-w-[420px]">
        <div class="rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-accent/20">
          <p>{{ message.content }}</p>
          <span v-if="message.time" class="ml-2 whitespace-nowrap text-xs text-white/60">{{ message.time }}</span>
        </div>
      </div>
    </template>
    <img :src="userAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover">
  </div>
</template>
