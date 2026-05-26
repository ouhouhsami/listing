import { supabase } from '../../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Variables d\'environnement Supabase manquantes sur Vercel' })
  }

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requis' })

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.SITE_URL}/api/auth/callback`,
    },
  })

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true })
}
