import Database from 'better-sqlite3'
import { readFileSync, existsSync, mkdirSync, renameSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'aipilot.db')
const JSON_PATH = DB_PATH.replace(/\.db$/, '.json')

// Создаём папку если нет
const dir = path.dirname(DB_PATH)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

// Открываем SQLite
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')  // быстрее, конкурентнее
db.pragma('foreign_keys = ON')

// ============================================================
// SCHEMA
// ============================================================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'client',
    email_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

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
  );

  CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    site_id TEXT,
    title TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (site_id) REFERENCES sites(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    metadata TEXT,
    source TEXT DEFAULT 'gateway',
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);
  CREATE INDEX IF NOT EXISTS idx_sites_url ON sites(url);
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
  CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
`)

// ============================================================
// MIGRATION из JSON в SQLite
// ============================================================
function migrateFromJson() {
  const jsonFile = JSON_PATH
  if (!existsSync(jsonFile)) return false

  // Проверяем, есть ли уже данные в SQLite
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get()
  if (count.c > 0) return false

  console.log('[DB] Migrating from JSON to SQLite...')

  let jsonData
  try {
    jsonData = JSON.parse(readFileSync(jsonFile, 'utf-8'))
  } catch (e) {
    console.warn('[DB] Failed to parse JSON file, skipping migration:', e.message)
    return false
  }

  const insertUser = db.prepare(
    'INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertSite = db.prepare(
    'INSERT INTO sites (id, user_id, url, name, api_token, wp_version, verified, cached_structure, cached_soul, cached_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const insertVerification = db.prepare(
    'INSERT INTO email_verifications (id, user_id, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  const insertSession = db.prepare(
    'INSERT INTO chat_sessions (id, user_id, site_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  )

  const transaction = db.transaction(() => {
    for (const u of (jsonData.users || [])) {
      insertUser.run(u.id, u.email, u.password_hash, u.name || null, u.role || 'client', u.email_verified || 0, u.created_at, u.updated_at)
    }
    for (const s of (jsonData.sites || [])) {
      const cachedStruct = typeof s.cached_structure === 'object' ? JSON.stringify(s.cached_structure) : (s.cached_structure || null)
      const cachedSoul = typeof s.cached_soul === 'object' ? JSON.stringify(s.cached_soul) : (s.cached_soul || null)
      insertSite.run(s.id, s.user_id, s.url, s.name || null, s.api_token || null, s.wp_version || null, s.verified || 0, cachedStruct, cachedSoul, s.cached_at || null, s.created_at, s.updated_at)
    }
    for (const v of (jsonData.emailVerifications || [])) {
      insertVerification.run(v.id, v.user_id, v.code, v.expires_at, v.created_at)
    }
    for (const s of (jsonData.chatSessions || [])) {
      insertSession.run(s.id, s.user_id, s.site_id || null, s.title || null, s.created_at, s.updated_at)
    }
  })

  try {
    transaction()
    // Переименовываем JSON, чтобы не перемигрировать
    renameSync(jsonFile, jsonFile + '.migrated')
    console.log('[DB] Migration complete. JSON renamed to', jsonFile + '.migrated')
  } catch (e) {
    console.error('[DB] Migration failed:', e.message)
  }
  return true
}

migrateFromJson()

// ============================================================
// HELPERS
// ============================================================

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// --- Users ---
const stmtFindUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
const stmtFindUserById = db.prepare('SELECT * FROM users WHERE id = ?')
const stmtCreateUser = db.prepare(
  'INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
)
const stmtUpdateUser = db.prepare(
  'UPDATE users SET name = COALESCE(?, name), email_verified = COALESCE(?, email_verified), updated_at = ? WHERE id = ?'
)

export function findUserByEmail(email) {
  return stmtFindUserByEmail.get(email) || null
}
export function findUserById(id) {
  return stmtFindUserById.get(id) || null
}
export function createUser({ email, passwordHash, name, role = 'client' }) {
  const id = uid()
  const t = now()
  stmtCreateUser.run(id, email, passwordHash, name || null, role, t, t)
  return findUserById(id)
}
export function updateUser(id, fields) {
  stmtUpdateUser.run(fields.name ?? null, fields.email_verified ?? null, now(), id)
  return findUserById(id)
}

// --- Sites ---
const stmtFindSitesByUser = db.prepare('SELECT * FROM sites WHERE user_id = ?')
const stmtFindSiteByUserAndUrl = db.prepare('SELECT * FROM sites WHERE user_id = ? AND url = ?')
const stmtFindSiteById = db.prepare('SELECT * FROM sites WHERE id = ?')
const stmtCreateSite = db.prepare(
  'INSERT INTO sites (id, user_id, url, name, api_token, wp_version, verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
)
const stmtUpdateSiteCache = db.prepare(
  'UPDATE sites SET cached_structure = COALESCE(?, cached_structure), cached_soul = COALESCE(?, cached_soul), cached_at = COALESCE(?, cached_at), updated_at = ? WHERE id = ?'
)
const stmtUpdateSiteToken = db.prepare(
  'UPDATE sites SET api_token = ?, verified = 1, updated_at = ? WHERE id = ?'
)
const stmtDeleteSite = db.prepare('DELETE FROM sites WHERE id = ?')
const stmtAllSites = db.prepare('SELECT * FROM sites ORDER BY created_at DESC')

export function findSitesByUser(userId) {
  return stmtFindSitesByUser.all(userId)
}
export function findSiteByUserAndUrl(userId, url) {
  return stmtFindSiteByUserAndUrl.get(userId, url) || null
}
export function findSiteById(id) {
  return stmtFindSiteById.get(id) || null
}
export function createSite({ userId, url, name, apiToken, wpVersion, verified = 0 }) {
  const id = uid()
  const t = now()
  stmtCreateSite.run(id, userId, url, name || null, apiToken || null, wpVersion || null, verified, t, t)
  return findSiteById(id)
}
export function updateSiteCache(id, fields) {
  const struct = fields.cached_structure ? (typeof fields.cached_structure === 'string' ? fields.cached_structure : JSON.stringify(fields.cached_structure)) : null
  const soul = fields.cached_soul ? (typeof fields.cached_soul === 'string' ? fields.cached_soul : JSON.stringify(fields.cached_soul)) : null
  stmtUpdateSiteCache.run(struct, soul, fields.cached_at || null, now(), id)
  return findSiteById(id)
}
export function updateSiteToken(id, token) {
  stmtUpdateSiteToken.run(token, now(), id)
  return findSiteById(id)
}
export function deleteSite(id) {
  stmtDeleteSite.run(id)
  return true
}
export function allSites() {
  return stmtAllSites.all()
}

// --- Email verifications ---
const stmtCreateVerification = db.prepare(
  'INSERT INTO email_verifications (id, user_id, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
)
const stmtFindVerification = db.prepare(
  'SELECT * FROM email_verifications WHERE user_id = ? AND code = ? AND expires_at > ?'
)
const stmtDeleteVerificationsByUser = db.prepare('DELETE FROM email_verifications WHERE user_id = ?')

export function createVerification(userId, code) {
  const id = uid()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  stmtCreateVerification.run(id, userId, code, expiresAt, now())
  return { id, user_id: userId, code, expires_at: expiresAt }
}
export function findVerification(userId, code) {
  return stmtFindVerification.get(userId, code, now()) || null
}
export function deleteVerificationsByUser(userId) {
  stmtDeleteVerificationsByUser.run(userId)
}

// --- Chat sessions ---
const stmtCreateChatSession = db.prepare(
  'INSERT INTO chat_sessions (id, user_id, site_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
)
const stmtFindSessionsByUserAndSite = db.prepare(
  'SELECT * FROM chat_sessions WHERE user_id = ? AND site_id = ? ORDER BY created_at DESC'
)
const stmtFindSessionById = db.prepare('SELECT * FROM chat_sessions WHERE id = ?')

export function createChatSession({ userId, siteId, title }) {
  const id = uid()
  const t = now()
  stmtCreateChatSession.run(id, userId, siteId || null, title || null, t, t)
  return stmtFindSessionById.get(id)
}
export function findSessionsByUserAndSite(userId, siteId) {
  return stmtFindSessionsByUserAndSite.all(userId, siteId)
}
export function findOrCreateSession(userId, siteId) {
  // Ищем последнюю сессию для user+site, если нет — создаём
  const sessions = stmtFindSessionsByUserAndSite.all(userId, siteId)
  if (sessions.length > 0) return sessions[0]
  return createChatSession({ userId, siteId, title: 'Чат' })
}

// --- Messages ---
const stmtCreateMessage = db.prepare(
  'INSERT INTO messages (id, session_id, role, content, metadata, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
)
const stmtMessagesBySession = db.prepare(
  'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC'
)

export function createMessage({ sessionId, role, content, metadata, source = 'gateway' }) {
  const id = uid()
  const meta = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null
  const t = now()
  stmtCreateMessage.run(id, sessionId, role, content, meta, source, t)
  return { id, session_id: sessionId, role, content, created_at: t }
}
export function getMessagesBySession(sessionId) {
  return stmtMessagesBySession.all(sessionId)
}

// ============================================================
// CLEANUP
// ============================================================
export function close() {
  db.close()
}

// Graceful shutdown
process.on('SIGINT', () => { close(); process.exit(0) })
process.on('SIGTERM', () => { close(); process.exit(0) })
