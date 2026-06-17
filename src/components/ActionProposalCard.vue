<script setup>
/**
 * ActionProposalCard.vue
 * Карточка предложения действия внутри MessageBubble.
 * Tailwind CSS v4 — горизонтальный layout, amber/green/red цветовые схемы.
 *
 * Состояния: pending → approved / rejected → completed
 *
 * Props:
 *   action { id, title, description, diff[], status }
 *   diff[] — массив строк с префиксами +/- или объектов { text, added, removed }
 *
 * Emits:
 *   approve(actionId)
 *   reject(actionId)
 */

import { computed } from 'vue'

const props = defineProps({
  action: {
    type: Object,
    required: true,
    validator: (a) => a && typeof a.id !== 'undefined'
  }
})

const emit = defineEmits(['approve', 'reject'])

function handleApprove() {
  if (props.action.status !== 'pending') return
  emit('approve', props.action.id)
}

function handleReject() {
  if (props.action.status !== 'pending') return
  emit('reject', props.action.id)
}

function isAddition(line) {
  if (typeof line === 'object') return !!(line.added || line.isAddition)
  return line.startsWith('+')
}

function isDeletion(line) {
  if (typeof line === 'object') return !!(line.removed || line.isDeletion)
  return line.startsWith('-')
}

function cleanDiff(line) {
  if (typeof line === 'object') return line.text || ''
  return line.replace(/^[+-]\s*/, '')
}

/** Класс для строки diff */
function diffLineClass(line) {
  if (isAddition(line)) return 'light:text-green-700 text-green-300'
  if (isDeletion(line)) return 'light:text-red-600 text-red-300 line-through'
  return 'light:text-gray-500 text-slate-400'
}

/** Динамические классы по статусу */
const statusKey = computed(() => props.action.status || 'pending')

const cardClass = computed(() => {
  const map = {
    pending: 'light:bg-gray-50 bg-slate-900 border light:border-amber-400/30 border-amber-500/30 light:ring-amber-200/50 ring-amber-500/5',
    approved: 'light:bg-gray-50 bg-slate-900 border light:border-green-400/30 border-green-500/20 opacity-70 light:ring-green-200/50 ring-green-500/5',
    rejected: 'light:bg-gray-50 bg-slate-900 border light:border-red-400/30 border-red-500/20 opacity-70 light:ring-red-200/50 ring-red-500/5',
    completed: 'light:bg-gray-50 bg-slate-900 border light:border-green-400/30 border-green-500/20 opacity-70 light:ring-green-200/50 ring-green-500/5'
  }
  return map[statusKey.value] || map.pending
})

const iconClass = computed(() => {
  const map = {
    pending: 'light:bg-amber-50 bg-amber-500/15 light:text-amber-600 text-amber-400',
    approved: 'light:bg-green-50 bg-green-500/15 light:text-green-600 text-green-400',
    rejected: 'light:bg-red-50 bg-red-500/15 light:text-red-600 text-red-400',
    completed: 'light:bg-green-50 bg-green-500/15 light:text-green-600 text-green-400'
  }
  return map[statusKey.value] || map.pending
})

const statusTextClass = computed(() => {
  const map = {
    pending: 'light:text-amber-600 text-amber-400',
    approved: 'light:text-green-600 text-green-400',
    rejected: 'light:text-red-600 text-red-400',
    completed: 'light:text-green-600 text-green-400'
  }
  return map[statusKey.value] || map.pending
})

const statusBadgeClass = computed(() => {
  const map = {
    pending: 'light:bg-amber-50 bg-amber-500/10 light:text-amber-600 text-amber-400',
    approved: 'light:bg-green-50 bg-green-500/10 light:text-green-600 text-green-400',
    rejected: 'light:bg-red-50 bg-red-500/10 light:text-red-600 text-red-400',
    completed: 'light:bg-green-50 bg-green-500/10 light:text-green-600 text-green-400'
  }
  return map[statusKey.value] || map.pending
})

const statusLabel = computed(() => {
  const map = {
    pending: 'Ожидает подтверждения',
    approved: 'Выполнено',
    rejected: 'Отклонено',
    completed: 'Выполнено'
  }
  return map[statusKey.value] || 'Ожидает подтверждения'
})
</script>

<template>
  <div
    class="flex items-start gap-3 p-4 rounded-2xl shadow-lg ring-1 animate-fade-in"
    :class="cardClass"
    role="region"
    :aria-label="`Предложение: ${action.title}`"
  >
    <!-- Status icon -->
    <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" :class="iconClass">
      <!-- Pending: warning triangle -->
      <svg v-if="statusKey === 'pending'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <!-- Approved / Completed: check circle -->
      <svg v-else-if="statusKey === 'approved' || statusKey === 'completed'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <!-- Rejected: x circle -->
      <svg v-else-if="statusKey === 'rejected'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Status badge + title -->
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium" :class="statusTextClass">{{ statusLabel }}</span>
        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full" :class="statusBadgeClass">{{ action.status }}</span>
      </div>

      <!-- Action description -->
      <p class="text-sm light:text-gray-800 text-slate-200 mb-3">
        <strong class="light:text-gray-600 text-slate-300">Действие:</strong> {{ action.title }}
      </p>

      <!-- Optional description text -->
      <p v-if="action.description" class="text-sm light:text-gray-500 text-slate-400 mb-3">{{ action.description }}</p>

      <!-- Diff block -->
      <div v-if="action.diff && action.diff.length" class="light:bg-gray-100/80 bg-slate-950/60 rounded-xl p-3 mb-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
        <div
          v-for="(line, i) in action.diff"
          :key="i"
          :class="diffLineClass(line)"
        >{{ cleanDiff(line) }}</div>
      </div>

      <!-- Buttons (pending only) -->
      <div v-if="action.status === 'pending'" class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          @click="handleApprove"
          aria-label="Подтвердить действие"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Подтвердить
        </button>
        <button
          class="px-4 py-2 light:bg-gray-200 bg-slate-800 light:hover:bg-gray-300 hover:bg-slate-700 light:text-gray-700 text-slate-300 text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          @click="handleReject"
          aria-label="Отклонить действие"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Отклонить
        </button>
      </div>

      <!-- Status footer (approved / rejected / completed) -->
      <div v-else-if="action.status !== 'pending'" class="flex items-center gap-2 text-xs light:text-gray-400 text-slate-600">
        <span v-if="action.status === 'approved' || action.status === 'completed'">Подтверждено вами</span>
        <span v-else-if="action.status === 'rejected'">Отклонено вами</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
