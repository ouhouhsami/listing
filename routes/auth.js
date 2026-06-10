import { Router } from 'express'
import { query } from '../lib/db.js'
import { signMagicLink, signSession, verify,
         setSessionCookie, clearSessionCookie } from '../lib/auth.js'
import { sendEmail } from '../lib/email.js'

const router = Router()

// POST /api/auth/magic-link — envoie le lien de connexion
router.post('/magic-link', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase()
  const next  = req.body.next || '/profil'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Email invalide' })
  }

  const token = signMagicLink(email)
  const url   = `${process.env.SITE_URL}/api/auth/callback?token=${token}&next=${encodeURIComponent(next)}`

  try {
    await sendEmail({
      to: email,
      subject: 'Votre lien de connexion — listing',
      html: `
        <p>Bonjour,</p>
        <p><a href="${url}">Cliquez ici pour vous connecter</a></p>
        <p><small>Ce lien est valable 15 minutes. Si vous n'avez pas demandé cette connexion, ignorez cet email.</small></p>
      `,
    })
  } catch (err) {
    return res.status(500).json({ error: `Envoi impossible : ${err.message}` })
  }

  res.json({ success: true })
})

// GET /api/auth/callback?token=...&next=... — valide le lien, pose le cookie
router.get('/callback', async (req, res) => {
  const payload = verify(req.query.token)
  if (payload?.kind !== 'magic') {
    return res.status(400).send('Lien invalide ou expiré. <a href="/connexion">Recommencer</a>')
  }

  const { rows } = await query(
    `insert into users (email) values ($1)
     on conflict (email) do update set email = excluded.email
     returning id`,
    [payload.email])

  setSessionCookie(res, signSession(rows[0].id))

  const next = (req.query.next || '/profil').toString()
  res.redirect(next.startsWith('/') ? next : '/profil')
})

// GET /api/auth/me — utilisateur courant (ou null)
router.get('/me', (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res)
  res.json({ success: true })
})

export default router
