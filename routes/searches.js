import { Router } from 'express'
import { query } from '../lib/db.js'
import { requireAuth } from '../lib/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/searches — mes recherches sauvegardées
router.get('/', async (req, res) => {
  const { rows } = await query(
    'select * from saved_searches where user_id = $1 order by created_at desc',
    [req.user.id])
  res.json(rows)
})

// POST /api/searches — sauvegarder une recherche
router.post('/', async (req, res) => {
  const b = req.body
  const { rows } = await query(
    `insert into saved_searches
       (user_id, property_type, zone, price_max, surface_min, rooms_min, bedrooms_min,
        has_balcony, has_parking, has_elevator, has_garden, label)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning *`,
    [req.user.id, b.property_type || 'appartement',
     b.zone ? JSON.stringify(b.zone) : null,
     b.price_max ?? null, b.surface_min ?? null, b.rooms_min ?? null, b.bedrooms_min ?? null,
     !!b.has_balcony, !!b.has_parking, !!b.has_elevator, !!b.has_garden,
     generateLabel(b)])
  res.status(201).json(rows[0])
})

// PATCH /api/searches/:id — activer/désactiver les alertes
router.patch('/:id', async (req, res) => {
  const { rowCount } = await query(
    'update saved_searches set alerts_enabled = $3 where id = $1 and user_id = $2',
    [req.params.id, req.user.id, !!req.body.alerts_enabled])
  if (!rowCount) return res.status(404).json({ error: 'Recherche introuvable' })
  res.json({ success: true })
})

// DELETE /api/searches/:id
router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(
    'delete from saved_searches where id = $1 and user_id = $2',
    [req.params.id, req.user.id])
  if (!rowCount) return res.status(404).json({ error: 'Recherche introuvable' })
  res.json({ success: true })
})

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

export default router
