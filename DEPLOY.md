# Déploiement sur un VPS OVH (Debian 12)

Tout tourne sur une seule machine : Node + Postgres + Caddy (HTTPS automatique).

## 1. Le VPS

Commander un VPS chez OVH (le Starter à ~3,50 €/mois suffit), choisir **Debian 12**.
Pointer votre domaine vers l'IP du VPS (enregistrement DNS de type A).

Se connecter :
```bash
ssh debian@VOTRE_IP
```

## 2. Postgres + PostGIS

```bash
sudo apt update
sudo apt install -y postgresql postgresql-15-postgis-3

# Créer l'utilisateur et la base
sudo -u postgres psql <<'SQL'
create user listing with password 'CHANGEZ_MOI';
create database listing owner listing;
\c listing
create extension postgis;
create extension pgcrypto;
SQL
```

Postgres n'écoute que sur localhost par défaut : parfait, on n'y touche pas.

## 3. Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
```

## 4. L'application

```bash
sudo mkdir -p /srv/listing && sudo chown $USER /srv/listing
git clone https://github.com/ouhouhsami/listing.git /srv/listing
cd /srv/listing
npm install --omit=dev

# Schéma
psql postgres://listing:CHANGEZ_MOI@localhost:5432/listing < db/schema.sql

# Configuration
cp .env.example .env
nano .env   # remplir DATABASE_URL, SESSION_SECRET (openssl rand -hex 32), SITE_URL, RESEND_API_KEY, CONTACT_EMAIL
```

## 5. Service systemd

```bash
sudo tee /etc/systemd/system/listing.service <<'EOF'
[Unit]
Description=listing
After=network.target postgresql.service

[Service]
WorkingDirectory=/srv/listing
EnvironmentFile=/srv/listing/.env
ExecStart=/usr/bin/node server.js
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now listing
sudo systemctl status listing    # vérifier que c'est vert
```

## 6. Caddy (HTTPS automatique)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

sudo tee /etc/caddy/Caddyfile <<'EOF'
votre-domaine.fr {
    reverse_proxy localhost:3000
}
EOF

sudo systemctl reload caddy
```

Caddy obtient et renouvelle le certificat Let's Encrypt tout seul. C'est fini :
le site est sur `https://votre-domaine.fr`.

## 7. Mises à jour

```bash
cd /srv/listing
git pull
npm install --omit=dev
sudo systemctl restart listing
```

## 8. Sauvegardes

```bash
# Dump quotidien à 4h du matin (crontab -e)
0 4 * * * pg_dump postgres://listing:CHANGEZ_MOI@localhost:5432/listing | gzip > /srv/backups/listing-$(date +\%u).sql.gz
```

Les 7 derniers jours tournent (le `%u` = jour de la semaine écrase l'ancien).
Pensez à copier ces fichiers hors du VPS de temps en temps.

## Dev local

```bash
npm install
# Postgres local + schéma, puis .env (RESEND_API_KEY vide → emails dans la console)
npm run dev
```
