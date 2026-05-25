import { supabase } from '../../lib/supabase.js'

export default async function handler(req, res) {
  const { id } = req.query

  // GET — détail d'une annonce
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return res.status(404).json({ error: 'Annonce introuvable' })

    // Incrémenter les vues
    await supabase.from('listings').update({ views: (data.views || 0) + 1 }).eq('id', id)

    // Ne pas exposer l'adresse exacte
    const { address, ...public_data } = data
    return res.json(public_data)
  }

  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  // PATCH — modifier une annonce
  if (req.method === 'PATCH') {
    const { data, error } = await supabase
      .from('listings')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // DELETE — supprimer une annonce
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ success: true })
  }

  res.status(405).end()
}

// POST /api/listings/[id]/sold — marquer comme vendu
export async function sold(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { id } = req.query
  const { user } = await getUser(req)
  if (!user) return res.status(401).json({ error: 'Non authentifié' })

  const { error } = await supabase
    .from('listings')
    .update({ status: 'vendu' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data } = await supabase.auth.getUser(token)
  return { user: data.user }
}
