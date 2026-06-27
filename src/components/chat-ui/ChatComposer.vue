<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Спросите AIPilot" },
  disabled: { type: Boolean, default: false },
  sendLabel: { type: String, default: "Send" },
  theme: { type: String, default: "light" }
});

const emit = defineEmits(["update:modelValue", "submit", "attach", "emoji"]);

const textareaRef = ref(null);

function autoResize() {
  const el = textareaRef.value;
  if (el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 144) + "px";
  }
}

function handleInput(e) {
  emit("update:modelValue", e.target.value);
  autoResize();
}

const handleSubmit = () => {
  const value = props.modelValue.trim();
  if (!value || props.disabled) return;
  emit("submit", value);
  emit("update:modelValue", "");
  autoResize();
};

function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

watch(() => props.modelValue, () => {
  autoResize();
});
</script>

<template>
  <div class="shrink-0 px-0 pb-0">
    <form
      class="flex min-h-28 items-start gap-3 rounded-2xl px-4 py-4 shadow-sm transition-colors duration-300"
      :class="
        theme === 'dark'
          ? 'bg-slate-900 ring-1 ring-white/10'
          : 'bg-white ring-1 ring-black/5'
      "
      @submit.prevent="handleSubmit"
    >
      <!-- Attach file -->
      <button
        type="button"
        class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl transition"
        :class="
          theme === 'dark'
            ? 'text-slate-400 hover:bg-slate-800 hover:text-accent'
            : 'text-gray-400 hover:bg-gray-100 hover:text-accent'
        "
        aria-label="Attach file"
        @click="emit('attach')"
      >
        <svg
          viewBox="0 0 24 24"
          class="size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
          ></path>
        </svg>
      </button>

      <textarea
        ref="textareaRef"
        :value="modelValue"
        rows="1"
        :placeholder="disabled ? 'Нет соединения...' : placeholder"
        class="max-h-36 min-h-12 flex-1 resize-none bg-transparent pt-3 text-sm outline-none transition-colors"
        :class="
          theme === 'dark'
            ? 'text-slate-100 placeholder-slate-500'
            : 'text-gray-800 placeholder-gray-500'
        "
        :disabled="disabled"
        @input="handleInput"
        @keydown="handleKeydown"
      ></textarea>

      <div class="flex shrink-0 items-center gap-3 self-end">
        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-full border transition"
          :class="
            theme === 'dark'
              ? 'border-slate-700 text-slate-400 hover:border-accent/50 hover:text-accent'
              : 'border-gray-200 text-gray-500 hover:border-accent/40 hover:text-accent'
          "
          aria-label="Emoji"
          @click="emit('emoji')"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <path d="M9 9h.01"></path>
            <path d="M15 9h.01"></path>
          </svg>
        </button>

        <button
          type="submit"
          class="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/20 transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="disabled || !modelValue.trim()"
        >
          <span>{{ sendLabel }}</span>
          <svg
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m22 2-7 20-4-9-9-4Z"></path>
            <path d="M22 2 11 13"></path>
          </svg>
        </button>
      </div>
    </form>
  </div>
</template>