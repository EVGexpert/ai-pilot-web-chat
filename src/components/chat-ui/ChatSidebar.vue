<script setup>
import { ref, computed } from "vue";
import ChatHistoryGroup from "./ChatHistoryGroup.vue";
import UserProfileCard from "./UserProfileCard.vue";
import ThemeSwitcher from "./ThemeSwitcher.vue";

const props = defineProps({
  historyGroups: {
    type: Array,
    default: () => []
  },
  activeChatId: {
    type: [String, Number],
    default: null
  },
  user: {
    type: Object,
    default: () => ({
      name: "James Broeng",
      email: "test@aipilot.ru",
      avatar: ""
    })
  },
  theme: {
    type: String,
    default: "light"
  },
  logoSrc: {
    type: String,
    default: "/img/logo-aipilot-v3.png"
  }
});

const emit = defineEmits(["update:theme", "new-chat", "select-chat", "search", "profile-settings"]);

const isCollapsed = ref(false);
const query = ref("");

const setTheme = (value) => {
  emit("update:theme", value);
};

function handleSelectChat(item) {
  emit("select-chat", item);
}

// Filter history items by search query
const filteredGroups = computed(() => {
  if (!query.value.trim()) return props.historyGroups;
  const q = query.value.toLowerCase();
  return props.historyGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.title.toLowerCase().includes(q))
    }))
    .filter(group => group.items.length > 0);
});
</script>

<template>
  <aside
    class="flex h-full shrink-0 flex-col divide-y overflow-hidden rounded-2xl py-5 transition-all duration-300"
    :class="[
      isCollapsed ? 'w-20 px-3' : 'w-72 px-4',
      theme === 'dark'
        ? 'divide-slate-700 bg-slate-900'
        : 'divide-gray-200 bg-gray-100',
    ]"
  >
    <!-- Header -->
    <div class="side-header shrink-0 space-y-5 pb-5">
      <div
        class="flex gap-4"
        :class="isCollapsed ? 'flex-col items-center' : 'justify-between'"
      >
        <img
          :src="logoSrc"
          class="shrink-0 transition-all duration-300"
          :class="isCollapsed ? 'size-10' : 'size-16'"
          alt="AI Pilot"
        />

        <button
          type="button"
          class="open-close flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:text-accent"
          :class="isCollapsed ? 'rotate-180' : ''"
          :aria-label="isCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
          @click="isCollapsed = !isCollapsed"
        >
          <svg
            class="size-7"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C3.81478 14.0642 3.99127 14.0774 4.1828 14.0873V1.91166Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <template v-if="!isCollapsed">
          <svg
            class="absolute left-3 top-1/2 size-4 -translate-y-1/2"
            :class="theme === 'dark' ? 'text-slate-500' : 'text-gray-400'"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>

          <input
            v-model="query"
            type="text"
            placeholder="Поиск"
            class="w-full rounded-xl border-0 py-2 pl-10 pr-4 text-sm shadow-sm outline-none transition-colors focus:ring-2 focus:ring-accent/50"
            :class="
              theme === 'dark'
                ? 'bg-slate-800 text-slate-100 placeholder-slate-500'
                : 'bg-white text-gray-700 placeholder-gray-400'
            "
          />
        </template>

        <button
          v-else
          type="button"
          class="flex size-11 w-full items-center justify-center rounded-xl shadow-sm transition"
          :class="
            theme === 'dark'
              ? 'bg-slate-900 text-slate-400 hover:bg-accent hover:text-white'
              : 'bg-white text-gray-500 hover:text-accent'
          "
          aria-label="Поиск"
          title="Поиск"
          @click="emit('search')"
        >
          <svg
            class="size-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </button>
      </div>

      <!-- New chat -->
      <button
        type="button"
        title="Новый чат"
        class="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2 text-sm shadow-xl transition-colors"
        :class="[
          isCollapsed ? '!gap-0 !px-0' : '',
          theme === 'dark'
            ? 'bg-accent text-white shadow-accent/20 hover:bg-accent/90'
            : 'bg-white text-gray-600 shadow-accent/10 hover:bg-accent/70 hover:text-white',
        ]"
        @click="emit('new-chat')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="size-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M8 0.599609C3.91309 0.599609 0.599609 3.91309 0.599609 8C0.599609 9.13376 0.855461 10.2098 1.3125 11.1719L1.5918 11.7588L2.76562 11.2012L2.48633 10.6143C2.11034 9.82278 1.90039 8.93675 1.90039 8C1.90039 4.63106 4.63106 1.90039 8 1.90039C11.3689 1.90039 14.0996 4.63106 14.0996 8C14.0996 11.3689 11.3689 14.0996 8 14.0996C7.31041 14.0996 6.80528 14.0514 6.35742 13.9277C5.91623 13.8059 5.49768 13.6021 4.99707 13.2529C4.26492 12.7422 3.21611 12.5616 2.35156 13.1074L2.33789 13.1162L2.32422 13.126L1.58789 13.6436L2.01953 14.9297L3.0459 14.207C3.36351 14.0065 3.83838 14.0294 4.25293 14.3184C4.84547 14.7317 5.39743 15.011 6.01172 15.1807C6.61947 15.3485 7.25549 15.4004 8 15.4004C12.0869 15.4004 15.4004 12.0869 15.4004 8C15.4004 3.91309 12.0869 0.599609 8 0.599609ZM7.34473 4.93945V7.34961H4.93945V8.65039H7.34473V11.0605H8.64551V8.65039H11.0605V7.34961H8.64551V4.93945H7.34473Z"
            fill="currentColor"
          />
        </svg>

        <span v-if="!isCollapsed">Новый чат</span>
      </button>
    </div>

    <!-- Chat history -->
    <div class="relative my-5 flex min-h-0 flex-1 flex-col">
      <div class="chat-history scrollbar-thin flex-1 overflow-y-auto space-y-5 px-1">
        <ChatHistoryGroup
          v-for="group in filteredGroups"
          :key="group.title"
          :title="group.title"
          :items="group.items"
          :activeChatId="activeChatId"
          :collapsed="isCollapsed"
          :theme="theme"
          @select="handleSelectChat"
        />
      </div>

      <div
        class="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
        :class="
          theme === 'dark'
            ? 'bg-linear-to-t from-slate-900 to-transparent'
            : 'bg-linear-to-t from-gray-100 to-transparent'
        "
      ></div>
    </div>

    <!-- Footer -->
    <div class="chat-footer shrink-0 space-y-4">
      <!-- Profile -->
      <UserProfileCard
        :user="user"
        :collapsed="isCollapsed"
        :theme="theme"
        @profile-settings="emit('profile-settings')"
      />

      <!-- Color mode -->
      <ThemeSwitcher
        :theme="theme"
        :collapsed="isCollapsed"
        @update:theme="setTheme"
      />
    </div>
  </aside>
</template>