<script setup>
/**
 * ActionProposalCard.vue
 * Карточка предложения действия внутри MessageBubble.
 * Редизайн по мотивам action-card.html из дизайн-системы.
 *
 * Состояния: pending → approved / rejected → completed
 */

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
  return line.startsWith('+')
}

function isDeletion(line) {
  return line.startsWith('-')
}

function cleanDiff(line) {
  return line.replace(/^[+-]\s*/, '')
}
</script>

<template>
  <div
    class="ap-card animate-fade-in"
    :class="[`ap-card--${action.status || 'pending'}`]"
    role="region"
    :aria-label="`Предложение: ${action.title}`"
  >
    <div class="ap-card__inner">
      <!-- Icon -->
      <div class="ap-card__icon" :class="`ap-card__icon--${action.status || 'pending'}`">
        <!-- Pending: warning triangle -->
        <svg v-if="action.status === 'pending' || !action.status" class="ap-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
        <!-- Approved: checkmark -->
        <svg v-else-if="action.status === 'approved' || action.status === 'completed'" class="ap-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <!-- Rejected: X -->
        <svg v-else-if="action.status === 'rejected'" class="ap-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </div>

      <!-- Content -->
      <div class="ap-card__content">
        <!-- Status header -->
        <div class="ap-card__status-row">
          <span v-if="action.status === 'pending' || !action.status" class="ap-card__status-text ap-card__status-text--pending">Ожидает подтверждения</span>
          <span v-else-if="action.status === 'approved'" class="ap-card__status-text ap-card__status-text--approved">Выполнено</span>
          <span v-else-if="action.status === 'completed'" class="ap-card__status-text ap-card__status-text--approved">Выполнено</span>
          <span v-else-if="action.status === 'rejected'" class="ap-card__status-text ap-card__status-text--rejected">Отклонено</span>
          <span class="ap-card__badge" :class="`ap-card__badge--${action.status || 'pending'}`">{{ action.status || 'pending' }}</span>
        </div>

        <!-- Title / description -->
        <p class="ap-card__desc">
          <strong>Действие:</strong> {{ action.title }}
        </p>
        <p v-if="action.description" class="ap-card__detail">{{ action.description }}</p>

        <!-- Diff block -->
        <div v-if="action.diff && action.diff.length" class="ap-card__diff">
          <div
            v-for="(line, i) in action.diff"
            :key="i"
            class="ap-card__diff-line"
            :class="{
              'ap-card__diff-line--add': isAddition(line),
              'ap-card__diff-line--del': isDeletion(line)
            }"
          >
            <span class="ap-card__diff-sign">{{ isAddition(line) ? '+' : isDeletion(line) ? '−' : ' ' }}</span>
            <code class="ap-card__diff-text">{{ cleanDiff(line) }}</code>
          </div>
        </div>

        <!-- Buttons (pending only) -->
        <div v-if="action.status === 'pending'" class="ap-card__actions">
          <button
            class="ap-card__btn ap-card__btn--approve"
            @click="handleApprove"
          >
            <svg class="ap-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Подтвердить
          </button>
          <button
            class="ap-card__btn ap-card__btn--reject"
            @click="handleReject"
          >
            <svg class="ap-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            Отменить
          </button>
        </div>

        <!-- Status footer (non-pending) -->
        <div v-if="action.status && action.status !== 'pending'" class="ap-card__footer">
          <span v-if="action.status === 'approved' || action.status === 'completed'">Подтверждено вами</span>
          <span v-else-if="action.status === 'rejected'">Отклонено вами</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ap-card {
  max-width: 85%;
  width: 100%;
  padding: 0;
  border-radius: var(--border-radius-lg, 20px);
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e8e8e8);
  box-shadow: var(--shadow-lg);
  margin: 8px 0;
  transition: opacity 0.2s ease, border-color 0.2s ease;
  overflow: hidden;
}

