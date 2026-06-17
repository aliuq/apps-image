#!/bin/bash

set -euxo pipefail

VERSION="00c43aa"

# Store the current working directory to return back later
old_pwd=$(pwd)
# Use the top-level directory for avoid standalone output issues with Next.js,
# and copy the built files to the correct location in the Dockerfile
sudo rm -rf /dashboard-icons
sudo mkdir -p /dashboard-icons
sudo chown -R $USER:$USER /dashboard-icons
cd /dashboard-icons
# Clone the repository
git clone --depth=1 https://github.com/homarr-labs/dashboard-icons . && git checkout $VERSION
rm -rf .git

# 允许 Docker 默认的 0.0.0.0 主机名走本地 HTTP，避免被 upstream middleware 强制跳转到 HTTPS
# https://github.com/homarr-labs/dashboard-icons/blob/main/web/src/middleware.ts
perl -0pi -e 's/host === "127\.0\.0\.1"/host === "127.0.0.1" || host === "0.0.0.0" || host.startsWith("0.0.0.0:")/' web/src/middleware.ts
# 替换 `https://dashboardicons.com` 为临时环境变量占位符 https://your-web-url.com
perl -0pi -e 's/WEB_URL = "https:\/\/dashboardicons\.com"/WEB_URL = "https:\/\/your-web-url\.com"/' web/src/constants.ts
# 替换 `dashboardicons.com` 为环境变量占位符 CANONICAL_HOST
perl -0pi -e 's/const CANONICAL_HOST = "dashboardicons\.com"/const CANONICAL_HOST = "$CANONICAL_HOST"/' web/src/middleware.ts

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

# 替换 .next 下所有文件中的 `https://your-web-url.com` 为环境变量占位符 `$WEB_URL`
find -L ./app/.next/standalone/web \
  -path '*/node_modules/*' -prune -o \
  -type f -name '*.*' -print0 |
  xargs -0r sed -i "s|https://your-web-url.com|\$WEB_URL|g"
