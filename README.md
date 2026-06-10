# listing

Plateforme immobilière entre particuliers. Auto-hébergée, sans SaaS.

## Stack

- **Node + Express** — un seul serveur : pages statiques + API JSON
- **PostgreSQL + PostGIS** — base auto-hébergée, recherche par zone géographique
- **Auth maison** — magic link par email, tokens HMAC, cookie de session httpOnly
- **Resend** — envoi d'emails (seule dépendance externe, remplaçable par n'importe quel SMTP)
- **Pico CSS** — framework CSS minimaliste sans classes
- **Leaflet + OpenStreetMap** — carte + dessin de zones
- **API Adresse gouv.fr** — autocomplétion et géocodage gratuits

## Structure

```
listing/
├── server.js             ← serveur Express (pages + API)
├── routes/
│   ├── auth.js           ← magic link, callback, session, logout
│   ├── listings.js       ← recherche, CRUD annonces
│   ├── searches.js       ← recherches sauvegardées
│   └── contact.js        ← mise en relation
├── lib/
│   ├── db.js             ← pool Postgres
│   ├── auth.js           ← tokens HMAC, cookies, middlewares
│   └── email.js          ← envoi d'emails (console en dev)
├── db/
│   └── schema.sql        ← schéma Postgres complet
├── public/               ← pages HTML servies telles quelles
│   ├── index.html        → /
│   ├── search.html       → /search
│   ├── connexion.html    → /connexion
│   ├── profil.html       → /profil
│   ├── publier.html      → /publier
│   ├── js/auth.js        → session côté client
│   └── listings/detail.html → /listings/:id
├── DEPLOY.md             ← guide de déploiement VPS (OVH)
└── .env.example
```

## Démarrage local

```bash
# 1. Postgres avec PostGIS, puis :
createdb listing
psql listing < db/schema.sql

# 2. Configuration
cp .env.example .env
# Remplir DATABASE_URL et SESSION_SECRET (openssl rand -hex 32).
# RESEND_API_KEY vide → les emails (dont le magic link) s'affichent dans la console.

# 3. Lancer
npm install
npm run dev
```

## Déploiement

Voir [DEPLOY.md](DEPLOY.md) — VPS OVH à ~3,50 €/mois, Postgres local,
Caddy pour le HTTPS automatique.
