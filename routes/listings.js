import { Router } from 'express'
import { query } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

const router = Router()

// GET /api/listings — recherche (tous filtres optionnels, zone en GeoJSON)
router.get('/', async (req, res) => {
  const q = req.query
  const where  = [`status = 'actif'`]
  const params = []
  const add = (clause, value) => { params.push(value); where.push(clause.replace('?', `$${params.length}`)) }

  if (q.type)         add('property_type = ?', q.type)
  if (q.price_max)    add('price <= ?',        parseInt(q.price_max))
  if (q.surface_min)  add('surface >= ?',      parseFloat(q.surface_min))
  if (q.rooms_min)    add('rooms >= ?',        parseInt(q.rooms_min))
  if (q.bedrooms_min) add('bedrooms >= ?',     parseInt(q.bedrooms_min))
  if (q.has_balcony  === 'true') where.push('has_balcony = true')
  if (q.has_parking  === 'true') where.push(`parking != 'aucun'`)
  if (q.has_elevator === 'true') where.push('has_elevator = true')
  if (q.has_garden   === 'true') where.push('has_garden = true')
  if (q.zone) {
    try {
      JSON.parse(q.zone) // validation
      add('ST_Within(geom, ST_SetSRID(ST_GeomFromGeoJSON(?), 4326))', q.zone)
    } catch { return res.status(400).json({ error: 'Zone invalide' }) }
  }

  const limit = Math.min(parseInt(q.limit) || 50, 50)
  const { rows } = await query(
    `select id, title, property_type, price, surface, rooms, bedrooms, dpe, city, created_at
     from listings
     where ${where.join(' and ')}
     order by created_at desc
     limit ${limit}`,
    params)

  res.json(rows)
})

// GET /api/listings/me — mes annonces (tous statuts)
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `select id, title, price, status, views, created_at
     from listings where user_id = $1 order by created_at desc`,
    [req.user.id])
  res.json(rows)
})

// GET /api/listings/:id — détail public (sans l'adresse exacte)
router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `update listings set views = views + 1 where id = $1
     returning id, created_at, status, property_type, title, city, postal_code,
               lat, lng, price, surface, land_surface, rooms, bedrooms, bathrooms,
               floor, total_floors, dpe, ges, heating_type, heating_mode,
               year_built, condition, has_balcony, has_cave, parking,
               has_elevator, has_garden, photos, description, views`,
    [req.params.id]).catch(() => ({ rows: [] }))

  if (!rows.length) return res.status(404).json({ error: 'Annonce introuvable' })
  res.json(rows[0])
})

// POST /api/listings — créer une annonce
router.post('/', requireAuth, async (req, res) => {
  const b = sanitize(req.body)

  // Coordonnées : autocomplete client, sinon géocodage serveur en fallback
  let geo
  if (b.lat && b.lng && b.city && b.postcode) {
    geo = { lat: parseFloat(b.lat), lng: parseFloat(b.lng), city: b.city, postal_code: b.postcode }
  } else {
    geo = await geocode(b.address)
  }
  if (!geo) return res.status(400).json({ error: 'Adresse non trouvée' })

  const typeLabel = b.property_type === 'appartement' ? 'Appartement' : 'Maison'
  const title = `${typeLabel} ${b.rooms} pièces · ${b.surface} m² · ${geo.city}`

  const { rows } = await query(
    `insert into listings
       (user_id, title, address, city, postal_code, lat, lng,
        property_type, price, surface, land_surface, rooms, bedrooms, bathrooms,
        floor, total_floors, dpe, ges, heating_type, heating_mode,
        year_built, condition, has_balcony, has_cave, parking, has_elevator, has_garden,
        description)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
             $21,$22,$23,$24,$25,$26,$27,$28)
     returning id`,
    [req.user.id, title, b.address, geo.city, geo.postal_code, geo.lat, geo.lng,
     b.property_type, b.price, b.surface, b.land_surface, b.rooms, b.bedrooms, b.bathrooms,
     b.floor, b.total_floors, b.dpe, b.ges, b.heating_type, b.heating_mode || null,
     b.year_built, b.condition, b.has_balcony, b.has_cave, b.parking || 'aucun',
     b.has_elevator, b.has_garden, b.description])

  res.status(201).json(rows[0])
})

// PATCH /api/listings/:id — modifier (statut, etc.)
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['status']
  const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return res.status(400).json({ error: 'Rien à modifier' })

  const sets   = updates.map(([k], i) => `${k} = $${i + 3}`).join(', ')
  const values = updates.map(([, v]) => v)

  const { rowCount } = await query(
    `update listings set ${sets}, updated_at = now()
     where id = $1 and user_id = $2`,
    [req.params.id, req.user.id, ...values])

  if (!rowCount) return res.status(404).json({ error: 'Annonce introuvable' })
  res.json({ success: true })
})

// DELETE /api/listings/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { rowCount } = await query(
    'delete from listings where id = $1 and user_id = $2',
    [req.params.id, req.user.id])
  if (!rowCount) return res.status(404).json({ error: 'Annonce introuvable' })
  res.json({ success: true })
})

// ── Helpers ──────────────────────────────────────────────────────────

function sanitize(body) {
  const int   = ['price', 'rooms', 'bedrooms', 'bathrooms', 'floor', 'total_floors', 'year_built']
  const float = ['surface', 'land_surface']
  const bool  = ['has_balcony', 'has_cave', 'has_elevator', 'has_garden']
  const out   = { ...body }
  for (const k of int)   out[k] = out[k] !== '' && out[k] != null ? parseInt(out[k])   : null
  for (const k of float) out[k] = out[k] !== '' && out[k] != null ? parseFloat(out[k]) : null
  for (const k of bool)  out[k] = out[k] === 'true' || out[k] === true
  return out
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

export default router
