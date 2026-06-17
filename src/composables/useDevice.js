/**
 * useDevice.js
 * Composable с утилитами для определения устройства (мобильный/десктоп).
 *
 * @returns {{
 *   isMobile: import('vue').Ref<boolean>,
 *   sidebarOpen: import('vue').Ref<boolean>,
 *   toggleSidebar: () => void,
 *   closeSidebar: () => void,
 * }}
 */
import { ref, onMounted, onUnmounted } from 'vue'

const BREAKPOINT = 768

export function useDevice() {
  const isMobile = ref(window.innerWidth < BREAKPOINT)
  const sidebarOpen = ref(false)

  function onResize() {
    isMobile.value = window.innerWidth < BREAKPOINT
    if (!isMobile.value) sidebarOpen.value = false
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  return { isMobile, sidebarOpen, toggleSidebar, closeSidebar }
}
