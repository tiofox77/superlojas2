#!/bin/bash
# Shared helpers for the deploy scripts. Credentials are read from files outside the repo:
#   ~/.superloja/ftp.env              FTP_HOST, FTP_USER, FTP_PASS
#   ~/.superloja/maintenance-token    token for /api/maintenance (MAINTENANCE.md)
# Nothing here prints a password or token.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_URL="${SUPERLOJA_URL:-https://superloja.vip}"

load_ftp() {
  local f="$HOME/.superloja/ftp.env"
  [ -f "$f" ] || { echo "Credenciais FTP em falta: crie $f (FTP_HOST, FTP_USER, FTP_PASS)" >&2; exit 1; }
  # shellcheck disable=SC1090
  source "$f"
  FTP_BASE="ftp://${FTP_HOST}"
  # Credentials go to curl through a temporary netrc, never on the command line.
  FTP_NETRC="$(mktemp)"
  printf 'machine %s login %s password %s\n' "$FTP_HOST" "$FTP_USER" "$FTP_PASS" > "$FTP_NETRC"
  trap 'rm -f "$FTP_NETRC"' EXIT
}

# curl over explicit FTPS (self-signed certificate on the host)
fcurl() { curl -s --ssl-reqd -k --netrc-file "$FTP_NETRC" "$@"; }

# Remote size of a file ("" when it does not exist)
remote_size() {
  local path="$1" dir base
  dir="$(dirname "$path")"; base="$(basename "$path")"
  [ "$dir" = "." ] && dir=""
  fcurl -m 30 "$FTP_BASE/${dir:+$dir/}" | tr -d '\r' | awk -v n="$base" '$9==n{print $5}'
}

# Download a remote file to a local path; returns non-zero if it is missing.
ftp_get() {
  local remote="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  fcurl -m 180 -f "$FTP_BASE/$remote" -o "$dest" 2>/dev/null
}

md5() { md5sum "$1" | cut -d' ' -f1; }

maintenance_token() {
  local t="${SUPERLOJA_MAINT_TOKEN:-}"
  [ -n "$t" ] || t="$(cat "$HOME/.superloja/maintenance-token" 2>/dev/null || true)"
  t="$(printf '%s' "$t" | tr -d '\r\n ')"
  [ -n "$t" ] || { echo "Token de manutencao em falta: ~/.superloja/maintenance-token (MAINTENANCE.md)" >&2; exit 1; }
  printf '%s' "$t"
}
