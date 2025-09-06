#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

# starship
update_starship() {
  # Skip if `~/.config/starship.toml` already exists
  if [ ! -f ~/.config/starship.toml ]; then
    # If `STARSHIP_CONFIG` environment variable doesn't exist, copy from `/usr/local/starship.toml` to `~/.config/starship.toml`
    # If it exists: 1. If not a network address, treat as relative path and copy to `~/.config/starship.toml`
    #               2. If it's a network address, download to `~/.config/starship.toml`
    if [ -z "${STARSHIP_CONFIG:-}" ]; then
      if [ -f /usr/local/starship.toml ]; then
        mkdir -p ~/.config
        cp /usr/local/starship.toml ~/.config/starship.toml
      fi
    else
      if echo "$STARSHIP_CONFIG" | grep -qE '^https?://'; then
        # Network address, download it
        mkdir -p ~/.config
        wget -O ~/.config/starship.toml "$STARSHIP_CONFIG"
      else
        # Not a network address, treat as relative path and copy
        if [ -f "$STARSHIP_CONFIG" ]; then
          mkdir -p ~/.config
          cp "$STARSHIP_CONFIG" ~/.config/starship.toml
        fi
      fi
    fi
    entrypoint_log "$ME: starship config ~/.config/starship.toml has been updated."
  else
    entrypoint_log "$ME: starship config ~/.config/starship.toml already exists, skip copying."
  fi
}

# `serve-web` mode: code-server web IDE
# `tunnel` mode: code-server tunnel mode
# `custom` mode: custom command
# `empty` mode: do nothing
# `ssh` mode: ssh server
run_mode=${RUN_MODE:-serve-web}

run_serve_web() {
  entrypoint_log "$ME: Starting in serve-web mode..."

  local cmd="code serve-web --host ${HOST:-0.0.0.0} --port ${PORT:-8000}"

  # If `TOKEN` environment variable exists, add `--connection-token` parameter, otherwise add `--without-connection-token`
  if [ -n "${TOKEN:-}" ]; then
    cmd="$cmd --connection-token ${TOKEN}"
  else
    cmd="$cmd --without-connection-token"
  fi

  cmd="$cmd $@"

  entrypoint_log "$ME: Running command: $cmd"
  exec $cmd
}

run_tunnel() {
  entrypoint_log "$ME: Starting in tunnel mode..."
  local cmd="code tunnel"

  cmd="$cmd $@"

  entrypoint_log "$ME: Running command: $cmd"
  exec $cmd
}

run_custom() {
  entrypoint_log "$ME: Starting in custom mode..."
  exec "code $@"
}

run_empty() {
  entrypoint_log "$ME: Starting in empty mode..."
  exec "$@"
}

run_ssh() {
  entrypoint_log "$ME: Starting in ssh mode..."

  # Generate SSH host keys if they don't exist
  if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    entrypoint_log "$ME: Generating SSH host keys..."
    sudo ssh-keygen -A
  fi

  # Check if `PUBLIC_KEY` environment variable exists or `PUBLIC_KEY_FILE` exists
  if [ -n "${PUBLIC_KEY_FILE:-}" ] && [ -f "$PUBLIC_KEY_FILE" ]; then
    PUBLIC_KEY=$(cat "$PUBLIC_KEY_FILE")
    entrypoint_log "$ME: Using public key from file $PUBLIC_KEY_FILE"
  fi

  if [ -n "${PUBLIC_KEY:-}" ]; then
    echo "$PUBLIC_KEY" >> $HOME/.ssh/authorized_keys
    entrypoint_log "$ME: Public key added to $HOME/authorized_keys"
  else
    entrypoint_log "$ME: No PUBLIC_KEY provided, skipping public key setup."
  fi

  # Start SSH service and keep container running
  entrypoint_log "$ME: Starting SSH daemon..."

  # Start sshd in background mode, then keep container running
  sudo /usr/sbin/sshd

  # Check if SSH service is running
  if pgrep sshd > /dev/null; then
    entrypoint_log "$ME: SSH daemon started successfully"
  else
    entrypoint_log "$ME: Failed to start SSH daemon"
    exit 1
  fi

  # Keep container running
  entrypoint_log "$ME: Container is ready. SSH service is running on port 22."

  # Allow restarting sshd service without destroying the container
  tail -f /dev/null
}

init_code() {
  case "$run_mode" in
    serve-web)
      run_serve_web "$@"
      ;;
    tunnel)
      run_tunnel "$@"
      ;;
    custom)
      run_custom "$@"
      ;;
    empty)
      run_empty "$@"
      ;;
    ssh)
      run_ssh "$@"
      ;;
    *)
      entrypoint_log "$ME: Unknown RUN_MODE '$run_mode'. Supported modes are: serve-web, tunnel, custom."
      exit 1
      ;;
  esac
}

update_starship
init_code "$@"

