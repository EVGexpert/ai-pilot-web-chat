import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const dbPath = process.env.DATABASE_PATH || './data/aipilot.db'
const dbDir = path.dirname(dbPath)
if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

let sqlDb = null

function save() {
  if (sqlDb) writeFileSync(dbPath, Buffer.from(sqlDb.export()))
}

setInterval(save, 5000)

const db = {
  prepare(sql) {
    const self = this
    return {
      get(...params) {
        try {
          const stmt = sqlDb.prepare(sql)
          if (params.length) stmt.bind(params)
          if (!stmt.step()) { stmt.free(); return undefined }
          const cols = stmt.getColumnNames()
          const vals = stmt.get()
          stmt.free()
          return cols.reduce((o, c, i) => ({ ...o, [c]: vals[i] }), {})
        } catch (e) {
          console.error('DB get error:', e.message)
          return undefined
        }
      },
      all(...params) {
        try {
          const stmt = sqlDb.prepare(sql)
          if (params.length) stmt.bind(params)
          const results = []
          while (stmt.step()) {
            const cols = stmt.getColumnNames()
            const vals = stmt.get()
            results.push(cols.reduce((o, c, i) => ({ ...o, [c]: vals[i] }), {}))
          }
          stmt.free()
          return results
        } catch (e) {
          console.error('DB all error:', e.message)
          return []
        }
      },
      run(...params) {
        try {
          sqlDb.run(sql, params)
          save()
          return { changes: sqlDb.getRowsModified() }
        } catch (e) {
          console.error('DB run error:', e.message)
          return { changes: 0 }
        }
      }
    }
  },
  exec(sql) {
    try { sqlDb.run(sql); save() } catch (e) { console.error('DB exec error:', e.message) }
  }
}

export async function initDb() {
  // Путь к WASM внутри node_modules (рабочая директория в Docker: /app)
  const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  const SQL = await initSqlJs({ locateFile: () => wasmPath })

  if (existsSync(dbPath)) {
    sqlDb = new SQL.Database(readFileSync(dbPath))
  } else {
    sqlDb = new SQL.Database()
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, name TEXT, role TEXT DEFAULT 'client',
      email_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      url TEXT NOT NULL, name TEXT, api_token TEXT NOT NULL,
      wp_version TEXT, verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      code TEXT NOT NULL, expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      site_id TEXT, title TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  save()
  return db
}

export default db
