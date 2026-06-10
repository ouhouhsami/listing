import crypto from 'node:crypto'
import { query } from './db.js'

const SECRET = process.env.SESSION_SECRET
if (!SECRET) throw new Error('SESSION_SECRET manquant')

const SESSION_DAYS    = 30
const MAGIC_LINK_MIN  = 15

// ── Tokens signés (HMAC-SHA256, sans état) ───────────────────────────

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

export function sign(payload, ttlSeconds) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 }))
  const mac  = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  return `${body}.${mac}`
}

export function verify(token) {
  if (!token || typeof token !== 'string') return null
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export const signMagicLink = email  => sign({ email, kind: 'magic' },   MAGIC_LINK_MIN * 60)
export const signSession   = userId => sign({ uid: userId, kind: 'session' }, SESSION_DAYS * 86400)

// ── Cookies ──────────────────────────────────────────────────────────

const COOKIE = 'session'

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`)
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
}

function parseCookies(req) {
  const out = {}
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

// ── Middleware ───────────────────────────────────────────────────────

// Attache req.user ({ id, email, created_at }) si session valide, sinon null.
export async function attachUser(req, res, next) {
  req.user = null
  const payload = verify(parseCookies(req)[COOKIE])
  if (payload?.kind === 'session') {
    const { rows } = await query(
      'select id, email, created_at from users where id = $1', [payload.uid])
    req.user = rows[0] || null
  }
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' })
  next()
}
