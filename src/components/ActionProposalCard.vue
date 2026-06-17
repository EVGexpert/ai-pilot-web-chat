<script setup>
/**
 * ActionProposalCard.vue — light theme from chat-layout.html
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
  return 'text-slate-400'
}

const statusKey = computed(() => props.action.status || 'pending')

const cardClass = computed(() => {
  const map = {
    pending: 'bg-slate-950 border border-amber-500/30 ring-1 ring-amber-500/5',
    approved: 'bg-slate-950 border border-green-500/20 opacity-70',
    rejected: 'bg-slate-950 border border-red-500/20 opacity-70',
    completed: 'bg-slate-950 border border-green-500/20 opacity-70'
  }
  return map[statusKey.value] || map.pending
})

const iconClass = computed(() => {
  const map = {
    pending: 'bg-amber-500/20 text-amber-600',
    approved: 'bg-green-500/15 text-green-600',
    rejected: 'bg-red-500/10 text-red-500',
    completed: 'bg-green-500/15 text-green-600'
  }
  return map[statusKey.value] || map.pending
})

const statusTextClass = computed(() => {
  const map = {
    pending: 'text-amber-600',
    approved: 'text-green-600',
    rejected: 'text-red-500',
    completed: 'text-green-600'
  }
  return map[statusKey.value] || map.pending
})

const statusBadgeClass = computed(() => {
  const map = {
    pending: 'bg-amber-500/20 text-amber-600',
    approved: 'bg-green-500/15 text-green-600',
    rejected: 'bg-red-500/10 text-red-500',
    completed: 'bg-green-500/15 text-green-600'
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
  <div class="flex items-start gap-3 p-4 rounded-2xl shadow-md animate-fade-in" :class="cardClass">
    <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" :class="iconClass">
      <svg v-if="statusKey === 'pending'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <svg v-else-if="statusKey === 'approved' || statusKey === 'completed'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <svg v-else-if="statusKey === 'rejected'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-sm font-medium" :class="statusTextClass">{{ statusLabel }}</span>
        <span class="px-2 py-0.5 text-[10px] font-medium rounded-full" :class="statusBadgeClass">{{ action.status }}</span>
      </div>

      <p class="text-sm text-slate-300 mb-3">
        <strong class="text-slate-400">Действие:</strong> {{ action.title }}
      </p>

      <p v-if="action.description" class="text-sm text-slate-600 mb-3">{{ action.description }}</p>

      <div v-if="action.diff && action.diff.length" class="bg-slate-800 rounded-xl p-3 mb-3 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
        <div v-for="(line, i) in action.diff" :key="i" :class="diffLineClass(line)">{{ cleanDiff(line) }}</div>
      </div>

      <div v-if="action.status === 'pending'" class="flex gap-2">
        <button
          class="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          @click="handleApprove"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          Подтвердить
        </button>
        <button
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          @click="handleReject"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Отклонить
        </button>
      </div>

      <div v-else class="flex items-center gap-2 text-xs text-slate-600">
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
</style>
