#!/bin/sh

set -e

ME=$(basename "$0")

# Supported modes:
# - gateway: start the OpenClaw gateway (default)
# - cli: run the OpenClaw CLI
# - other values: forward the original container command unchanged
RUN_MODE=${RUN_MODE:-gateway}

# Allow the built-in gateway listener to be overridden without replacing the entrypoint.
OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND:-lan}
OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT:-18789}
OPENCLAW_STATE_DIR=${OPENCLAW_STATE_DIR:-$HOME/.openclaw}

# Control UI requests usually come from a local browser, so allow localhost by default
# unless the caller provides a stricter override.
DEFAULT_ORIGINS="[\"http://localhost:$OPENCLAW_GATEWAY_PORT\",\"http://127.0.0.1:$OPENCLAW_GATEWAY_PORT\"]"
# same as `OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS`
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-$DEFAULT_ORIGINS}
# same as `OC_GATEWAY__CONTROL_UI__ALLOW_INSECURE_AUTH`
INSECURE_AUTH=${INSECURE_AUTH:-false}
# same as `OC_GATEWAY__CONTROL_UI__DANGEROUSLY_DISABLE_DEVICE_AUTH`
DISABLE_DEVICE_AUTH=${DISABLE_DEVICE_AUTH:-false}

get_date() {
  date +"%Y-%m-%dT%H:%M:%S.%3N%:z"
}

get_config_path() {
  local explicit=""
  local state_dir=""
  local openclaw_home=""
  local home_dir=""
  local config_file_name="${CONFIG_FILE_NAME:-openclaw.json}"

  explicit="${OPENCLAW_CONFIG_PATH:-}"
  [ -z "$explicit" ] && explicit="${CLAWDBOT_CONFIG_PATH:-}"

  if [ -n "$explicit" ]; then
    printf "%s\n" "$explicit"
    return 0
  fi

  state_dir="${OPENCLAW_STATE_DIR:-}"
  if [ -n "$state_dir" ]; then
    printf "%s\n" "$state_dir/$config_file_name"
    return 0
  fi

  openclaw_home="${OPENCLAW_HOME:-}"
  if [ -n "$openclaw_home" ]; then
    printf "%s\n" "$openclaw_home/.openclaw/$config_file_name"
    return 0
  fi

  home_dir="${HOME:-$(getent passwd "$(id -u)" | cut -d: -f6)}"
  printf "%s\n" "$home_dir/.openclaw/$config_file_name"
}

