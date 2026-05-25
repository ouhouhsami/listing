import { supabase } from '../lib/supabase.js'
import { Resend }   from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { listing_id, message } = req.body
  if (!listing_id || !message) return res.status(400).json({ error: 'Données manquantes' })

  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  // Récupérer le bien
  const { data: listing } = await supabase
    .from('listings')
    .select('id, title, city, price')
    .eq('id', listing_id)
    .single()

  if (!listing) return res.status(404).json({ error: 'Annonce introuvable' })

  // Enregistrer la demande
  await supabase.from('contact_requests').insert({
    listing_id,
    buyer_id:    user.id,
    buyer_email: user.email,
    message,
  })

  // Envoyer l'email à l'équipe
  await resend.emails.send({
    from:    'listing <contact@listing.fr>',
    to:      process.env.CONTACT_EMAIL,
    subject: `Nouvelle demande — ${listing.title}`,
    html: `
      <p><strong>Bien :</strong> ${listing.title} · ${listing.city}</p>
      <p><strong>Prix :</strong> ${listing.price.toLocaleString('fr-FR')} €</p>
      <p><strong>Acheteur :</strong> ${user.email}</p>
      <p><strong>Message :</strong></p>
      <blockquote>${message}</blockquote>
      <p><a href="${process.env.SITE_URL}/listings/${listing_id}">Voir l'annonce</a></p>
    `,
  })

  res.json({ success: true })
}

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data } = await supabase.auth.getUser(token)
  return { user: data.user }
}
