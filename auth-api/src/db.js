import initSqlJs from 'sql.js'
import { readFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'aipilot.db')
const JSON_PATH = DB_PATH.replace(/\.db$/, '.json')

// Создаём папку если нет
const dir = path.dirname(DB_PATH)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

// ============================================================
// INIT SQLite
// ============================================================
let db
const SQL = await initSqlJs()

function openDb() {
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  return db
}

openDb()

// ============================================================
// SCHEMA
// ============================================================
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'client',
    email_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    name TEXT,
    api_token TEXT,
    wp_version TEXT,
    verified INTEGER DEFAULT 0,
    cached_structure TEXT,
    cached_soul TEXT,
    cached_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    site_id TEXT,
    title TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (site_id) REFERENCES sites(id)
  )
`)
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    metadata TEXT,
    source TEXT DEFAULT 'gateway',
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  )
`)
db.run('CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id)')
db.run('CREATE INDEX IF NOT EXISTS idx_sites_url ON sites(url)')
db.run('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)')
db.run('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id)')

// ============================================================
// AUTO-SAVE to disk
// ============================================================
function save() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(DB_PATH, buffer)
  } catch (e) {
    console.error('[DB] Save error:', e.message)
  }
}

// Сохраняем через 1s после последнего изменения (debounce)
let saveTimer = null
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    save()
    saveTimer = null
  }, 1000)
}

import { writeFileSync } from 'fs'

// ============================================================
// MIGRATION из JSON в SQLite
// ============================================================
function migrateFromJson() {
  if (!existsSync(JSON_PATH)) return false

  // Проверяем, есть ли уже данные
  const count = db.exec('SELECT COUNT(*) as c FROM users')
  if (count.length > 0 && count[0].values[0][0] > 0) return false

  console.log('[DB] Migrating from JSON to SQLite...')

  let jsonData
  try {
    jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))
  } catch (e) {
    console.warn('[DB] Failed to parse JSON file, skipping migration:', e.message)
    return false
  }

  try {
    for (const u of (jsonData.users || [])) {
      db.run('INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.email, u.password_hash, u.name || null, u.role || 'client', u.email_verified || 0, u.created_at, u.updated_at])
    }
    for (const s of (jsonData.sites || [])) {
      const cachedStruct = typeof s.cached_structure === 'object' ? JSON.stringify(s.cached_structure) : (s.cached_structure || null)
      const cachedSoul = typeof s.cached_soul === 'object' ? JSON.stringify(s.cached_soul) : (s.cached_soul || null)
      db.run('INSERT INTO sites (id, user_id, url, name, api_token, wp_version, verified, cached_structure, cached_soul, cached_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.user_id, s.url, s.name || null, s.api_token || null, s.wp_version || null, s.verified || 0, cachedStruct, cachedSoul, s.cached_at || null, s.created_at, s.updated_at])
    }
    for (const v of (jsonData.emailVerifications || [])) {
      db.run('INSERT INTO email_verifications (id, user_id, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
        [v.id, v.user_id, v.code, v.expires_at, v.created_at])
    }
    for (const s of (jsonData.chatSessions || [])) {
      db.run('INSERT INTO chat_sessions (id, user_id, site_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [s.id, s.user_id, s.site_id || null, s.title || null, s.created_at, s.updated_at])
    }
    save()
    renameSync(JSON_PATH, JSON_PATH + '.migrated')
    console.log('[DB] Migration complete. JSON renamed to', JSON_PATH + '.migrated')
  } catch (e) {
    console.error('[DB] Migration failed:', e.message)
  }
  return true
}

migrateFromJson()

// ============================================================
// HELPERS — sql.js wrapper
// ============================================================

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// Вспомогательные функции для работы с sql.js
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  let row = null
  if (stmt.step()) row = stmt.getAsObject()
  stmt.free()
  return row || null
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

function run(sql, params = []) {
  db.run(sql, params)
  scheduleSave()
}

// --- Users ---
export function findUserByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = ?', [email])
}
export function findUserById(id) {
  return queryOne('SELECT * FROM users WHERE id = ?', [id])
}
export function createUser({ email, passwordHash, name, role = 'client' }) {
  const id = uid()
  const t = now()
  run('INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [id, email, passwordHash, name || null, role, t, t])
  return findUserById(id)
}
export function updateUser(id, fields) {
  const sets = []
  const params = []
  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name) }
  if (fields.email_verified !== undefined) { sets.push('email_verified = ?'); params.push(fields.email_verified) }
  if (sets.length === 0) return findUserById(id)
  params.push(now(), id)
  run(`UPDATE users SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`, params)
  return findUserById(id)
}

