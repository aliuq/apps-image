#!/bin/sh

set -e

ME=$(basename "$0")
# RUN_MODE 选择启动方式，默认启动 Orca 服务
RUN_MODE=${RUN_MODE:-serve}
# Tailscale 默认关闭；pre-auth 使用预认证密钥，machine 执行 tailscale up 并等待连接
TAILSCALE_KEY_TYPE=${TAILSCALE_KEY_TYPE:-none}
tailscale_state_dir=/var/lib/tailscale
tailscale_socket=/var/run/tailscale/tailscaled.sock

# NGINX_ENTRYPOINT_QUIET_LOGS 非空时不输出普通日志
entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    printf '%s: %s\n' "$ME" "$*"
  fi
}

entrypoint_error() {
  printf '%s: %s\n' "$ME" "$*" >&2
}

# 设置了自定义控制服务器时，将地址传给 tailscale up
tailscale_up() {
  if [ -n "${TAILSCALE_LOGIN_SERVER:-}" ]; then
    set -- "$@" --login-server="$TAILSCALE_LOGIN_SERVER"
  fi
  tailscale up "$@"
}

# 按密钥类型启动 Tailscale，并检查所需的 TUN 设备和网络权限
start_tailscale() {
  case "$TAILSCALE_KEY_TYPE" in
    none)
      return
      ;;
    pre-auth|machine)
      ;;
    *)
      entrypoint_error "Unsupported TAILSCALE_KEY_TYPE '$TAILSCALE_KEY_TYPE'; use none, pre-auth, or machine."
      exit 1
      ;;
  esac

  if [ ! -c /dev/net/tun ]; then
    entrypoint_error "Tailscale needs /dev/net/tun and NET_ADMIN/NET_RAW. Start Docker with --device=/dev/net/tun --cap-add=NET_ADMIN --cap-add=NET_RAW."
    exit 1
  fi

  # 预认证模式可复用已有状态；无状态且未提供认证密钥时会报错
  tailscale_state_exists=0
  if [ -s "$tailscale_state_dir/tailscaled.state" ]; then
    tailscale_state_exists=1
  fi

  mkdir -p "$tailscale_state_dir" "$(dirname "$tailscale_socket")"
  entrypoint_log "Starting Tailscale daemon"
  tailscaled --state="$tailscale_state_dir/tailscaled.state" &
  tailscaled_pid=$!

  # 等待控制 socket 就绪；守护进程退出或等待超过 5 分钟时失败
  attempts=0
  while [ ! -S "$tailscale_socket" ]; do
    if ! kill -0 "$tailscaled_pid" 2>/dev/null; then
      entrypoint_error "Tailscale daemon exited before its socket became available."
      exit 1
    fi
    if [ "$attempts" -ge 300 ]; then
      entrypoint_error "Timed out waiting for the Tailscale daemon socket."
      exit 1
    fi
    sleep 1
    attempts=$((attempts + 1))
  done

  # 已连接时跳过登录；否则按模式运行 tailscale up
  tailscale_ip=$(tailscale ip -4 2>/dev/null | head -n 1 || true)
  if [ -z "$tailscale_ip" ]; then
    case "$TAILSCALE_KEY_TYPE" in
      pre-auth)
        if [ -z "${TAILSCALE_AUTH_KEY:-}" ] && [ "$tailscale_state_exists" -eq 0 ]; then
          entrypoint_error "Set TAILSCALE_AUTH_KEY to a Tailscale pre-authentication key."
          exit 1
        fi
        if [ -n "${TAILSCALE_AUTH_KEY:-}" ]; then
          tailscale_up --auth-key="$TAILSCALE_AUTH_KEY"
        else
          tailscale_up
        fi
        ;;
      machine)
        tailscale_up
        ;;
    esac

    # 首次登录时 tailscale up 会显示认证链接；等待连接并分配 IPv4 地址
    entrypoint_log "Waiting for Tailscale connection"
    while [ -z "$tailscale_ip" ]; do
      if ! kill -0 "$tailscaled_pid" 2>/dev/null; then
        entrypoint_error "Tailscale daemon exited before the device connected."
        exit 1
      fi
      sleep 1
      tailscale_ip=$(tailscale ip -4 2>/dev/null | head -n 1 || true)
    done
  fi

  # 未设置配对地址时，使用 Tailscale IPv4 地址
  if [ -z "${ORCA_PAIRING_ADDRESS:-}" ]; then
    ORCA_PAIRING_ADDRESS=$tailscale_ip
    export ORCA_PAIRING_ADDRESS
  fi
}

run_serve() {
  # 环境变量提供默认监听地址和端口；命令行参数优先
  ORCA_BIND=${ORCA_BIND:-0.0.0.0}
  ORCA_PORT=${ORCA_PORT:-6768}
  has_bind=0
  has_port=0
  has_pairing_address=0

  # 识别 --option value 和 --option=value，避免覆盖命令行参数
  for arg in "$@"; do
    case "$arg" in
      --bind|--bind=*) has_bind=1 ;;
      --port|--port=*) has_port=1 ;;
      --pairing-address|--pairing-address=*) has_pairing_address=1 ;;
    esac
  done

  if [ "$has_bind" -eq 0 ]; then
    set -- --bind "$ORCA_BIND" "$@"
  fi

  if [ "$has_port" -eq 0 ]; then
    set -- --port "$ORCA_PORT" "$@"
  fi

  if [ "$has_pairing_address" -eq 0 ]; then
    if [ -z "${ORCA_PAIRING_ADDRESS:-}" ]; then
      entrypoint_error "Set ORCA_PAIRING_ADDRESS to a host-reachable IP or hostname, or pass --pairing-address."
      exit 1
    fi
    set -- "$@" --pairing-address "$ORCA_PAIRING_ADDRESS"
  fi

  entrypoint_log "Starting Orca server"
  exec orca-ide serve "$@"
}

main() {
  case "$RUN_MODE" in
    serve)
      # serve 模式先启动 Tailscale，再运行服务
      start_tailscale
      run_serve "$@"
      ;;
    cli)
      entrypoint_log "RUN_MODE=cli; running Orca CLI"
      exec orca-ide "$@"
      ;;
    *)
      if [ "$#" -eq 0 ]; then
        entrypoint_error "RUN_MODE='$RUN_MODE' requires a command."
        exit 2
      fi
      entrypoint_log "RUN_MODE=$RUN_MODE; exec original command"
      exec "$@"
      ;;
  esac
}

main "$@"
