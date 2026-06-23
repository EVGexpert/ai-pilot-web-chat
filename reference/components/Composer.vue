<script setup>
import { ref } from 'vue'
const text = ref('')
</script>

<template>
  <div class="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
    <div class="flex items-end gap-3">
      <div class="relative flex-1">
        <textarea v-model="text" placeholder="Напишите сообщение..." rows="1" class="block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"></textarea>
        <button type="button" class="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-accent" aria-label="Добавить вложение">
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
        </button>
      </div>
      <button type="button" class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20 transition hover:bg-accent/90 active:scale-[0.99]" :disabled="!text.trim()" aria-label="Отправить сообщение">
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>
      </button>
    </div>
    <p class="mt-1.5 text-[10px] text-gray-400">AI Pilot может допускать ошибки. Проверяйте важную информацию.</p>
  </div>
</template>
