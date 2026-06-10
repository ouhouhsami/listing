import { Router } from 'express'
import { query } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'
import { sendEmail } from '../lib/email.js'

const router = Router()

// POST /api/contact — demande de mise en relation
router.post('/', requireAuth, async (req, res) => {
  const { listing_id, message } = req.body
  if (!listing_id || !message) return res.status(400).json({ error: 'Données manquantes' })

  const { rows } = await query(
    'select id, title, city, price from listings where id = $1', [listing_id])
  const listing = rows[0]
  if (!listing) return res.status(404).json({ error: 'Annonce introuvable' })

  await query(
    `insert into contact_requests (listing_id, buyer_id, buyer_email, message)
     values ($1, $2, $3, $4)`,
    [listing_id, req.user.id, req.user.email, message])

  await sendEmail({
    to:      process.env.CONTACT_EMAIL,
    subject: `Nouvelle demande — ${listing.title}`,
    html: `
      <p><strong>Bien :</strong> ${listing.title} · ${listing.city}</p>
      <p><strong>Prix :</strong> ${listing.price.toLocaleString('fr-FR')} €</p>
      <p><strong>Acheteur :</strong> ${req.user.email}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${escapeHtml(message)}</blockquote>
      <p><a href="${process.env.SITE_URL}/listings/${listing_id}">Voir l'annonce</a></p>
    `,
  }).catch(err => console.error('Email contact non envoyé :', err.message))

  res.json({ success: true })
})

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

export default router
