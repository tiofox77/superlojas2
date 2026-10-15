#!/bin/bash
# Delete files on the server (ftp_deploy.sh never deletes). Each file is first saved to
# recovery/deleted/<date>/<path>, and nothing is removed without --confirmar.
#   bash scripts/ftp_delete.sh --confirmar dist/assets/index-OLD.js ...
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$REPO_ROOT"
confirm=0; paths=()
for a in "$@"; do [ "$a" = "--confirmar" ] && confirm=1 || paths+=("$a"); done
[ ${#paths[@]} -gt 0 ] || { echo "Uso: bash scripts/ftp_delete.sh --confirmar caminho..."; exit 1; }
for p in "${paths[@]}"; do
  case "$p" in api/.env|.env|api/routes/*|api/bootstrap/*|.htaccess|dist/index.html|index.php|api/public/index.php)
    echo "RECUSADO: $p e essencial ao site"; exit 2 ;;
  esac
done
load_ftp
backup="recovery/deleted/$(date +%Y%m%d-%H%M%S)"
for p in "${paths[@]}"; do
  if [ $confirm = 0 ]; then echo "apagaria: $p ($(remote_size "$p") bytes) — repita com --confirmar"; continue; fi
  if ! ftp_get "$p" "$backup/$p"; then echo "AUSENTE $p"; continue; fi
  if fcurl -m 30 "$FTP_BASE/" -Q "DELE $p" -o /dev/null; then echo "apagado $p (copia em $backup/$p)"
  else echo "FALHOU $p"; fi
done
