import { createRouter, createWebHistory } from 'vue-router'
import MainContent from './components/MainContent.vue'
import ConnectPopup from './components/ConnectPopup.vue'

const routes = [
  { path: '/', name: 'main', component: MainContent },
  { path: '/connect', name: 'connect', component: ConnectPopup },
  { path: '/auth/connect', redirect: '/connect' },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
