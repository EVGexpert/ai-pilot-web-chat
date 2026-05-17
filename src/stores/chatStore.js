import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const isConnected = ref(false)
  const isLoading = ref(false)
  const streamingContent = ref('')

  let chatClient = null

  async function connect() {
    const auth = useAuthStore()
    if (!auth.token) return

    try {
      const { useOpenClawChat } = await import('openclaw-webchat-vue')
      chatClient = useOpenClawChat({
        gateway: import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru',
        token: auth.token
      })

      isConnected.value = true
    } catch (err) {
      console.error('Chat connection failed:', err)
    }
  }

  async function send(content) {
    if (!chatClient) return
    isLoading.value = true

    try {
      messages.value.push({ role: 'user', content })
      streamingContent.value = ''

      const response = await chatClient.send(content)
      messages.value.push({ role: 'assistant', content: response })
    } finally {
      isLoading.value = false
      streamingContent.value = ''
    }
  }

  function disconnect() {
    chatClient = null
    isConnected.value = false
    messages.value = []
  }

  return { messages, isConnected, isLoading, streamingContent, connect, send, disconnect }
})