entrypoint_log() {
  if [ -n "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    return
  fi

  printf "\033[90m$(get_date) $ME: $1$3$2\033[39m\n"
}

entrypoint_warn() {
  entrypoint_log "\033[33m" "\033[39m" "$1"
}

exists_config_file() {
  entrypoint_log "Checking for OpenClaw config file at $(get_config_path)"
  [ -f "$(get_config_path)" ]
}

# If `$OPENCLAW_STATE_DIR` is volume-mounted from the host,
# it may be owned by a different user than the one running inside the container.
# change its ownership to avoid permission issues.
fix_permissions() {
  mkdir -p "$OPENCLAW_STATE_DIR"
  if [ -d "$OPENCLAW_STATE_DIR" ] && [ ! -w "$OPENCLAW_STATE_DIR" ]; then
    entrypoint_log "Fixing permissions for $OPENCLAW_STATE_DIR"
    sudo chown -R "$(id -u):$(id -g)" "$OPENCLAW_STATE_DIR"
  fi
}

# Run `openclaw doctor` to check the environment and fix common issues.
run_openclaw_doctor() {
  entrypoint_log "Running doctor to ensure OpenClaw is properly set up"
  if openclaw doctor --fix --force >/dev/null 2>&1; then
    entrypoint_log "openclaw doctor --fix --force completed successfully"
  else
    entrypoint_warn "openclaw doctor --fix --force encountered issues"
  fi
}

# if `$OPENCLAW_STATE_DIR/completions` directory not exists, rerun completion install command to generate it.
ensure_openclaw_completion() {
  if [ ! -d "$OPENCLAW_STATE_DIR/completions" ]; then
    entrypoint_log "OpenClaw completions not found; installing..."
    if openclaw completion -y --shell zsh --write-state --install 2>/dev/null; then
      entrypoint_log "OpenClaw completions installed"
    else
      entrypoint_warn "Failed to install OpenClaw completions"
    fi
  fi
}

# Recovery global bun packages from `/tmp/node_modules.tar.gz` if
# global bun packages not exists, which may be caused by bun global cache cleared
recover_bun_global_packages() {
  if [ ! -d "$HOME/.bun/install/global/node_modules" ]; then
    if [ -f /tmp/node_modules.tar.gz ]; then
      entrypoint_log "Recovering global bun packages from backup"
      mkdir -p "$HOME/.bun/install/global/node_modules"
      tar -xzf /tmp/node_modules.tar.gz -C "$HOME/.bun/install/global/node_modules" --strip-components=1
      rm -f /tmp/node_modules.tar.gz
      entrypoint_log "Global bun packages recovered"
    else
      entrypoint_warn "No backup found for global bun packages; skipping recovery"
    fi
  fi
}

# Common environment variables for both gateway and CLI modes
export_openclaw_env() {
  export OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS="${OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS:-$ALLOWED_ORIGINS}"
  export OC_GATEWAY__MODE="${OC_GATEWAY__MODE:-local}"
  export OC_GATEWAY__CONTROL_UI__ALLOW_INSECURE_AUTH="${OC_GATEWAY__CONTROL_UI__ALLOW_INSECURE_AUTH:-$INSECURE_AUTH}"
  export OC_GATEWAY__CONTROL_UI__DANGEROUSLY_DISABLE_DEVICE_AUTH="${OC_GATEWAY__CONTROL_UI__DANGEROUSLY_DISABLE_DEVICE_AUTH:-$DISABLE_DEVICE_AUTH}"
}

update_starship() {
  mkdir -p "$HOME/.config"

  if [ -f "$HOME/.config/starship.toml" ]; then
    entrypoint_log "Starship config exists; skip update"
    return
  fi

  if [ -z "${STARSHIP_CONFIG:-}" ]; then
    if [ -f /usr/local/starship.toml ]; then
      cp /usr/local/starship.toml "$HOME/.config/starship.toml"
      entrypoint_log "Installed default Starship config"
    fi
    return
  fi

  if printf '%s' "$STARSHIP_CONFIG" | grep -qE '^https?://'; then
    entrypoint_log "Download Starship config from URL"
    wget -O "$HOME/.config/starship.toml" "$STARSHIP_CONFIG"
    entrypoint_log "Installed Starship config from URL"
    return
  fi

  if [ -f "$STARSHIP_CONFIG" ]; then
    cp "$STARSHIP_CONFIG" "$HOME/.config/starship.toml"
    entrypoint_log "Installed Starship config from file"
    return
  fi

  entrypoint_warn "STARSHIP_CONFIG not found: $STARSHIP_CONFIG"
}

update_openclaw_config() {
  username=$(whoami)
  # Use radom filename to avoid security issues.
  tempfile=$(mktemp /tmp/XXXXXX.mjs)

  entrypoint_log "Generating OpenClaw config from runtime environment"

  # Non-root users cannot traverse `/root`, so copy the generator to a temporary
  # readable location before running it as the current user.
  trap 'rm -f "$tempfile"' EXIT HUP INT TERM
  sudo cp /root/update_config.mjs "$tempfile"
  sudo chmod 644 "$tempfile"
  sudo chown "$username:$username" "$tempfile"
  node "$tempfile"
  rm -f "$tempfile"
  trap - EXIT HUP INT TERM
}

ensure_gateway_token() {
  if [ -n "${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
    entrypoint_log "Using the provided OpenClaw gateway token"
    return
  fi

  export OC_GATEWAY__AUTH__MODE="${OC_GATEWAY__AUTH__MODE:-token}"
  if [ "$OC_GATEWAY__AUTH__MODE" != "token" ]; then
    entrypoint_log "OpenClaw gateway auth mode is set to '$OC_GATEWAY__AUTH__MODE'; skipping token generation"
    return
  fi

  export OC_GATEWAY__AUTH__TOKEN=${OC_GATEWAY__AUTH__TOKEN:-$(openssl rand -hex 32)}
  entrypoint_log "Generated a new OpenClaw gateway token for this container process"
}

run_gateway() {
  entrypoint_log "Start gateway on $OPENCLAW_GATEWAY_BIND:$OPENCLAW_GATEWAY_PORT"

  gateway_token=${OPENCLAW_GATEWAY_TOKEN:-$OC_GATEWAY__AUTH__TOKEN}
  if [ -n "$gateway_token" ]; then
    entrypoint_log "Gateway Token: $gateway_token"
  fi

  entrypoint_warn "⚠️  OC_* variables are only used when creating openclaw.json"
  entrypoint_warn "If the file already exists, edit it directly or remove it before restart"

  exec openclaw gateway --allow-unconfigured --bind "$OPENCLAW_GATEWAY_BIND" --port "$OPENCLAW_GATEWAY_PORT" "$@"
}

run_cli() {
  exec openclaw "$@"
}

run() {
  case "$RUN_MODE" in
  gateway)
    run_gateway "$@"
    ;;
  cli)
    run_cli "$@"
    ;;
  *)
    entrypoint_log "RUN_MODE=$RUN_MODE; exec original command"
    exec "$@"
    ;;
  esac
}

main() {
  update_starship
  fix_permissions
  recover_bun_global_packages
  ensure_openclaw_completion

  if exists_config_file; then
    entrypoint_log "OpenClaw config file exists; skip generation"
  else
    [ "$RUN_MODE" = "gateway" ] && ensure_gateway_token
    export_openclaw_env
    update_openclaw_config
    run_openclaw_doctor
  fi

  run "$@"
}

main "$@"
