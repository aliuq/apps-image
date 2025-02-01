#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

# 写入环境变量 SESSION_SECRET 到 .env。如果 SESSION_SECRET 为空，则写入默认值 abc123
if [ -z "${SESSION_SECRET}" ]; then
  SESSION_SECRET="abc123"
  entrypoint_log "$ME: Not found SESSION_SECRET, use default value"
fi
echo "SESSION_SECRET=${SESSION_SECRET}" >> .env

npm start
