#!/bin/sh

set -e

ME=$(basename "$0")

# Allow the default gateway listener to be overridden without replacing the entrypoint.
OPENCLAW_GATEWAY_BIND=${OPENCLAW_GATEWAY_BIND:-lan}
OPENCLAW_GATEWAY_PORT=${OPENCLAW_GATEWAY_PORT:-18789}

# Control UI requests usually originate from localhost in the browser, so allow those
# origins by default unless the caller provides a stricter explicit override.
DEFAULT_ORIGINS="[\"http://localhost:$OPENCLAW_GATEWAY_PORT\",\"http://127.0.0.1:$OPENCLAW_GATEWAY_PORT\"]"
# Specify `ALLOWED_ORIGINS` to override the default allowed origins for the Control UI.
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-$DEFAULT_ORIGINS}

get_date() {
  date +"%Y-%m-%dT%H:%M:%S.%3N%:z"
}

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$(get_date) $@"
  fi
}

current_user() {
  whoami
}

# Update Openclaw config using the provided script
update_openclaw_config() {
  entrypoint_log "$ME: Updating Openclaw config..."
  username=$(current_user)
  tempfile=$(mktemp /tmp/XXXXXX.mjs)
  # Non-root users cannot traverse `/root`; copy the script to a temporary file
  # so the config generation step can run without switching the whole entrypoint to root.
  sudo cp /root/update_config.mjs "$tempfile"
  sudo chmod 644 "$tempfile"
  sudo chown $username:$username "$tempfile"
  node "$tempfile"
  rm -f "$tempfile"
}

start_openclaw() {
  entrypoint_log "$ME: Starting Openclaw..."
  exec openclaw gateway --allow-unconfigured --bind "$OPENCLAW_GATEWAY_BIND" --port "$OPENCLAW_GATEWAY_PORT"
}

# By default, generate the config first and then start the built-in Openclaw gateway.
# When `openclaw ...` is passed explicitly, generate the config first and then forward
# the original arguments to `openclaw` unchanged.
# Any other command is executed as-is so callers can debug or override the default entrypoint behavior.
if [ "$#" -eq 0 ]; then
  # Seed the Control UI allowed origins when the caller does not provide an
  # explicit `OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS` value.
  if [ -z "${OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS:-}" ]; then
    export OC_GATEWAY__CONTROL_UI__ALLOWED_ORIGINS="$ALLOWED_ORIGINS"
  fi
  update_openclaw_config
  start_openclaw
elif [ "$1" = "openclaw" ]; then
  update_openclaw_config
  exec "$@"
else
  exec "$@"
fi
