import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '')
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const siteUrl     = process.env.SITE_URL?.trim().replace(/\/$/, '')

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant sur Vercel' })
  }

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requis' })

  const supabase = createClient(supabaseUrl, serviceKey)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/api/auth/callback` },
  })

  if (error) return res.status(500).json({ error: error.message, url: supabaseUrl })

  res.json({ success: true })
}
