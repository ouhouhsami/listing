import { supabase } from '../lib/supabase.js'

export default async function handler(req, res) {
  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  // GET — liste des recherches sauvegardées
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // POST — sauvegarder une recherche
  if (req.method === 'POST') {
    const body = req.body
    const label = generateLabel(body)

    const { data, error } = await supabase
      .from('saved_searches')
      .insert({ ...body, user_id: user.id, label, alerts_enabled: true })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).end()
}

// DELETE /api/searches/[id]
export async function deleteSearch(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()
  const { id } = req.query
  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// POST /api/searches/[id]/alerts — toggle alertes
export async function toggleAlerts(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.query
  const { enabled } = req.body
  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  const { error } = await supabase
    .from('saved_searches')
    .update({ alerts_enabled: enabled === 'true' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

function generateLabel(s) {
  const parts = []
  if (s.property_type) parts.push(s.property_type === 'appartement' ? 'Appart' : 'Maison')
  if (s.price_max)     parts.push(`max ${Math.round(s.price_max / 1000)}k€`)
  if (s.rooms_min)     parts.push(`${s.rooms_min}p+`)
  if (s.surface_min)   parts.push(`${s.surface_min}m²+`)
  if (s.has_balcony)   parts.push('Balcon')
  if (s.has_parking)   parts.push('Parking')
  if (s.has_elevator)  parts.push('Ascenseur')
  if (s.has_garden)    parts.push('Jardin')
  return parts.join(' · ')
}

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data } = await supabase.auth.getUser(token)
  return { user: data.user }
}
