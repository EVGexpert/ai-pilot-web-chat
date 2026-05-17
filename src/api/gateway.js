import { useAuthStore } from '../stores/authStore'

const GATEWAY_WS = import.meta.env.VITE_GATEWAY_WS || 'wss://pilotsite.ru'

export function getGatewayConfig() {
  const auth = useAuthStore()
  return {
    gateway: GATEWAY_WS,
    token: auth.token
  }
}

export default { getGatewayConfig }
