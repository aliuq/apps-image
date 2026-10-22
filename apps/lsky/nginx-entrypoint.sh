#!/bin/sh

set -e

case "${1:-}" in
    nginx|nginx-debug)
        command=$1
        shift
        set -- "$command" -c /tmp/lsky-nginx/nginx.conf "$@"
        ;;
esac

exec /docker-entrypoint.sh "$@"
