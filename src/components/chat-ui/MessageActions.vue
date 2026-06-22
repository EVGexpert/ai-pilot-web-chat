<script setup>
const props = defineProps({
  // id нужен, чтобы родитель понимал, к какому сообщению применили действие.
  messageId: {
    type: [String, Number],
    required: true
  },
  // Можно скрывать панель, например для системных сообщений.
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['listen', 'copy', 'like', 'dislike'])

function onAction(action) {
  if (props.disabled) return
  emit(action, props.messageId)
}
</script>

<template>
  <div class="mt-2 flex items-center gap-4 pl-1 text-gray-400">
    <button class="transition hover:text-accent" type="button" aria-label="Listen" @click="onAction('listen')">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
        <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
      </svg>
    </button>

    <button class="transition hover:text-accent" type="button" aria-label="Copy" @click="onAction('copy')">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="12" height="12" rx="2"></rect>
        <path d="M4 16V6a2 2 0 0 1 2-2h10"></path>
      </svg>
    </button>

    <button class="transition hover:text-accent" type="button" aria-label="Like" @click="onAction('like')">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 10v11"></path>
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
      </svg>
    </button>

    <button class="transition hover:text-accent" type="button" aria-label="Dislike" @click="onAction('dislike')">
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 14V3"></path>
        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
      </svg>
    </button>
  </div>
</template>
