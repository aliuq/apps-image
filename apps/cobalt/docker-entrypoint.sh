#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

auto_envsubst() {
  local filter="${NGINX_ENVSUBST_FILTER:-}"

  defined_envs=$(printf '${%s} ' $(awk "END { for (name in ENVIRON) { print ( name ~ /${filter}/ ) ? name : \"\" } }" </dev/null))

  # 打印调试信息
  # entrypoint_log "$ME: Filter pattern: '$filter'"
  # entrypoint_log "$ME: Defined environment variables: $defined_envs"

  entrypoint_log "$ME: Replacing……"
  find "/app" -follow -type f -name "*.js" -print | while read -r template; do
    envsubst "$defined_envs" <"$template" >"$template.1"
    mv "$template.1" "$template"
  done
}

auto_envsubst

exit 0
