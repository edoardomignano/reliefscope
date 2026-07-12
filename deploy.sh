#!/bin/bash
# Kopiert die App aus ../files, passt Referenzen an und pusht zu GitHub Pages.
set -e
cd "$(dirname "$0")"
cp ../files/relief-recherche.html index.html
cp ../files/manifest.json ../files/icon.svg ../files/sw.js .
# Dateiname-Referenzen auf index.html umbiegen
sed -i '' 's/relief-recherche\.html/index.html/g' manifest.json sw.js
# Cache-Version pro Deploy eindeutig machen (zwingt Clients zum Update)
V=$(date +%s)
sed -i '' "s/reliefscope-shell-v[0-9a-z]*/reliefscope-shell-$V/" sw.js
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')" || echo "nichts zu committen"
git push origin main
echo "Deployed. Pages baut in ~1 Minute."
