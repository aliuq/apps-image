#!/bin/sh

set -e

ME=$(basename "$0")

entrypoint_log() {
  if [ -z "${NGINX_ENTRYPOINT_QUIET_LOGS:-}" ]; then
    echo "$@"
  fi
}

# Return default IP list as comma-separated string
# ref: https://github.com/weserv/images/blob/5.x/ngx_conf/nginx.conf
default_deny_ip() {
  echo "127.0.0.0/8,::1/128,169.254.0.0/16,224.0.0.0/4,fe80::/64,ff00::/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7"
}

# Format comma-separated IP list to nginx configuration format
format_deny_ip() {
  local ip_list="$1"

  # Check if already in full configuration format (contains weserv_deny_ip)
  if echo "$ip_list" | grep -q "weserv_deny_ip"; then
    echo "$ip_list"
    return
  fi

  # Convert comma-separated IPs to multi-line configuration
  echo "$ip_list" | tr ',' '\n' | while IFS= read -r ip; do
    ip=$(echo "$ip" | xargs)  # Trim whitespace
    if [ -n "$ip" ]; then
      echo "    weserv_deny_ip $ip;"
    fi
  done
}

# Set weserv_deny_ip configuration in /etc/nginx/nginx.conf
set_weserv_deny_ip() {
  entrypoint_log "$ME: Set weserv deny ip configuration"

  # Only use default if WESERV_DENY_IP is not set (use '-' instead of ':-')
  # This allows empty string to skip IP deny configuration
  WESERV_DENY_IP=${WESERV_DENY_IP-"$(default_deny_ip)"}

  # If WESERV_DENY_IP is empty, remove the placeholder without adding any rules
  if [ -z "$WESERV_DENY_IP" ]; then
    sed -i '/#WESERV_DENY_IP#/d' /etc/nginx/nginx.conf
  else
    # Format IP configuration
    FORMATTED_DENY_IP=$(format_deny_ip "$WESERV_DENY_IP")

    sed -i '/#WESERV_DENY_IP#/{
    r /dev/stdin
    d
  }' /etc/nginx/nginx.conf <<EOF
$FORMATTED_DENY_IP
EOF
  fi

  entrypoint_log "$ME: Set weserv deny ip configuration complete"
}

set_weserv_deny_ip

nginx -g "daemon off;"
