#!/bin/bash

set -euo pipefail

VERSION="v0.9.98"

# Clone the repository
mkdir -p app && cd app
git clone -b $VERSION --recurse-submodules https://github.com/readest/readest .

# Copy the variables starting with `NEXT_PUBLIC_` from
# `/app/apps/readest-app/.env.local.example` to /app/apps/readest-app/.env.local,
# and set their values as environment variable placeholders in the format `KEY=\$KEY`.
env_source=./apps/readest-app/.env.local.example
env_target=./apps/readest-app/.env.local
awk -F= '/^NEXT_PUBLIC_/ && $1 != "" { printf "%s=\$%s\n", $1, $1 }' $env_source >> $env_target

# Replace `NEXT_PUBLIC_SUPABASE_URL` to `https://your-supabase-url.com` placeholder for
# avoid `Invalid URL` error during build
sed -i 's|^NEXT_PUBLIC_SUPABASE_URL=.*$|NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.com|' $env_target

# Install pnpm
mise use node@lts -g
corepack enable && corepack prepare pnpm@latest-10 --activate

# Install dependencies and build the application
pnpm install --frozen-lockfile

# Setup vendors and build
pnpm --filter @readest/readest-app setup-vendors
pnpm --filter=@readest/readest-app setup-pdfjs
pnpm --filter=@readest/readest-app build-web

# Replace `https://your-supabase-url.com` in `.next` js files with environment variable
find ./apps/readest-app/.next -name "*.js" -exec sed -i "s|https://your-supabase-url.com|\$NEXT_PUBLIC_SUPABASE_URL|g" {} +

# Remove Next.js cache to reduce image size
rm -rf ./apps/readest-app/.next/cache

# Install dotenv-cli and @next/bundle-analyzer as dev dependencies for deploy command
pnpm --filter=@readest/readest-app install dotenv-cli @next/bundle-analyzer -P

# Clean store to reduce image size
pnpm store prune --force

# Clean unnecessary packages on web app
pnpm --filter=@readest/readest-app remove @opennextjs/cloudflare

# Create pruned node_modules for production
pnpm --filter=@readest/readest-app --prod deploy --legacy pruned
