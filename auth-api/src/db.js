import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const FILE = process.env.DATABASE_PATH || './data/aipilot.json'
const DIR = path.dirname(FILE)
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true })

const Store = {
  users: [],
  sites: [],
  emailVerifications: [],
  chatSessions: [],
}

function load() {
  try {
    if (existsSync(FILE)) Object.assign(Store, JSON.parse(readFileSync(FILE, 'utf-8')))
  } catch {}
}
function save() {
  try { writeFileSync(FILE, JSON.stringify(Store)) } catch {}
}

load()
setInterval(save, 5000)

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

// === User helpers ===
export function findUserByEmail(email) {
  return Store.users.find(u => u.email === email) || null
}
export function findUserById(id) {
  return Store.users.find(u => u.id === id) || null
}
export function createUser({ email, passwordHash, name, role = 'client' }) {
  const user = { id: uid(), email, password_hash: passwordHash, name: name || null, role, email_verified: 0, created_at: now(), updated_at: now() }
  Store.users.push(user)
  save()
  return user
}
export function updateUser(id, fields) {
  const u = Store.users.find(u => u.id === id)
  if (!u) return null
  Object.assign(u, fields, { updated_at: now() })
  save()
  return u
}

// === Site helpers ===
export function findSitesByUser(userId) {
  return Store.sites.filter(s => s.user_id === userId)
}
export function findSiteByUserAndUrl(userId, url) {
  return Store.sites.find(s => s.user_id === userId && s.url === url) || null
}
export function findSiteById(id) {
  return Store.sites.find(s => s.id === id) || null
}
export function createSite({ userId, url, name, apiToken, wpVersion, verified = 0 }) {
  const site = { id: uid(), user_id: userId, url, name: name || url, api_token: apiToken, wp_version: wpVersion || null, verified, created_at: now(), updated_at: now() }
  Store.sites.push(site)
  save()
  return site
}
export function deleteSite(id) {
  const idx = Store.sites.findIndex(s => s.id === id)
  if (idx === -1) return false
  Store.sites.splice(idx, 1)
  save()
  return true
}

export function updateSiteCache(id, fields) {
  const site = Store.sites.find(s => s.id === id)
  if (!site) return false
  Object.assign(site, fields)
  site.updated_at = now()
  save()
  return true
}

// === Verification helpers ===
export function createVerification(userId, code) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)
  const v = { id: uid(), user_id: userId, code, expires_at: expiresAt, created_at: now() }
  Store.emailVerifications.push(v)
  save()
  return v
}
export function findVerification(userId, code) {
  return Store.emailVerifications.find(v => v.user_id === userId && v.code === code && v.expires_at > now()) || null
}
export function deleteVerificationsByUser(userId) {
  Store.emailVerifications = Store.emailVerifications.filter(v => v.user_id !== userId)
  save()
}

// === Chat session helpers ===
export function createChatSession({ userId, siteId, title }) {
  const s = { id: uid(), user_id: userId, site_id: siteId || null, title: title || null, created_at: now(), updated_at: now() }
  Store.chatSessions.push(s)
  save()
  return s
}

export { Store }
