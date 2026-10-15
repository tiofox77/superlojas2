#!/bin/bash
# Production maintenance API (MAINTENANCE.md). The token is read from ~/.superloja/maintenance-token
# and never printed.
#
#   bash scripts/manutencao.sh status
#   bash scripts/manutencao.sh migracoes
#   bash scripts/manutencao.sh migrar 2026_10_15_120000_create_maintenance_tables.php   # one file (the normal way)
#   bash scripts/manutencao.sh migrar --todas                                           # every pending migration
#   bash scripts/manutencao.sh erros [desde]        # errors since an ISO time (default: last deploy in recovery/deploy-log.txt)
#   bash scripts/manutencao.sh logs "limit=20&level=warning&q=texto"
#   bash scripts/manutencao.sh opcache-reset        # after uploading PHP classes
#   bash scripts/manutencao.sh cache-limpar [app|views|config|all]
#   bash scripts/manutencao.sh procura | auditoria | storage-link
set -euo pipefail
source "$(dirname "$0")/lib.sh"
TOKEN="$(maintenance_token)"
BASE="$SITE_URL/api/maintenance"

get()  { curl -sS -m 80 -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" "$BASE/$1"; echo; }
post() {
  local body="${2:-}"; [ -n "$body" ] || body='{}'
  curl -sS -m 80 -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" -H "Content-Type: application/json" -d "$body" "$BASE/$1"; echo
}

cmd="${1:-status}"; arg="${2:-}"
case "$cmd" in
  status)        get status ;;
  migracoes)     get migrations ;;
  migrar)
    if [ "$arg" = "--todas" ]; then post migrate '{"all":true}'
    elif [ -n "$arg" ]; then post migrate "{\"file\":\"$(basename "$arg")\"}"
    else echo "Indique o ficheiro da migracao (ou --todas)."; exit 1; fi ;;
  erros)
    since="$arg"
    if [ -z "$since" ] && [ -f "$REPO_ROOT/recovery/deploy-log.txt" ]; then
      since="$(grep '^== ' "$REPO_ROOT/recovery/deploy-log.txt" | tail -1 | awk '{print $2}')"
    fi
    get "logs?level=error&limit=50${since:+&since=$since}" ;;
  logs)          get "logs${arg:+?$arg}" ;;
  opcache-reset) post opcache-reset ;;
  cache-limpar)  post cache/clear "{\"scope\":\"${arg:-app}\"}" ;;
  procura)       get "demand${arg:+?$arg}" ;;
  auditoria)     get "audit${arg:+?$arg}" ;;
  storage-link)  post storage-link ;;
  *) echo "Comando desconhecido: $cmd (veja o cabecalho do script)"; exit 1 ;;
esac
