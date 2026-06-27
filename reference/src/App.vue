<script setup>
import { ref, watch } from "vue";

import Sidebar from "../components/Sidebar.vue";
import UserMessage from "../components/UserMessage.vue";
import AssistantMessage from "../components/AssistantMessage.vue";
import Composer from "../components/Composer.vue";

const theme = ref("light");

const userAvatar = "/img/user-img.png";
const assistantAvatar = "/img/logo-aipilot-v2.png";

watch(
  theme,
  (value) => {
    document.documentElement.classList.toggle("dark", value === "dark");
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="h-screen overflow-hidden p-5 transition-colors duration-300"
    :class="theme === 'dark' ? 'dark bg-slate-950' : 'bg-chat-bg'"
  >
    <div class="flex h-full w-full gap-5">
      <Sidebar v-model:theme="theme" />

      <main class="flex h-full min-w-0 flex-1 flex-col">
        <section
          class="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl transition-colors duration-300"
          :class="theme === 'dark' ? 'bg-slate-950' : 'bg-chat-bg'"
        >
          <div class="scrollbar-thin flex-1 overflow-y-auto px-6 pb-8 pt-2">
            <div class="mx-auto flex w-full max-w-5xl flex-col gap-3">
              <AssistantMessage
                :message="{
                  id: 1,
                  role: 'assistant',
                  content: 'Hello! I’m your personal Assistant Slothpilot.',
                  time: '10:26',
                }"
                :assistant-avatar="assistantAvatar"
              />

              <UserMessage
                :message="{
                  id: 2,
                  role: 'user',
                  type: 'voice',
                  duration: '02:12',
                  time: '11:25',
                }"
                :user-avatar="userAvatar"
              />

              <UserMessage
                :message="{
                  id: 3,
                  role: 'user',
                  type: 'text',
                  content: 'Привет, проверка связи',
                  time: '01:25',
                }"
                :user-avatar="userAvatar"
              />

              <AssistantMessage
                :message="{
                  id: 4,
                  role: 'assistant',
                  content:
                    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 💀',
                  time: '02:25',
                }"
                :assistant-avatar="assistantAvatar"
              />

              <UserMessage
                :message="{
                  id: 5,
                  role: 'user',
                  type: 'link',
                  link: {
                    title: 'External Link Title',
                    description: 'External link description',
                    url: 'https://www.externallink.com',
                  },
                  time: '01:25',
                }"
                :user-avatar="userAvatar"
              />
            </div>
          </div>

          <Composer :theme="theme" />
        </section>
      </main>
    </div>
  </div>
</template>
