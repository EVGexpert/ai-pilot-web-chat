<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import MessageActions from './MessageActions.vue'
import TypingDots from './TypingDots.vue'
import ActionProposalCard from '../ActionProposalCard.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  assistantAvatar: {
    type: String,
    default: '/img/logo-aipilot-v2.png'
  },
  userAvatar: {
    type: String,
    default: '/img/user-img.png'
  },
  showAssistantActions: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['listen', 'copy', 'like', 'dislike', 'approve-action', 'reject-action'])

const isUser = computed(() => props.message.role === 'user')
const isAssistant = computed(() => props.message.role === 'assistant')
const isLoading = computed(() => props.message.type === 'loading')
const isVoice = computed(() => props.message.type === 'voice')
const isLink = computed(() => props.message.type === 'link')

const paragraphs = computed(() => {
  // message.content — обычный текст ответа. Для markdown можно заменить на sanitized html.
  const value = String(props.message.content || '').trim()
  return value ? value.split(/\n{2,}/) : []
})

const waveformBars = computed(() => props.message.waveform || [12, 22, 14, 30, 18, 26, 16, 34, 20, 28, 12, 24, 16, 32, 18, 26])

const renderedContent = computed(() => {
  if (!props.message?.content) return ''
  if (props.message.role === 'assistant') {
    const html = marked.parse(props.message.content)
    return DOMPurify.sanitize(html)
  }
  return props.message.content
})
</script>

<template>
  <!-- message.time — переменная времени сообщения, например '10:26'. -->
  <div v-if="isUser" class="flex items-start justify-end gap-3 animate-slide-in">
    <div class="max-w-[560px]">
      <template v-if="isVoice">
        <div class="flex items-center gap-3 rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-white shadow-lg shadow-accent/20">
          <button type="button" class="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30" aria-label="Play voice message">
            <svg viewBox="0 0 24 24" class="size-4" fill="currentColor">
              <path d="M8 5v14l11-7-11-7Z"></path>
            </svg>
          </button>

          <div class="flex min-w-36 flex-1 items-center gap-1">
            <span
              v-for="(bar, index) in waveformBars"
              :key="index"
              class="w-0.5 rounded-full bg-white/70"
              :style="{ height: `${bar}px` }"
            ></span>
          </div>

          <span class="text-xs text-white/70">{{ message.duration || '02:12' }}</span>
          <span class="text-xs text-white/70">{{ message.time }}</span>
        </div>
      </template>

      <template v-else-if="isLink">
        <div class="overflow-hidden rounded-2xl rounded-tr-md bg-accent text-white shadow-lg shadow-accent/20">
          <div class="flex items-start justify-between gap-4 bg-black/10 px-4 py-3">
            <div class="min-w-0">
              <!-- message.link.title / description / url — данные карточки ссылки. -->
              <p class="truncate text-sm font-semibold">{{ message.link?.title || 'External Link Title' }}</p>
              <p class="mt-1 line-clamp-2 text-xs text-white/60">{{ message.link?.description || 'External link description' }}</p>
            </div>
            <svg viewBox="0 0 24 24" class="size-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 17 17 7"></path>
              <path d="M7 7h10v10"></path>
            </svg>
          </div>

          <a :href="message.link?.url || '#'" target="_blank" rel="noreferrer" class="block truncate px-4 py-3 text-xs text-white/80 hover:text-white">
            {{ message.link?.url || 'https://www.externallink.com' }}
            <span class="ml-2 text-white/60">{{ message.time }}</span>
          </a>
        </div>
      </template>

      <template v-else-if="isLoading">
        <div class="chat-user-bubble inline-flex items-center gap-2">
          <TypingDots />
        </div>
      </template>

      <template v-else>
        <div class="chat-user-bubble">
          <p v-for="(paragraph, index) in paragraphs" :key="index" :class="index > 0 ? 'mt-4' : ''">
            {{ paragraph }}
          </p>
          <span v-if="message.time" class="ml-2 whitespace-nowrap text-xs text-white/60">{{ message.time }}</span>
        </div>
      </template>
    </div>

    <img :src="message.avatar || userAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover" />
  </div>

  <div v-else class="flex items-start gap-3 animate-fade-in">
    <img :src="message.avatar || assistantAvatar" alt="" class="size-9 shrink-0 rounded-full object-cover" />

    <div class="max-w-[560px]">
      <div v-if="isLoading" class="inline-flex rounded-2xl rounded-tl-md bg-accent px-4 py-3 shadow-lg shadow-accent/20">
        <TypingDots />
      </div>

      <div v-else class="chat-assistant-bubble">
        <div v-html="renderedContent" class="prose prose-sm max-w-none"></div>

        <!-- message.items — массив пунктов, если ответ нужно вывести списком. -->
        <ol v-if="message.items?.length" class="mt-3 list-decimal space-y-1 pl-5">
          <li v-for="(item, index) in message.items" :key="index">
            <span v-if="item.title" class="font-medium">{{ item.title }}:</span>
            {{ item.text }}
          </li>
        </ol>

        <div v-if="message.time" class="mt-2 flex items-center justify-end gap-1 text-xs text-gray-400">
          {{ message.time }}
        </div>
      </div>

      <div v-if="message.actions && message.actions.length" class="mt-2 flex flex-col gap-2">
        <ActionProposalCard
          v-for="action in message.actions"
          :key="action.id"
          :action="action"
          @approve="(id) => $emit('approve-action', id)"
          @reject="(id) => $emit('reject-action', id)"
        />
      </div>

      <MessageActions
        v-if="isAssistant && !isLoading && showAssistantActions"
        :message-id="message.id"
        @listen="emit('listen', $event)"
        @copy="emit('copy', $event)"
        @like="emit('like', $event)"
        @dislike="emit('dislike', $event)"
      />
    </div>
  </div>
</template>