// --- Sites ---
export function findSitesByUser(userId) {
  return queryAll('SELECT * FROM sites WHERE user_id = ?', [userId])
}
export function findSiteByUserAndUrl(userId, url) {
  return queryOne('SELECT * FROM sites WHERE user_id = ? AND url = ?', [userId, url])
}
export function findSiteById(id) {
  return queryOne('SELECT * FROM sites WHERE id = ?', [id])
}
export function createSite({ userId, url, name, apiToken, wpVersion, verified = 0 }) {
  const id = uid()
  const t = now()
  run('INSERT INTO sites (id, user_id, url, name, api_token, wp_version, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, url, name || null, apiToken || null, wpVersion || null, verified, t, t])
  return findSiteById(id)
}
export function updateSiteCache(id, fields) {
  const struct = fields.cached_structure ? (typeof fields.cached_structure === 'string' ? fields.cached_structure : JSON.stringify(fields.cached_structure)) : null
  const soul = fields.cached_soul ? (typeof fields.cached_soul === 'string' ? fields.cached_soul : JSON.stringify(fields.cached_soul)) : null
  run('UPDATE sites SET cached_structure = COALESCE(?, cached_structure), cached_soul = COALESCE(?, cached_soul), cached_at = COALESCE(?, cached_at), updated_at = ? WHERE id = ?',
    [struct, soul, fields.cached_at || null, now(), id])
  return findSiteById(id)
}
export function updateSiteToken(id, token) {
  run('UPDATE sites SET api_token = ?, verified = 1, updated_at = ? WHERE id = ?', [token, now(), id])
  return findSiteById(id)
}
export function deleteSite(id) {
  run('DELETE FROM sites WHERE id = ?', [id])
  return true
}
export function allSites() {
  return queryAll('SELECT * FROM sites ORDER BY created_at DESC')
}

// --- Email verifications ---
export function createVerification(userId, code) {
  const id = uid()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  run('INSERT INTO email_verifications (id, user_id, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, userId, code, expiresAt, now()])
  return { id, user_id: userId, code, expires_at: expiresAt, created_at: now() }
}
export function findVerification(userId, code) {
  return queryOne('SELECT * FROM email_verifications WHERE user_id = ? AND code = ? AND expires_at > ?', [userId, code, now()])
}
export function deleteVerificationsByUser(userId) {
  run('DELETE FROM email_verifications WHERE user_id = ?', [userId])
}

// --- Chat sessions ---
export function createChatSession({ userId, siteId, title }) {
  const id = uid()
  const t = now()
  run('INSERT INTO chat_sessions (id, user_id, site_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, siteId || null, title || null, t, t])
  return queryOne('SELECT * FROM chat_sessions WHERE id = ?', [id])
}
export function findSessionsByUserAndSite(userId, siteId) {
  return queryAll('SELECT * FROM chat_sessions WHERE user_id = ? AND site_id = ? ORDER BY created_at DESC', [userId, siteId])
}
export function findOrCreateSession(userId, siteId) {
  const sessions = queryAll('SELECT * FROM chat_sessions WHERE user_id = ? AND site_id = ? ORDER BY created_at DESC', [userId, siteId])
  if (sessions.length > 0) return sessions[0]
  return createChatSession({ userId, siteId, title: 'Чат' })
}

// --- Messages ---
export function createMessage({ sessionId, role, content, metadata, source = 'gateway' }) {
  const id = uid()
  const meta = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null
  const t = now()
  run('INSERT INTO messages (id, session_id, role, content, metadata, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, sessionId, role, content, meta, source, t])
  return { id, session_id: sessionId, role, content, created_at: t }
}
export function getMessagesBySession(sessionId) {
  return queryAll('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC', [sessionId])
}

// ============================================================
// PERIODIC SAVE & SHUTDOWN
// ============================================================
// Дополнительный автосейв каждые 10 секунд
setInterval(() => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  save()
}, 10000)

export function close() {
  if (saveTimer) clearTimeout(saveTimer)
  save()
  db.close()
}

process.on('SIGINT', () => { close(); process.exit(0) })
process.on('SIGTERM', () => { close(); process.exit(0) })
