#!/bin/bash
# Construit la preview statique pour GitHub Pages dans _site/.
# Les pages HTML de public/ sont utilisées telles quelles (aucune duplication
# dans les sources) : on injecte le mock API et on réécrit les chemins absolus
# pour le sous-chemin du site projet (https://user.github.io/listing/).
set -euo pipefail

BASE="${1:-/listing}"   # sous-chemin GitHub Pages, ex. /listing

rm -rf _site
mkdir -p _site
cp -r public/* _site/

# Fiches annonces : générer une page par id de démo (liens /listings/demo-N)
for id in demo-1 demo-2 demo-3; do
  mkdir -p "_site/listings/$id"
  cp public/listings/detail.html "_site/listings/$id/index.html"
done

# Injecter le mock API avant auth.js dans toutes les pages
find _site -name '*.html' -exec sed -i \
  's|<script src="/js/auth.js"></script>|<script src="/js/mock-api.js"></script>\n  <script src="/js/auth.js"></script>|' {} +

# Réécrire les chemins absolus (attributs HTML, templates JS, navigations)
find _site -name '*.html' -exec sed -i \
  -e "s|href=\"/|href=\"$BASE/|g" \
  -e "s|src=\"/|src=\"$BASE/|g" \
  -e "s|action=\"/|action=\"$BASE/|g" \
  -e "s|location.href = '/|location.href = '$BASE/|g" \
  -e "s|location.href = \`/|location.href = \`$BASE/|g" {} +

# auth.js injecte les liens nav (/profil, /connexion) : réécrire aussi
sed -i "s|href=\"/|href=\"$BASE/|g" _site/js/auth.js

echo "Preview construite dans _site/ (base : $BASE)"
