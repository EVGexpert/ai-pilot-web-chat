import initSqlJs from 'sql.js'
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'

const dbPath = process.env.DATABASE_PATH || './data/aipilot.db'
const dbDir = path.dirname(dbPath)

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

let sqlDb = null

function save() {
  if (sqlDb) {
    writeFileSync(dbPath, Buffer.from(sqlDb.export()))
  }
}

// Автосохранение
setInterval(save, 5000)

// Wrapper, совместимый с better-sqlite3 API
class Statement {
  constructor(db, sql) {
    this.db = db
    this.sql = sql
  }
  get(...params) {
    try {
      const stmt = this.db.prepare(this.sql)
      if (params.length) stmt.bind(params)
      if (stmt.step()) {
        const cols = stmt.getColumnNames()
        const vals = stmt.get()
        stmt.free()
        const obj = {}
        cols.forEach((c, i) => { obj[c] = vals[i] })
        return obj
      }
      stmt.free()
      return undefined
    } catch (e) {
      console.error('SQL get error:', this.sql, e.message)
      return undefined
    }
  }
  all(...params) {
    try {
      const stmt = this.db.prepare(this.sql)
      if (params.length) stmt.bind(params)
      const results = []
      while (stmt.step()) {
        const cols = stmt.getColumnNames()
        const vals = stmt.get()
        const obj = {}
        cols.forEach((c, i) => { obj[c] = vals[i] })
        results.push(obj)
      }
      stmt.free()
      return results
    } catch (e) {
      console.error('SQL all error:', this.sql, e.message)
      return []
    }
  }
  run(...params) {
    try {
      this.db.run(this.sql, params)
      save()
      return { changes: this.db.getRowsModified() }
    } catch (e) {
      console.error('SQL run error:', this.sql, e.message)
      return { changes: 0 }
    }
  }
}

const db = {
  prepare(sql) {
    return new Statement(sqlDb, sql)
  },
  exec(sql) {
    try { sqlDb.run(sql); save() } catch (e) { console.error('SQL exec error:', e.message) }
  }
}

export async function initDb() {
  const SQL = await initSqlJs()
  if (existsSync(dbPath)) {
    sqlDb = new SQL.Database(readFileSync(dbPath))
  } else {
    sqlDb = new SQL.Database()
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'client',
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT,
      api_token TEXT NOT NULL,
      wp_version TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      site_id TEXT,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  save()
  return db
}

export default db
