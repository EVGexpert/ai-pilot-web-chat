<script setup>
defineProps({
  theme: { type: String, default: "light" },
  collapsed: { type: Boolean, default: false },
});

const emit = defineEmits(["update:theme"]);

function setTheme(value) {
  emit("update:theme", value);
}
</script>

<template>
  <div
    class="flex items-center justify-center rounded-b-2xl transition-colors duration-300"
    :class="[
      collapsed ? 'px-1 py-1' : 'px-5',
      theme === 'dark' ? '' : 'bg-[#f4f4f6]',
    ]"
  >
    <div
      class="grid rounded-xl p-0.5 transition-all duration-300"
      :class="[
        collapsed
          ? 'w-full grid-cols-1 grid-rows-2 gap-1'
          : 'h-[34px] w-[235px] grid-cols-2',
        theme === 'dark'
          ? 'bg-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'bg-[#eeeeF1] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
      ]"
      role="group"
      aria-label="Color mode"
    >
      <button
        type="button"
        class="flex items-center justify-center rounded-[10px] transition"
        :class="[
          collapsed ? 'h-8' : '',
          theme === 'light'
            ? 'bg-[#fafafa] text-[#666666] shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-black/10'
            : 'text-slate-400 hover:bg-white/10 hover:text-white',
        ]"
        title="Светлая"
        aria-label="Color mode: Светлая"
        :aria-pressed="theme === 'light'"
        @click="setTheme('light')"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <circle cx="12" cy="12" r="3.2"></circle>
          <path d="M12 3.5v2"></path>
          <path d="M12 18.5v2"></path>
          <path d="M4.5 12h2"></path>
          <path d="M17.5 12h2"></path>
          <path d="m6.7 6.7 1.4 1.4"></path>
          <path d="m15.9 15.9 1.4 1.4"></path>
          <path d="m17.3 6.7-1.4 1.4"></path>
          <path d="m8.1 15.9-1.4 1.4"></path>
        </svg>
      </button>

      <button
        type="button"
        class="flex items-center justify-center rounded-[10px] transition"
        :class="[
          collapsed ? 'h-8' : '',
          theme === 'dark'
            ? 'bg-slate-700 text-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] ring-1 ring-white/10'
            : 'text-[#666666] hover:bg-white/60',
        ]"
        title="Тёмная"
        aria-label="Color mode: Тёмная"
        :aria-pressed="theme === 'dark'"
        @click="setTheme('dark')"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path d="M12 3.5a7 7 0 0 0 8.5 8.5A8.5 8.5 0 1 1 12 3.5Z"></path>
        </svg>
      </button>
    </div>
  </div>
</template>
