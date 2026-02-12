#!/bin/bash

set -euxo pipefail

VERSION="v0.9.99"

# Store the current working directory to return back later
old_pwd=$(pwd)
# Use the top-level directory for avoid standalone output issues with Next.js,
# and copy the built files to the correct location in the Dockerfile
sudo mkdir -p /readest
sudo chown -R $USER:$USER /readest
cd /readest
# Clone the repository
git clone -b $VERSION --recurse-submodules https://github.com/readest/readest .
rm -rf .git

# Copy the variables starting with `NEXT_PUBLIC_` from
# `/app/apps/readest-app/.env.local.example` to /app/apps/readest-app/.env.local,
# and set their values as environment variable placeholders in the format `KEY=\$KEY`.
env_source=./apps/readest-app/.env.local.example
env_target=./apps/readest-app/.env.local
awk -F= '/^NEXT_PUBLIC_/ && $1 != "" { printf "%s=\$%s\n", $1, $1 }' $env_source >> $env_target

# Replace `NEXT_PUBLIC_SUPABASE_URL` to `https://your-supabase-url.com` placeholder for
# avoid `Invalid URL` error during build
sed -i 's|^NEXT_PUBLIC_SUPABASE_URL=.*$|NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.com|' $env_target

export CI=true
export NODE_ENV=production

# Configure Next.js for standalone output
next_config=./apps/readest-app/next.config.mjs
if ! grep -q 'output:' $next_config; then
  sed -i '/const nextConfig = {/a\  output: "standalone",' $next_config;
else
  sed -i 's/output: .*/output: "standalone",/' $next_config;
fi

# Install pnpm
mise use node@lts pnpm@10 -g

# Install dependencies and build the application
pnpm install --frozen-lockfile

# Setup vendors and build
pnpm --filter @readest/readest-app setup-vendors
pnpm --filter=@readest/readest-app setup-pdfjs
pnpm --filter=@readest/readest-app build-web

# Replace `https://your-supabase-url.com` in `.next` js files with environment variable
find ./apps/readest-app/.next \
  -path "*/node_modules/*" -prune -o \
  -name "*.js" \
  -exec sed -i "s|https://your-supabase-url.com|\$NEXT_PUBLIC_SUPABASE_URL|g" {} +

# Clean up build artifacts to reduce image size
rm -rf ./apps/readest-app/.next/cache

# Copy the built files to the correct location for the Dockerfile
cd $old_pwd
mkdir -p app
cp -r /readest/apps/readest-app/.next ./app/.next
cp -r /readest/apps/readest-app/public ./app/public
rm -rf /readest
