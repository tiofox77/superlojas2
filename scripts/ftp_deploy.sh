#!/bin/bash
# Upload files to production by FTPS, safely.
#
#   bash scripts/ftp_deploy.sh api/app/Services/X.php api/routes/api.php
#   bash scripts/ftp_deploy.sh public/sw.js:sw.js           # local:remote when the paths differ
#   bash scripts/ftp_deploy.sh --criticos api/bootstrap/app.php   # only after comparing with production
#
# Each file goes to <remote>.up (resumable, retried), is downloaded back and compared by MD5, and only
# then renamed over the live file — a broken transfer never replaces a working file.
# Order is enforced: other files → api/routes/*.php → dist/index.html (last: it switches the frontend).
# Prints DEPLOY CONFIRMADO and exits 0 when everything matched, exits 2 otherwise.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$REPO_ROOT"

allow_critical=0
items=()
for a in "$@"; do
  case "$a" in
    --criticos) allow_critical=1 ;;
    *) items+=("$a") ;;
  esac
done
[ ${#items[@]} -gt 0 ] || { echo "Uso: bash scripts/ftp_deploy.sh ficheiro [local:remoto] ..."; exit 1; }

for it in "${items[@]}"; do
  case "${it%%:*}" in
    api/bootstrap/app.php|api/app/Providers/AppServiceProvider.php|api/.env|.env)
      if [ "${it%%:*}" = "api/.env" ] || [ "${it%%:*}" = ".env" ]; then echo "RECUSADO: nunca enviar $it"; exit 2; fi
      [ $allow_critical = 1 ] || { echo "RECUSADO: ${it%%:*} deita o site abaixo se falhar. Compare com a producao e use --criticos."; exit 2; } ;;
  esac
done

# Enforce the order: routes after the classes they reference, dist/index.html at the very end.
ordered=(); routes=(); index=()
for it in "${items[@]}"; do
  case "${it%%:*}" in
    api/routes/*) routes+=("$it") ;;
    dist/index.html) index+=("$it") ;;
    *) ordered+=("$it") ;;
  esac
done
ordered+=("${routes[@]}" "${index[@]}")

load_ftp
failures=0
log="$REPO_ROOT/recovery/deploy-log.txt"; mkdir -p "$(dirname "$log")"
echo "== $(date -u +%FT%TZ) deploy: ${ordered[*]}" >> "$log"

for it in "${ordered[@]}"; do
  [ -n "$it" ] || continue
  local_path="${it%%:*}"; remote="${it#*:}"; [ "$it" = "$local_path" ] && remote="$local_path"
  if [ ! -f "$local_path" ]; then echo "FALHOU $remote: ficheiro local nao existe"; failures=$((failures+1)); continue; fi
  size=$(stat -c %s "$local_path"); want=$(md5 "$local_path")

  fcurl -m 30 "$FTP_BASE/" -Q "DELE $remote.up" -o /dev/null 2>/dev/null
  got=""
  for try in $(seq 1 25); do
    rate=""; [ "$try" -gt 3 ] && rate="--limit-rate 8k"
    fcurl -m 120 $rate --ftp-create-dirs -C - -T "$local_path" "$FTP_BASE/$remote.up" 2>/dev/null
    got=$(remote_size "$remote.up")
    [ "$got" = "$size" ] && break
    [ -n "$got" ] && [ "$got" -gt "$size" ] && fcurl -m 30 "$FTP_BASE/" -Q "DELE $remote.up" -o /dev/null 2>/dev/null
  done
  if [ "$got" != "$size" ]; then echo "FALHOU $remote: upload incompleto (${got:-0}/$size)"; failures=$((failures+1)); continue; fi

  tmp=$(mktemp)
  if ! ftp_get "$remote.up" "$tmp" || [ "$(md5 "$tmp")" != "$want" ]; then
    rm -f "$tmp"; echo "FALHOU $remote: MD5 diferente depois do envio (ficheiro vivo intacto)"; failures=$((failures+1)); continue
  fi
  rm -f "$tmp"
  if ! fcurl -m 30 "$FTP_BASE/" -Q "RNFR $remote.up" -Q "RNTO $remote" -o /dev/null; then
    echo "FALHOU $remote: nao foi possivel trocar o ficheiro"; failures=$((failures+1)); continue
  fi
  echo "OK     $remote ($size bytes, md5 $want, $try tentativa(s))"
  echo "   ok $remote $want" >> "$log"
done

if [ $failures -eq 0 ]; then
  echo "DEPLOY CONFIRMADO (${#ordered[@]} ficheiro(s))"
  exit 0
fi
echo "DEPLOY INCOMPLETO: $failures falha(s). Os ficheiros que falharam ficaram na versao anterior."
exit 2