.ap-card--pending {
  border-color: color-mix(in srgb, var(--color-warning, #f78801) 40%, transparent);
  box-shadow: var(--shadow-lg), 0 0 0 1px color-mix(in srgb, var(--color-warning, #f78801) 5%, transparent);
}

.ap-card--approved {
  border-color: color-mix(in srgb, var(--color-success, #3bc49b) 25%, transparent);
  opacity: 0.85;
}

.ap-card--completed {
  border-color: color-mix(in srgb, var(--color-success, #3bc49b) 25%, transparent);
  opacity: 0.75;
}

.ap-card--rejected {
  border-color: color-mix(in srgb, var(--color-error, #c43b3b) 25%, transparent);
  opacity: 0.75;
}

.ap-card__inner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

/* Icon */
.ap-card__icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: var(--border-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ap-card__icon--pending {
  background: color-mix(in srgb, var(--color-warning, #f78801) 15%, transparent);
  color: var(--color-warning, #f78801);
}

.ap-card__icon--approved,
.ap-card__icon--completed {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 15%, transparent);
  color: var(--color-success, #3bc49b);
}

.ap-card__icon--rejected {
  background: color-mix(in srgb, var(--color-error, #c43b3b) 15%, transparent);
  color: var(--color-error, #c43b3b);
}

.ap-icon-svg {
  width: 20px;
  height: 20px;
}

/* Content */
.ap-card__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ap-card__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ap-card__status-text {
  font-size: var(--typography-body-size);
  font-weight: 500;
}

.ap-card__status-text--pending {
  color: var(--color-warning, #f78801);
}

.ap-card__status-text--approved {
  color: var(--color-success, #3bc49b);
}

.ap-card__status-text--rejected {
  color: var(--color-error, #c43b3b);
}

.ap-card__badge {
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 500;
  border-radius: 12px;
  line-height: 1.5;
}

.ap-card__badge--pending {
  background: color-mix(in srgb, var(--color-warning, #f78801) 10%, transparent);
  color: var(--color-warning, #f78801);
}

.ap-card__badge--approved {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 10%, transparent);
  color: var(--color-success, #3bc49b);
}

.ap-card__badge--completed {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 8%, transparent);
  color: var(--color-success, #3bc49b);
}

.ap-card__badge--rejected {
  background: color-mix(in srgb, var(--color-error, #c43b3b) 10%, transparent);
  color: var(--color-error, #c43b3b);
}

.ap-card__desc {
  margin: 0;
  font-size: var(--typography-body-size);
  color: var(--text-secondary);
  line-height: 1.5;
}

.ap-card__detail {
  margin: 0;
  font-size: var(--typography-body-small);
  color: var(--text-tertiary);
  line-height: 1.5;
}

/* Diff */
.ap-card__diff {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px 12px;
  border-radius: var(--border-radius-md);
  background: color-mix(in srgb, var(--bg-primary) 60%, transparent);
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.ap-card__diff-line {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 1px 0;
}

.ap-card__diff-line--add {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 10%, transparent);
}

.ap-card__diff-line--del {
  background: color-mix(in srgb, var(--color-error, #c43b3b) 10%, transparent);
}

.ap-card__diff-sign {
  display: inline-block;
  width: 12px;
  flex-shrink: 0;
  text-align: center;
  font-weight: 700;
}

.ap-card__diff-line--add .ap-card__diff-sign {
  color: var(--color-success, #3bc49b);
}

.ap-card__diff-line--del .ap-card__diff-sign {
  color: var(--color-error, #c43b3b);
}

.ap-card__diff-text {
  font-family: inherit;
  font-size: inherit;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}

.ap-card__diff-line--add .ap-card__diff-text {
  color: var(--color-success, #3bc49b);
}

.ap-card__diff-line--del .ap-card__diff-text {
  color: var(--color-error, #c43b3b);
  text-decoration: line-through;
}

/* Actions */
.ap-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.ap-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--border-radius-md);
  font-family: var(--font-family);
  font-size: var(--typography-body-size);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  white-space: nowrap;
  user-select: none;
}

.ap-btn-icon {
  width: 16px;
  height: 16px;
}

.ap-card__btn--approve {
  flex: 1;
  background: var(--color-success, #22c55e);
  color: #ffffff;
}

.ap-card__btn--approve:hover {
  opacity: 0.9;
}

.ap-card__btn--reject {
  flex: 1;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.ap-card__btn--reject:hover {
  background: var(--bg-hover);
}

/* Footer */
.ap-card__footer {
  font-size: var(--typography-body-small);
  color: var(--text-quaternary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Responsive */
@media (max-width: 767px) {
  .ap-card {
    max-width: 100%;
  }

  .ap-card__inner {
    padding: 12px;
    gap: 10px;
  }

  .ap-card__actions {
    flex-direction: column;
  }

  .ap-card__btn {
    width: 100%;
  }
}
</style>
