import { supabase } from '../../lib/supabase.js'

export default async function handler(req, res) {

  // GET /api/listings — liste des annonces (recherche ou dernières)
  if (req.method === 'GET') {
    const { type, price_max, surface_min, rooms_min, bedrooms_min,
            has_balcony, has_parking, has_elevator, has_garden, zone } = req.query

    let query = supabase
      .from('listings')
      .select('id, title, property_type, price, surface, rooms, bedrooms, dpe, city, created_at')
      .eq('status', 'actif')
      .order('created_at', { ascending: false })

    if (type)        query = query.eq('property_type', type)
    if (price_max)   query = query.lte('price', parseInt(price_max))
    if (surface_min) query = query.gte('surface', parseFloat(surface_min))
    if (rooms_min)   query = query.gte('rooms', parseInt(rooms_min))
    if (bedrooms_min) query = query.gte('bedrooms', parseInt(bedrooms_min))
    if (has_balcony === 'true')  query = query.eq('has_balcony', true)
    if (has_elevator === 'true') query = query.eq('has_elevator', true)
    if (has_garden === 'true')   query = query.eq('has_garden', true)

    const { data, error } = await query.limit(50)
    if (error) return res.status(500).json({ error: error.message })

    // Filtrage par zone GeoJSON si présent
    let results = data
    if (zone) {
      try {
        const polygon = JSON.parse(zone)
        results = data.filter(l => isInPolygon(l.lat, l.lng, polygon.coordinates[0]))
      } catch {}
    }

    return res.json(results)
  }

  // POST /api/listings — créer une annonce
  if (req.method === 'POST') {
    const { user } = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Non authentifié' })

    const body = req.body

    // Géocodage via API Adresse gouv.fr
    const geo = await geocode(body.address)
    if (!geo) return res.status(400).json({ error: 'Adresse non trouvée' })

    // Titre auto
    const type = body.property_type === 'appartement' ? 'Appartement' : 'Maison'
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

function isInPolygon(lat, lng, coords) {
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]
    const [xj, yj] = coords[j]
    const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}
