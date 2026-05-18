import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const KEY_LENGTH = 64
const SALT_LENGTH = 16

export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = scryptSync(password, salt, KEY_LENGTH)
  return salt + ':' + derivedKey.toString('hex')
}

export async function verifyPassword(password, hashed) {
  const [salt, key] = hashed.split(':')
  const derivedKey = scryptSync(password, salt, KEY_LENGTH)
  const keyBuf = Buffer.from(key, 'hex')
  const derivedBuf = derivedKey
  return keyBuf.length === derivedBuf.length && timingSafeEqual(keyBuf, derivedBuf)
}
