#!/bin/bash
# Call the production maintenance API (see MAINTENANCE.md).
# The token is read from $SUPERLOJA_MAINT_TOKEN or ~/.superloja/maintenance-token — never commit it.
#
#   bash tools/maint.sh status
#   bash tools/maint.sh logs "limit=20&level=error"
#   bash tools/maint.sh migrate              # POST
#   bash tools/maint.sh cache/clear '{"scope":"app"}'
set -euo pipefail
BASE="${SUPERLOJA_URL:-https://superloja.vip}/api/maintenance"
TOKEN="${SUPERLOJA_MAINT_TOKEN:-$(cat "$HOME/.superloja/maintenance-token" 2>/dev/null || true)}"
[ -n "$TOKEN" ] || { echo "Token em falta: crie ~/.superloja/maintenance-token (MAINTENANCE.md)" >&2; exit 1; }

action="${1:-status}"; arg="${2:-}"
case "$action" in
  migrate|cache/clear|storage-link)
    body="$arg"; [ -n "$body" ] || body='{}'
    curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" \
      -H "Content-Type: application/json" -d "$body" "$BASE/$action" ;;
  *)
    curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/json" "$BASE/$action${arg:+?$arg}" ;;
esac
echo
