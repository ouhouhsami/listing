import { supabase } from '../../lib/supabase.js'

export default async function handler(req, res) {

  // GET /api/listings — recherche via fonction SQL
  if (req.method === 'GET') {
    const { type, price_max, surface_min, rooms_min, bedrooms_min,
            has_balcony, has_parking, has_elevator, has_garden, zone, limit } = req.query

    const { data, error } = await supabase.rpc('search_listings', {
      p_zone:         zone         ? JSON.parse(zone)          : null,
      p_type:         type         || null,
      p_price_max:    price_max    ? parseInt(price_max)       : null,
      p_surface_min:  surface_min  ? parseFloat(surface_min)   : null,
      p_rooms_min:    rooms_min    ? parseInt(rooms_min)       : null,
      p_bedrooms_min: bedrooms_min ? parseInt(bedrooms_min)    : null,
      p_has_balcony:  has_balcony  === 'true' ? true : null,
      p_has_parking:  has_parking  === 'true' ? true : null,
      p_has_elevator: has_elevator === 'true' ? true : null,
      p_has_garden:   has_garden   === 'true' ? true : null,
      p_limit:        Math.min(parseInt(limit) || 50, 50),
    })

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // POST /api/listings — créer une annonce
  if (req.method === 'POST') {
    const { user } = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Non authentifié' })

    // lat/lng/city/postcode viennent de l'autocomplete client (api-adresse.data.gouv.fr)
    // postcode → postal_code pour correspondre au schéma
    const { lat, lng, city, postcode, ...body } = req.body

    let geo
    if (lat && lng && city && postcode) {
      geo = { lat: parseFloat(lat), lng: parseFloat(lng), city, postal_code: postcode }
    } else {
      geo = await geocode(body.address)
    }
    if (!geo) return res.status(400).json({ error: 'Adresse non trouvée' })

    const type  = body.property_type === 'appartement' ? 'Appartement' : 'Maison'
    const title = `${type} ${body.rooms} pièces · ${body.surface} m² · ${geo.city}`

    const { data, error } = await supabase.from('listings').insert({
      ...body,
      user_id:     user.id,
      title,
      city:        geo.city,
      postal_code: geo.postal_code,
      lat:         geo.lat,
      lng:         geo.lng,
      status:      'actif',
      views:       0,
    }).select().single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  res.status(405).end()
}

// ── Helpers ──────────────────────────────────────────────────────────

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return { user: null }
  const { data } = await supabase.auth.getUser(token)
  return { user: data.user }
}

async function geocode(address) {
  try {
    const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`)
    const d = await r.json()
    if (!d.features?.length) return null
    const f = d.features[0]
    return {
      lat:         f.geometry.coordinates[1],
      lng:         f.geometry.coordinates[0],
      city:        f.properties.city,
      postal_code: f.properties.postcode,
    }
  } catch { return null }
}
