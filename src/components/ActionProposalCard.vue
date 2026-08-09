<script setup>
/**
 * ActionProposalCard.vue — light theme
 *
 * States: pending → processing → completed | failed
 * - pending:    idle, buttons active
 * - processing: buttons disabled, spinner + action label shown
 * - completed:  green result, post ID shown
 * - failed:     error message, retry possible (resets to pending)
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

function diffLineClass(line) {
  if (isAddition(line)) return 'text-green-600'
  if (isDeletion(line)) return 'text-red-400 line-through'
  return 'text-gray-500'
}

const statusKey = computed(() => props.action.status || 'pending')

const cardClass = computed(() => {
  const map = {
    pending: 'bg-white border border-amber-200 ring-1 ring-amber-100',
    processing: 'bg-white border border-blue-200 ring-1 ring-blue-100',
    approved: 'bg-white border border-green-200 opacity-70',
    rejected: 'bg-white border border-red-200 opacity-70',
    completed: 'bg-white border border-green-200 opacity-70',
    failed: 'bg-white border border-red-200 ring-1 ring-red-100'
  }
  return map[statusKey.value] || map.pending
})

const iconClass = computed(() => {
  const map = {
    pending: 'bg-amber-100 text-amber-600',
    processing: 'bg-blue-100 text-blue-600',
    approved: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-500',
    completed: 'bg-green-100 text-green-600',
    failed: 'bg-red-100 text-red-500'
  }
  return map[statusKey.value] || map.pending
})

const statusTextClass = computed(() => {
  const map = {
    pending: 'text-amber-700',
    processing: 'text-blue-700',
    approved: 'text-green-700',
    rejected: 'text-red-600',
    completed: 'text-green-700',
    failed: 'text-red-600'
  }
  return map[statusKey.value] || map.pending
})

const statusBadgeClass = computed(() => {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-600',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600'
  }
  return map[statusKey.value] || map.pending
})

const statusLabel = computed(() => {
  const map = {
    pending: 'Ожидает подтверждения',
    processing: 'Обработка…',
    approved: 'Выполнено',
    rejected: 'Отклонено',
    completed: 'Выполнено',
    failed: 'Ошибка'
  }
  return map[statusKey.value] || 'Ожидает подтверждения'
})

const isProcessing = computed(() => statusKey.value === 'processing')
const isFailed = computed(() => statusKey.value === 'failed')
</script>

<template>
  <div class="flex items-start gap-3 p-4 rounded-2xl shadow-sm animate-fade-in" :class="cardClass">
    <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" :class="iconClass">
      <!-- warning icon (pending) -->
      <svg v-if="statusKey === 'pending'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <!-- spinner (processing) -->
      <svg v-else-if="statusKey === 'processing'" class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <!-- check (completed/approved) -->
      <svg v-else-if="statusKey === 'approved' || statusKey === 'completed'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <!-- x (rejected/failed) -->
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium" :class="statusTextClass">{{ statusLabel }}</span>
        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full" :class="statusBadgeClass">{{ action.status }}</span>
      </div>

      <p class="text-sm text-gray-700 mb-3">
        <strong class="text-gray-500">Действие:</strong> {{ action.title }}
      </p>

      <p v-if="action.description" class="text-sm text-gray-500 mb-3">{{ action.description }}</p>

      <!-- Diff block -->
      <div v-if="action.diff && action.diff.length" class="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
        <div v-for="(line, i) in action.diff" :key="i" :class="diffLineClass(line)">{{ cleanDiff(line) }}</div>
      </div>

      <!-- Post ID for completed actions -->
      <div v-if="action.status === 'completed' && action.postId" class="mb-3 text-xs text-gray-500">
        <strong>ID записи:</strong> {{ action.postId }}
      </div>

      <!-- Error message for failed -->
      <div v-if="action.status === 'failed' && action.error" class="mb-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {{ action.error }}
      </div>

      <!-- Pending: action buttons -->
      <div v-if="action.status === 'pending' || action.status === 'failed'" class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          @click="handleApprove"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          {{ action.status === 'failed' ? 'Повторить' : 'Подтвердить' }}
        </button>
        <button
          class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          @click="handleReject"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Отклонить
        </button>
      </div>

      <!-- Processing: spinner + action label -->
      <div v-else-if="isProcessing" class="flex gap-2">
        <button
          disabled
          class="flex-1 px-4 py-2 bg-blue-400 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Публикуем…
        </button>
        <button
          disabled
          class="px-4 py-2 bg-gray-300 text-gray-500 text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Отклоняем…
        </button>
      </div>

      <!-- Completed/rejected: status text -->
      <div v-else class="flex items-center gap-2 text-xs text-gray-400">
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
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
