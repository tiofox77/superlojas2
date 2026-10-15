#!/bin/bash
# Snapshot of production before a deploy (read-only): downloads the live version of every file in
# scripts/.lista-deploy.txt (or the arguments) to recovery/pre-deploy/<path> — the restore point —
# and compares it with the local file.
#
#   bash scripts/instantaneo_ftp.sh                 # uses scripts/.lista-deploy.txt (one path per line, local[:remote])
#   bash scripts/instantaneo_ftp.sh api/routes/api.php
#
# The diff must be exactly the change being deployed. Anything else means production was changed
# outside git (or the local file carries unrelated work): stop and find out before sending.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
cd "$REPO_ROOT"

if [ $# -gt 0 ]; then items=("$@"); else
  list="scripts/.lista-deploy.txt"
  [ -f "$list" ] || { echo "Crie $list (um caminho por linha) ou passe os ficheiros como argumentos."; exit 1; }
  mapfile -t items < <(grep -v '^\s*\(#\|$\)' "$list" | tr -d '\r')
fi

load_ftp
dest="recovery/pre-deploy"
for it in "${items[@]}"; do
  local_path="${it%%:*}"; remote="${it#*:}"; [ "$it" = "$local_path" ] && remote="$local_path"
  if ftp_get "$remote" "$dest/$remote"; then
    if [ ! -f "$local_path" ]; then state="guardado (sem copia local)"
    elif diff -q --strip-trailing-cr "$dest/$remote" "$local_path" >/dev/null; then state="guardado · igual ao local"
    else
      changes=$(diff --strip-trailing-cr "$dest/$remote" "$local_path" | grep -c '^[<>]')
      state="guardado · difere em $changes linha(s): diff -u --strip-trailing-cr $dest/$remote $local_path"
    fi
  else
    rm -f "$dest/$remote"
    state="AUSENTE na producao (ficheiro novo)"
  fi
  echo "$remote: $state"
done
