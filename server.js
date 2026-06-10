import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { attachUser } from './lib/auth.js'
import authRoutes     from './routes/auth.js'
import listingsRoutes from './routes/listings.js'
import searchesRoutes from './routes/searches.js'
import contactRoutes  from './routes/contact.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC    = path.join(__dirname, 'public')

const app = express()
app.set('trust proxy', 1) // derrière Caddy
app.use(express.json())
app.use(attachUser)

// ── API ──────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/listings', listingsRoutes)
app.use('/api/searches', searchesRoutes)
app.use('/api/contact',  contactRoutes)

// ── Pages ────────────────────────────────────────────────────────────
const page = file => (req, res) => res.sendFile(path.join(PUBLIC, file))

app.get('/',             page('index.html'))
app.get('/search',       page('search.html'))
app.get('/connexion',    page('connexion.html'))
app.get('/profil',       page('profil.html'))
app.get('/publier',      page('publier.html'))
app.get('/listings/:id', page('listings/detail.html'))

app.use(express.static(PUBLIC))

// ── Erreurs ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`listing démarré sur http://localhost:${PORT}`))
