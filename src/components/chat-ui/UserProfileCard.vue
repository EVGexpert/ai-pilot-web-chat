<script setup>
defineProps({
  user: {
    type: Object,
    default: () => ({
      name: 'James Broeng',
      email: 'test@aipilot.ru',
      avatar: '/img/user-img.png'
    })
  }
})

const emit = defineEmits(['settings'])
</script>

<template>
  <div class="profile-card">
    <div class="flex min-w-0 items-center gap-3">
      <!-- user.avatar — переменная с аватаром текущего пользователя. -->
      <img class="size-10 shrink-0 rounded-full object-cover" :src="user.avatar || '/img/user-img.png'" alt="" />

      <div class="min-w-0 text-sm text-gray-800">
        <!-- user.name / user.email — данные из authStore или профиля пользователя. -->
        <p class="truncate">{{ user.name }}</p>
        <p class="truncate text-gray-500">{{ user.email }}</p>
      </div>
    </div>

    <button
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-accent"
      aria-label="Profile settings"
      @click="emit('settings')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.66.84.12.053.237.109.352.168.325.168.718.133 1.01-.085l1.057-.793a1.125 1.125 0 0 1 1.45.12l1.833 1.833c.389.389.44 1.002.12 1.45l-.793 1.057c-.218.292-.253.685-.085 1.01.06.115.115.232.168.352.154.347.466.597.84.66l1.281.213c.542.09.94.56.94 1.11v2.593c0 .55-.398 1.02-.94 1.11l-1.281.213c-.374.063-.686.313-.84.66a6.997 6.997 0 0 1-.168.352c-.168.325-.133.718.085 1.01l.793 1.057c.32.448.269 1.061-.12 1.45l-1.833 1.833a1.125 1.125 0 0 1-1.45.12l-1.057-.793c-.292-.218-.685-.253-1.01-.085a6.997 6.997 0 0 1-.352.168c-.347.154-.597.466-.66.84l-.213 1.281c-.09.542-.56.94-1.11.94h-2.593c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.66-.84a6.997 6.997 0 0 1-.352-.168c-.325-.168-.718-.133-1.01.085l-1.057.793a1.125 1.125 0 0 1-1.45-.12L3.02 18.468a1.125 1.125 0 0 1-.12-1.45l.793-1.057c.218-.292.253-.685.085-1.01a6.997 6.997 0 0 1-.168-.352c-.154-.347-.466-.597-.84-.66l-1.281-.213A1.125 1.125 0 0 1 .55 12.616v-2.593c0-.55.398-1.02.94-1.11L2.77 8.7c.374-.063.686-.313.84-.66.053-.12.109-.237.168-.352.168-.325.133-.718-.085-1.01L2.9 5.621a1.125 1.125 0 0 1 .12-1.45l1.833-1.833a1.125 1.125 0 0 1 1.45-.12l1.057.793c.292.218.685.253 1.01.085.115-.06.232-.115.352-.168.347-.154.597-.466.66-.84l.213-1.281Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    </button>
  </div>
</template>
