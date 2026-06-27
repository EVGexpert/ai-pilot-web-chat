<script setup>
defineProps({
  message: {
    type: Object,
    default: () => ({
      id: 2,
      role: "user",
      type: "text",
      content: "Привет, проверка связи",
      time: "01:25",
    }),
  },
  userAvatar: {
    type: String,
    default: "/img/user-img.png",
  },
});
</script>

<template>
  <div class="flex items-start justify-end gap-3 animate-slide-in">
    <!-- User: external link -->
    <template v-if="message.type === 'link'">
      <div class="w-full max-w-[420px]">
        <div
          class="overflow-hidden rounded-2xl rounded-tr-md bg-accent text-white shadow-lg shadow-accent/20"
        >
          <div
            class="flex items-start justify-between gap-4 bg-black/10 px-4 py-3"
          >
            <div>
              <p class="text-sm font-semibold">
                {{ message.link?.title || "External Link Title" }}
              </p>

              <p class="mt-1 text-xs text-white/60">
                {{ message.link?.description || "External link description" }}
              </p>
            </div>

            <svg
              viewBox="0 0 24 24"
              class="size-5 shrink-0"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
              />
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              />
            </svg>
          </div>

          <div
            class="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span class="truncate">
              {{ message.link?.url || "https://www.externallink.com" }}
            </span>

            <span
              class="flex shrink-0 items-center gap-1 text-xs text-white/60"
            >
              {{ message.time || "01:25" }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- User: voice message -->
    <template v-else-if="message.type === 'voice'">
      <div class="max-w-[420px]">
        <div
          class="flex items-center gap-3 rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-white shadow-lg shadow-accent/20"
        >
          <button
            type="button"
            class="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-accent"
            aria-label="Play voice message"
          >
            <svg viewBox="0 0 24 24" class="size-4 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <div class="flex h-8 flex-1 items-center gap-0.5">
            <span class="h-3 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/80"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-7 w-0.5 rounded-full bg-white"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-8 w-0.5 rounded-full bg-white"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-7 w-0.5 rounded-full bg-white"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/80"></span>
            <span class="h-4 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-8 w-0.5 rounded-full bg-white"></span>
            <span class="h-5 w-0.5 rounded-full bg-white/70"></span>
            <span class="h-3 w-0.5 rounded-full bg-white/60"></span>
            <span class="h-6 w-0.5 rounded-full bg-white/90"></span>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-1 text-xs">
            <span>
              {{ message.voice?.duration || message.duration || "02:12" }}
            </span>

            <span class="inline-flex items-center gap-1 text-white/60">
              {{ message.time || "11:25" }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- User: text message -->
    <template v-else>
      <div class="max-w-[420px]">
        <div
          class="rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-accent/20"
        >
          <p>{{ message.content }}</p>

          <span
            v-if="message.time"
            class="ml-2 whitespace-nowrap text-xs text-white/60"
          >
            {{ message.time }}
          </span>
        </div>
      </div>
    </template>

    <img
      :src="userAvatar"
      alt=""
      class="size-9 shrink-0 rounded-full object-cover"
    />
  </div>
</template>
