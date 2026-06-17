#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

auto_envsubst() {
  export WEB_URL="${WEB_URL:-https://dashboardicons.com}"

  host="${WEB_URL#*://}"
  host="${host%%/*}"
  host="${host%%:*}"

  export CANONICAL_HOST="${CANONICAL_HOST:-$host}"

  defined_envs='${WEB_URL} ${CANONICAL_HOST}'

  entrypoint_log "$ME: Replacing environment variables..."

  find ".next" -follow -path '*/node_modules/*' -prune -o -type f -name "*.*" -print | while read -r template; do
    envsubst "$defined_envs" <"$template" >"$template.1"
    mv "$template.1" "$template"
  done

  entrypoint_log "$ME: Environment variables replaced successfully"
}

auto_envsubst

exec "$@"
