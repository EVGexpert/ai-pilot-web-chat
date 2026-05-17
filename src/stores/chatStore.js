import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const isConnected = ref(false)
  const isLoading = ref(false)
  const streamingContent = ref('')
  const error = ref(null)

  // Эти методы будут вызываться из компонента ChatWindow
  function bindToComposable(composable) {
    messages.value = composable.messages.value
    isConnected.value = composable.isConnected.value
    isLoading.value = composable.isLoading.value
    streamingContent.value = composable.streamingContent.value
    error.value = composable.error ? composable.error.value : null
  }

  function updateFromComposable(composable) {
    messages.value = composable.messages
    isConnected.value = composable.isConnected
    isLoading.value = composable.isLoading
    streamingContent.value = composable.streamingContent
    error.value = composable.error || null
  }

  return { messages, isConnected, isLoading, streamingContent, error, bindToComposable, updateFromComposable }
})
