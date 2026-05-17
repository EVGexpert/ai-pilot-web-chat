import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import authRoutes from './routes/auth.js'
import sitesRoutes from './routes/sites.js'
import { config } from './config.js'

const app = Fastify({ logger: true })

// CORS — разрешаем чат
await app.register(cors, {
  origin: ['https://chat.pilotsite.ru', 'https://pilotsite.ru'],
  credentials: true
})

// Rate limit — защита от брутфорса
await app.register(rateLimit, {
  max: 20,
  timeWindow: '1 minute'
})

// Роуты
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(sitesRoutes, { prefix: '/api/sites' })

// Health check
app.get('/api/health', async () => ({ status: 'ok', version: '0.1.0' }))

const start = async () => {
  try {
    const port = config.PORT
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Auth API running on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
