#!/bin/sh

set -e

ME=$(basename "$0")

if [ ! -z "$USE_DEFAULT" ]; then
    mv .env.local .env.local.example -f
    echo "$ME: Reset .env.local to .env.local.example"
fi

pnpm start-web
# NEXT_PUBLIC_APP_PLATFORM=web /app/apps/readest-app/node_modules/.bin/next start
