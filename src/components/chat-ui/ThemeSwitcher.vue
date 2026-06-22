<script setup>
const props = defineProps({
  // Значение можно синхронизировать с настройками пользователя: light | dark | system.
  modelValue: {
    type: String,
    default: 'light'
  }
})

const emit = defineEmits(['update:modelValue'])

const modes = [
  { value: 'light', label: 'Светлая', icon: 'sun' },
  { value: 'dark', label: 'Тёмная', icon: 'moon' }
]
</script>

<template>
  <div class="grid grid-cols-2 gap-1 rounded-xl bg-gray-200/70 p-1">
    <button
      v-for="mode in modes"
      :key="mode.value"
      type="button"
      :title="mode.label"
      :aria-label="`Color mode: ${mode.label}`"
      :aria-pressed="modelValue === mode.value"
      class="flex h-9 items-center justify-center rounded-[10px] text-[#666666] transition hover:bg-white/60"
      :class="modelValue === mode.value ? 'bg-white text-accent shadow-sm' : ''"
      @click="emit('update:modelValue', mode.value)"
    >
      <svg v-if="mode.icon === 'sun'" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="m4.93 4.93 1.41 1.41"></path>
        <path d="m17.66 17.66 1.41 1.41"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
        <path d="m6.34 17.66-1.41 1.41"></path>
        <path d="m19.07 4.93-1.41 1.41"></path>
      </svg>

      <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z"></path>
      </svg>
    </button>
  </div>
</template>
