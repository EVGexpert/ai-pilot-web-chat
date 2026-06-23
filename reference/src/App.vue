<script setup>
import Sidebar from '../components/Sidebar.vue'
import UserMessage from '../components/UserMessage.vue'
import AssistantMessage from '../components/AssistantMessage.vue'
import Composer from '../components/Composer.vue'
</script>

<template>
  <!-- ===== LAYOUT ===== -->
  <div class="bg-chat-bg h-screen overflow-hidden p-5">
    <div class="flex h-full w-full gap-5">

      <!-- ===== SIDEBAR ===== -->
      <Sidebar />

      <!-- ===== MAIN ===== -->
      <main class="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-chat-bg">
        <!-- Messages area -->
        <div class="scrollbar-thin flex-1 overflow-y-auto px-6 pb-8 pt-2">
          <div class="mx-auto flex w-full max-w-5xl flex-col gap-3">

            <!-- USER MESSAGE (text) -->
            <UserMessage
              :message="{
                id: 1,
                role: 'user',
                type: 'text',
                content: 'Привет, проверка связи',
                time: '01:25'
              }"
              user-avatar="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E"
            />

            <!-- ASSISTANT MESSAGE -->
            <AssistantMessage
              :message="{
                id: 2,
                role: 'assistant',
                content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. 💀',
                time: '02:25'
              }"
              assistant-avatar="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E"
            />

            <!-- USER MESSAGE (link card) -->
            <UserMessage
              :message="{
                id: 3,
                role: 'user',
                type: 'link',
                link: {
                  title: 'External Link Title',
                  description: 'External link description',
                  url: 'https://www.externallink.com'
                },
                time: '01:25'
              }"
              user-avatar="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239ca3af'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E"
            />

          </div>
        </div>

        <!-- COMPOSER -->
        <Composer />
      </main>
    </div>
  </div>
</template>