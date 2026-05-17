import axios from 'axios'

const API_BASE = import.meta.env.VITE_ORCHESTRATOR_URL || '/api'

const orchestrator = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
})

orchestrator.interceptors.request.use(config => {
  const token = localStorage.getItem('aipilot_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function getSites() {
  const { data } = await orchestrator.get('/sites')
  return data
}

export async function getSiteStructure(siteId) {
  const { data } = await orchestrator.get(`/sites/${siteId}/structure`)
  return data
}

export default orchestrator
