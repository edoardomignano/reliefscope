#!/bin/bash
# ReliefScope-Deploy: baut die App und pusht dist/ auf den gh-pages-Branch.
# GitHub Pages served gh-pages — main bleibt reiner Quellcode.
# Cache-Strategie: vite-plugin-pwa (Workbox) revisioniert jede Datei pro Build;
# zusätzlich stempeln wir version.txt mit Zeitstempel (Nachvollziehbarkeit +
# erzwingt einen neuen SW-Hash selbst bei byte-gleichem Build).
set -euo pipefail
cd "$(dirname "$0")"

STAMP="$(date +%Y-%m-%d_%H%M%S)"

npm run build
echo "$STAMP" > dist/version.txt

# dist/ als Worktree auf gh-pages veröffentlichen
git fetch origin gh-pages 2>/dev/null || true
rm -rf .deploy-worktree
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git worktree add .deploy-worktree origin/gh-pages
else
  git worktree add --detach .deploy-worktree
  (cd .deploy-worktree && git checkout --orphan gh-pages && git rm -rf --quiet . 2>/dev/null || true)
fi

# --checksum: nach INHALT vergleichen, nicht Größe+mtime. Kritisch, weil sw.js bei
# jedem Build gleich groß ist (nur die 8-Zeichen-Asset-Hashes ändern sich) und
# frisch gebaut ~dieselbe mtime hat — rsync würde die neue sw.js sonst überspringen
# und das live sw.js precacht tote Asset-Namen (404 → Auto-Update blockiert).
rsync -a --checksum --delete --exclude '.git' dist/ .deploy-worktree/
(
  cd .deploy-worktree
  git add -A
  git commit -m "Deploy $STAMP" || echo "nichts zu deployen"
  git push origin HEAD:gh-pages
)
git worktree remove --force .deploy-worktree
echo "Deployed ($STAMP). Pages baut in ~1 Minute: https://edoardomignano.github.io/reliefscope/"
