<script setup>
/**
 * ActionProposalCard.vue
 * Карточка предложения действия внутри MessageBubble.
 * Использует CSS-переменные дизайн-системы AI Pilot.
 *
 * Состояния: pending → approved / rejected → completed
 *
 * Props:
 *   action { id, title, description, diff[], status }
 *   diff[] — массив строк с префиксами +/-
 *
 * Emits:
 *   approve(actionId)
 *   reject(actionId)
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

/** Определяем, является ли строка diff добавлением (+) */
function isAddition(line) {
  return line.startsWith('+')
}

/** Определяем, является ли строка diff удалением (-) */
function isDeletion(line) {
  return line.startsWith('-')
}

/** Чистим префикс для отображения */
function cleanDiff(line) {
  return line.replace(/^[+-]\s*/, '')
}
</script>

<template>
  <div
    class="ap-card"
    :class="[`ap-card--${action.status || 'pending'}`]"
    role="region"
    :aria-label="`Предложение: ${action.title}`"
  >
    <!-- Заголовок -->
    <h4 class="ap-card__title">{{ action.title }}</h4>

    <!-- Описание -->
    <p v-if="action.description" class="ap-card__desc">{{ action.description }}</p>

    <!-- Diff-блок -->
    <div v-if="action.diff && action.diff.length" class="ap-card__diff">
      <div class="ap-card__diff-label">Изменения</div>
      <div class="ap-card__diff-body">
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
    </div>

    <!-- Кнопки (только в pending) -->
    <div v-if="action.status === 'pending'" class="ap-card__actions">
      <button
        class="ap-card__btn ap-card__btn--secondary"
        @click="handleReject"
        aria-label="Отменить действие"
      >
        Отмена
      </button>
      <button
        class="ap-card__btn ap-card__btn--primary"
        @click="handleApprove"
        aria-label="Подтвердить действие"
      >
        Подтвердить
      </button>
    </div>

    <!-- Статус-чип (approved / rejected / completed) -->
    <div v-else class="ap-card__status">
      <span v-if="action.status === 'approved'" class="ap-card__chip ap-card__chip--approved">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Подтверждено
      </span>
      <span v-else-if="action.status === 'rejected'" class="ap-card__chip ap-card__chip--rejected">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        Отменено
      </span>
      <span v-else-if="action.status === 'completed'" class="ap-card__chip ap-card__chip--completed">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Выполнено
      </span>
    </div>
  </div>
</template>

<style scoped>
/* ========================================
   Action Proposal Card
   ======================================== */

.ap-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 520px;
  width: 100%;
  padding: 16px;
  border-radius: var(--border-radius-md, 12px);
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e8e8e8);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04));
  margin: 8px 0;
  transition: opacity 0.2s ease, border-color 0.2s ease;
}

