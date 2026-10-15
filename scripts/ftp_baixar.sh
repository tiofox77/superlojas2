#!/bin/bash
# Download files from production (read-only).
#   bash scripts/ftp_baixar.sh <destino> api/routes/api.php main-seo.php ...
set -uo pipefail
source "$(dirname "$0")/lib.sh"
[ $# -ge 2 ] || { echo "Uso: bash scripts/ftp_baixar.sh <destino> caminho..."; exit 1; }
dest="$1"; shift
load_ftp
for remote in "$@"; do
  if ftp_get "$remote" "$dest/$remote"; then echo "ok $remote → $dest/$remote ($(stat -c %s "$dest/$remote") bytes)"
  else echo "AUSENTE $remote"; fi
done
