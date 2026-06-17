#!/bin/bash

set -euxo pipefail

VERSION="00c43aa"

# Store the current working directory to return back later
old_pwd=$(pwd)
# Use the top-level directory for avoid standalone output issues with Next.js,
# and copy the built files to the correct location in the Dockerfile
sudo mkdir -p /dashboard-icons
sudo chown -R $USER:$USER /dashboard-icons
cd /dashboard-icons
# Clone the repository
git clone --depth=1 https://github.com/homarr-labs/dashboard-icons . && git checkout $VERSION
rm -rf .git

# 允许 Docker 默认的 0.0.0.0 主机名走本地 HTTP，避免被 upstream middleware 强制跳转到 HTTPS
# https://github.com/homarr-labs/dashboard-icons/blob/main/web/src/middleware.ts
perl -0pi -e 's/host === "127\.0\.0\.1"/host === "127.0.0.1" || host === "0.0.0.0" || host.startsWith("0.0.0.0:")/' web/src/middleware.ts

# Set up environment variables
export NEXT_PUBLIC_DISABLE_POSTHOG="true"
export NEXT_TELEMETRY_DISABLED=1
export CI_MODE=true
export NODE_ENV=production

cd web
mise trust .
mise use bun@latest -g

# Install dependencies
bun install
bun add @swc/helpers -D

# Build the application
bun run build

# Clean unused files to avoid trigger github actions dist size limit
# System.IO.IOException: No space left on device
mise cache clear
rm -rf node_modules .next/server

# Copy the built files to the correct location for the Dockerfile
cd $old_pwd
mkdir -p app
rm -rf ./app/.next ./app/public
cp -r /dashboard-icons/web/.next ./app/.next
cp -r /dashboard-icons/web/public ./app/public
sudo rm -rf /dashboard-icons
