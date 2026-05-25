# listing — achetersanscom

Plateforme immobilière entre particuliers. HTML pur + Vercel Functions + Supabase.

## Stack

- **HTML** — pages statiques servies par Vercel
- **Vercel Functions** — API routes en Node.js (`/api/*`)
- **Supabase** — PostgreSQL + PostGIS + Auth magic link
- **Resend** — emails (magic link + alertes + contact)
- **Leaflet + OpenStreetMap** — carte + polygones
- **API Adresse gouv.fr** — géocodage gratuit

## Structure

```
listing/
├── public/               ← pages HTML
│   ├── index.html        → /
│   ├── search.html       → /search
│   ├── connexion.html    → /connexion
│   ├── profil.html       → /profil
│   ├── publier.html      → /publier
│   └── listings/
│       └── detail.html   → /listings/[id]
├── api/                  ← Vercel Functions
│   ├── auth/
│   │   ├── magic-link.js
│   │   ├── callback.js
│   │   └── logout.js
│   ├── listings/
│   │   ├── index.js
│   │   └── [id].js
│   ├── contact.js
│   └── searches.js
├── lib/
│   └── supabase.js
├── supabase/
│   └── schema.sql
├── vercel.json
└── .env.example
```

## Démarrage

### 1. Supabase
1. Créer un projet sur supabase.com
2. SQL Editor → exécuter `supabase/schema.sql`
3. Storage → créer bucket `listing-photos` (public, 5Mo max)
4. Authentication → Email → activer Magic Link
5. Authentication → URL Configuration → ajouter `https://votre-domaine.vercel.app/api/auth/callback`

### 2. Resend
1. Créer un compte sur resend.com
2. Créer une clé API
3. Vérifier votre domaine d'envoi

### 3. Vercel
1. vercel.com → New Project → importer `ouhouhsami/listing`
2. Ajouter les variables d'environnement (voir `.env.example`)
3. Déployer

### Variables d'environnement
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
SITE_URL
CONTACT_EMAIL
```
