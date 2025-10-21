#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

# Get environment variable from .env file and decode from base64
# Returns decoded value or empty string if not found/invalid
get_env_decoded() {
  local key="$1"
  local value
  local env_path="/app/apps/readest-app/.env"

  # Extract value from .env file
  value=$(grep -E "^[[:space:]]*$key=" "$env_path" 2>/dev/null | grep -v '^#' | tail -n1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")

  # Check if value exists
  if [ -z "$value" ]; then
    entrypoint_log "$ME: Warning - Variable $key not found in $env_path file"
    return 1
  fi

  # Try to decode base64, handle errors gracefully
  local decoded
  decoded=$(echo "$value" | base64 --decode 2>/dev/null)

  if [ $? -ne 0 ] || [ -z "$decoded" ]; then
    entrypoint_log "$ME: Warning - Failed to decode base64 value for $key"
    return 1
  fi

  echo "$decoded"
  return 0
}

auto_envsubst() {
  local default_posthog_host=$(get_env_decoded "NEXT_PUBLIC_DEFAULT_POSTHOG_URL_BASE64") || default_posthog_host=""
  local default_posthog_key=$(get_env_decoded "NEXT_PUBLIC_DEFAULT_POSTHOG_KEY_BASE64") || default_posthog_key=""
  local default_supabase_url=$(get_env_decoded "NEXT_PUBLIC_DEFAULT_SUPABASE_URL_BASE64") || default_supabase_url=""
  local default_supabase_anon_key=$(get_env_decoded "NEXT_PUBLIC_DEFAULT_SUPABASE_KEY_BASE64") || default_supabase_anon_key=""

  export NEXT_PUBLIC_POSTHOG_HOST=${NEXT_PUBLIC_POSTHOG_HOST:-$default_posthog_host}
  export NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY:-$default_posthog_key}
  export NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-$default_supabase_url}
  export NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-$default_supabase_anon_key}
  export NEXT_PUBLIC_STORAGE_FIXED_QUOTA=${NEXT_PUBLIC_STORAGE_FIXED_QUOTA:-0}
  export NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-}
  export NEXT_PUBLIC_OBJECT_STORAGE_TYPE=${NEXT_PUBLIC_OBJECT_STORAGE_TYPE:-}

  local filter="${ENVSUBST_FILTER:-}"

  defined_envs=$(printf '${%s} ' $(awk "END { for (name in ENVIRON) { print ( name ~ /${filter}/ ) ? name : \"\" } }" </dev/null))

  entrypoint_log "$ME: Replacing environment variables..."

  find "/app/apps/readest-app/.next" -follow -type f -name "*.js" -print | while read -r template; do
    envsubst "$defined_envs" <"$template" >"$template.1"
    mv "$template.1" "$template"
  done

  entrypoint_log "$ME: Environment variables replaced successfully"
}

auto_envsubst

pnpm start-web