/* Состояния: лёгкая визуальная маркировка */
.ap-card--approved {
  border-left: 3px solid var(--color-success, #3bc49b);
}

.ap-card--rejected {
  border-left: 3px solid var(--color-error, #c43b3b);
  opacity: 0.75;
}

.ap-card--completed {
  border-left: 3px solid var(--color-success, #3bc49b);
}

/* Заголовок */
.ap-card__title {
  margin: 0;
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #191919);
  line-height: 1.3;
}

/* Описание */
.ap-card__desc {
  margin: 0;
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary, #454646);
}

/* Diff-блок */
.ap-card__diff {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ap-card__diff-label {
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-quaternary, #858686);
}

.ap-card__diff-body {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 8px 10px;
  border-radius: var(--border-radius-sm, 8px);
  background: var(--bg-tertiary, #f1f1f1);
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}

.ap-card__diff-line {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 1px 0;
  border-radius: 2px;
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

.ap-card__diff-line:not(.ap-card__diff-line--add):not(.ap-card__diff-line--del) .ap-card__diff-sign {
  color: var(--text-quaternary, #858686);
}

.ap-card__diff-text {
  font-family: inherit;
  font-size: inherit;
  color: var(--text-secondary, #454646);
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

/* Кнопки */
.ap-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.ap-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--border-radius-sm, 8px);
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
  white-space: nowrap;
  user-select: none;
}

.ap-card__btn:focus-visible {
  outline: 2px solid var(--color-primary, #7837df);
  outline-offset: 2px;
}

/* Primary (Подтвердить) */
.ap-card__btn--primary {
  flex: 1;
  background: var(--color-primary, #7837df);
  color: var(--text-inverse, #ffffff);
}

.ap-card__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover, #6a2ecc);
}

.ap-card__btn--primary:active:not(:disabled) {
  transform: scale(0.98);
}

/* Secondary (Отмена) */
.ap-card__btn--secondary {
  flex: 1;
  background: transparent;
  color: var(--text-secondary, #454646);
  border: 1px solid var(--border-color, #d8d8d8);
}

.ap-card__btn--secondary:hover:not(:disabled) {
  background: var(--bg-hover, #e9eaeb);
}

.ap-card__btn--secondary:active:not(:disabled) {
  transform: scale(0.98);
}

/* Статус-чип */
.ap-card__status {
  display: flex;
  align-items: center;
  margin-top: 4px;
}

.ap-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-family: var(--font-family, 'Inter', sans-serif);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.ap-card__chip svg {
  flex-shrink: 0;
}

.ap-card__chip--approved {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 12%, transparent);
  color: var(--color-success, #3bc49b);
}

.ap-card__chip--rejected {
  background: color-mix(in srgb, var(--color-error, #c43b3b) 12%, transparent);
  color: var(--color-error, #c43b3b);
}

.ap-card__chip--completed {
  background: color-mix(in srgb, var(--color-success, #3bc49b) 8%, transparent);
  color: var(--color-success, #3bc49b);
}

/* ========================================
   Responsive: мобильные
   ======================================== */
@media (max-width: 767px) {
  .ap-card {
    padding: 14px;
    gap: 10px;
    max-width: 100%;
  }

  .ap-card__title {
    font-size: 14px;
  }

  .ap-card__desc {
    font-size: 13px;
  }

  .ap-card__diff-body {
    font-size: 11px;
    padding: 6px 8px;
  }

  .ap-card__btn {
    padding: 10px 14px;
    font-size: 14px;
    flex: 1;
  }

  .ap-card__actions {
    flex-direction: column;
  }

  .ap-card__btn {
    width: 100%;
  }
}

/* ========================================
   Dark Theme
   ======================================== */
[data-theme="dark"] .ap-card {
  background: var(--bg-card, #222222);
  border-color: var(--border-color, #333330);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

[data-theme="dark"] .ap-card__title {
  color: var(--text-primary, #ededed);
}

[data-theme="dark"] .ap-card__desc {
  color: var(--text-secondary, #bfbfbf);
}

[data-theme="dark"] .ap-card__diff-body {
  background: var(--bg-tertiary, #2b2b2b);
}

[data-theme="dark"] .ap-card__diff-text {
  color: var(--text-secondary, #bfbfbf);
}

[data-theme="dark"] .ap-card__diff-line:not(.ap-card__diff-line--add):not(.ap-card__diff-line--del) .ap-card__diff-text {
  color: var(--text-tertiary, #858686);
}

[data-theme="dark"] .ap-card__diff-line--add .ap-card__diff-text {
  color: #5ddbaf;
}

[data-theme="dark"] .ap-card__diff-line--del .ap-card__diff-text {
  color: #e06060;
}

[data-theme="dark"] .ap-card__btn--primary {
  background: var(--color-primary, #a57de4);
  color: var(--text-inverse, #191919);
}

[data-theme="dark"] .ap-card__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover, #b895e8);
}

[data-theme="dark"] .ap-card__btn--secondary {
  color: var(--text-secondary, #bfbfbf);
  border-color: var(--border-color, #333330);
}

[data-theme="dark"] .ap-card__btn--secondary:hover:not(:disabled) {
  background: var(--bg-hover, #333333);
}

[data-theme="dark"] .ap-card--approved {
  border-left-color: #5ddbaf;
}

[data-theme="dark"] .ap-card--rejected {
  border-left-color: #e06060;
}

[data-theme="dark"] .ap-card--completed {
  border-left-color: #5ddbaf;
}
</style>
