import { nanoid } from 'nanoid'
import { hashPassword, verifyPassword } from '../password.js'
import db from '../db.js'
import { generateToken } from '../middleware/auth.js'
import { sendVerificationEmail } from '../email.js'
import { config } from '../config.js'

export default async function authRoutes(app) {
  // Регистрация
  app.post('/register', async (request, reply) => {
    const { email, password, name } = request.body || {}

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email и пароль обязательны' })
    }

    if (password.length < 6) {
      return reply.status(400).send({ error: 'Пароль минимум 6 символов' })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      return reply.status(409).send({ error: 'Email уже зарегистрирован' })
    }

    const id = nanoid()
    const passwordHash = await hashPassword(password)

    db.prepare(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)'
    ).run(id, email, passwordHash, name || null)

    // Код подтверждения email
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    db.prepare(
      'INSERT INTO email_verifications (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)'
    ).run(nanoid(), id, code, expiresAt)

    // Отправляем письмо
    try {
      await sendVerificationEmail(email, code)
    } catch (err) {
      console.error('Email send failed:', err.message)
      // Не фатально — пользователь может запросить повторно
    }

    const token = generateToken({ id, email })

    return reply.status(201).send({
      token,
      user: { id, email, name: name || null, emailVerified: false },
      message: 'Подтвердите email. Код отправлен на почту.'
    })
  })

  // Вход
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body || {}

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email и пароль обязательны' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    if (!user) {
      return reply.status(401).send({ error: 'Неверный email или пароль' })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Неверный email или пароль' })
    }

    const token = generateToken(user)

    // Загружаем сайты пользователя
    const sites = db.prepare('SELECT id, url, name, wp_version FROM sites WHERE user_id = ?').all(user.id)

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'client',
        emailVerified: !!user.email_verified
      },
      sites
    })
  })

  // Подтверждение email
  app.post('/verify-email', async (request, reply) => {
    const { email, code } = request.body || {}

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (!user) {
      return reply.status(404).send({ error: 'Пользователь не найден' })
    }

    const verification = db.prepare(
      'SELECT * FROM email_verifications WHERE user_id = ? AND code = ? AND expires_at > datetime(\'now\')'
    ).get(user.id, code)

    if (!verification) {
      return reply.status(400).send({ error: 'Неверный или просроченный код' })
    }

    db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(user.id)
    db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(user.id)

    return reply.send({ message: 'Email подтверждён' })
  })

  // Повторная отправка кода
  app.post('/resend-verification', async (request, reply) => {
    const { email } = request.body || {}

    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)
    if (!user) {
      return reply.status(404).send({ error: 'Пользователь не найден' })
    }

    if (user.email_verified) {
      return reply.send({ message: 'Email уже подтверждён' })
    }

    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    db.prepare('DELETE FROM email_verifications WHERE user_id = ?').run(user.id)
    db.prepare(
      'INSERT INTO email_verifications (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)'
    ).run(nanoid(), user.id, code, expiresAt)

    try {
      await sendVerificationEmail(email, code)
      return reply.send({ message: 'Код отправлен повторно' })
    } catch (err) {
      return reply.status(500).send({ error: 'Ошибка отправки: ' + err.message })
    }
  })

  // Информация о пользователе
  app.get('/me', {
    preHandler: async (request, reply) => {
      const auth = request.headers.authorization
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing token' })
      }
      const { verifyToken } = await import('../middleware/auth.js')
      const payload = verifyToken(auth.slice(7))
      if (!payload) return reply.status(401).send({ error: 'Invalid token' })
      request.user = payload
    }
  }, async (request, reply) => {
    const user = db.prepare('SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?').get(request.user.sub)
    if (!user) return reply.status(404).send({ error: 'User not found' })

    const sites = db.prepare('SELECT id, url, name, wp_version, created_at FROM sites WHERE user_id = ?').all(user.id)

    return reply.send({ user, sites })
  })
}
